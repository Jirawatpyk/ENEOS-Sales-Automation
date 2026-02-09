/**
 * ENEOS Sales Automation - Admin Controller Tests
 * ทดสอบ Admin Dashboard API endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { LeadRow } from '../../types/index.js';

// Mock service functions
const mockGetAllLeads = vi.fn();
const mockGetRow = vi.fn();
const mockGetSalesTeamMember = vi.fn();
const mockGetStatusHistory = vi.fn();
const mockGetLeadByIdSupa = vi.fn();
const mockSupabaseLeadToLeadRow = vi.fn();
const mockGetLeadsWithPagination = vi.fn();
const mockGetDistinctFilterValues = vi.fn();

vi.mock('../../services/sales-team.service.js', () => ({
  salesTeamService: {
    getSalesTeamMember: (id: string) => mockGetSalesTeamMember(id),
  },
}));

vi.mock('../../services/status-history.service.js', () => ({
  statusHistoryService: {
    getStatusHistory: (leadId: string) => mockGetStatusHistory(leadId),
  },
}));

vi.mock('../../services/leads.service.js', () => ({
  getAllLeads: () => mockGetAllLeads(),
  getLeadById: (id: string) => mockGetLeadByIdSupa(id),
  supabaseLeadToLeadRow: (lead: unknown) => mockSupabaseLeadToLeadRow(lead),
  getLeadsWithPagination: (...args: unknown[]) => mockGetLeadsWithPagination(...args),
  getDistinctFilterValues: () => mockGetDistinctFilterValues(),
}));

// Import after mocking
import {
  getDashboard,
  getLeads,
  getLeadById,
  getSalesPerformance,
  getCampaigns,
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
  contactedAt: null, // When sales claimed the lead
  // Google Search Grounding fields (2026-01-26)
  juristicId: null,
  dbdSector: null,
  province: null,
  fullAddress: null,
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
    mockGetStatusHistory.mockResolvedValue([]); // Default to empty history (fallback mode)
    mockGetLeadByIdSupa.mockResolvedValue(null);
    mockSupabaseLeadToLeadRow.mockReturnValue(null);
    mockGetLeadsWithPagination.mockResolvedValue({ data: [], total: 0 });
    mockGetDistinctFilterValues.mockResolvedValue({
      owners: [],
      campaigns: [],
      leadSources: [],
    });
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
        createSampleLead({ status: 'new' }), // unclaimed
        createSampleLead({ rowNumber: 3, status: 'new' }), // unclaimed
        createSampleLead({ rowNumber: 4, status: 'contacted', salesOwnerId: 'sales-001', contactedAt: getCurrentDateISO() }), // claimed + contacted
        createSampleLead({ rowNumber: 5, status: 'closed', salesOwnerId: 'sales-001', closedAt: getCurrentDateISO() }), // claimed + closed
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.statusDistribution.new).toBe(2);
      expect(response.data.statusDistribution.contacted).toBe(1);
      expect(response.data.statusDistribution.closed).toBe(1);
      expect(response.data.statusDistribution.claimed).toBe(2); // 2 leads มี salesOwnerId
    });

    it('should sort topSales by closed count descending', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Create leads with different closed counts per sales owner
      mockGetAllLeads.mockResolvedValue([
        // Sales A: 1 closed
        createSampleLead({ rowNumber: 2, status: 'closed', salesOwnerId: 'sales-A', salesOwnerName: 'ทดสอบ A', closedAt: getCurrentDateISO() }),
        createSampleLead({ rowNumber: 3, status: 'contacted', salesOwnerId: 'sales-A', salesOwnerName: 'ทดสอบ A' }),
        // Sales B: 3 closed (should be rank 1)
        createSampleLead({ rowNumber: 4, status: 'closed', salesOwnerId: 'sales-B', salesOwnerName: 'TaOz B', closedAt: getCurrentDateISO() }),
        createSampleLead({ rowNumber: 5, status: 'closed', salesOwnerId: 'sales-B', salesOwnerName: 'TaOz B', closedAt: getCurrentDateISO() }),
        createSampleLead({ rowNumber: 6, status: 'closed', salesOwnerId: 'sales-B', salesOwnerName: 'TaOz B', closedAt: getCurrentDateISO() }),
        createSampleLead({ rowNumber: 7, status: 'contacted', salesOwnerId: 'sales-B', salesOwnerName: 'TaOz B' }),
        // Sales C: 2 closed (should be rank 2)
        createSampleLead({ rowNumber: 8, status: 'closed', salesOwnerId: 'sales-C', salesOwnerName: 'Sales C', closedAt: getCurrentDateISO() }),
        createSampleLead({ rowNumber: 9, status: 'closed', salesOwnerId: 'sales-C', salesOwnerName: 'Sales C', closedAt: getCurrentDateISO() }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const topSales = response.data.topSales;

      // Should be sorted by closed descending
      expect(topSales).toHaveLength(3);
      expect(topSales[0].name).toBe('TaOz B');
      expect(topSales[0].closed).toBe(3);
      expect(topSales[0].rank).toBe(1);

      expect(topSales[1].name).toBe('Sales C');
      expect(topSales[1].closed).toBe(2);
      expect(topSales[1].rank).toBe(2);

      expect(topSales[2].name).toBe('ทดสอบ A');
      expect(topSales[2].closed).toBe(1);
      expect(topSales[2].rank).toBe(3);
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

    it('should calculate period comparison changes correctly', async () => {
      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // 3 leads today, 2 leads yesterday
      mockGetAllLeads.mockResolvedValue([
        // Today's leads
        createSampleLead({ rowNumber: 2, status: 'new', date: today.toISOString() }),
        createSampleLead({ rowNumber: 3, status: 'claimed', salesOwnerId: 'sales-001', date: today.toISOString() }),
        createSampleLead({ rowNumber: 4, status: 'closed', salesOwnerId: 'sales-001', closedAt: today.toISOString(), date: today.toISOString() }),
        // Yesterday's leads
        createSampleLead({ rowNumber: 5, status: 'new', date: yesterday.toISOString() }),
        createSampleLead({ rowNumber: 6, status: 'closed', salesOwnerId: 'sales-002', closedAt: yesterday.toISOString(), date: yesterday.toISOString() }),
      ]);

      await getDashboard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.summary.totalLeads).toBe(3); // 3 today
      expect(response.data.summary.changes.totalLeads).toBe(50); // (3-2)/2 * 100 = 50%
    });

    it('should return 100% change when previous period has 0 leads', async () => {
      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      const today = new Date();

      // Only today's leads, no yesterday leads
      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ rowNumber: 2, status: 'new', date: today.toISOString() }),
        createSampleLead({ rowNumber: 3, status: 'closed', salesOwnerId: 'sales-001', closedAt: today.toISOString(), date: today.toISOString() }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.summary.changes.totalLeads).toBe(100); // New data = +100%
      expect(response.data.summary.changes.closed).toBe(100);
    });

    it('should return 0% change when both periods have 0 leads', async () => {
      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      // No leads at all
      mockGetAllLeads.mockResolvedValue([]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.summary.changes.totalLeads).toBe(0);
      expect(response.data.summary.changes.claimed).toBe(0);
      expect(response.data.summary.changes.closed).toBe(0);
    });

    it('should calculate negative change when current period has fewer leads', async () => {
      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // 1 lead today, 4 leads yesterday
      mockGetAllLeads.mockResolvedValue([
        // Today's lead
        createSampleLead({ rowNumber: 2, status: 'new', date: today.toISOString() }),
        // Yesterday's leads
        createSampleLead({ rowNumber: 3, status: 'new', date: yesterday.toISOString() }),
        createSampleLead({ rowNumber: 4, status: 'new', date: yesterday.toISOString() }),
        createSampleLead({ rowNumber: 5, status: 'new', date: yesterday.toISOString() }),
        createSampleLead({ rowNumber: 6, status: 'new', date: yesterday.toISOString() }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.summary.totalLeads).toBe(1);
      expect(response.data.summary.changes.totalLeads).toBe(-75); // (1-4)/4 * 100 = -75%
    });

    it('should handle year crossover for monthly comparison (January → December previous year)', async () => {
      // Mock the date to be January 15, 2026
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));

      const req = createMockRequest({ query: { period: 'month' } });
      const res = createMockResponse();
      const next = createMockNext();

      // January 2026 leads
      const januaryLead = createSampleLead({
        rowNumber: 2,
        status: 'new',
        date: '2026-01-10T10:00:00.000Z',
      });
      // December 2025 leads (previous year)
      const decemberLeads = [
        createSampleLead({ rowNumber: 3, status: 'new', date: '2025-12-05T10:00:00.000Z' }),
        createSampleLead({ rowNumber: 4, status: 'new', date: '2025-12-15T10:00:00.000Z' }),
        createSampleLead({ rowNumber: 5, status: 'new', date: '2025-12-25T10:00:00.000Z' }),
      ];

      mockGetAllLeads.mockResolvedValue([januaryLead, ...decemberLeads]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // January has 1 lead, December (previous year) has 3 leads
      expect(response.data.summary.totalLeads).toBe(1);
      // Change = (1 - 3) / 3 * 100 = -66.67%
      expect(response.data.summary.changes.totalLeads).toBeCloseTo(-66.67, 0);

      vi.useRealTimers();
    });

    it('should handle year crossover for quarterly comparison (Q1 → Q4 previous year)', async () => {
      // Mock the date to be February 15, 2026 (Q1)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

      const req = createMockRequest({ query: { period: 'quarter' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Q1 2026 leads (Jan-Mar)
      const q1Leads = [
        createSampleLead({ rowNumber: 2, status: 'new', date: '2026-01-10T10:00:00.000Z' }),
        createSampleLead({ rowNumber: 3, status: 'closed', date: '2026-02-10T10:00:00.000Z', closedAt: '2026-02-10T10:00:00.000Z', salesOwnerId: 's1', salesOwnerName: 'Test' }),
      ];
      // Q4 2025 leads (Oct-Dec, previous year)
      const q4Leads = [
        createSampleLead({ rowNumber: 4, status: 'new', date: '2025-10-05T10:00:00.000Z' }),
        createSampleLead({ rowNumber: 5, status: 'new', date: '2025-11-15T10:00:00.000Z' }),
        createSampleLead({ rowNumber: 6, status: 'new', date: '2025-12-25T10:00:00.000Z' }),
        createSampleLead({ rowNumber: 7, status: 'closed', date: '2025-12-20T10:00:00.000Z', closedAt: '2025-12-20T10:00:00.000Z', salesOwnerId: 's2', salesOwnerName: 'Test2' }),
      ];

      mockGetAllLeads.mockResolvedValue([...q1Leads, ...q4Leads]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Q1 has 2 leads, Q4 (previous year) has 4 leads
      expect(response.data.summary.totalLeads).toBe(2);
      // Change = (2 - 4) / 4 * 100 = -50%
      expect(response.data.summary.changes.totalLeads).toBe(-50);

      vi.useRealTimers();
    });

    it('should handle first day of year comparison (Jan 1 today → Dec 31 yesterday)', async () => {
      // Mock the date to be January 1, 2026
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      // January 1, 2026 lead
      const todayLead = createSampleLead({
        rowNumber: 2,
        status: 'new',
        date: '2026-01-01T10:00:00.000Z',
      });
      // December 31, 2025 leads
      const yesterdayLeads = [
        createSampleLead({ rowNumber: 3, status: 'new', date: '2025-12-31T10:00:00.000Z' }),
        createSampleLead({ rowNumber: 4, status: 'new', date: '2025-12-31T15:00:00.000Z' }),
      ];

      mockGetAllLeads.mockResolvedValue([todayLead, ...yesterdayLeads]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Today (Jan 1) has 1 lead, Yesterday (Dec 31 previous year) has 2 leads
      expect(response.data.summary.totalLeads).toBe(1);
      // Change = (1 - 2) / 2 * 100 = -50%
      expect(response.data.summary.changes.totalLeads).toBe(-50);

      vi.useRealTimers();
    });
  });

  // ===========================================
  // Activity Timestamp Selection (getActivityTimestamp helper)
  // ===========================================
  describe('Activity Timestamp Selection', () => {
    beforeEach(() => {
      // Freeze time to Jan 20 so hardcoded January dates fall within "month" period
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use closedAt for closed status in recentActivity', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const closedTime = '2026-01-18T10:00:00.000Z';
      const contactedTime = '2026-01-17T09:00:00.000Z';
      const dateTime = '2026-01-16T08:00:00.000Z';

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          status: 'closed',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'สมชาย',
          closedAt: closedTime,
          contactedAt: contactedTime,
          date: dateTime,
        }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.recentActivity[0].timestamp).toBe(closedTime);
    });

    it('should use lostAt for lost status in recentActivity', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const lostTime = '2026-01-18T11:00:00.000Z';
      const contactedTime = '2026-01-17T09:00:00.000Z';
      const dateTime = '2026-01-16T08:00:00.000Z';

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          status: 'lost',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'สมชาย',
          lostAt: lostTime,
          contactedAt: contactedTime,
          date: dateTime,
        }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.recentActivity[0].timestamp).toBe(lostTime);
    });

    it('should use unreachableAt for unreachable status in recentActivity', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const unreachableTime = '2026-01-18T12:00:00.000Z';
      const contactedTime = '2026-01-17T09:00:00.000Z';
      const dateTime = '2026-01-16T08:00:00.000Z';

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          status: 'unreachable',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'สมชาย',
          unreachableAt: unreachableTime,
          contactedAt: contactedTime,
          date: dateTime,
        }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.recentActivity[0].timestamp).toBe(unreachableTime);
    });

    it('should use contactedAt for contacted status in recentActivity', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const contactedTime = '2026-01-17T09:00:00.000Z';
      const dateTime = '2026-01-16T08:00:00.000Z';

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          status: 'contacted',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'สมชาย',
          contactedAt: contactedTime,
          date: dateTime,
        }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.recentActivity[0].timestamp).toBe(contactedTime);
    });

    it('should use date for new status in recentActivity', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const dateTime = '2026-01-16T08:00:00.000Z';

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          status: 'new',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'สมชาย',
          date: dateTime,
        }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.recentActivity[0].timestamp).toBe(dateTime);
    });

    it('should fallback to contactedAt when closedAt is null for closed status', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const contactedTime = '2026-01-17T09:00:00.000Z';
      const dateTime = '2026-01-16T08:00:00.000Z';

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          status: 'closed',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'สมชาย',
          closedAt: '', // Empty - should fallback
          contactedAt: contactedTime,
          date: dateTime,
        }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.recentActivity[0].timestamp).toBe(contactedTime);
    });

    it('should fallback to date when both closedAt and contactedAt are null', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const dateTime = '2026-01-16T08:00:00.000Z';

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          status: 'closed',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'สมชาย',
          closedAt: '',
          contactedAt: '',
          date: dateTime,
        }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.recentActivity[0].timestamp).toBe(dateTime);
    });

    it('should sort recentActivity by the correct timestamp for each status', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Closed lead with newest closedAt should appear first
      const closedTime = '2026-01-18T12:00:00.000Z';
      const contactedTime = '2026-01-18T10:00:00.000Z';
      const lostTime = '2026-01-18T08:00:00.000Z';

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          status: 'contacted',
          salesOwnerId: 'sales-001',
          salesOwnerName: 'สมชาย',
          contactedAt: contactedTime,
          date: '2026-01-15T00:00:00.000Z',
        }),
        createSampleLead({
          rowNumber: 3,
          status: 'closed',
          salesOwnerId: 'sales-002',
          salesOwnerName: 'สมหญิง',
          closedAt: closedTime,
          contactedAt: '2026-01-16T00:00:00.000Z',
          date: '2026-01-14T00:00:00.000Z',
        }),
        createSampleLead({
          rowNumber: 4,
          status: 'lost',
          salesOwnerId: 'sales-003',
          salesOwnerName: 'สมปอง',
          lostAt: lostTime,
          contactedAt: '2026-01-17T00:00:00.000Z',
          date: '2026-01-13T00:00:00.000Z',
        }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Should be sorted: closed (12:00) > contacted (10:00) > lost (08:00)
      expect(response.data.recentActivity[0].timestamp).toBe(closedTime);
      expect(response.data.recentActivity[1].timestamp).toBe(contactedTime);
      expect(response.data.recentActivity[2].timestamp).toBe(lostTime);
    });
  });

  // ===========================================
  // getLeads
  // ===========================================
  describe('getLeads', () => {
    // Helper: set up getLeadsWithPagination + supabaseLeadToLeadRow mocks
    // The controller now delegates filtering/pagination to the service.
    // Tests verify correct parameter passing and response transformation.
    const setupPaginatedMock = (leads: LeadRow[], total?: number) => {
      // getLeadsWithPagination returns SupabaseLead[] — we use LeadRow as proxy objects
      mockGetLeadsWithPagination.mockResolvedValue({
        data: leads, // proxy objects (mockSupabaseLeadToLeadRow converts them)
        total: total ?? leads.length,
      });
      // supabaseLeadToLeadRow passes through the proxy objects as-is
      mockSupabaseLeadToLeadRow.mockImplementation((lead: unknown) => lead);
    };

    it('should return paginated leads with defaults', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const leads = Array.from({ length: 20 }, (_, i) =>
        createSampleLead({ rowNumber: i + 2 })
      );
      setupPaginatedMock(leads, 25);

      await getLeads(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.data).toHaveLength(20); // Service returned 20 items
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.limit).toBe(20);
      expect(response.data.pagination.total).toBe(25);
      expect(response.data.pagination.totalPages).toBe(2);
      expect(response.data.pagination.hasNext).toBe(true);
      expect(response.data.pagination.hasPrev).toBe(false);
    });

    it('should pass page and limit to service', async () => {
      const req = createMockRequest({ query: { page: '2', limit: '10' } });
      const res = createMockResponse();
      const next = createMockNext();

      const leads = Array.from({ length: 10 }, (_, i) =>
        createSampleLead({ rowNumber: i + 12 })
      );
      setupPaginatedMock(leads, 25);

      await getLeads(req, res, next);

      expect(mockGetLeadsWithPagination).toHaveBeenCalledWith(2, 10, expect.objectContaining({}));
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(10);
      expect(response.data.pagination.page).toBe(2);
      expect(response.data.pagination.limit).toBe(10);
      expect(response.data.pagination.hasNext).toBe(true);
      expect(response.data.pagination.hasPrev).toBe(true);
    });

    it('should pass status filter to service', async () => {
      const req = createMockRequest({ query: { status: 'contacted' } });
      const res = createMockResponse();
      const next = createMockNext();

      const contactedLeads = [
        createSampleLead({ rowNumber: 3, status: 'contacted', salesOwnerId: 'sales-001', contactedAt: getCurrentDateISO() }),
        createSampleLead({ rowNumber: 4, status: 'contacted', salesOwnerId: 'sales-002', contactedAt: getCurrentDateISO() }),
      ];
      setupPaginatedMock(contactedLeads);

      await getLeads(req, res, next);

      expect(mockGetLeadsWithPagination).toHaveBeenCalledWith(
        1, 20, expect.objectContaining({ status: 'contacted' })
      );
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(2);
    });

    it('should pass status=claimed filter to service', async () => {
      const req = createMockRequest({ query: { status: 'claimed' } });
      const res = createMockResponse();
      const next = createMockNext();

      const claimedLeads = [
        createSampleLead({ rowNumber: 3, status: 'contacted', salesOwnerId: 'sales-001', contactedAt: getCurrentDateISO() }),
        createSampleLead({ rowNumber: 4, status: 'closed', salesOwnerId: 'sales-002', closedAt: getCurrentDateISO() }),
      ];
      setupPaginatedMock(claimedLeads);

      await getLeads(req, res, next);

      expect(mockGetLeadsWithPagination).toHaveBeenCalledWith(
        1, 20, expect.objectContaining({ status: 'claimed' })
      );
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(2);
    });

    it('should pass owner filter to service', async () => {
      const req = createMockRequest({ query: { owner: 'sales-001' } });
      const res = createMockResponse();
      const next = createMockNext();

      setupPaginatedMock([
        createSampleLead({ status: 'contacted', salesOwnerId: 'sales-001' }),
      ]);

      await getLeads(req, res, next);

      expect(mockGetLeadsWithPagination).toHaveBeenCalledWith(
        1, 20, expect.objectContaining({ owner: 'sales-001' })
      );
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(1);
    });

    it('should pass search filter to service', async () => {
      const req = createMockRequest({ query: { search: 'Test Company' } });
      const res = createMockResponse();
      const next = createMockNext();

      setupPaginatedMock([
        createSampleLead({ company: 'Test Company' }),
      ]);

      await getLeads(req, res, next);

      expect(mockGetLeadsWithPagination).toHaveBeenCalledWith(
        1, 20, expect.objectContaining({ search: 'Test Company' })
      );
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(1);
    });

    it('should pass sort params to service', async () => {
      const req = createMockRequest({ query: { sortBy: 'company', sortOrder: 'asc' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Service returns pre-sorted data
      setupPaginatedMock([
        createSampleLead({ rowNumber: 3, company: 'Alpha Corp' }),
        createSampleLead({ rowNumber: 4, company: 'Beta Corp' }),
        createSampleLead({ company: 'Zebra Corp' }),
      ]);

      await getLeads(req, res, next);

      expect(mockGetLeadsWithPagination).toHaveBeenCalledWith(
        1, 20, expect.objectContaining({ sortBy: 'company', sortOrder: 'asc' })
      );
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

    it('should include available filters from getDistinctFilterValues', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      setupPaginatedMock([]);
      mockGetDistinctFilterValues.mockResolvedValue({
        owners: [{ id: 'sales-001', name: 'Sales 1' }, { id: 'sales-002', name: 'Sales 2' }],
        campaigns: [{ id: 'campaign-001', name: 'Campaign 1' }],
        leadSources: ['Website', 'Referral'],
      });

      await getLeads(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.filters.available).toHaveProperty('statuses');
      expect(response.data.filters.available).toHaveProperty('owners');
      expect(response.data.filters.available).toHaveProperty('campaigns');
      expect(response.data.filters.available.owners).toHaveLength(2);
      expect(response.data.filters.available.campaigns).toHaveLength(1);
      expect(response.data.filters.available.leadSources).toEqual(['Website', 'Referral']);
    });

    it('should include grounding fields in lead list (2026-01-26)', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      setupPaginatedMock([
        createSampleLead({
          rowNumber: 2,
          juristicId: '0105563079446',
          dbdSector: 'F&B-M',
          province: 'กรุงเทพมหานคร',
          fullAddress: '123/45 ถนนสุขุมวิท',
        }),
        createSampleLead({
          rowNumber: 3,
          // Legacy lead without grounding fields
        }),
      ]);

      await getLeads(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.data).toHaveLength(2);

      // First lead has grounding fields
      expect(response.data.data[0]).toHaveProperty('juristicId', '0105563079446');
      expect(response.data.data[0]).toHaveProperty('dbdSector', 'F&B-M');
      expect(response.data.data[0]).toHaveProperty('province', 'กรุงเทพมหานคร');
      expect(response.data.data[0]).toHaveProperty('fullAddress', '123/45 ถนนสุขุมวิท');

      // Second lead has null grounding fields
      expect(response.data.data[1]).toHaveProperty('juristicId', null);
      expect(response.data.data[1]).toHaveProperty('dbdSector', null);
      expect(response.data.data[1]).toHaveProperty('province', null);
      expect(response.data.data[1]).toHaveProperty('fullAddress', null);
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
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

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

      mockGetLeadByIdSupa.mockResolvedValue(null);

      await getLeadById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should return validation error for empty ID', async () => {
      const req = createMockRequest({ params: { id: '' } });
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
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);
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
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.history).toBeInstanceOf(Array);
      expect(response.data.history.length).toBeGreaterThan(0);
    });

    // Story 0-12: Status History - Controller-level coverage
    it('should return history from Status_History sheet when entries exist', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({
        rowNumber: 5,
        status: 'closed',
        salesOwnerId: 'sales-001',
        salesOwnerName: 'Sales Person',
        leadUUID: 'lead_abc-123',
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: 'lead_abc-123' });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      mockGetStatusHistory.mockResolvedValue([
        {
          leadUUID: 'lead_abc-123',
          status: 'new',
          changedById: 'system',
          changedByName: 'System',
          timestamp: '2024-01-15T10:00:00.000Z',
        },
        {
          leadUUID: 'lead_abc-123',
          status: 'contacted',
          changedById: 'sales-001',
          changedByName: 'Sales Person',
          timestamp: '2024-01-15T11:00:00.000Z',
        },
        {
          leadUUID: 'lead_abc-123',
          status: 'closed',
          changedById: 'sales-001',
          changedByName: 'Sales Person',
          timestamp: '2024-01-16T10:00:00.000Z',
        },
      ]);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(mockGetStatusHistory).toHaveBeenCalledWith('lead_abc-123');
      expect(response.data.history).toHaveLength(3);
      // Verify mapped fields (status, by, timestamp)
      expect(response.data.history[0]).toEqual({
        status: 'closed',
        by: 'Sales Person',
        timestamp: '2024-01-16T10:00:00.000Z',
      });
      expect(response.data.history[2]).toEqual({
        status: 'new',
        by: 'System',
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should sort history newest first', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({
        rowNumber: 5,
        status: 'contacted',
        salesOwnerId: 'sales-001',
        leadUUID: 'lead_sort-test',
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: 'lead_sort-test' });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      // Return entries in ascending order (oldest first)
      mockGetStatusHistory.mockResolvedValue([
        {
          leadUUID: 'lead_sort-test',
          status: 'new',
          changedById: 'system',
          changedByName: 'System',
          timestamp: '2024-01-10T08:00:00.000Z',
        },
        {
          leadUUID: 'lead_sort-test',
          status: 'contacted',
          changedById: 'sales-001',
          changedByName: 'Sales A',
          timestamp: '2024-01-12T14:30:00.000Z',
        },
      ]);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Should be newest first
      expect(response.data.history[0].status).toBe('contacted');
      expect(response.data.history[1].status).toBe('new');
    });

    it('should use fallback history when getStatusHistory returns empty', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({
        rowNumber: 5,
        status: 'closed',
        salesOwnerId: 'sales-001',
        salesOwnerName: 'Sales Person',
        leadUUID: 'lead_fallback-123',
        date: '2024-01-14T09:00:00.000Z',
        contactedAt: '2024-01-15T10:00:00.000Z',
        closedAt: '2024-01-16T10:00:00.000Z',
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: 'lead_fallback-123' });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);
      // getStatusHistory returns empty → fallback kicks in
      mockGetStatusHistory.mockResolvedValue([]);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // getStatusHistory was called but returned empty
      expect(mockGetStatusHistory).toHaveBeenCalledWith('lead_fallback-123');
      // Fallback reconstructs from timestamps
      expect(response.data.history).toHaveLength(3); // closed + contacted + new
      expect(response.data.history[0].status).toBe('closed');
      expect(response.data.history[0].by).toBe('Sales Person');
      expect(response.data.history[1].status).toBe('contacted');
      expect(response.data.history[2].status).toBe('new');
      expect(response.data.history[2].by).toBe('System');
    });

    it('should include all status types in fallback history', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({
        rowNumber: 5,
        status: 'lost',
        salesOwnerId: 'sales-001',
        salesOwnerName: 'Sales Person',
        leadUUID: null,
        date: '2024-01-10T08:00:00.000Z',
        contactedAt: '2024-01-11T09:00:00.000Z',
        closedAt: '2024-01-12T10:00:00.000Z',
        lostAt: '2024-01-13T11:00:00.000Z',
        unreachableAt: '2024-01-14T12:00:00.000Z',
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // All 5 statuses: unreachable, lost, closed, contacted, new (newest first)
      expect(response.data.history).toHaveLength(5);
      const statuses = response.data.history.map((h: { status: string }) => h.status);
      expect(statuses).toEqual(['unreachable', 'lost', 'closed', 'contacted', 'new']);
    });

    it('should use "Unknown" when salesOwnerName is missing in fallback mode', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({
        rowNumber: 5,
        status: 'contacted',
        salesOwnerId: 'sales-001',
        salesOwnerName: null, // Missing name
        leadUUID: null,
        date: '2024-01-10T08:00:00.000Z',
        contactedAt: '2024-01-11T09:00:00.000Z',
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.history[0].by).toBe('Unknown');
      // 'new' entry is always by 'System'
      expect(response.data.history[1].by).toBe('System');
    });

    it('should calculate metrics in minutes', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Use consistent dates for metrics calculation
      // responseTime = contactedAt - date
      // closingTime = closedAt - contactedAt
      const baseDate = new Date();
      const contactedDate = new Date(baseDate.getTime() + 30 * 60 * 1000); // 30 mins after base
      const closedDate = new Date(contactedDate.getTime() + 60 * 60 * 1000); // 60 mins after contacted

      const lead = createSampleLead({
        rowNumber: 5,
        date: baseDate.toISOString(),
        salesOwnerId: 'sales-001',
        clickedAt: baseDate.toISOString(), // clickedAt is less relevant now
        contactedAt: contactedDate.toISOString(),
        closedAt: closedDate.toISOString(),
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.metrics.responseTime).toBe(30); // 30 minutes (contactedAt - date)
      expect(response.data.metrics.closingTime).toBe(60); // 60 minutes (closedAt - contactedAt)
    });

    it('should return 0 for metrics when contactedAt is null (legacy lead)', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Lead without contactedAt (legacy data)
      const lead = createSampleLead({
        rowNumber: 5,
        salesOwnerId: 'sales-001',
        contactedAt: null,
        closedAt: '2026-01-16T10:00:00.000Z',
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.metrics.responseTime).toBe(0); // No contactedAt = 0
      expect(response.data.metrics.closingTime).toBe(0); // No contactedAt = 0
    });

    it('should return 0 for closingTime when contactedAt > closedAt (invalid data)', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Invalid: contactedAt after closedAt (should not happen normally)
      const baseDate = new Date();
      const closedDate = new Date(baseDate.getTime() + 30 * 60 * 1000);
      const contactedDate = new Date(baseDate.getTime() + 60 * 60 * 1000); // After closedAt!

      const lead = createSampleLead({
        rowNumber: 5,
        date: baseDate.toISOString(),
        salesOwnerId: 'sales-001',
        contactedAt: contactedDate.toISOString(),
        closedAt: closedDate.toISOString(),
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Invalid timestamp ordering: contactedAt > closedAt should return 0
      expect(response.data.metrics.closingTime).toBe(0);
    });

    it('should return grounding fields when present (2026-01-26)', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      const lead = createSampleLead({
        rowNumber: 5,
        juristicId: '0105563079446',
        dbdSector: 'F&B-M',
        province: 'กรุงเทพมหานคร',
        fullAddress: '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
      });
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      await getLeadById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Verify all grounding fields are returned
      expect(response.data.juristicId).toBe('0105563079446');
      expect(response.data.dbdSector).toBe('F&B-M');
      expect(response.data.province).toBe('กรุงเทพมหานคร');
      expect(response.data.fullAddress).toBe('123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110');
    });

    it('should return null for grounding fields when not present', async () => {
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Legacy lead without grounding fields
      const lead = createSampleLead({ rowNumber: 5 });
      mockGetLeadByIdSupa.mockResolvedValue({ id: String(lead.rowNumber) });
      mockSupabaseLeadToLeadRow.mockReturnValue(lead);

      await getLeadById(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Grounding fields should be null for legacy leads
      expect(response.data.juristicId).toBeNull();
      expect(response.data.dbdSector).toBeNull();
      expect(response.data.province).toBeNull();
      expect(response.data.fullAddress).toBeNull();
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

    it('should calculate comparison with previous period', async () => {
      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockGetAllLeads.mockResolvedValue([
        // Today: 2 claimed, 1 closed
        createSampleLead({
          rowNumber: 2,
          salesOwnerId: 'sales-001',
          salesOwnerName: 'Sales 1',
          status: 'closed',
          closedAt: today.toISOString(),
          date: today.toISOString(),
        }),
        createSampleLead({
          rowNumber: 3,
          salesOwnerId: 'sales-001',
          salesOwnerName: 'Sales 1',
          status: 'claimed',
          date: today.toISOString(),
        }),
        // Yesterday: 1 claimed, 1 closed
        createSampleLead({
          rowNumber: 4,
          salesOwnerId: 'sales-002',
          salesOwnerName: 'Sales 2',
          status: 'closed',
          closedAt: yesterday.toISOString(),
          date: yesterday.toISOString(),
        }),
      ]);

      await getSalesPerformance(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.comparison).toBeDefined();
      expect(response.data.comparison.previousPeriod.claimed).toBe(1);
      expect(response.data.comparison.previousPeriod.closed).toBe(1);
      expect(response.data.comparison.changes.claimed).toBe(100); // 2 vs 1 = +100%
      expect(response.data.comparison.changes.closed).toBe(0); // 1 vs 1 = 0%
    });

    it('should handle no previous period data for comparison', async () => {
      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      const today = new Date();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          salesOwnerId: 'sales-001',
          salesOwnerName: 'Sales 1',
          status: 'closed',
          closedAt: today.toISOString(),
          date: today.toISOString(),
        }),
      ]);

      await getSalesPerformance(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.comparison.previousPeriod.claimed).toBe(0);
      expect(response.data.comparison.previousPeriod.closed).toBe(0);
      expect(response.data.comparison.changes.claimed).toBe(100); // New data
      expect(response.data.comparison.changes.closed).toBe(100);
    });
  });

  // ===========================================
  // Period Calculation Edge Cases (Story 0-13)
  // ===========================================
  describe('Period Calculation Edge Cases', () => {
    it('should calculate week period comparison correctly', async () => {
      const req = createMockRequest({ query: { period: 'week' } });
      const res = createMockResponse();
      const next = createMockNext();

      const now = new Date();
      const thisWeek = new Date(now);
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);

      mockGetAllLeads.mockResolvedValue([
        // This week: 4 leads
        createSampleLead({ rowNumber: 2, status: 'new', date: thisWeek.toISOString() }),
        createSampleLead({ rowNumber: 3, status: 'claimed', salesOwnerId: 'sales-001', date: thisWeek.toISOString() }),
        createSampleLead({ rowNumber: 4, status: 'closed', salesOwnerId: 'sales-001', closedAt: thisWeek.toISOString(), date: thisWeek.toISOString() }),
        createSampleLead({ rowNumber: 5, status: 'closed', salesOwnerId: 'sales-002', closedAt: thisWeek.toISOString(), date: thisWeek.toISOString() }),
        // Last week: 2 leads
        createSampleLead({ rowNumber: 6, status: 'new', date: lastWeek.toISOString() }),
        createSampleLead({ rowNumber: 7, status: 'closed', salesOwnerId: 'sales-001', closedAt: lastWeek.toISOString(), date: lastWeek.toISOString() }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.summary.totalLeads).toBe(4); // 4 this week
      expect(response.data.summary.changes.totalLeads).toBe(100); // (4-2)/2 * 100 = 100%
      expect(response.data.summary.changes.closed).toBe(100); // (2-1)/1 * 100 = 100%
    });

    it('should calculate month period comparison correctly', async () => {
      // Freeze time to mid-month so thisMonth dates are within range
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));

      const req = createMockRequest({ query: { period: 'month' } });
      const res = createMockResponse();
      const next = createMockNext();

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

      mockGetAllLeads.mockResolvedValue([
        // This month: 3 leads
        createSampleLead({ rowNumber: 2, status: 'new', date: thisMonth.toISOString() }),
        createSampleLead({ rowNumber: 3, status: 'closed', salesOwnerId: 'sales-001', closedAt: thisMonth.toISOString(), date: thisMonth.toISOString() }),
        createSampleLead({ rowNumber: 4, status: 'claimed', salesOwnerId: 'sales-002', date: thisMonth.toISOString() }),
        // Last month: 6 leads (decline scenario)
        createSampleLead({ rowNumber: 5, status: 'new', date: lastMonth.toISOString() }),
        createSampleLead({ rowNumber: 6, status: 'new', date: lastMonth.toISOString() }),
        createSampleLead({ rowNumber: 7, status: 'closed', salesOwnerId: 'sales-001', closedAt: lastMonth.toISOString(), date: lastMonth.toISOString() }),
        createSampleLead({ rowNumber: 8, status: 'closed', salesOwnerId: 'sales-002', closedAt: lastMonth.toISOString(), date: lastMonth.toISOString() }),
        createSampleLead({ rowNumber: 9, status: 'claimed', salesOwnerId: 'sales-001', date: lastMonth.toISOString() }),
        createSampleLead({ rowNumber: 10, status: 'claimed', salesOwnerId: 'sales-002', date: lastMonth.toISOString() }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.summary.totalLeads).toBe(3); // 3 this month
      expect(response.data.summary.changes.totalLeads).toBe(-50); // (3-6)/6 * 100 = -50%
      expect(response.data.summary.changes.closed).toBe(-50); // (1-2)/2 * 100 = -50%

      vi.useRealTimers();
    });

    it('should handle custom period with same duration before', async () => {
      const req = createMockRequest({
        query: {
          period: 'custom',
          startDate: '2026-01-10',
          endDate: '2026-01-15', // 6 days
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        // Current period (Jan 10-15): 2 leads
        createSampleLead({ rowNumber: 2, status: 'new', date: '2026-01-12T10:00:00.000Z' }),
        createSampleLead({ rowNumber: 3, status: 'closed', salesOwnerId: 'sales-001', closedAt: '2026-01-14T10:00:00.000Z', date: '2026-01-14T10:00:00.000Z' }),
        // Previous period (Jan 4-9): 1 lead
        createSampleLead({ rowNumber: 4, status: 'new', date: '2026-01-06T10:00:00.000Z' }),
      ]);

      await getDashboard(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.summary.totalLeads).toBe(2);
      expect(response.data.summary.changes.totalLeads).toBe(100); // (2-1)/1 * 100 = 100%
    });
  });

  // ===========================================
  // getCampaigns (Story 0-13 - Campaign Comparison)
  // ===========================================
  describe('getCampaigns', () => {
    it('should return campaign data with comparison', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          campaignId: 'campaign-001',
          campaignName: 'Campaign A',
          status: 'closed',
          closedAt: getCurrentDateISO(),
        }),
        createSampleLead({
          rowNumber: 3,
          campaignId: 'campaign-001',
          campaignName: 'Campaign A',
          status: 'claimed',
          salesOwnerId: 'sales-001',
        }),
        createSampleLead({
          rowNumber: 4,
          campaignId: 'campaign-002',
          campaignName: 'Campaign B',
          status: 'new',
        }),
      ]);

      await getCampaigns(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('campaigns');
      expect(response.data).toHaveProperty('totals');
      expect(response.data).toHaveProperty('comparison');
      expect(response.data).toHaveProperty('period');
    });

    it('should calculate campaign comparison with previous period', async () => {
      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockGetAllLeads.mockResolvedValue([
        // Today: 3 leads, 2 closed
        createSampleLead({
          rowNumber: 2,
          campaignId: 'campaign-001',
          status: 'closed',
          closedAt: today.toISOString(),
          date: today.toISOString(),
        }),
        createSampleLead({
          rowNumber: 3,
          campaignId: 'campaign-001',
          status: 'closed',
          closedAt: today.toISOString(),
          date: today.toISOString(),
        }),
        createSampleLead({
          rowNumber: 4,
          campaignId: 'campaign-001',
          status: 'new',
          date: today.toISOString(),
        }),
        // Yesterday: 2 leads, 1 closed
        createSampleLead({
          rowNumber: 5,
          campaignId: 'campaign-001',
          status: 'closed',
          closedAt: yesterday.toISOString(),
          date: yesterday.toISOString(),
        }),
        createSampleLead({
          rowNumber: 6,
          campaignId: 'campaign-001',
          status: 'new',
          date: yesterday.toISOString(),
        }),
      ]);

      await getCampaigns(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.comparison).toBeDefined();
      expect(response.data.comparison.previousPeriod.leads).toBe(2);
      expect(response.data.comparison.previousPeriod.closed).toBe(1);
      expect(response.data.comparison.changes.leads).toBe(50); // (3-2)/2 * 100 = 50%
      expect(response.data.comparison.changes.closed).toBe(100); // (2-1)/1 * 100 = 100%
    });

    it('should handle no previous period campaign data', async () => {
      const req = createMockRequest({ query: { period: 'today' } });
      const res = createMockResponse();
      const next = createMockNext();

      const today = new Date();

      mockGetAllLeads.mockResolvedValue([
        createSampleLead({
          rowNumber: 2,
          campaignId: 'campaign-001',
          status: 'closed',
          closedAt: today.toISOString(),
          date: today.toISOString(),
        }),
      ]);

      await getCampaigns(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.comparison.previousPeriod.leads).toBe(0);
      expect(response.data.comparison.previousPeriod.closed).toBe(0);
      expect(response.data.comparison.changes.leads).toBe(100); // New data = +100%
      expect(response.data.comparison.changes.closed).toBe(100);
    });
  });
});
