/**
 * ENEOS Sales Automation - Brevo Webhook Validators
 * Input validation using Zod
 */

import { z } from 'zod';
import { NormalizedBrevoPayload } from '../types/index.js';
import { formatDateForSheets } from '../utils/date-formatter.js';

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
  JOB_TITLE: z.string().optional(),
  LEAD_SOURCE: z.string().optional(),
  CITY: z.string().optional(),
  WEBSITE: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  sms: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  lead_source: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
}).optional();

export const brevoWebhookSchema = z.object({
  // event is optional - defaults to 'click' for Automation outbound webhooks
  event: z.string().optional().default('click'),
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
  // Brevo Automation webhook uses "attributes" object
  attributes: contactSchema,
  // Automation workflow fields
  appName: z.string().optional(),
  workflow_id: z.number().optional(),
  step_id: z.number().optional(),
  // Contact attributes at root level (legacy/alternative format)
  FIRSTNAME: z.string().optional(),
  LASTNAME: z.string().optional(),
  PHONE: z.string().optional(),
  SMS: z.string().optional(),
  COMPANY: z.string().optional(),
  JOB_TITLE: z.string().optional(),
  LEAD_SOURCE: z.string().optional(),
  CITY: z.string().optional(),
  WEBSITE: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  sms: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  lead_source: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
});

export type BrevoWebhookInput = z.infer<typeof brevoWebhookSchema>;

// ===========================================
// Normalizer Function
// ===========================================

/**
 * Normalize Brevo webhook payload to consistent format
 * Handles: nested contact object, attributes object (Automation), and flat attributes
 */
export function normalizeBrevoPayload(input: BrevoWebhookInput): NormalizedBrevoPayload {
  // Get contact data from nested object, attributes (Automation), or root level
  const contact = input.contact || {};
  const attrs = input.attributes || {};

  return {
    email: input.email.toLowerCase().trim(),
    firstname: attrs.FIRSTNAME || attrs.firstname || contact.FIRSTNAME || contact.firstname || input.FIRSTNAME || input.firstname || '',
    lastname: attrs.LASTNAME || attrs.lastname || contact.LASTNAME || contact.lastname || input.LASTNAME || input.lastname || '',
    phone: attrs.PHONE || attrs.phone || attrs.SMS || attrs.sms || contact.PHONE || contact.phone || contact.SMS || contact.sms || input.PHONE || input.phone || input.SMS || input.sms || '',
    company: attrs.COMPANY || attrs.company || contact.COMPANY || contact.company || input.COMPANY || input.company || '',
    campaignId: String(input.campaign_id || input.workflow_id || ''),
    campaignName: input.campaign_name || (input.workflow_id ? `Workflow ${input.workflow_id}` : ''),
    subject: input.subject || '',
    contactId: String(input.contact_id || ''),
    eventId: input['message-id'] || String(input.id || ''),
    clickedAt: formatDateForSheets(input.date || new Date()),
    // New fields from Brevo Contact Attributes
    jobTitle: attrs.JOB_TITLE || attrs.job_title || contact.JOB_TITLE || contact.job_title || input.JOB_TITLE || input.job_title || '',
    leadSource: attrs.LEAD_SOURCE || attrs.lead_source || contact.LEAD_SOURCE || contact.lead_source || input.LEAD_SOURCE || input.lead_source || '',
    city: attrs.CITY || attrs.city || contact.CITY || contact.city || input.CITY || input.city || '',
    website: attrs.WEBSITE || attrs.website || contact.WEBSITE || contact.website || input.WEBSITE || input.website || '',
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
