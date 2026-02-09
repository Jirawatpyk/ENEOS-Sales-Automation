/**
 * ENEOS Sales Automation - Campaign Constants
 * Constants for Brevo Campaign Events processing
 *
 * Story 9-2: Removed Google Sheets column indices and Campaign_Contacts constants
 * (Supabase uses named columns — no column index mapping needed)
 */

// ===========================================
// Campaign Event Types
// ===========================================

export const CAMPAIGN_EVENTS = {
  // Enabled (Story 5-1)
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICK: 'click',

  // Future (prepared but not enabled)
  HARD_BOUNCE: 'hard_bounce',
  SOFT_BOUNCE: 'soft_bounce',
  UNSUBSCRIBE: 'unsubscribe',
  SPAM: 'spam',
} as const;

export type CampaignEventType = typeof CAMPAIGN_EVENTS[keyof typeof CAMPAIGN_EVENTS];

/**
 * Events ที่ process ตอนนี้ - เพิ่ม event ใหม่แค่เพิ่มใน array นี้
 */
export const ENABLED_EVENTS: CampaignEventType[] = [
  CAMPAIGN_EVENTS.DELIVERED,
  CAMPAIGN_EVENTS.OPENED,
  CAMPAIGN_EVENTS.CLICK,
];

/**
 * Check if an event type is enabled for processing
 */
export function isEventEnabled(event: string): boolean {
  return ENABLED_EVENTS.includes(event as CampaignEventType);
}
