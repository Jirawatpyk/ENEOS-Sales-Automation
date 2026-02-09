/**
 * ENEOS Sales Automation - API Contract Integration Tests
 *
 * Purpose: Validate that frontend parameter names match backend expectations.
 * These tests prevent the API mismatch issues discovered in Epic 4:
 * - Story 4-1: salesOwnerId vs owner, sortDir vs sortOrder
 * - Story 4-7: Missing salesOwnerName sort option
 * - Story 4-14: Missing leadSource filter support
 *
 * If these tests fail, it means the API contract is broken and must be fixed
 * before deploying either frontend or backend changes.
 *
 * Reference: docs/api/api-contract.md
 *
 * @module tests/api-contract
 * Created: Epic 4 Retrospective Action Item #3
 */

import { describe, it, expect } from 'vitest';
import {
  leadsQuerySchema,
  salesPerformanceQuerySchema,
  dashboardQuerySchema,
  campaignsQuerySchema,
  leadIdSchema,
  salesPerformanceTrendQuerySchema,
} from '../validators/admin.validators.js';
import { SORT_OPTIONS, SORT_ORDERS, VALID_PERIODS, PAGINATION } from '../constants/admin.constants.js';

/**
 * Frontend Parameter Names
 * These are the exact parameter names the frontend sends.
 * If backend doesn't accept these, tests will fail.
 */
const FRONTEND_LEADS_PARAMS = {
  // Pagination
  page: 'page',
  limit: 'limit',

  // Filters
  status: 'status',
  owner: 'owner', // NOT salesOwnerId (Epic 4 lesson)
  campaign: 'campaign',
  leadSource: 'leadSource', // Story 4-14
  search: 'search',
  startDate: 'startDate',
  endDate: 'endDate',

  // Sorting
  sortBy: 'sortBy', // NOT sortColumn
  sortOrder: 'sortOrder', // NOT sortDir (Epic 4 lesson)
};

const FRONTEND_SORT_BY_OPTIONS = {
  leads: ['date', 'createdAt', 'company', 'status', 'salesOwnerName'],
  sales: ['claimed', 'closed', 'conversionRate'],
  campaigns: ['leads', 'closed', 'conversionRate'],
};

