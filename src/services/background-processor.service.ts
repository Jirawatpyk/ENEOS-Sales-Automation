/**
 * Background Processor Service
 * Handles async processing of leads to improve webhook response time
 */

import { logger } from '../utils/logger.js';
import { GeminiService } from './gemini.service.js';
import { LineService } from './line.service.js';
import * as leadsService from './leads.service.js';
import { deadLetterQueue } from './dead-letter-queue.service.js';
import { processingStatusService } from './processing-status.service.js';
import { extractDomain } from '../utils/email-parser.js';
import { formatPhone } from '../utils/phone-formatter.js';
import { formatDateForSheets } from '../utils/date-formatter.js';
import { config } from '../config/index.js';
import type { NormalizedBrevoPayload } from '../types/index.js';
import type { Lead, LeadRow, CompanyAnalysis } from '../types/index.js';

/**
 * Process lead in background (fire-and-forget)
 * This function is called after webhook responds 200 OK
 */
export async function processLeadInBackground(
  payload: NormalizedBrevoPayload,
  correlationId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    // Update status to processing
    processingStatusService.startProcessing(correlationId);

    logger.info('Background processing started', {
      correlationId,
      email: payload.email,
      company: payload.company,
    });

    // Step 1: AI Enrichment
    const geminiService = new GeminiService();
    const domain = extractDomain(payload.email);
    let aiAnalysis: CompanyAnalysis = {
      industry: 'Unknown',
      talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาะสูงจากญี่ปุ่น',
      website: null,
      registeredCapital: null,
      keywords: ['B2B'],
      juristicId: null,
      dbdSector: null,
      province: null,
      fullAddress: null,
      confidence: 0,
      confidenceFactors: {
        hasRealDomain: false,
        hasDBDData: false,
        keywordMatch: false,
        geminiConfident: false,
        dataCompleteness: 0,
      },
    };

    if (config.features.aiEnrichment) {
      const aiStartTime = Date.now();
      try {
        aiAnalysis = await geminiService.analyzeCompany(domain, payload.company);
        logger.info('AI analysis completed', {
          correlationId,
          email: payload.email,
          industry: aiAnalysis.industry,
          confidence: aiAnalysis.confidence,
          duration: Date.now() - aiStartTime,
        });
      } catch (aiError) {
        logger.warn('AI analysis failed, using defaults', {
          correlationId,
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
        });
        // Continue with defaults - not critical
      }
    }

    // Step 2: Save to Supabase
    const lead: Partial<Lead> = {
      date: formatDateForSheets(),
      customerName: `${payload.firstname} ${payload.lastname}`.trim() || 'ไม่ระบุ',
      email: payload.email,
      phone: formatPhone(payload.phone),
      company: payload.company || 'ไม่ระบุ',
      industryAI: aiAnalysis.industry,
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
      leadSource: payload.leadSource || null,
      jobTitle: payload.jobTitle || null,
      city: payload.city || null,
      juristicId: aiAnalysis.juristicId || null,
      dbdSector: aiAnalysis.dbdSector || null,
      province: aiAnalysis.province || null,
      fullAddress: aiAnalysis.fullAddress || null,
    };

    const savedLead = await leadsService.addLead(lead);

    logger.info('Lead saved to Supabase', {
      correlationId,
      leadId: savedLead.id,
      email: payload.email,
    });

    // Construct LeadRow-compatible object for LINE notification
    // LINE template still expects LeadRow until Story 9-1b rewrites it
    const leadRow: LeadRow = {
      ...(lead as Lead),
      rowNumber: 0, // No row number in Supabase
      version: savedLead.version,
      leadUUID: savedLead.id,
      createdAt: savedLead.created_at,
      updatedAt: savedLead.updated_at,
    };

    // Step 3: Send LINE notification
    if (config.features.lineNotifications) {
      try {
        const lineService = new LineService();
        await lineService.pushLeadNotification(leadRow, {
          industry: aiAnalysis.industry,
          talkingPoint: aiAnalysis.talkingPoint,
          website: aiAnalysis.website,
          registeredCapital: aiAnalysis.registeredCapital,
        });

        logger.info('LINE notification sent', {
          correlationId,
          leadId: savedLead.id,
          company: lead.company,
        });
      } catch (lineError) {
        // Log but don't fail - LINE notification is non-critical
        logger.error('Failed to send LINE notification', {
          correlationId,
          error: lineError instanceof Error ? lineError.message : 'Unknown error',
          leadId: savedLead.id,
        });
      }
    }

    // Success - update status
    const duration = Date.now() - startTime;
    processingStatusService.complete(
      correlationId,
      0, // No row number in Supabase — processingStatus still expects number
      aiAnalysis.industry,
      aiAnalysis.confidence,
      duration
    );

    logger.info('Background processing completed', {
      correlationId,
      leadId: savedLead.id,
      duration,
      email: payload.email,
    });
  } catch (error) {
    // Critical error - save to DLQ and update status
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update status to failed
    processingStatusService.fail(correlationId, errorMessage, duration);

    logger.error('Background processing failed', {
      correlationId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      email: payload.email,
    });

    // Save to Dead Letter Queue
    deadLetterQueue.add(
      'brevo_webhook',
      payload,
      error instanceof Error ? error : new Error(String(error)),
      correlationId
    );

    // TODO: Send admin notification for critical errors
    // For now, just log - can implement later if needed
  }
}

/**
 * Process lead with correlation ID for tracking
 */
export function processLeadAsync(
  payload: NormalizedBrevoPayload,
  correlationId: string
): void {
  // Fire-and-forget - don't await
  processLeadInBackground(payload, correlationId).catch((error) => {
    // This should never happen as processLeadInBackground catches all errors
    // But just in case...
    logger.error('Unexpected error in background processor', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  logger.info('Background processing queued', {
    correlationId,
    email: payload.email,
  });
}
