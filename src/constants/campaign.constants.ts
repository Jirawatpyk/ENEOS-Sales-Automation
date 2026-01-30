/**
 * ENEOS Sales Automation - Campaign Constants
 * Constants for Brevo Campaign Events processing
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

// ===========================================
// Campaign_Events Sheet Columns (Detail Log)
// ===========================================

/**
 * Column indices for Campaign_Events sheet (0-indexed)
 *
 * | Column | Index | Type |
 * |--------|-------|------|
 * | Event_ID | 0 | number |
 * | Campaign_ID | 1 | number |
 * | Campaign_Name | 2 | string |
 * | Email | 3 | string |
 * | Event | 4 | string |
 * | Event_At | 5 | datetime |
 * | Sent_At | 6 | datetime |
 * | URL | 7 | string |
 * | Tag | 8 | string |
 * | Segment_IDs | 9 | string (JSON) |
 * | Created_At | 10 | datetime |
 */
export const CAMPAIGN_EVENTS_COLUMNS = {
  EVENT_ID: 0,
  CAMPAIGN_ID: 1,
  CAMPAIGN_NAME: 2,
  EMAIL: 3,
  EVENT: 4,
  EVENT_AT: 5,
  SENT_AT: 6,
  URL: 7,
  TAG: 8,
  SEGMENT_IDS: 9,
  CREATED_AT: 10,
} as const;

export const CAMPAIGN_EVENTS_RANGE = 'A:K'; // 11 columns

// ===========================================
// Campaign_Stats Sheet Columns (Aggregate)
// ===========================================

/**
 * Column indices for Campaign_Stats sheet (0-indexed)
 *
 * | Column | Index | Type | Notes |
 * |--------|-------|------|-------|
 * | Campaign_ID | 0 | number | |
 * | Campaign_Name | 1 | string | |
 * | Delivered | 2 | number | Total delivered |
 * | Opened | 3 | number | Total opens |
 * | Clicked | 4 | number | Total clicks |
 * | Unique_Opens | 5 | number | Unique emails opened |
 * | Unique_Clicks | 6 | number | Unique emails clicked |
 * | Open_Rate | 7 | number (%) | Unique_Opens / Delivered * 100 |
 * | Click_Rate | 8 | number (%) | Unique_Clicks / Delivered * 100 |
 * | Hard_Bounce | 9 | number | **Future** (default 0) |
 * | Soft_Bounce | 10 | number | **Future** (default 0) |
 * | Unsubscribe | 11 | number | **Future** (default 0) |
 * | Spam | 12 | number | **Future** (default 0) |
 * | First_Event | 13 | datetime | |
 * | Last_Updated | 14 | datetime | |
 */
export const CAMPAIGN_STATS_COLUMNS = {
  CAMPAIGN_ID: 0,
  CAMPAIGN_NAME: 1,
  DELIVERED: 2,
  OPENED: 3,
  CLICKED: 4,
  UNIQUE_OPENS: 5,
  UNIQUE_CLICKS: 6,
  OPEN_RATE: 7,
  CLICK_RATE: 8,
  // Future columns (prepared but not enabled)
  HARD_BOUNCE: 9,
  SOFT_BOUNCE: 10,
  UNSUBSCRIBE: 11,
  SPAM: 12,
  // Timestamps
  FIRST_EVENT: 13,
  LAST_UPDATED: 14,
} as const;

export const CAMPAIGN_STATS_RANGE = 'A:O'; // 15 columns

// ===========================================
// Sheet Names
// ===========================================

export const CAMPAIGN_SHEETS = {
  EVENTS: 'Campaign_Events',
  STATS: 'Campaign_Stats',
} as const;

// ===========================================
// Default Stats Row (for new campaigns)
// ===========================================

export function createDefaultStatsRow(
  campaignId: number,
  campaignName: string,
  timestamp: string
): (string | number)[] {
  return [
    campaignId,       // Campaign_ID
    campaignName,     // Campaign_Name
    0,                // Delivered
    0,                // Opened
    0,                // Clicked
    0,                // Unique_Opens
    0,                // Unique_Clicks
    0,                // Open_Rate
    0,                // Click_Rate
    0,                // Hard_Bounce (future)
    0,                // Soft_Bounce (future)
    0,                // Unsubscribe (future)
    0,                // Spam (future)
    timestamp,        // First_Event
    timestamp,        // Last_Updated
  ];
}

// ===========================================
// Export All Constants
// ===========================================

export const CAMPAIGN_CONSTANTS = {
  EVENTS: CAMPAIGN_EVENTS,
  ENABLED_EVENTS,
  EVENTS_COLUMNS: CAMPAIGN_EVENTS_COLUMNS,
  EVENTS_RANGE: CAMPAIGN_EVENTS_RANGE,
  STATS_COLUMNS: CAMPAIGN_STATS_COLUMNS,
  STATS_RANGE: CAMPAIGN_STATS_RANGE,
  SHEETS: CAMPAIGN_SHEETS,
} as const;
