/**
 * Campaign Stats Validator Tests
 * Story 5-2 Task 3.5: 15+ test cases for validators
 */

import { describe, it, expect } from 'vitest';
import {
  getCampaignStatsQuerySchema,
  getCampaignEventsQuerySchema,
  campaignIdParamSchema,
  validateCampaignStatsQuery,
  validateCampaignEventsQuery,
  validateCampaignIdParam,
  safeValidateCampaignStatsQuery,
  safeValidateCampaignEventsQuery,
  safeValidateCampaignIdParam,
  VALID_SORT_BY_OPTIONS,
  VALID_EVENT_TYPES,
} from '../../validators/campaign-stats.validator.js';

describe('campaign-stats.validator', () => {
  // ===========================================
  // getCampaignStatsQuerySchema Tests
  // ===========================================
  describe('getCampaignStatsQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = getCampaignStatsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('Last_Updated');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should parse valid pagination params', () => {
      const result = getCampaignStatsQuerySchema.safeParse({
        page: '2',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject page less than 1', () => {
      const result = getCampaignStatsQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const result = getCampaignStatsQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    it('should accept search parameter', () => {
      const result = getCampaignStatsQuerySchema.safeParse({
        search: 'BMF2026',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('BMF2026');
      }
    });

    it('should accept valid dateFrom and dateTo', () => {
      const result = getCampaignStatsQuerySchema.safeParse({
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dateFrom).toBe('2026-01-01');
        expect(result.data.dateTo).toBe('2026-01-31');
      }
    });

    it('should reject invalid dateFrom format', () => {
      const result = getCampaignStatsQuerySchema.safeParse({
        dateFrom: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid sortBy options', () => {
      for (const sortBy of VALID_SORT_BY_OPTIONS) {
        const result = getCampaignStatsQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe(sortBy);
        }
      }
    });

    it('should reject invalid sortBy option', () => {
      const result = getCampaignStatsQuerySchema.safeParse({
        sortBy: 'Invalid_Field',
      });
      expect(result.success).toBe(false);
    });

    it('should accept asc and desc sortOrder', () => {
      const ascResult = getCampaignStatsQuerySchema.safeParse({ sortOrder: 'asc' });
      const descResult = getCampaignStatsQuerySchema.safeParse({ sortOrder: 'desc' });
      expect(ascResult.success).toBe(true);
      expect(descResult.success).toBe(true);
    });

    it('should reject invalid sortOrder', () => {
      const result = getCampaignStatsQuerySchema.safeParse({
        sortOrder: 'random',
      });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // getCampaignEventsQuerySchema Tests
  // ===========================================
  describe('getCampaignEventsQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = getCampaignEventsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50); // Different default for events
      }
    });

    it('should accept valid event type filter', () => {
      for (const event of VALID_EVENT_TYPES) {
        const result = getCampaignEventsQuerySchema.safeParse({ event });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event).toBe(event);
        }
      }
    });

    it('should reject invalid event type', () => {
      const result = getCampaignEventsQuerySchema.safeParse({
        event: 'bounce',
      });
      expect(result.success).toBe(false);
    });

    it('should accept date range filters', () => {
      const result = getCampaignEventsQuerySchema.safeParse({
        dateFrom: '2026-01-15T00:00:00.000Z',
        dateTo: '2026-01-30T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const result = getCampaignEventsQuerySchema.safeParse({
        dateTo: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // campaignIdParamSchema Tests
  // ===========================================
  describe('campaignIdParamSchema', () => {
    it('should parse valid campaign ID', () => {
      const result = campaignIdParamSchema.safeParse({ id: '123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(123);
      }
    });

    it('should reject non-numeric ID', () => {
      const result = campaignIdParamSchema.safeParse({ id: 'abc' });
      expect(result.success).toBe(false);
    });

    it('should reject negative ID', () => {
      const result = campaignIdParamSchema.safeParse({ id: '-1' });
      expect(result.success).toBe(false);
    });

    it('should reject zero ID', () => {
      const result = campaignIdParamSchema.safeParse({ id: '0' });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Validation Helper Functions Tests
  // ===========================================
  describe('validateCampaignStatsQuery', () => {
    it('should return parsed data for valid query', () => {
      const result = validateCampaignStatsQuery({
        page: '1',
        limit: '20',
        sortBy: 'Delivered',
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('Delivered');
    });

    it('should throw for invalid query', () => {
      expect(() => validateCampaignStatsQuery({ page: '-1' })).toThrow();
    });
  });

  describe('validateCampaignEventsQuery', () => {
    it('should return parsed data for valid query', () => {
      const result = validateCampaignEventsQuery({
        event: 'click',
        page: '2',
      });
      expect(result.event).toBe('click');
      expect(result.page).toBe(2);
    });

    it('should throw for invalid query', () => {
      expect(() => validateCampaignEventsQuery({ event: 'invalid' })).toThrow();
    });
  });

  describe('validateCampaignIdParam', () => {
    it('should return parsed data for valid param', () => {
      const result = validateCampaignIdParam({ id: '456' });
      expect(result.id).toBe(456);
    });

    it('should throw for invalid param', () => {
      expect(() => validateCampaignIdParam({ id: 'xyz' })).toThrow();
    });
  });

  // ===========================================
  // Safe Validation Functions Tests
  // ===========================================
  describe('safeValidateCampaignStatsQuery', () => {
    it('should return success with data for valid query', () => {
      const result = safeValidateCampaignStatsQuery({ search: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('test');
      }
    });

    it('should return failure with errors for invalid query', () => {
      const result = safeValidateCampaignStatsQuery({ sortBy: 'invalid' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(Object.keys(result.errors).length).toBeGreaterThan(0);
      }
    });
  });

  describe('safeValidateCampaignEventsQuery', () => {
    it('should return success with data for valid query', () => {
      const result = safeValidateCampaignEventsQuery({ event: 'opened' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.event).toBe('opened');
      }
    });

    it('should return failure with errors for invalid query', () => {
      const result = safeValidateCampaignEventsQuery({ event: 'bounce' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe('safeValidateCampaignIdParam', () => {
    it('should return success with data for valid param', () => {
      const result = safeValidateCampaignIdParam({ id: '789' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(789);
      }
    });

    it('should return failure with errors for invalid param', () => {
      const result = safeValidateCampaignIdParam({ id: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });
});
