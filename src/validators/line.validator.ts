/**
 * ENEOS Sales Automation - LINE Webhook Validators
 * Input validation for LINE postback events
 */

import { z } from 'zod';
import { LinePostbackData, LeadStatus } from '../types/index.js';

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
 * Expected format: "action=contacted&row_id=123"
 */
export function parsePostbackData(dataString: string): LinePostbackData | null {
  try {
    const params = new URLSearchParams(dataString);
    const action = params.get('action');
    const rowId = params.get('row_id');

    if (!action || !rowId) {
      return null;
    }

    // Validate action is a valid status
    const validStatuses: LeadStatus[] = ['new', 'contacted', 'unreachable', 'closed', 'lost'];
    if (!validStatuses.includes(action as LeadStatus)) {
      return null;
    }

    const parsedRowId = parseInt(rowId, 10);
    if (isNaN(parsedRowId) || parsedRowId < 1) {
      return null;
    }

    return {
      action: action as LeadStatus,
      rowId: parsedRowId,
    };
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
