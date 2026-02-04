/**
 * ENEOS Sales Automation - Campaign Webhook Controller
 * Handles Brevo Campaign Events webhook (delivered, opened, click)
 * and Brevo Automation Contact webhook (contact attributes storage)
 */

import { Request, Response, NextFunction } from 'express';
import { campaignLogger as logger } from '../utils/logger.js';
import { campaignStatsService } from '../services/campaign-stats.service.js';
import { campaignContactsService } from '../services/campaign-contacts.service.js';
import { addFailedBrevoWebhook } from '../services/dead-letter-queue.service.js';
import { validateCampaignEvent } from '../validators/campaign-event.validator.js';
import { validateBrevoWebhook } from '../validators/brevo.validator.js';
import { isEventEnabled } from '../constants/campaign.constants.js';

// ===========================================
// Main Webhook Handler
// ===========================================

/**
 * Handle Brevo Campaign/Automation webhook
 * Detection: payload has `event` field → Campaign Event (existing flow)
 *            payload has NO `event` field → Automation Contact (new flow, Story 5-11)
 */
export async function handleCampaignWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawPayload = req.body;

  // Story 5-11 AC1: Detect webhook source
  // Campaign payloads have `event` field (delivered/opened/click)
  // Automation payloads have no `event` key at all (but may have `attributes`)
  // CRITICAL: Must check raw payload BEFORE validation — brevoWebhookSchema.event has
  // .default('click') which injects event:'click' into payloads that lack it.
  // Use 'in' operator to check key existence (not truthiness — empty string, null, 0 are still campaign events)
  if (!('event' in rawPayload)) {
    // Automation webhook → store contact data (no AI, no LINE)
    return handleAutomationContact(req, res, next);
  }

  // Existing campaign event flow (no changes)
  return handleCampaignEvent(req, res);
}

// ===========================================
// Automation Contact Handler (Story 5-11)
// ===========================================

/**
 * Handle Brevo Automation webhook — store contact data in Campaign_Contacts
 * AC4: No AI enrichment, no LINE notifications, no Lead creation
 * AC5: Validate email, store with defaults, DLQ on error
 */
async function handleAutomationContact(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const rawPayload = req.body;
  const requestId = req.requestId;

  logger.info('Received automation contact webhook', {
    email: rawPayload?.email,
    hasAttributes: !!rawPayload?.attributes,
  });

  // Validate payload using existing brevo validator
  const validation = validateBrevoWebhook(rawPayload);
  if (!validation.success || !validation.data) {
    logger.warn('Invalid automation contact payload', { error: validation.error });
    res.status(400).json({
      success: false,
      error: 'Invalid payload',
      details: validation.error,
    });
    return;
  }

  // AC4: Respond 200 OK immediately
  res.status(200).json({
    success: true,
    message: 'Automation contact received',
  });

  // Store contact in background (fire-and-forget)
  // NOTE: storeCampaignContact catches errors internally and resolves with { success: false },
  // so we must check result.success in .then() — .catch() only handles unexpected rejections.
  const contact = validation.data;
  campaignContactsService.storeCampaignContact(contact).then((result) => {
    if (!result.success) {
      logger.error('Failed to store automation contact, adding to DLQ', {
        email: contact.email,
        error: result.error,
        requestId,
      });
      // AC5: Add to DLQ on error
      addFailedBrevoWebhook(rawPayload, new Error(result.error || 'Unknown error'), requestId);
    }
  }).catch((error) => {
    // Safety net for unexpected rejections (should not normally happen)
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Unexpected error storing automation contact, adding to DLQ', {
      email: contact.email,
      error: errorMessage,
      requestId,
    });
    addFailedBrevoWebhook(rawPayload, error instanceof Error ? error : new Error(errorMessage), requestId);
  });
}

// ===========================================
// Campaign Event Handler (existing flow)
// ===========================================

/**
 * Handle Brevo Campaign Events webhook
 * Flow: Validate → Return 200 immediately → Process async
 */
async function handleCampaignEvent(
  req: Request,
  res: Response
): Promise<void> {
  const startTime = Date.now();
  const requestId = req.requestId;
  const rawPayload = req.body;

  logger.info('Received campaign webhook', {
    event: rawPayload?.event,
    email: rawPayload?.email,
    campaignId: rawPayload?.camp_id,
  });

  // Step 1: Validate incoming payload
  const validation = validateCampaignEvent(rawPayload);
  if (!validation.success || !validation.data) {
    logger.warn('Invalid campaign webhook payload', { error: validation.error });
    res.status(400).json({
      success: false,
      error: 'Invalid payload',
      details: validation.error,
    });
    return;
  }

  const event = validation.data;

  // Step 2: Check if event type is enabled
  if (!isEventEnabled(event.event)) {
    logger.info('Event type not enabled, acknowledging but not processing', {
      eventType: event.event,
      eventId: event.eventId,
    });
    res.status(200).json({
      success: true,
      message: `Event '${event.event}' acknowledged but not enabled for processing`,
    });
    return;
  }

  // Step 3: Return 200 immediately (non-blocking pattern)
  res.status(200).json({
    success: true,
    message: 'Event received',
    eventId: event.eventId,
    campaignId: event.campaignId,
  });

  // Step 4: Process event asynchronously (fire and forget)
  processCampaignEventAsync(event, rawPayload, requestId, startTime).catch((error) => {
    logger.error('Async campaign event processing failed', {
      error: error instanceof Error ? error.message : String(error),
      eventId: event.eventId,
      requestId,
    });
  });
}

/**
 * Process campaign event asynchronously
 * Called after 200 response is sent to Brevo
 */
async function processCampaignEventAsync(
  event: ReturnType<typeof validateCampaignEvent>['data'],
  rawPayload: unknown,
  requestId: string | undefined,
  startTime: number
): Promise<void> {
  if (!event) {
    return;
  }

  const result = await campaignStatsService.recordCampaignEvent(event);

  if (result.duplicate) {
    logger.info('Duplicate event detected (async)', { eventId: event.eventId });
    return;
  }

  if (!result.success) {
    // Add to DLQ for retry
    const dlqId = addFailedBrevoWebhook(
      rawPayload,
      new Error(result.error || 'Unknown error'),
      requestId
    );
    logger.error('Campaign event processing failed, added to DLQ', {
      dlqId,
      eventId: event.eventId,
      error: result.error,
    });
    return;
  }

  const duration = Date.now() - startTime;
  logger.info('Campaign event processed successfully (async)', {
    eventId: event.eventId,
    campaignId: event.campaignId,
    event: event.event,
    duration,
  });
}

// ===========================================
// Verification Endpoint
// ===========================================

/**
 * Verify campaign webhook endpoint (GET request for setup)
 */
export function verifyCampaignWebhook(_req: Request, res: Response): void {
  logger.info('Campaign webhook verification request received');

  res.status(200).json({
    success: true,
    message: 'Campaign webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
