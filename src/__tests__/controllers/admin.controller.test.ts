/**
 * ENEOS Sales Automation - Admin Controller Tests
 * ทดสอบ Admin Dashboard API endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { LeadRow } from '../../types/index.js';

// Mock sheetsService
const mockGetAllLeads = vi.fn();
const mockGetRow = vi.fn();
const mockGetSalesTeamMember = vi.fn();

vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    getAllLeads: () => mockGetAllLeads(),
    getRow: (row: number) => mockGetRow(row),
    getSalesTeamMember: (id: string) => mockGetSalesTeamMember(id),
  },
}));

// Import after mocking
import {
  getDashboard,
  getLeads,
  getLeadById,
  getSalesPerformance,
} from '../../controllers/admin.controller.js';

// ===========================================
// Test Helpers
// ===========================================

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    query: {},
    params: {},
    user: {
      email: 'test@eneos.co.th',
      name: 'Test User',
      role: 'admin',
      googleId: 'google-123',
    },
    ...overrides,
  }) as Request;

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

// Helper to get current date ISO string (for filtering by period)
const getCurrentDateISO = (daysOffset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

// Sample lead data
const createSampleLead = (overrides: Partial<LeadRow> = {}): LeadRow => ({
  rowNumber: 2,
  date: getCurrentDateISO(), // Use current date by default
  customerName: 'Test Customer',
  email: 'customer@test.com',
  phone: '0812345678',
  company: 'Test Company',
  industryAI: 'Manufacturing',
  website: 'https://test.com',
  capital: '10M',
  status: 'new',
  salesOwnerId: null,
  salesOwnerName: null,
  campaignId: 'campaign-001',
  campaignName: 'Test Campaign',
  emailSubject: 'Test Subject',
  source: 'Brevo',
  leadId: 'lead-001',
  eventId: 'event-001',
  clickedAt: null,
  talkingPoint: 'Test talking point',
  closedAt: null,
  lostAt: null,
  unreachableAt: null,
  version: 1,
  ...overrides,
});

// ===========================================
// Tests
// ===========================================

describe('Admin Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    mockGetAllLeads.mockResolvedValue([]);
    mockGetRow.mockResolvedValue(null);
    mockGetSalesTeamMember.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================
  // getDashboard
  // ===========================================
  describe('getDashboard', () => {
    it('should return dashboard data with default period', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ status: 'new' }),
        createSampleLead({ rowNumber: 3, status: 'claimed', salesOwnerId: 'sales-001', salesOwnerName: 'Sales Person' }),
        createSampleLead({ rowNumber: 4, status: 'closed', salesOwnerId: 'sales-001', salesOwnerName: 'Sales Person', closedAt: '2024-01-16T10:00:00.000Z' }),
      ]);

      await getDashboard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('summary');
      expect(response.data).toHaveProperty('trends');
      expect(response.data).toHaveProperty('statusDistribution');
      expect(response.data).toHaveProperty('topSales');
      expect(response.data).toHaveProperty('recentActivity');
      expect(response.data).toHaveProperty('alerts');
      expect(response.data).toHaveProperty('period');
    });

    it('should use specified period', async () => {
      const req = createMockRequest({ query: { period: 'week' } });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([]);

      await getDashboard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.period.type).toBe('week');
    });

    it('should return validation error for invalid period', async () => {
      const req = createMockRequest({ query: { period: 'invalid' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getDashboard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for custom period without dates', async () => {
      const req = createMockRequest({ query: { period: 'custom' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getDashboard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should calculate status distribution correctly', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ status: 'new' }),
        createSampleLead({ rowNumber: 3, status: 'new' }),
        createSampleLead({ rowNumber: 4, status: 'claimed', salesOwnerId: 'sales-001' }),
        createSampleLead({ rowNumber: 5, status: 'closed', salesOwnerId: 'sales-001', closedAt: getCurrentDateISO() }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.statusDistribution.new).toBe(2);
      expect(response.data.statusDistribution.claimed).toBe(1);
      expect(response.data.statusDistribution.closed).toBe(1);
    });

    it('should handle getAllLeads error gracefully and return empty data', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // getAllLeads catches errors internally and returns empty array
      mockGetAllLeads.mockRejectedValue(new Error('Database error'));

      await getDashboard(req, res, next);

      // Should still return 200 with empty data (graceful degradation)
      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.summary.totalLeads).toBe(0);
    });
  });

  // ===========================================
  // getLeads
  // ===========================================
  describe('getLeads', () => {
    it('should return paginated leads with defaults', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const leads = Array.from({ length: 25 }, (_, i) =>
        createSampleLead({ rowNumber: i + 2 })
      );
      mockGetAllLeads.mockResolvedValue(leads);

      await getLeads(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.data).toHaveLength(20); // Default limit
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.limit).toBe(20);
      expect(response.data.pagination.total).toBe(25);
      expect(response.data.pagination.totalPages).toBe(2);
      expect(response.data.pagination.hasNext).toBe(true);
      expect(response.data.pagination.hasPrev).toBe(false);
    });

    it('should respect page and limit parameters', async () => {
      const req = createMockRequest({ query: { page: '2', limit: '10' } });
      const res = createMockResponse();
      const next = createMockNext();

      const leads = Array.from({ length: 25 }, (_, i) =>
        createSampleLead({ rowNumber: i + 2 })
      );
      mockGetAllLeads.mockResolvedValue(leads);

      await getLeads(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(10);
      expect(response.data.pagination.page).toBe(2);
      expect(response.data.pagination.limit).toBe(10);
      expect(response.data.pagination.hasNext).toBe(true);
      expect(response.data.pagination.hasPrev).toBe(true);
    });

    it('should filter by status', async () => {
      const req = createMockRequest({ query: { status: 'claimed' } });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ status: 'new' }),
        createSampleLead({ rowNumber: 3, status: 'claimed', salesOwnerId: 'sales-001' }),
        createSampleLead({ rowNumber: 4, status: 'claimed', salesOwnerId: 'sales-002' }),
      ]);

      await getLeads(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(2);
      expect(response.data.data.every((l: { status: string }) => l.status === 'claimed')).toBe(true);
    });

    it('should filter by owner', async () => {
      const req = createMockRequest({ query: { owner: 'sales-001' } });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ status: 'claimed', salesOwnerId: 'sales-001' }),
        createSampleLead({ rowNumber: 3, status: 'claimed', salesOwnerId: 'sales-002' }),
      ]);

      await getLeads(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(1);
    });

    it('should filter by search', async () => {
      const req = createMockRequest({ query: { search: 'Test Company' } });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ company: 'Test Company' }),
        createSampleLead({ rowNumber: 3, company: 'Other Company' }),
      ]);

      await getLeads(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(1);
    });

    it('should sort by company ascending', async () => {
      const req = createMockRequest({ query: { sortBy: 'company', sortOrder: 'asc' } });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ company: 'Zebra Corp' }),
        createSampleLead({ rowNumber: 3, company: 'Alpha Corp' }),
        createSampleLead({ rowNumber: 4, company: 'Beta Corp' }),
      ]);

      await getLeads(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data[0].company).toBe('Alpha Corp');
      expect(response.data.data[1].company).toBe('Beta Corp');
      expect(response.data.data[2].company).toBe('Zebra Corp');
    });

    it('should return validation error for invalid page', async () => {
      const req = createMockRequest({ query: { page: '-1' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getLeads(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for limit exceeding max', async () => {
      const req = createMockRequest({ query: { limit: '999' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getLeads(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should include available filters in response', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ salesOwnerId: 'sales-001', salesOwnerName: 'Sales 1' }),
        createSampleLead({ rowNumber: 3, salesOwnerId: 'sales-002', salesOwnerName: 'Sales 2' }),
      ]);

      await getLeads(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.filters.available).toHaveProperty('statuses');
      expect(response.data.filters.available).toHaveProperty('owners');
      expect(response.data.filters.available).toHaveProperty('campaigns');
    });
  });

  // ===========================================
  // getLeadById
  // ===========================================
  describe('getLeadById', () => {
    it('should return lead detail for valid ID', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({ rowNumber: 5 });
      mockGetRow.mockResolvedValue(lead);

      await getLeadById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.row).toBe(5);
      expect(response.data.customerName).toBe('Test Customer');
      expect(response.data).toHaveProperty('history');
      expect(response.data).toHaveProperty('metrics');
    });

    it('should return 404 for non-existent lead', async () => {
      const req = createMockRequest({ params: { id: '999' } });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetRow.mockResolvedValue(null);

      await getLeadById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should return validation error for ID less than 2', async () => {
      const req = createMockRequest({ params: { id: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getLeadById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should include owner detail when salesOwnerId exists', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({
        rowNumber: 5,
        salesOwnerId: 'sales-001',
        salesOwnerName: 'Sales Person',
      });
      mockGetRow.mockResolvedValue(lead);
      mockGetSalesTeamMember.mockResolvedValue({
        lineUserId: 'sales-001',
        name: 'Sales Person',
        email: 'sales@eneos.co.th',
        phone: '0899999999',
      });

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.owner).not.toBeNull();
      expect(response.data.owner.id).toBe('sales-001');
      expect(response.data.owner.email).toBe('sales@eneos.co.th');
    });

    it('should include status history', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({
        rowNumber: 5,
        status: 'closed',
        salesOwnerId: 'sales-001',
        salesOwnerName: 'Sales Person',
        clickedAt: '2024-01-15T11:00:00.000Z',
        closedAt: '2024-01-16T10:00:00.000Z',
      });
      mockGetRow.mockResolvedValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.history).toBeInstanceOf(Array);
      expect(response.data.history.length).toBeGreaterThan(0);
    });

    it('should calculate metrics in minutes', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Use consistent dates for metrics calculation
      const baseDate = new Date();
      const clickedDate = new Date(baseDate.getTime() + 30 * 60 * 1000); // 30 mins after base
      const closedDate = new Date(clickedDate.getTime() + 60 * 60 * 1000); // 60 mins after clicked

      const lead = createSampleLead({
        rowNumber: 5,
        date: baseDate.toISOString(),
        salesOwnerId: 'sales-001',
        clickedAt: clickedDate.toISOString(),
        closedAt: closedDate.toISOString(),
      });
      mockGetRow.mockResolvedValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.metrics.responseTime).toBe(30); // 30 minutes
      expect(response.data.metrics.closingTime).toBe(60); // 60 minutes
    });
  });

  // ===========================================
  // getSalesPerformance
  // ===========================================
  describe('getSalesPerformance', () => {
    it('should return sales performance data', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          status: 'closed',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'Sales 1',
          closedAt: getCurrentDateISO(),
        }),
        createSampleLead({
          rowNumber: 3,
          status: 'claimed',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'Sales 1',
        }),
        createSampleLead({
          rowNumber: 4,
          status: 'closed',
          salesOwnerId: 'sales-002',
          salesOwnerName: 'Sales 2',
          closedAt: getCurrentDateISO(-1),
        }),
      ]);

      await getSalesPerformance(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('period');
      expect(response.data).toHaveProperty('team');
      expect(response.data).toHaveProperty('totals');
      expect(response.data).toHaveProperty('comparison');
    });

    it('should group by sales owner', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ salesOwnerId: 'sales-001', salesOwnerName: 'Sales 1' }),
        createSampleLead({ rowNumber: 3, salesOwnerId: 'sales-001', salesOwnerName: 'Sales 1' }),
        createSampleLead({ rowNumber: 4, salesOwnerId: 'sales-002', salesOwnerName: 'Sales 2' }),
      ]);

      await getSalesPerformance(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.team).toHaveLength(2);
    });

    it('should sort by closed count by default', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          salesOwnerId: 'sales-001',
          salesOwnerName: 'Sales 1',
          status: 'closed',
          closedAt: getCurrentDateISO(),
        }),
        createSampleLead({
          rowNumber: 3,
          salesOwnerId: 'sales-002',
          salesOwnerName: 'Sales 2',
          status: 'closed',
          closedAt: getCurrentDateISO(),
        }),
        createSampleLead({
          rowNumber: 4,
          salesOwnerId: 'sales-002',
          salesOwnerName: 'Sales 2',
          status: 'closed',
          closedAt: getCurrentDateISO(-1),
        }),
      ]);

      await getSalesPerformance(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.team[0].id).toBe('sales-002'); // Has 2 closed
      expect(response.data.team[1].id).toBe('sales-001'); // Has 1 closed
    });

    it('should calculate totals correctly', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          salesOwnerId: 'sales-001',
          status: 'closed',
          closedAt: getCurrentDateISO(),
        }),
        createSampleLead({
          rowNumber: 3,
          salesOwnerId: 'sales-001',
          status: 'claimed',
        }),
        createSampleLead({
          rowNumber: 4,
          salesOwnerId: 'sales-002',
          status: 'contacted',
        }),
      ]);

      await getSalesPerformance(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.totals.teamSize).toBe(2);
      expect(response.data.totals.claimed).toBe(3); // All leads with salesOwnerId
      expect(response.data.totals.closed).toBe(1);
    });

    it('should return validation error for invalid sortBy', async () => {
      const req = createMockRequest({ query: { sortBy: 'invalid' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformance(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should accept custom period with dates', async () => {
      const req = createMockRequest({
        query: {
          period: 'custom',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([]);

      await getSalesPerformance(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.period.type).toBe('custom');
    });

    it('should calculate conversion rate', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          salesOwnerId: 'sales-001',
          status: 'closed',
          closedAt: getCurrentDateISO(),
        }),
        createSampleLead({
          rowNumber: 3,
          salesOwnerId: 'sales-001',
          status: 'claimed',
        }),
        createSampleLead({
          rowNumber: 4,
          salesOwnerId: 'sales-001',
          status: 'lost',
          lostAt: getCurrentDateISO(-1),
        }),
        createSampleLead({
          rowNumber: 5,
          salesOwnerId: 'sales-001',
          status: 'contacted',
        }),
      ]);

      await getSalesPerformance(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const sales1 = response.data.team.find((t: { id: string }) => t.id === 'sales-001');
      expect(sales1.stats.claimed).toBe(4);
      expect(sales1.stats.closed).toBe(1);
      expect(sales1.stats.conversionRate).toBe(25); // 1/4 * 100 = 25%
    });
  });
});
