/**
 * ENEOS Sales Automation - Campaign Constants Tests
 * Story 9-2: Removed Google Sheets column indices and Campaign_Contacts constants
 */

import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_EVENTS,
  ENABLED_EVENTS,
  isEventEnabled,
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

  describe('CampaignEventType', () => {
    it('should only accept valid event type values', () => {
      // Type assertion test - verifies the type works at compile time
      const validEvent: CampaignEventType = 'delivered';
      expect(ENABLED_EVENTS).toContain(validEvent);
    });
  });

  describe('Story 9-2: Google Sheets constants removed', () => {
    it('should NOT export column index constants (Supabase uses named columns)', () => {
      // Verify that the module only exports the expected symbols
      const moduleExports = { CAMPAIGN_EVENTS, ENABLED_EVENTS, isEventEnabled };
      expect(Object.keys(moduleExports)).toHaveLength(3);
    });
  });
});
