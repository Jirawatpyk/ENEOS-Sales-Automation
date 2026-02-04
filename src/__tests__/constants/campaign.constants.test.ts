/**
 * ENEOS Sales Automation - Campaign Constants Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_EVENTS,
  ENABLED_EVENTS,
  isEventEnabled,
  CAMPAIGN_EVENTS_COLUMNS,
  CAMPAIGN_STATS_COLUMNS,
  CAMPAIGN_CONTACTS_COLUMNS,
  CAMPAIGN_CONTACTS_RANGE,
  CAMPAIGN_CONTACTS_SHEET_NAME,
  CAMPAIGN_SHEETS,
  createDefaultStatsRow,
  type CampaignEventType,
} from '../../constants/campaign.constants.js';

describe('Campaign Constants', () => {
  describe('CAMPAIGN_EVENTS', () => {
    it('should define all event types', () => {
      expect(CAMPAIGN_EVENTS.DELIVERED).toBe('delivered');
      expect(CAMPAIGN_EVENTS.OPENED).toBe('opened');
      expect(CAMPAIGN_EVENTS.CLICK).toBe('click');
      expect(CAMPAIGN_EVENTS.HARD_BOUNCE).toBe('hard_bounce');
      expect(CAMPAIGN_EVENTS.SOFT_BOUNCE).toBe('soft_bounce');
      expect(CAMPAIGN_EVENTS.UNSUBSCRIBE).toBe('unsubscribe');
      expect(CAMPAIGN_EVENTS.SPAM).toBe('spam');
    });

    it('should have 7 event types total', () => {
      const eventTypes = Object.keys(CAMPAIGN_EVENTS);
      expect(eventTypes).toHaveLength(7);
    });
  });

  describe('ENABLED_EVENTS', () => {
    it('should contain only 3 events for Story 5-1', () => {
      expect(ENABLED_EVENTS).toHaveLength(3);
    });

    it('should include delivered, opened, click', () => {
      expect(ENABLED_EVENTS).toContain('delivered');
      expect(ENABLED_EVENTS).toContain('opened');
      expect(ENABLED_EVENTS).toContain('click');
    });

    it('should NOT include future events', () => {
      expect(ENABLED_EVENTS).not.toContain('hard_bounce');
      expect(ENABLED_EVENTS).not.toContain('soft_bounce');
      expect(ENABLED_EVENTS).not.toContain('unsubscribe');
      expect(ENABLED_EVENTS).not.toContain('spam');
    });
  });

  describe('isEventEnabled', () => {
    it('should return true for enabled events', () => {
      expect(isEventEnabled('delivered')).toBe(true);
      expect(isEventEnabled('opened')).toBe(true);
      expect(isEventEnabled('click')).toBe(true);
    });

    it('should return false for disabled events', () => {
      expect(isEventEnabled('hard_bounce')).toBe(false);
      expect(isEventEnabled('soft_bounce')).toBe(false);
      expect(isEventEnabled('unsubscribe')).toBe(false);
      expect(isEventEnabled('spam')).toBe(false);
    });

    it('should return false for unknown events', () => {
      expect(isEventEnabled('unknown')).toBe(false);
      expect(isEventEnabled('')).toBe(false);
      expect(isEventEnabled('DELIVERED')).toBe(false); // Case sensitive
    });
  });

  describe('CAMPAIGN_EVENTS_COLUMNS', () => {
    it('should have correct column indices', () => {
      expect(CAMPAIGN_EVENTS_COLUMNS.EVENT_ID).toBe(0);
      expect(CAMPAIGN_EVENTS_COLUMNS.CAMPAIGN_ID).toBe(1);
      expect(CAMPAIGN_EVENTS_COLUMNS.CAMPAIGN_NAME).toBe(2);
      expect(CAMPAIGN_EVENTS_COLUMNS.EMAIL).toBe(3);
      expect(CAMPAIGN_EVENTS_COLUMNS.EVENT).toBe(4);
      expect(CAMPAIGN_EVENTS_COLUMNS.EVENT_AT).toBe(5);
      expect(CAMPAIGN_EVENTS_COLUMNS.SENT_AT).toBe(6);
      expect(CAMPAIGN_EVENTS_COLUMNS.URL).toBe(7);
      expect(CAMPAIGN_EVENTS_COLUMNS.TAG).toBe(8);
      expect(CAMPAIGN_EVENTS_COLUMNS.SEGMENT_IDS).toBe(9);
      expect(CAMPAIGN_EVENTS_COLUMNS.CREATED_AT).toBe(10);
    });
  });

  describe('CAMPAIGN_STATS_COLUMNS', () => {
    it('should have correct column indices', () => {
      expect(CAMPAIGN_STATS_COLUMNS.CAMPAIGN_ID).toBe(0);
      expect(CAMPAIGN_STATS_COLUMNS.CAMPAIGN_NAME).toBe(1);
      expect(CAMPAIGN_STATS_COLUMNS.DELIVERED).toBe(2);
      expect(CAMPAIGN_STATS_COLUMNS.OPENED).toBe(3);
      expect(CAMPAIGN_STATS_COLUMNS.CLICKED).toBe(4);
      expect(CAMPAIGN_STATS_COLUMNS.UNIQUE_OPENS).toBe(5);
      expect(CAMPAIGN_STATS_COLUMNS.UNIQUE_CLICKS).toBe(6);
      expect(CAMPAIGN_STATS_COLUMNS.OPEN_RATE).toBe(7);
      expect(CAMPAIGN_STATS_COLUMNS.CLICK_RATE).toBe(8);
    });

    it('should have future columns prepared', () => {
      expect(CAMPAIGN_STATS_COLUMNS.HARD_BOUNCE).toBe(9);
      expect(CAMPAIGN_STATS_COLUMNS.SOFT_BOUNCE).toBe(10);
      expect(CAMPAIGN_STATS_COLUMNS.UNSUBSCRIBE).toBe(11);
      expect(CAMPAIGN_STATS_COLUMNS.SPAM).toBe(12);
    });

    it('should have timestamp columns at the end', () => {
      expect(CAMPAIGN_STATS_COLUMNS.FIRST_EVENT).toBe(13);
      expect(CAMPAIGN_STATS_COLUMNS.LAST_UPDATED).toBe(14);
    });
  });

  describe('CAMPAIGN_CONTACTS_COLUMNS', () => {
    it('should have correct column indices', () => {
      expect(CAMPAIGN_CONTACTS_COLUMNS.EMAIL).toBe(0);
      expect(CAMPAIGN_CONTACTS_COLUMNS.FIRSTNAME).toBe(1);
      expect(CAMPAIGN_CONTACTS_COLUMNS.LASTNAME).toBe(2);
      expect(CAMPAIGN_CONTACTS_COLUMNS.PHONE).toBe(3);
      expect(CAMPAIGN_CONTACTS_COLUMNS.COMPANY).toBe(4);
      expect(CAMPAIGN_CONTACTS_COLUMNS.JOB_TITLE).toBe(5);
      expect(CAMPAIGN_CONTACTS_COLUMNS.CITY).toBe(6);
      expect(CAMPAIGN_CONTACTS_COLUMNS.WEBSITE).toBe(7);
      expect(CAMPAIGN_CONTACTS_COLUMNS.CAMPAIGN_ID).toBe(8);
      expect(CAMPAIGN_CONTACTS_COLUMNS.CAMPAIGN_NAME).toBe(9);
      expect(CAMPAIGN_CONTACTS_COLUMNS.EVENT_AT).toBe(10);
      expect(CAMPAIGN_CONTACTS_COLUMNS.URL).toBe(11);
      expect(CAMPAIGN_CONTACTS_COLUMNS.LEAD_SOURCE).toBe(12);
      expect(CAMPAIGN_CONTACTS_COLUMNS.CREATED_AT).toBe(13);
      expect(CAMPAIGN_CONTACTS_COLUMNS.UPDATED_AT).toBe(14);
    });

    it('should have 15 columns total', () => {
      expect(Object.keys(CAMPAIGN_CONTACTS_COLUMNS)).toHaveLength(15);
    });
  });

  describe('CAMPAIGN_CONTACTS_RANGE', () => {
    it('should cover 15 columns (A:O)', () => {
      expect(CAMPAIGN_CONTACTS_RANGE).toBe('A:O');
    });
  });

  describe('CAMPAIGN_CONTACTS_SHEET_NAME', () => {
    it('should be Campaign_Contacts', () => {
      expect(CAMPAIGN_CONTACTS_SHEET_NAME).toBe('Campaign_Contacts');
    });
  });

  describe('CAMPAIGN_SHEETS', () => {
    it('should define correct sheet names', () => {
      expect(CAMPAIGN_SHEETS.EVENTS).toBe('Campaign_Events');
      expect(CAMPAIGN_SHEETS.STATS).toBe('Campaign_Stats');
      expect(CAMPAIGN_SHEETS.CONTACTS).toBe('Campaign_Contacts');
    });
  });

  describe('createDefaultStatsRow', () => {
    it('should create a valid default stats row', () => {
      const row = createDefaultStatsRow(123, 'Test Campaign', '2026-01-30 10:00:00');

      expect(row).toHaveLength(15);
      expect(row[0]).toBe(123); // Campaign_ID
      expect(row[1]).toBe('Test Campaign'); // Campaign_Name
      expect(row[2]).toBe(0); // Delivered
      expect(row[3]).toBe(0); // Opened
      expect(row[4]).toBe(0); // Clicked
      expect(row[5]).toBe(0); // Unique_Opens
      expect(row[6]).toBe(0); // Unique_Clicks
      expect(row[7]).toBe(0); // Open_Rate
      expect(row[8]).toBe(0); // Click_Rate
      expect(row[9]).toBe(0); // Hard_Bounce
      expect(row[10]).toBe(0); // Soft_Bounce
      expect(row[11]).toBe(0); // Unsubscribe
      expect(row[12]).toBe(0); // Spam
      expect(row[13]).toBe('2026-01-30 10:00:00'); // First_Event
      expect(row[14]).toBe('2026-01-30 10:00:00'); // Last_Updated
    });

    it('should use provided timestamp for both First_Event and Last_Updated', () => {
      const timestamp = '2026-01-30 12:34:56';
      const row = createDefaultStatsRow(1, 'Test', timestamp);

      expect(row[13]).toBe(timestamp);
      expect(row[14]).toBe(timestamp);
    });
  });
});
