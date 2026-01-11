/**
 * ENEOS Sales Automation - Brevo Webhook Validators
 * Input validation using Zod
 */

import { z } from 'zod';
import { NormalizedBrevoPayload } from '../types/index.js';

// ===========================================
// Brevo Webhook Schema
// ===========================================

// Contact attributes schema (nested object from Brevo)
const contactSchema = z.object({
  FIRSTNAME: z.string().optional(),
  LASTNAME: z.string().optional(),
  PHONE: z.string().optional(),
  SMS: z.string().optional(),
  COMPANY: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  sms: z.string().optional(),
  company: z.string().optional(),
}).optional();

export const brevoWebhookSchema = z.object({
  event: z.string(),
  email: z.string().email('Invalid email format'),
  id: z.number().optional(),
  date: z.string().optional(),
  ts: z.number().optional(),
  'message-id': z.string().optional(),
  ts_event: z.number().optional(),
  subject: z.string().optional(),
  tag: z.string().optional(),
  sending_ip: z.string().optional(),
  ts_epoch: z.number().optional(),
  contact_id: z.number().optional(),
  campaign_id: z.number().optional(),
  campaign_name: z.string().optional(),
  link: z.string().optional(),
  // Contact can be nested object or flat attributes
  contact: contactSchema,
  // Contact attributes at root level (legacy/alternative format)
  FIRSTNAME: z.string().optional(),
  LASTNAME: z.string().optional(),
  PHONE: z.string().optional(),
  SMS: z.string().optional(),
  COMPANY: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  sms: z.string().optional(),
  company: z.string().optional(),
});

export type BrevoWebhookInput = z.infer<typeof brevoWebhookSchema>;

// ===========================================
// Normalizer Function
// ===========================================

/**
 * Normalize Brevo webhook payload to consistent format
 * Handles both nested contact object and flat attributes
 */
export function normalizeBrevoPayload(input: BrevoWebhookInput): NormalizedBrevoPayload {
  // Get contact data from nested object or root level
  const contact = input.contact || {};

  return {
    email: input.email.toLowerCase().trim(),
    firstname: contact.FIRSTNAME || contact.firstname || input.FIRSTNAME || input.firstname || '',
    lastname: contact.LASTNAME || contact.lastname || input.LASTNAME || input.lastname || '',
    phone: contact.PHONE || contact.phone || contact.SMS || contact.sms || input.PHONE || input.phone || input.SMS || input.sms || '',
    company: contact.COMPANY || contact.company || input.COMPANY || input.company || '',
    campaignId: String(input.campaign_id || ''),
    campaignName: input.campaign_name || '',
    subject: input.subject || '',
    contactId: String(input.contact_id || ''),
    eventId: input['message-id'] || String(input.id || ''),
    clickedAt: input.date || new Date().toISOString(),
  };
}

// ===========================================
// Validation Function
// ===========================================

export function validateBrevoWebhook(data: unknown): {
  success: boolean;
  data?: NormalizedBrevoPayload;
  error?: string;
} {
  const result = brevoWebhookSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return {
      success: false,
      error: errors.join(', '),
    };
  }

  return {
    success: true,
    data: normalizeBrevoPayload(result.data),
  };
}

// ===========================================
// Event Type Helpers
// ===========================================

export const BREVO_EVENTS = {
  CLICK: 'click',
  OPENED: 'opened',
  HARD_BOUNCE: 'hard_bounce',
  SOFT_BOUNCE: 'soft_bounce',
  DELIVERED: 'delivered',
  SPAM: 'spam',
  UNSUBSCRIBED: 'unsubscribed',
} as const;

export function isClickEvent(event: string): boolean {
  return event.toLowerCase() === BREVO_EVENTS.CLICK;
}

export function isOpenEvent(event: string): boolean {
  return event.toLowerCase() === BREVO_EVENTS.OPENED;
}
