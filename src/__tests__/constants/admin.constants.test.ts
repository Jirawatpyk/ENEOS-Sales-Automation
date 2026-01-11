/**
 * ENEOS Sales Automation - Admin Constants Tests
 * ทดสอบค่าคงที่สำหรับ Admin Dashboard API
 */

import { describe, it, expect } from 'vitest';
import {
  PAGINATION,
  DASHBOARD,
  ALERTS,
  DEFAULT_TARGETS,
  VALID_PERIODS,
  SORT_OPTIONS,
  SORT_ORDERS,
  ADMIN_CONSTANTS,
  PeriodType,
} from '../../constants/admin.constants.js';

describe('Admin Constants', () => {
  describe('PAGINATION', () => {
    it('should have correct default page value', () => {
      expect(PAGINATION.DEFAULT_PAGE).toBe(1);
    });

    it('should have correct default limit value', () => {
      expect(PAGINATION.DEFAULT_LIMIT).toBe(20);
    });

    it('should have correct max limit value', () => {
      expect(PAGINATION.MAX_LIMIT).toBe(100);
    });

    it('should have default limit less than or equal to max limit', () => {
      expect(PAGINATION.DEFAULT_LIMIT).toBeLessThanOrEqual(PAGINATION.MAX_LIMIT);
    });

    it('should have positive values', () => {
      expect(PAGINATION.DEFAULT_PAGE).toBeGreaterThan(0);
      expect(PAGINATION.DEFAULT_LIMIT).toBeGreaterThan(0);
      expect(PAGINATION.MAX_LIMIT).toBeGreaterThan(0);
    });
  });

  describe('DASHBOARD', () => {
    it('should have correct top sales limit', () => {
      expect(DASHBOARD.TOP_SALES_LIMIT).toBe(5);
    });

    it('should have correct recent activity limit', () => {
      expect(DASHBOARD.RECENT_ACTIVITY_LIMIT).toBe(10);
    });

    it('should have positive values', () => {
      expect(DASHBOARD.TOP_SALES_LIMIT).toBeGreaterThan(0);
      expect(DASHBOARD.RECENT_ACTIVITY_LIMIT).toBeGreaterThan(0);
    });
  });

  describe('ALERTS', () => {
    it('should have correct unclaimed hours threshold', () => {
      expect(ALERTS.UNCLAIMED_HOURS).toBe(24);
    });

    it('should have correct stale days threshold', () => {
      expect(ALERTS.STALE_DAYS).toBe(7);
    });

    it('should have reasonable threshold values', () => {
      expect(ALERTS.UNCLAIMED_HOURS).toBeGreaterThan(0);
      expect(ALERTS.UNCLAIMED_HOURS).toBeLessThanOrEqual(72); // Max 3 days
      expect(ALERTS.STALE_DAYS).toBeGreaterThan(0);
      expect(ALERTS.STALE_DAYS).toBeLessThanOrEqual(30); // Max 30 days
    });
  });

  describe('DEFAULT_TARGETS', () => {
    it('should have correct claimed per month target', () => {
      expect(DEFAULT_TARGETS.CLAIMED_PER_MONTH).toBe(30);
    });

    it('should have correct closed per month target', () => {
      expect(DEFAULT_TARGETS.CLOSED_PER_MONTH).toBe(10);
    });

    it('should have claimed target greater than closed target', () => {
      expect(DEFAULT_TARGETS.CLAIMED_PER_MONTH).toBeGreaterThan(
        DEFAULT_TARGETS.CLOSED_PER_MONTH
      );
    });

    it('should have positive values', () => {
      expect(DEFAULT_TARGETS.CLAIMED_PER_MONTH).toBeGreaterThan(0);
      expect(DEFAULT_TARGETS.CLOSED_PER_MONTH).toBeGreaterThan(0);
    });
  });

  describe('VALID_PERIODS', () => {
    it('should contain all expected period values', () => {
      expect(VALID_PERIODS).toContain('today');
      expect(VALID_PERIODS).toContain('yesterday');
      expect(VALID_PERIODS).toContain('week');
      expect(VALID_PERIODS).toContain('month');
      expect(VALID_PERIODS).toContain('quarter');
      expect(VALID_PERIODS).toContain('year');
      expect(VALID_PERIODS).toContain('custom');
    });

    it('should have exactly 7 period options', () => {
      expect(VALID_PERIODS).toHaveLength(7);
    });

    it('should be readonly array', () => {
      const periods: readonly string[] = VALID_PERIODS;
      expect(periods).toBeDefined();
    });

    it('should support PeriodType type', () => {
      const period: PeriodType = 'month';
      expect(VALID_PERIODS).toContain(period);
    });
  });

  describe('SORT_OPTIONS', () => {
    describe('LEADS', () => {
      it('should contain all expected lead sort options', () => {
        expect(SORT_OPTIONS.LEADS).toContain('date');
        expect(SORT_OPTIONS.LEADS).toContain('company');
        expect(SORT_OPTIONS.LEADS).toContain('status');
      });

      it('should have exactly 3 lead sort options', () => {
        expect(SORT_OPTIONS.LEADS).toHaveLength(3);
      });
    });

    describe('SALES', () => {
      it('should contain all expected sales sort options', () => {
        expect(SORT_OPTIONS.SALES).toContain('claimed');
        expect(SORT_OPTIONS.SALES).toContain('closed');
        expect(SORT_OPTIONS.SALES).toContain('conversionRate');
      });

      it('should have exactly 3 sales sort options', () => {
        expect(SORT_OPTIONS.SALES).toHaveLength(3);
      });
    });
  });

  describe('SORT_ORDERS', () => {
    it('should contain asc and desc', () => {
      expect(SORT_ORDERS).toContain('asc');
      expect(SORT_ORDERS).toContain('desc');
    });

    it('should have exactly 2 sort orders', () => {
      expect(SORT_ORDERS).toHaveLength(2);
    });
  });

  describe('ADMIN_CONSTANTS (All-in-one export)', () => {
    it('should contain all individual constants', () => {
      expect(ADMIN_CONSTANTS.PAGINATION).toBe(PAGINATION);
      expect(ADMIN_CONSTANTS.DASHBOARD).toBe(DASHBOARD);
      expect(ADMIN_CONSTANTS.ALERTS).toBe(ALERTS);
      expect(ADMIN_CONSTANTS.DEFAULT_TARGETS).toBe(DEFAULT_TARGETS);
      expect(ADMIN_CONSTANTS.VALID_PERIODS).toBe(VALID_PERIODS);
      expect(ADMIN_CONSTANTS.SORT_OPTIONS).toBe(SORT_OPTIONS);
      expect(ADMIN_CONSTANTS.SORT_ORDERS).toBe(SORT_ORDERS);
    });

    it('should have all expected keys', () => {
      const keys = Object.keys(ADMIN_CONSTANTS);
      expect(keys).toContain('PAGINATION');
      expect(keys).toContain('DASHBOARD');
      expect(keys).toContain('ALERTS');
      expect(keys).toContain('DEFAULT_TARGETS');
      expect(keys).toContain('VALID_PERIODS');
      expect(keys).toContain('SORT_OPTIONS');
      expect(keys).toContain('SORT_ORDERS');
    });
  });
});
