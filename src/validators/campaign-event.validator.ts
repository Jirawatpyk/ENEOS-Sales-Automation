/**
 * ENEOS Sales Automation - Campaign Event Validators
 * Input validation using Zod for Brevo Campaign Events webhook
 */

import { z } from 'zod';

// ===========================================
// Campaign Event Schema
// ===========================================

/**
 * Brevo Campaign Event webhook payload schema
 * Handles: delivered, opened, click events (and future: hard_bounce, soft_bounce, unsubscribe, spam)
 *
 * CRITICAL: "campaign name" has a SPACE in the field name (Brevo API quirk)
 */
export const campaignEventSchema = z.object({
  // Required fields
  camp_id: z.number({ required_error: 'camp_id is required' }).int('camp_id must be an integer').positive('camp_id must be positive'),
  email: z.string().email('Invalid email format'),
  event: z.string({ required_error: 'event is required' }).min(1, 'event must not be empty'),
  id: z.number({ required_error: 'id is required' }).int('id must be an integer').positive('id must be positive'),

  // Optional fields
  'campaign name': z.string().optional(),
  URL: z.string().optional(),
  date_event: z.string().optional(),
  date_sent: z.string().optional(),
  segment_ids: z.array(z.number()).optional(),
  tag: z.string().optional(),
  ts: z.number().optional(),
  ts_event: z.number().optional(),
  ts_sent: z.number().optional(),
}).passthrough(); // Allow unknown fields from Brevo

export type CampaignEventInput = z.infer<typeof campaignEventSchema>;

// ===========================================
// Normalized Campaign Event Type
// ===========================================

export interface NormalizedCampaignEvent {
  eventId: number;
  campaignId: number;
  campaignName: string;
  email: string;
  event: string;
  eventAt: string;
  sentAt: string;
  url: string;
  tag: string;
  segmentIds: number[];
}

// ===========================================
// Normalizer Function
// ===========================================

/**
 * Normalize Brevo campaign event payload to consistent format
 * Converts: "campaign name" → campaignName, camp_id → campaignId, etc.
 */
export function normalizeCampaignEventPayload(input: CampaignEventInput): NormalizedCampaignEvent {
  // Resolve event timestamp: prefer date_event, fallback to ts_event (unix)
  let eventAt = input.date_event || '';
  if (!eventAt && input.ts_event) {
    eventAt = new Date(input.ts_event * 1000).toISOString();
  }

  let sentAt = input.date_sent || '';
  if (!sentAt && input.ts_sent) {
    sentAt = new Date(input.ts_sent * 1000).toISOString();
  }

  return {
    eventId: input.id,
    campaignId: input.camp_id,
    campaignName: input['campaign name'] || '',
    email: input.email.toLowerCase().trim(),
    event: input.event,
    eventAt,
    sentAt,
    url: input.URL || '',
    tag: input.tag || '',
    segmentIds: input.segment_ids || [],
  };
}

// ===========================================
// Validation Function
// ===========================================

/**
 * Validate and normalize Brevo campaign event payload
 * Returns normalized data on success, error message on failure
 */
export function validateCampaignEvent(data: unknown): {
  success: boolean;
  data?: NormalizedCampaignEvent;
  error?: string;
} {
  const result = campaignEventSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return {
      success: false,
      error: errors.join(', '),
    };
  }

  return {
    success: true,
    data: normalizeCampaignEventPayload(result.data),
  };
}