describe('API Contract Tests', () => {
  describe('Leads API Contract (/api/admin/leads)', () => {
    describe('Parameter Names', () => {
      it('should accept "page" parameter', () => {
        const result = leadsQuerySchema.safeParse({ page: 1 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
        }
      });

      it('should accept "limit" parameter', () => {
        const result = leadsQuerySchema.safeParse({ limit: 20 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(20);
        }
      });

      it('should accept "status" parameter with valid values', () => {
        const validStatuses = ['new', 'claimed', 'contacted', 'closed', 'lost', 'unreachable'];
        validStatuses.forEach((status) => {
          const result = leadsQuerySchema.safeParse({ status });
          expect(result.success, `status="${status}" should be accepted`).toBe(true);
        });
      });

      it('should accept "owner" parameter (not salesOwnerId)', () => {
        const result = leadsQuerySchema.safeParse({ owner: 'U1234567890' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.owner).toBe('U1234567890');
        }
      });

      it('should accept "campaign" parameter', () => {
        const result = leadsQuerySchema.safeParse({ campaign: 'campaign-123' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.campaign).toBe('campaign-123');
        }
      });

      it('should accept "leadSource" parameter (Story 4-14)', () => {
        const result = leadsQuerySchema.safeParse({ leadSource: 'Email Campaign' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.leadSource).toBe('Email Campaign');
        }
      });

      it('should accept "leadSource" with __unknown__ value for null sources', () => {
        const result = leadsQuerySchema.safeParse({ leadSource: '__unknown__' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.leadSource).toBe('__unknown__');
        }
      });

      it('should accept "search" parameter', () => {
        const result = leadsQuerySchema.safeParse({ search: 'test company' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.search).toBe('test company');
        }
      });

      it('should accept "startDate" parameter', () => {
        const result = leadsQuerySchema.safeParse({ startDate: '2024-01-01' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.startDate).toBe('2024-01-01');
        }
      });

      it('should accept "endDate" parameter', () => {
        const result = leadsQuerySchema.safeParse({ endDate: '2024-12-31' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.endDate).toBe('2024-12-31');
        }
      });

      it('should accept "sortBy" parameter (not sortColumn)', () => {
        const result = leadsQuerySchema.safeParse({ sortBy: 'company' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe('company');
        }
      });

      it('should accept "sortOrder" parameter (not sortDir)', () => {
        const result = leadsQuerySchema.safeParse({ sortOrder: 'asc' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortOrder).toBe('asc');
        }
      });
    });

    describe('Sort Options (Frontend → Backend)', () => {
      it('should accept sortBy="createdAt" (frontend default)', () => {
        const result = leadsQuerySchema.safeParse({ sortBy: 'createdAt' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe('createdAt');
        }
      });

      it('should accept sortBy="date" (backend original)', () => {
        const result = leadsQuerySchema.safeParse({ sortBy: 'date' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe('date');
        }
      });

      it('should accept sortBy="company"', () => {
        const result = leadsQuerySchema.safeParse({ sortBy: 'company' });
        expect(result.success).toBe(true);
      });

      it('should accept sortBy="status"', () => {
        const result = leadsQuerySchema.safeParse({ sortBy: 'status' });
        expect(result.success).toBe(true);
      });

      it('should accept sortBy="salesOwnerName" (Story 4-7)', () => {
        const result = leadsQuerySchema.safeParse({ sortBy: 'salesOwnerName' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe('salesOwnerName');
        }
      });

      it('should have all frontend sort options in backend SORT_OPTIONS.LEADS', () => {
        FRONTEND_SORT_BY_OPTIONS.leads.forEach((sortBy) => {
          expect(
            SORT_OPTIONS.LEADS.includes(sortBy as typeof SORT_OPTIONS.LEADS[number]),
            `sortBy="${sortBy}" must be in SORT_OPTIONS.LEADS`
          ).toBe(true);
        });
      });

      it('should accept sortOrder="asc"', () => {
        const result = leadsQuerySchema.safeParse({ sortOrder: 'asc' });
        expect(result.success).toBe(true);
      });

      it('should accept sortOrder="desc"', () => {
        const result = leadsQuerySchema.safeParse({ sortOrder: 'desc' });
        expect(result.success).toBe(true);
      });
    });

    describe('Combined Parameters (Real Frontend Request)', () => {
      it('should accept typical frontend request with all filters', () => {
        const frontendRequest = {
          page: 1,
          limit: 20,
          status: 'new',
          owner: 'U1234567890',
          leadSource: 'Email Campaign',
          search: 'test',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };

        const result = leadsQuerySchema.safeParse(frontendRequest);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toMatchObject(frontendRequest);
        }
      });

      it('should accept string numbers from URL query params', () => {
        const urlQueryParams = {
          page: '2',
          limit: '50',
        };

        const result = leadsQuerySchema.safeParse(urlQueryParams);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(2);
          expect(result.data.limit).toBe(50);
        }
      });
    });

    describe('Default Values', () => {
      it('should default page to 1', () => {
        const result = leadsQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(PAGINATION.DEFAULT_PAGE);
        }
      });

      it('should default limit to 20', () => {
        const result = leadsQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(PAGINATION.DEFAULT_LIMIT);
        }
      });

      it('should default sortBy to "date"', () => {
        const result = leadsQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe('date');
        }
      });

      it('should default sortOrder to "desc"', () => {
        const result = leadsQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortOrder).toBe('desc');
        }
      });
    });
  });

  describe('Lead Detail API Contract (/api/admin/leads/:id)', () => {
    it('should accept UUID string id', () => {
      const result = leadIdSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      }
    });

    it('should accept numeric string id (legacy)', () => {
      const result = leadIdSchema.safeParse({ id: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('10');
      }
    });

    it('should reject empty id', () => {
      const result = leadIdSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('should accept any non-empty string id', () => {
      const result = leadIdSchema.safeParse({ id: 'lead-abc-123' });
      expect(result.success).toBe(true);
    });
  });

  describe('Dashboard API Contract (/api/admin/dashboard)', () => {
    it('should accept "period" parameter with all valid values', () => {
      VALID_PERIODS.forEach((period) => {
        if (period === 'custom') {
          const result = dashboardQuerySchema.safeParse({
            period: 'custom',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          });
          expect(result.success, `period="${period}" should be accepted`).toBe(true);
        } else {
          const result = dashboardQuerySchema.safeParse({ period });
          expect(result.success, `period="${period}" should be accepted`).toBe(true);
        }
      });
    });

    it('should default period to "month"', () => {
      const result = dashboardQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe('month');
      }
    });

    it('should require startDate and endDate for custom period', () => {
      const result = dashboardQuerySchema.safeParse({ period: 'custom' });
      expect(result.success).toBe(false);
    });
  });

  describe('Sales Performance API Contract (/api/admin/sales-performance)', () => {
    it('should accept all frontend sort options', () => {
      FRONTEND_SORT_BY_OPTIONS.sales.forEach((sortBy) => {
        const result = salesPerformanceQuerySchema.safeParse({ sortBy });
        expect(result.success, `sortBy="${sortBy}" should be accepted`).toBe(true);
      });
    });

    it('should have all frontend sort options in backend SORT_OPTIONS.SALES', () => {
      FRONTEND_SORT_BY_OPTIONS.sales.forEach((sortBy) => {
        expect(
          SORT_OPTIONS.SALES.includes(sortBy as typeof SORT_OPTIONS.SALES[number]),
          `sortBy="${sortBy}" must be in SORT_OPTIONS.SALES`
        ).toBe(true);
      });
    });

    it('should default sortBy to "closed"', () => {
      const result = salesPerformanceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('closed');
      }
    });
  });

  describe('Sales Performance Trend API Contract (/api/admin/sales-performance/trend)', () => {
    it('should require userId parameter', () => {
      const result = salesPerformanceTrendQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept userId parameter', () => {
      const result = salesPerformanceTrendQuerySchema.safeParse({ userId: 'U1234567890' });
      expect(result.success).toBe(true);
    });

    it('should accept days parameter with values 7, 30, 90', () => {
      [7, 30, 90].forEach((days) => {
        const result = salesPerformanceTrendQuerySchema.safeParse({
          userId: 'U1234567890',
          days,
        });
        expect(result.success, `days=${days} should be accepted`).toBe(true);
      });
    });

    it('should reject invalid days value', () => {
      const result = salesPerformanceTrendQuerySchema.safeParse({
        userId: 'U1234567890',
        days: 14,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Campaigns API Contract (/api/admin/campaigns)', () => {
    it('should accept all frontend sort options', () => {
      FRONTEND_SORT_BY_OPTIONS.campaigns.forEach((sortBy) => {
        const result = campaignsQuerySchema.safeParse({ sortBy });
        expect(result.success, `sortBy="${sortBy}" should be accepted`).toBe(true);
      });
    });

    it('should have all frontend sort options in backend SORT_OPTIONS.CAMPAIGNS', () => {
      FRONTEND_SORT_BY_OPTIONS.campaigns.forEach((sortBy) => {
        expect(
          SORT_OPTIONS.CAMPAIGNS.includes(sortBy as typeof SORT_OPTIONS.CAMPAIGNS[number]),
          `sortBy="${sortBy}" must be in SORT_OPTIONS.CAMPAIGNS`
        ).toBe(true);
      });
    });

    it('should default period to "quarter"', () => {
      const result = campaignsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe('quarter');
      }
    });
  });

  describe('Constants Alignment', () => {
    it('should have exactly 2 sort orders', () => {
      expect(SORT_ORDERS).toHaveLength(2);
      expect(SORT_ORDERS).toContain('asc');
      expect(SORT_ORDERS).toContain('desc');
    });

    it('should have exactly 9 period options', () => {
      expect(VALID_PERIODS).toHaveLength(9);
    });

    it('should have 5 leads sort options (including createdAt alias and salesOwnerName)', () => {
      expect(SORT_OPTIONS.LEADS).toHaveLength(5);
    });

    it('should have 3 sales sort options', () => {
      expect(SORT_OPTIONS.SALES).toHaveLength(3);
    });

    it('should have 3 campaigns sort options', () => {
      expect(SORT_OPTIONS.CAMPAIGNS).toHaveLength(3);
    });
  });

  describe('Breaking Change Detection', () => {
    /**
     * These tests will fail if someone removes or renames parameters.
     * This is intentional - it forces a discussion about API changes.
     */

    it('should fail if owner parameter is removed from leads schema', () => {
      const result = leadsQuerySchema.safeParse({ owner: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('owner');
      }
    });

    it('should fail if leadSource parameter is removed from leads schema', () => {
      const result = leadsQuerySchema.safeParse({ leadSource: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('leadSource');
      }
    });

    it('should fail if salesOwnerName sort option is removed', () => {
      expect(SORT_OPTIONS.LEADS).toContain('salesOwnerName');
    });

    it('should fail if createdAt sort option is removed (frontend uses this)', () => {
      expect(SORT_OPTIONS.LEADS).toContain('createdAt');
    });
  });
});
