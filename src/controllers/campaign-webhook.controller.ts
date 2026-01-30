/**
 * ENEOS Sales Automation - Campaign Webhook Controller
 * Handles Brevo Campaign Events webhook (delivered, opened, click)
 */

import { Request, Response, NextFunction } from 'express';
import { campaignLogger as logger } from '../utils/logger.js';
import { campaignStatsService } from '../services/campaign-stats.service.js';
import { addFailedBrevoWebhook } from '../services/dead-letter-queue.service.js';
import { validateCampaignEvent } from '../validators/campaign-event.validator.js';
import { isEventEnabled } from '../constants/campaign.constants.js';

// ===========================================
// Main Webhook Handler
// ===========================================

/**
 * Handle Brevo Campaign Events webhook
 * Flow: Validate → Return 200 immediately → Process async
 *
 * Implements:
 * - AC1: Returns 200 OK immediately (non-blocking, same as LINE webhook pattern)
 * - AC2: Validates payload with Zod
 * - AC7: Checks if event is enabled before processing
 */
export async function handleCampaignWebhook(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  const requestId = req.requestId;
  const rawPayload = req.body;

  logger.info('Received campaign webhook', {
    event: rawPayload?.event,
    email: rawPayload?.email,
    campaignId: rawPayload?.camp_id,
  });

  // Step 1: Validate incoming payload (AC2)
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

  // Step 2: Check if event type is enabled (AC7)
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

  // Step 3: Return 200 immediately (AC1 - Non-blocking pattern)
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
