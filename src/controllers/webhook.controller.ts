/**
 * ENEOS Sales Automation - Webhook Controller
 * Handles Brevo webhook events (Scenario A)
 */

import { Request, Response, NextFunction } from 'express';
import { webhookLogger as logger } from '../utils/logger.js';
import { sheetsService } from '../services/sheets.service.js';
import { geminiService } from '../services/gemini.service.js';
import { lineService } from '../services/line.service.js';
import { deduplicationService } from '../services/deduplication.service.js';
import { addFailedBrevoWebhook } from '../services/dead-letter-queue.service.js';
import { validateBrevoWebhook, isClickEvent } from '../validators/brevo.validator.js';
import { extractDomain } from '../utils/email-parser.js';
import { formatPhone } from '../utils/phone-formatter.js';
import { formatDateForSheets } from '../utils/date-formatter.js';
import { Lead, LeadRow, DuplicateLeadError } from '../types/index.js';
import { config } from '../config/index.js';
import {
  leadsProcessed,
  duplicateLeadsTotal,
  aiAnalysisDuration,
  aiAnalysisTotal,
  lineNotificationTotal,
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

    // Step 2: Check if this is a click event (hot lead)
    if (!isClickEvent(req.body.event)) {
      logger.info('Ignoring non-click event', { event: req.body.event });
      res.status(200).json({
        success: true,
        message: `Event '${req.body.event}' acknowledged but not processed`,
      });
      return;
    }

    // Step 3: Check for duplicates
    try {
      await deduplicationService.checkOrThrow(payload.email, payload.campaignId);
    } catch (error) {
      if (error instanceof DuplicateLeadError) {
        duplicateLeadsTotal.inc();
        logger.info('Duplicate lead detected', {
          email: payload.email,
          campaignId: payload.campaignId,
        });
        res.status(200).json({
          success: true,
          message: 'Duplicate lead - already processed',
        });
        return;
      }
      throw error;
    }

    // Step 4: AI Enrichment (analyze company)
    const domain = extractDomain(payload.email);
    let aiAnalysis = {
      industry: 'ไม่ระบุ',
      companyType: 'ไม่ระบุ',
      talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาพสูงจากญี่ปุ่น',
      website: null as string | null,
      registeredCapital: null as string | null,
      keywords: ['B2B'],
    };

    if (config.features.aiEnrichment) {
      const aiStartTime = Date.now();
      try {
        aiAnalysis = await geminiService.analyzeCompany(domain, payload.company);
        aiAnalysisDuration.observe((Date.now() - aiStartTime) / 1000);
        aiAnalysisTotal.inc({ status: 'success' });
        logger.info('AI analysis completed', {
          email: payload.email,
          industry: aiAnalysis.industry,
        });
      } catch (aiError) {
        aiAnalysisDuration.observe((Date.now() - aiStartTime) / 1000);
        aiAnalysisTotal.inc({ status: 'error' });
        logger.error('AI analysis failed, using defaults', {
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
        });
        // Continue with default values
      }
    }

    // Step 5: Save to Google Sheets
    const lead: Partial<Lead> = {
      date: formatDateForSheets(),
      customerName: `${payload.firstname} ${payload.lastname}`.trim() || 'ไม่ระบุ',
      email: payload.email,
      phone: formatPhone(payload.phone),
      company: payload.company || 'ไม่ระบุ',
      industryAI: aiAnalysis.industry,
      // Use Brevo website if provided, otherwise use AI-guessed website
      website: payload.website || aiAnalysis.website,
      capital: aiAnalysis.registeredCapital,
      status: 'new',
      campaignId: payload.campaignId,
      campaignName: payload.campaignName,
      emailSubject: payload.subject,
      source: 'Brevo',
      leadId: payload.contactId,
      eventId: payload.eventId,
      clickedAt: payload.clickedAt,
      talkingPoint: aiAnalysis.talkingPoint,
      // New fields from Brevo Contact Attributes
      leadSource: payload.leadSource || null,
      jobTitle: payload.jobTitle || null,
      city: payload.city || null,
    };

    const rowNumber = await sheetsService.addLead(lead);
    leadsProcessed.inc({ status: 'new', source: 'brevo' });

    logger.info('Lead saved to Google Sheets', {
      rowNumber,
      email: payload.email,
    });

    // Create LeadRow object for LINE notification
    const leadRow: LeadRow = {
      ...lead as Lead,
      rowNumber,
      version: 1, // New lead starts with version 1
    };

    // Step 6: Send LINE notification
    if (config.features.lineNotifications) {
      try {
        await lineService.pushLeadNotification(leadRow, {
          industry: aiAnalysis.industry,
          talkingPoint: aiAnalysis.talkingPoint,
          website: aiAnalysis.website,
          registeredCapital: aiAnalysis.registeredCapital,
        });
        lineNotificationTotal.inc({ status: 'success', type: 'push' });

        logger.info('LINE notification sent', {
          rowNumber,
          company: lead.company,
        });
      } catch (lineError) {
        lineNotificationTotal.inc({ status: 'error', type: 'push' });
        // Log but don't fail the request
        logger.error('Failed to send LINE notification', {
          error: lineError instanceof Error ? lineError.message : 'Unknown error',
          rowNumber,
        });
      }
    }

    // Success response
    const duration = Date.now() - startTime;
    logger.info('Webhook processed successfully', {
      rowNumber,
      duration,
      email: payload.email,
    });

    res.status(200).json({
      success: true,
      message: 'Lead processed successfully',
      data: {
        rowNumber,
        email: payload.email,
        company: lead.company,
        industry: aiAnalysis.industry,
      },
    });
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
