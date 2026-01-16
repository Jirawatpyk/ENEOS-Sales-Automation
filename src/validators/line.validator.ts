/**
 * ENEOS Sales Automation - LINE Webhook Validators
 * Input validation for LINE postback events
 */

import { z } from 'zod';
import { LinePostbackData, LeadStatus } from '../types/index.js';
import { isValidLeadUUID } from '../utils/uuid.js';

// ===========================================
// LINE Webhook Schema
// ===========================================

export const lineWebhookEventSchema = z.object({
  type: z.string(),
  replyToken: z.string(),
  source: z.object({
    type: z.string(),
    userId: z.string(),
    groupId: z.string().optional(),
  }),
  timestamp: z.number(),
  postback: z.object({
    data: z.string(),
  }).optional(),
  message: z.object({
    type: z.string(),
    id: z.string(),
    text: z.string().optional(),
  }).optional(),
});

export const lineWebhookBodySchema = z.object({
  destination: z.string(),
  events: z.array(lineWebhookEventSchema),
});

export type LineWebhookEventInput = z.infer<typeof lineWebhookEventSchema>;
export type LineWebhookBodyInput = z.infer<typeof lineWebhookBodySchema>;

// ===========================================
// Postback Data Parser
// ===========================================

/**
 * Parse postback data string to structured object
 * Supports both legacy format (row_id) and new UUID format (lead_id)
 * Legacy format: "action=contacted&row_id=123"
 * New format: "action=contacted&lead_id=lead_uuid-here"
 */
export function parsePostbackData(dataString: string): LinePostbackData | null {
  try {
    const params = new URLSearchParams(dataString);
    const action = params.get('action');
    const rowId = params.get('row_id');
    const leadId = params.get('lead_id');

    // Must have action and at least one identifier (rowId or leadId)
    if (!action || (!rowId && !leadId)) {
      return null;
    }

    // Validate action is a valid status (includes 'claimed' for completeness)
    const validStatuses: LeadStatus[] = ['new', 'claimed', 'contacted', 'unreachable', 'closed', 'lost'];
    if (!validStatuses.includes(action as LeadStatus)) {
      return null;
    }

    // Build result object
    const result: LinePostbackData = {
      action: action as LeadStatus,
    };

    // Parse rowId if present (legacy support)
    if (rowId) {
      const parsedRowId = parseInt(rowId, 10);
      if (isNaN(parsedRowId) || parsedRowId < 1) {
        // Invalid rowId but leadId might be present
        if (!leadId) {
          return null;
        }
      } else {
        result.rowId = parsedRowId;
      }
    }

    // Parse leadId if present (new UUID format)
    if (leadId) {
      // Validate UUID format using the dedicated validator
      // Accepts both full lead_<uuid> format and legacy formats for backward compatibility
      if (isValidLeadUUID(leadId)) {
        // Valid lead_<uuid> format
        result.leadId = leadId;
      } else if (leadId.length >= 36) {
        // Might be a raw UUID without prefix - accept for backward compatibility
        result.leadId = leadId;
      } else {
        // Invalid leadId but rowId might be present for fallback
        if (!result.rowId) {
          return null;
        }
        // Don't set invalid leadId, let rowId handle it
      }
    }

    return result;
  } catch {
    return null;
  }
}

// ===========================================
// Validation Functions
// ===========================================

export function validateLineWebhook(data: unknown): {
  success: boolean;
  data?: LineWebhookBodyInput;
  error?: string;
} {
  const result = lineWebhookBodySchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return {
      success: false,
      error: errors.join(', '),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

// ===========================================
// Event Type Helpers
// ===========================================

export const LINE_EVENT_TYPES = {
  MESSAGE: 'message',
  POSTBACK: 'postback',
  FOLLOW: 'follow',
  UNFOLLOW: 'unfollow',
  JOIN: 'join',
  LEAVE: 'leave',
} as const;

export function isPostbackEvent(event: LineWebhookEventInput): boolean {
  return event.type === LINE_EVENT_TYPES.POSTBACK && !!event.postback;
}

export function isMessageEvent(event: LineWebhookEventInput): boolean {
  return event.type === LINE_EVENT_TYPES.MESSAGE && !!event.message;
}

export function isFromGroup(event: LineWebhookEventInput): boolean {
  return event.source.type === 'group' && !!event.source.groupId;
}
