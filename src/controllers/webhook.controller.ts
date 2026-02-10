/**
 * ENEOS Sales Automation - Webhook Controller
 * Handles Brevo webhook events (Scenario A)
 */

import { Request, Response, NextFunction } from 'express';
import { webhookLogger as logger } from '../utils/logger.js';
import { checkOrThrow } from '../services/deduplication.service.js';
import { addFailedBrevoWebhook } from '../services/dead-letter-queue.service.js';
import { processLeadAsync } from '../services/background-processor.service.js';
import { processingStatusService } from '../services/processing-status.service.js';
import { validateBrevoWebhook } from '../validators/brevo.validator.js';
import { formatDateForSheets } from '../utils/date-formatter.js';
import { DuplicateLeadError } from '../types/index.js';
import { config } from '../config/index.js';
import { randomUUID } from 'crypto';
import {
  leadsProcessed,
  duplicateLeadsTotal,
} from '../utils/metrics.js';

// ===========================================
// Main Webhook Handler (Scenario A)
// ===========================================

/**
 * Handle Brevo webhook events
 * Flow: Validate → Deduplicate → AI Enrich → Save to Sheets → Notify LINE
 */
export async function handleBrevoWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Received Brevo webhook', {
      event: req.body?.event,
      email: req.body?.email,
      rawPayload: JSON.stringify(req.body),
    });

    // Step 1: Validate incoming payload
    const validation = validateBrevoWebhook(req.body);
    if (!validation.success || !validation.data) {
      logger.warn('Invalid webhook payload', { error: validation.error });
      res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: validation.error,
      });
      return;
    }

    const payload = validation.data;

    // Step 2: Check if this is from Brevo Automation (no event field)
    // Brevo Automation: ไม่ส่ง event field → Process Lead
    // Brevo Campaign: ส่ง event field (delivered/opened/click) → ใช้ /webhook/brevo/campaign แทน
    if (req.body.event) {
      logger.info('Skipping - request has event field (not from Automation)', {
        event: req.body.event,
        email: req.body.email,
      });
      res.status(200).json({
        success: true,
        message: 'Acknowledged',
      });
      return;
    }

    // Step 3: Check for duplicates (using email + leadSource)
    try {
      await checkOrThrow(payload.email, payload.leadSource);
    } catch (error) {
      if (error instanceof DuplicateLeadError) {
        duplicateLeadsTotal.inc();
        logger.info('Duplicate lead detected', {
          email: payload.email,
          leadSource: payload.leadSource,
        });
        res.status(200).json({
          success: true,
          message: 'Duplicate lead - already processed',
        });
        return;
      }
      throw error;
    }

    // Step 4: Generate correlation ID for tracking
    const correlationId = randomUUID();

    // Create initial processing status
    processingStatusService.create(correlationId, payload.email, payload.company);

    // Step 5: Respond immediately (non-blocking)
    const duration = Date.now() - startTime;
    logger.info('Webhook received - processing in background', {
      correlationId,
      duration,
      email: payload.email,
      company: payload.company,
    });

    res.status(200).json({
      success: true,
      message: 'Lead received and processing',
      processing: 'background',
      correlationId,
    });

    // Step 6: Process lead in background (fire-and-forget)
    processLeadAsync(payload, correlationId);
    leadsProcessed.inc({ status: 'new', source: 'brevo' });
  } catch (error) {
    // Add to Dead Letter Queue for later retry
    const dlqId = addFailedBrevoWebhook(
      req.body,
      error instanceof Error ? error : new Error(String(error)),
      req.requestId
    );

    logger.error('Brevo webhook processing failed, added to DLQ', {
      dlqId,
      requestId: req.requestId,
      email: req.body?.email,
    });

    next(error);
  }
}

// ===========================================
// Webhook Verification (for Brevo setup)
// ===========================================

/**
 * Verify webhook endpoint (GET request for setup)
 */
export function verifyWebhook(_req: Request, res: Response): void {
  logger.info('Webhook verification request received');

  res.status(200).json({
    success: true,
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}

// ===========================================
// Test Endpoint
// ===========================================

/**
 * Test endpoint for manual testing
 */
export async function testWebhook(req: Request, res: Response): Promise<void> {
  if (config.isProd) {
    res.status(403).json({
      success: false,
      error: 'Test endpoint disabled in production',
    });
    return;
  }

  // Create a mock payload for testing
  const mockPayload = {
    event: 'click',
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
    phone: '0812345678',
    company: 'Test Company',
    campaign_id: 99999,
    campaign_name: 'Test Campaign',
    subject: 'Test Email',
    contact_id: 12345,
    'message-id': 'test-event-123',
    date: formatDateForSheets(),
  };

  // Inject mock payload into request body
  req.body = mockPayload;

  // Forward to main handler
  logger.info('Processing test webhook');

  res.status(200).json({
    success: true,
    message: 'Test webhook processed',
    mockPayload,
  });
}
