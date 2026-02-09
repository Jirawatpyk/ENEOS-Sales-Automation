/**
 * ENEOS Sales Automation - LINE Controller
 * Handles LINE postback events (Scenario B)
 */

import { Request, Response, NextFunction } from 'express';
import { lineLogger as logger } from '../utils/logger.js';
import * as leadsService from '../services/leads.service.js';
import { lineService } from '../services/line.service.js';
import { addFailedLinePostback } from '../services/dead-letter-queue.service.js';
import {
  validateLineWebhook,
  parsePostbackData,
  isPostbackEvent,
  LineWebhookEventInput,
} from '../validators/line.validator.js';
import { AppError, RaceConditionError } from '../types/index.js';
import { config } from '../config/index.js';
import {
  leadsClaimedTotal,
  raceConditionsTotal,
  lineNotificationTotal,
} from '../utils/metrics.js';

// ===========================================
// Main LINE Webhook Handler (Scenario B)
// ===========================================

/**
 * Handle LINE webhook events
 * Flow: Validate → Parse Postback → Get Row → Check Race Condition → Update → Reply
 */
export async function handleLineWebhook(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {

  try {
    // Log all events with source details for debugging
    const rawEvents = req.body?.events || [];
    logger.info('Received LINE webhook', {
      eventsCount: rawEvents.length,
      sources: rawEvents.map((e: { type: string; source?: { type: string; groupId?: string; userId?: string } }) => ({
        eventType: e.type,
        sourceType: e.source?.type,
        groupId: e.source?.groupId,
        userId: e.source?.userId?.substring(0, 10) + '...',
      })),
    });

    // Step 1: Validate incoming payload
    const validation = validateLineWebhook(req.body);
    if (!validation.success || !validation.data) {
      logger.warn('Invalid LINE webhook payload', { error: validation.error });
      // LINE expects 200 even for invalid payloads
      res.status(200).json({ success: false, error: validation.error });
      return;
    }

    const { events } = validation.data;

    // Process events in parallel but respond immediately
    // LINE requires quick response (< 1 second)
    res.status(200).json({ success: true });

    // Process events asynchronously
    for (const event of events) {
      processLineEvent(event).catch((error) => {
        // Add to Dead Letter Queue for later review
        const dlqId = addFailedLinePostback(
          event,
          error instanceof Error ? error : new Error(String(error)),
          req.requestId
        );

        logger.error('Error processing LINE event, added to DLQ', {
          dlqId,
          error: error instanceof Error ? error.message : 'Unknown error',
          eventType: event.type,
        });
      });
    }
  } catch (error) {
    // LINE expects 200 even on error
    logger.error('Error in LINE webhook handler', { error });
    res.status(200).json({ success: false });
  }
}

// ===========================================
// Event Processor
// ===========================================

/**
 * Process individual LINE event
 */
async function processLineEvent(event: LineWebhookEventInput): Promise<void> {
  // Only process postback events
  if (!isPostbackEvent(event)) {
    logger.debug('Ignoring non-postback event', { type: event.type });
    return;
  }

  const { replyToken, source, postback } = event;
  const userId = source.userId;
  const groupId = source.groupId;

  logger.info('Processing postback event', {
    userId,
    data: postback?.data,
  });

  // Parse postback data
  const postbackData = parsePostbackData(postback?.data || '');
  if (!postbackData) {
    logger.warn('Invalid postback data', { data: postback?.data });
    await lineService.replyError(replyToken, 'ข้อมูลไม่ถูกต้อง');
    return;
  }

  const { action, rowId, leadId } = postbackData;

  // Helper function to get user profile with fallback
  const getUserProfileSafe = async (): Promise<string> => {
    try {
      if (groupId) {
        const profile = await lineService.getGroupMemberProfile(groupId, userId);
        return profile.displayName;
      } else {
        const profile = await lineService.getUserProfile(userId);
        return profile.displayName;
      }
    } catch (profileError) {
      logger.warn('Could not get user profile, using userId', {
        userId,
        error: profileError instanceof Error ? profileError.message : 'Unknown error',
      });
      return userId.substring(0, 10) + '...';
    }
  };

  // Determine the lead UUID to use
  // Priority: leadId (new UUID format) > rowId (legacy — not supported in Supabase)
  let effectiveLeadId: string;
  let userName: string;

  if (leadId) {
    // UUID-based lookup — run getLeadById and getUserProfile in PARALLEL
    const [supabaseLead, profileName] = await Promise.all([
      leadsService.getLeadById(leadId),
      getUserProfileSafe(),
    ]);

    if (!supabaseLead) {
      logger.warn('Lead not found by UUID', { leadId });
      await lineService.replyError(replyToken, 'ไม่พบข้อมูลเคสนี้ในระบบ');
      return;
    }
    effectiveLeadId = leadId;
    userName = profileName;
    logger.info('Resolved leadId via Supabase', { leadId });
  } else if (rowId !== undefined) {
    // Legacy row-based postback — not supported after Supabase migration
    // Story 9-1b will update templates to always use leadId
    logger.warn('Legacy rowId postback received — not supported in Supabase', { rowId });
    await lineService.replyError(replyToken, 'กรุณากดปุ่มจากข้อความใหม่');
    return;
  } else {
    logger.warn('No leadId or rowId in postback', { data: postback?.data });
    await lineService.replyError(replyToken, 'ข้อมูลไม่ถูกต้อง');
    return;
  }

  try {
    // Claim or update lead via Supabase
    const result = await leadsService.claimLead(effectiveLeadId, userId, userName, action);

    if (result.alreadyClaimed) {
      // Lead was claimed by someone else
      raceConditionsTotal.inc();
      await lineService.replyClaimed(
        replyToken,
        result.lead.company,
        result.lead.customerName,
        result.owner || 'Unknown'
      );
      lineNotificationTotal.inc({ status: 'success', type: 'reply' });
      logger.info('Lead already claimed', {
        leadId: effectiveLeadId,
        owner: result.owner,
        attemptedBy: userName,
      });
      return;
    }

    // Check if this is a NEW claim or owner updating status
    if (result.isNewClaim) {
      // First time claim - show success message
      leadsClaimedTotal.inc({ status: 'contacted' });
      await lineService.replySuccess(
        replyToken,
        userName,
        result.lead.company,
        result.lead.customerName,
        action
      );
      lineNotificationTotal.inc({ status: 'success', type: 'reply' });

      logger.info('Lead claimed successfully', {
        leadId: effectiveLeadId,
        owner: userName,
        status: action,
      });
    } else {
      // Owner is updating their own lead status
      const isClosedSale = action === 'closed';
      const isLostSale = action === 'lost';

      leadsClaimedTotal.inc({ status: action });
      await lineService.replyStatusUpdate(
        replyToken,
        result.lead.company,
        action,
        isClosedSale,
        isLostSale
      );
      lineNotificationTotal.inc({ status: 'success', type: 'reply' });

      logger.info('Lead status updated by owner', {
        leadId: effectiveLeadId,
        newStatus: action,
        owner: userName,
      });
    }
  } catch (error) {
    logger.error('Error processing postback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      leadId: effectiveLeadId,
      userId,
    });

    if (error instanceof RaceConditionError) {
      // Race condition = someone else claimed it at the same time
      // Re-fetch to get the actual owner and show proper message
      try {
        const currentSupabaseLead = await leadsService.getLeadById(effectiveLeadId);
        if (currentSupabaseLead?.sales_owner_name) {
          await lineService.replyClaimed(
            replyToken,
            currentSupabaseLead.company,
            currentSupabaseLead.customer_name,
            currentSupabaseLead.sales_owner_name
          );
        } else {
          await lineService.replyError(replyToken, 'มีคนรับเคสนี้ไปแล้ว กรุณาลองใหม่');
        }
      } catch {
        await lineService.replyError(replyToken, 'มีคนรับเคสนี้ไปแล้ว');
      }
    } else if (error instanceof AppError && error.code === 'ROW_NOT_FOUND') {
      await lineService.replyError(replyToken, 'ไม่พบข้อมูลเคสนี้ในระบบ');
    } else {
      await lineService.replyError(replyToken);
    }
  }
}

