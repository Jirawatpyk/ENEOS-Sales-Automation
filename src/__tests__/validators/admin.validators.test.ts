/**
 * ENEOS Sales Automation - Admin Validators Tests
 * ทดสอบ Zod schemas สำหรับ validate query parameters
 */

import { describe, it, expect } from 'vitest';
import {
  leadStatusSchema,
  periodSchema,
  dashboardQuerySchema,
  leadsQuerySchema,
  leadIdSchema,
  salesPerformanceQuerySchema,
  validateQuery,
  safeValidateQuery,
} from '../../validators/admin.validators.js';
import { PAGINATION } from '../../constants/admin.constants.js';

describe('Admin Validators', () => {
  // ===========================================
  // Lead Status Schema
  // ===========================================
  describe('leadStatusSchema', () => {
    it('should accept valid lead statuses', () => {
      const validStatuses = ['new', 'claimed', 'contacted', 'closed', 'lost', 'unreachable'];

      validStatuses.forEach((status) => {
        const result = leadStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(status);
        }
      });
    });

    it('should reject invalid lead status', () => {
      const result = leadStatusSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = leadStatusSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(leadStatusSchema.safeParse(null).success).toBe(false);
      expect(leadStatusSchema.safeParse(undefined).success).toBe(false);
    });
  });

  // ===========================================
  // Period Schema
  // ===========================================
  describe('periodSchema', () => {
    it('should accept valid periods', () => {
      const validPeriods = ['today', 'yesterday', 'week', 'month', 'quarter', 'year', 'custom'];

      validPeriods.forEach((period) => {
        const result = periodSchema.safeParse(period);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(period);
        }
      });
    });

    it('should reject invalid period', () => {
      const result = periodSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Dashboard Query Schema
  // ===========================================
  describe('dashboardQuerySchema', () => {
    it('should use default period when not provided', () => {
      const result = dashboardQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe('month');
      }
    });

    it('should accept valid period', () => {
      const result = dashboardQuerySchema.safeParse({ period: 'week' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe('week');
      }
    });

    it('should accept custom period with dates', () => {
      const result = dashboardQuerySchema.safeParse({
        period: 'custom',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      expect(result.success).toBe(true);
    });

    it('should reject custom period without startDate', () => {
      const result = dashboardQuerySchema.safeParse({
        period: 'custom',
        endDate: '2024-01-31',
      });
      expect(result.success).toBe(false);
    });

    it('should reject custom period without endDate', () => {
      const result = dashboardQuerySchema.safeParse({
        period: 'custom',
        startDate: '2024-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('should reject when startDate is after endDate', () => {
      const result = dashboardQuerySchema.safeParse({
        period: 'custom',
        startDate: '2024-01-31',
        endDate: '2024-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('should accept when startDate equals endDate', () => {
      const result = dashboardQuerySchema.safeParse({
        period: 'custom',
        startDate: '2024-01-15',
        endDate: '2024-01-15',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Leads Query Schema
  // ===========================================
  describe('leadsQuerySchema', () => {
    it('should use defaults when no params provided', () => {
      const result = leadsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(PAGINATION.DEFAULT_PAGE);
        expect(result.data.limit).toBe(PAGINATION.DEFAULT_LIMIT);
        expect(result.data.sortBy).toBe('date');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should coerce page string to number', () => {
      const result = leadsQuerySchema.safeParse({ page: '5' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
      }
    });

    it('should coerce limit string to number', () => {
      const result = leadsQuerySchema.safeParse({ limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject page less than 1', () => {
      const result = leadsQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const result = leadsQuerySchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const result = leadsQuerySchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than MAX_LIMIT', () => {
      const result = leadsQuerySchema.safeParse({ limit: PAGINATION.MAX_LIMIT + 1 });
      expect(result.success).toBe(false);
    });

    it('should accept limit at MAX_LIMIT', () => {
      const result = leadsQuerySchema.safeParse({ limit: PAGINATION.MAX_LIMIT });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(PAGINATION.MAX_LIMIT);
      }
    });

    it('should accept valid status filter', () => {
      const result = leadsQuerySchema.safeParse({ status: 'claimed' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('claimed');
      }
    });

    it('should reject invalid status filter', () => {
      const result = leadsQuerySchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept owner filter', () => {
      const result = leadsQuerySchema.safeParse({ owner: 'user-123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.owner).toBe('user-123');
      }
    });

    it('should accept campaign filter', () => {
      const result = leadsQuerySchema.safeParse({ campaign: 'campaign-456' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.campaign).toBe('campaign-456');
      }
    });

    it('should accept search filter', () => {
      const result = leadsQuerySchema.safeParse({ search: 'test company' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('test company');
      }
    });

    it('should reject search longer than 100 characters', () => {
      const longSearch = 'a'.repeat(101);
      const result = leadsQuerySchema.safeParse({ search: longSearch });
      expect(result.success).toBe(false);
    });

    it('should accept search at 100 characters', () => {
      const exactSearch = 'a'.repeat(100);
      const result = leadsQuerySchema.safeParse({ search: exactSearch });
      expect(result.success).toBe(true);
    });

    it('should accept valid sortBy options', () => {
      const validSortOptions = ['date', 'company', 'status'];

      validSortOptions.forEach((sortBy) => {
        const result = leadsQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe(sortBy);
        }
      });
    });

    it('should reject invalid sortBy option', () => {
      const result = leadsQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept valid sortOrder options', () => {
      const validSortOrders = ['asc', 'desc'];

      validSortOrders.forEach((sortOrder) => {
        const result = leadsQuerySchema.safeParse({ sortOrder });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortOrder).toBe(sortOrder);
        }
      });
    });

    it('should reject invalid sortOrder', () => {
      const result = leadsQuerySchema.safeParse({ sortOrder: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept date range filters', () => {
      const result = leadsQuerySchema.safeParse({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBe('2024-01-01');
        expect(result.data.endDate).toBe('2024-01-31');
      }
    });

    it('should accept all filters combined', () => {
      const result = leadsQuerySchema.safeParse({
        page: 2,
        limit: 50,
        status: 'claimed',
        owner: 'user-123',
        campaign: 'campaign-456',
        search: 'test',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        sortBy: 'company',
        sortOrder: 'asc',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Lead ID Schema
  // ===========================================
  describe('leadIdSchema', () => {
    it('should accept UUID string', () => {
      const result = leadIdSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      }
    });

    it('should accept numeric string (legacy row ID)', () => {
      const result = leadIdSchema.safeParse({ id: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('10');
      }
    });

    it('should reject empty string', () => {
      const result = leadIdSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('should accept any non-empty string', () => {
      const result = leadIdSchema.safeParse({ id: 'lead-abc-123' });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Sales Performance Query Schema
  // ===========================================
  describe('salesPerformanceQuerySchema', () => {
    it('should use defaults when no params provided', () => {
      const result = salesPerformanceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe('month');
        expect(result.data.sortBy).toBe('closed');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should accept valid period', () => {
      const result = salesPerformanceQuerySchema.safeParse({ period: 'quarter' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe('quarter');
      }
    });

    it('should accept custom period with dates', () => {
      const result = salesPerformanceQuerySchema.safeParse({
        period: 'custom',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      });
      expect(result.success).toBe(true);
    });

    it('should reject custom period without dates', () => {
      const result = salesPerformanceQuerySchema.safeParse({ period: 'custom' });
      expect(result.success).toBe(false);
    });

    it('should accept valid sales sortBy options', () => {
      const validSortOptions = ['claimed', 'closed', 'conversionRate'];

      validSortOptions.forEach((sortBy) => {
        const result = salesPerformanceQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe(sortBy);
        }
      });
    });

    it('should reject invalid sortBy for sales', () => {
      const result = salesPerformanceQuerySchema.safeParse({ sortBy: 'date' });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // validateQuery Helper
  // ===========================================
  describe('validateQuery', () => {
    it('should return parsed data for valid input', () => {
      const result = validateQuery(leadsQuerySchema, { page: '5', limit: '50' });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it('should throw error for invalid input', () => {
      expect(() => {
        validateQuery(leadsQuerySchema, { page: -1 });
      }).toThrow('Validation failed');
    });

    it('should include error path in message', () => {
      try {
        validateQuery(leadsQuerySchema, { status: 'invalid' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('status');
      }
    });
  });

  // ===========================================
  // safeValidateQuery Helper
  // ===========================================
  describe('safeValidateQuery', () => {
    it('should return success with data for valid input', () => {
      const result = safeValidateQuery(leadsQuerySchema, { page: '5' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
      }
    });

    it('should return failure with errors for invalid input', () => {
      const result = safeValidateQuery(leadsQuerySchema, { page: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should not throw for invalid input', () => {
      expect(() => {
        safeValidateQuery(leadsQuerySchema, { status: 'invalid' });
      }).not.toThrow();
    });

    it('should include field path in error messages', () => {
      const result = safeValidateQuery(leadsQuerySchema, { status: 'invalid' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('status'))).toBe(true);
      }
    });

    it('should return multiple errors when multiple fields invalid', () => {
      const result = safeValidateQuery(leadsQuerySchema, {
        page: -1,
        limit: 999,
        status: 'invalid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(1);
      }
    });
  });
});