// ===========================================
// Signature Verification Middleware
// ===========================================

/**
 * Verify LINE webhook signature
 * Security: Only skip verification if explicitly configured via SKIP_LINE_SIGNATURE_VERIFICATION=true
 */
export function verifyLineSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only skip verification if explicitly configured (NOT based on NODE_ENV alone)
  if (config.dev.skipLineSignatureVerification) {
    logger.warn('LINE signature verification SKIPPED (SKIP_LINE_SIGNATURE_VERIFICATION=true)', {
      warning: 'This should only be used for local development!',
    });
    return next();
  }

  const signature = req.get('x-line-signature');
  if (!signature) {
    logger.warn('Missing LINE signature');
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  // Get raw body for signature verification
  const rawBody = JSON.stringify(req.body);
  const isValid = lineService.verifySignature(rawBody, signature);

  if (!isValid) {
    logger.warn('Invalid LINE signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}

// ===========================================
// Test Endpoint
// ===========================================

/**
 * Test LINE notification
 */
export async function testLineNotification(
  _req: Request,
  res: Response
): Promise<void> {
  if (config.isProd) {
    res.status(403).json({
      success: false,
      error: 'Test endpoint disabled in production',
    });
    return;
  }

  try {
    await lineService.pushTextMessage('🧪 Test notification from ENEOS Sales Automation');

    res.status(200).json({
      success: true,
      message: 'Test notification sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
