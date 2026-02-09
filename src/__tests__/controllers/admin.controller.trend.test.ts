/**
 * ENEOS Sales Automation - Admin Controller Trend Tests
 * Story 3.5: Individual Performance Trend
 *
 * Tests for getSalesPerformanceTrend endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { LeadRow } from '../../types/index.js';

// Use vi.hoisted for proper mock hoisting
const { mockSalesTeamService, mockLeadsService } = vi.hoisted(() => {
  const mockSalesTeamService = {
    getSalesTeamMember: vi.fn().mockResolvedValue(null),
  };
  const mockLeadsService = {
    getAllLeads: vi.fn().mockResolvedValue([]),
  };
  return { mockSalesTeamService, mockLeadsService };
});

// Mock logger first (before any other imports that might use it)
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock salesTeamService (extracted from sheets.service)
vi.mock('../../services/sales-team.service.js', () => ({
  salesTeamService: mockSalesTeamService,
}));

// Mock statusHistoryService (extracted from sheets.service)
vi.mock('../../services/status-history.service.js', () => ({
  statusHistoryService: {
    getStatusHistory: vi.fn().mockResolvedValue([]),
    addStatusHistory: vi.fn().mockResolvedValue(undefined),
    getAllStatusHistory: vi.fn().mockResolvedValue({ entries: [], total: 0, changedByOptions: [] }),
  },
}));

// Mock leadsService (getAllLeads moved from sheetsService)
vi.mock('../../services/leads.service.js', () => mockLeadsService);

// Import after mocking
import { getSalesPerformanceTrend } from '../../controllers/admin.controller.js';

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
      role: 'manager',
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

// Helper to create date string for a given days offset
const getDateISO = (daysOffset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

// Helper to create date string in YYYY-MM-DD format
const getDateKey = (daysOffset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

// Sample lead data factory
const createSampleLead = (overrides: Partial<LeadRow> = {}): LeadRow => ({
  rowNumber: 2,
  date: getDateISO(),
  customerName: 'Test Customer',
  email: 'customer@test.com',
  phone: '0812345678',
  company: 'Test Company',
  industryAI: 'Manufacturing',
  website: 'https://test.com',
  capital: '10M',
  status: 'claimed',
  salesOwnerId: 'sales-001',
  salesOwnerName: 'Sales Person',
  campaignId: 'campaign-001',
  campaignName: 'Test Campaign',
  emailSubject: 'Test Subject',
  source: 'Brevo',
  leadId: 'lead-001',
  eventId: 'event-001',
  clickedAt: getDateISO(),
  talkingPoint: 'Test talking point',
  closedAt: null,
  lostAt: null,
  unreachableAt: null,
  version: 1,
  leadSource: null,
  jobTitle: null,
  city: null,
  leadUUID: null,
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

// ===========================================
// Tests
// ===========================================

describe('getSalesPerformanceTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeadsService.getAllLeads.mockResolvedValue([]);
    mockSalesTeamService.getSalesTeamMember.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Validation', () => {
    it('should return 400 if userId is missing', async () => {
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if days is invalid', async () => {
      const req = createMockRequest({ query: { userId: 'sales-001', days: '15' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should accept valid days values (7, 30, 90)', async () => {
      for (const days of [7, 30, 90]) {
        const req = createMockRequest({ query: { userId: 'sales-001', days: String(days) } });
        const res = createMockResponse();
        const next = createMockNext();

        await getSalesPerformanceTrend(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
      }
    });
  });

  describe('Data Aggregation', () => {
    it('should return trend data for specified user', async () => {
      const userId = 'sales-001';
      mockLeadsService.getAllLeads.mockResolvedValue([
        createSampleLead({ salesOwnerId: userId, status: 'claimed', date: getDateISO(-1) }),
        createSampleLead({ rowNumber: 3, salesOwnerId: userId, status: 'closed', date: getDateISO(-1), closedAt: getDateISO(-1) }),
        createSampleLead({ rowNumber: 4, salesOwnerId: 'sales-002', status: 'claimed', date: getDateISO(-1) }),
      ]);
      mockSalesTeamService.getSalesTeamMember.mockResolvedValue({ name: 'Test Sales', email: 'test@eneos.co.th' });

      const req = createMockRequest({ query: { userId, days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.userId).toBe(userId);
      expect(response.data.name).toBe('Test Sales');
      expect(response.data.period).toBe(7);
      expect(response.data.dailyData).toHaveLength(7);
      expect(response.data.teamAverage).toHaveLength(7);
    });

    it('should count claimed leads correctly for user', async () => {
      const userId = 'sales-001';
      const yesterday = getDateISO(-1);

      mockLeadsService.getAllLeads.mockResolvedValue([
        createSampleLead({ salesOwnerId: userId, status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 3, salesOwnerId: userId, status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 4, salesOwnerId: userId, status: 'closed', date: yesterday, closedAt: yesterday }),
      ]);

      const req = createMockRequest({ query: { userId, days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const yesterdayData = response.data.dailyData.find(
        (d: { date: string }) => d.date === getDateKey(-1)
      );

      expect(yesterdayData).toBeDefined();
      expect(yesterdayData.claimed).toBe(3); // All 3 leads are claimed by this user
      expect(yesterdayData.closed).toBe(1); // Only 1 is closed
    });

    it('should calculate team average correctly', async () => {
      const yesterday = getDateISO(-1);

      mockLeadsService.getAllLeads.mockResolvedValue([
        // User 1: 2 claimed, 1 closed
        createSampleLead({ salesOwnerId: 'sales-001', status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 3, salesOwnerId: 'sales-001', status: 'closed', date: yesterday, closedAt: yesterday }),
        // User 2: 2 claimed, 0 closed
        createSampleLead({ rowNumber: 4, salesOwnerId: 'sales-002', status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 5, salesOwnerId: 'sales-002', status: 'contacted', date: yesterday }),
      ]);

      const req = createMockRequest({ query: { userId: 'sales-001', days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const yesterdayTeamAvg = response.data.teamAverage.find(
        (d: { date: string }) => d.date === getDateKey(-1)
      );

      expect(yesterdayTeamAvg).toBeDefined();
      // Total: 4 claimed, 1 closed, 2 users
      // Average: 4/2 = 2 claimed, 1/2 = 0.5 → rounded to 1 closed (or 0 depending on rounding)
      expect(yesterdayTeamAvg.claimed).toBe(2); // Math.round(4/2)
    });

    it('should return empty data for user with no leads', async () => {
      mockLeadsService.getAllLeads.mockResolvedValue([
        createSampleLead({ salesOwnerId: 'sales-002', status: 'claimed' }),
      ]);

      const req = createMockRequest({ query: { userId: 'sales-001', days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);

      // All days should have 0 for this user
      const totalClaimed = response.data.dailyData.reduce(
        (sum: number, d: { claimed: number }) => sum + d.claimed, 0
      );
      expect(totalClaimed).toBe(0);
    });
  });

  describe('Conversion Rate', () => {
    it('should calculate conversion rate correctly', async () => {
      const userId = 'sales-001';
      const yesterday = getDateISO(-1);

      mockLeadsService.getAllLeads.mockResolvedValue([
        createSampleLead({ salesOwnerId: userId, status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 3, salesOwnerId: userId, status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 4, salesOwnerId: userId, status: 'closed', date: yesterday, closedAt: yesterday }),
        createSampleLead({ rowNumber: 5, salesOwnerId: userId, status: 'closed', date: yesterday, closedAt: yesterday }),
      ]);

      const req = createMockRequest({ query: { userId, days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const yesterdayData = response.data.dailyData.find(
        (d: { date: string }) => d.date === getDateKey(-1)
      );

      // 4 claimed, 2 closed = 50% conversion
      expect(yesterdayData.conversionRate).toBe(50);
    });

    it('should return 0 conversion rate when no leads claimed', async () => {
      mockLeadsService.getAllLeads.mockResolvedValue([]);

      const req = createMockRequest({ query: { userId: 'sales-001', days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      response.data.dailyData.forEach((day: { conversionRate: number }) => {
        expect(day.conversionRate).toBe(0);
      });
    });
  });

  describe('Period Handling', () => {
    it('should return correct number of days for 7-day period', async () => {
      const req = createMockRequest({ query: { userId: 'sales-001', days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.dailyData).toHaveLength(7);
      expect(response.data.period).toBe(7);
    });

    it('should return correct number of days for 30-day period (default)', async () => {
      const req = createMockRequest({ query: { userId: 'sales-001' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.dailyData).toHaveLength(30);
      expect(response.data.period).toBe(30);
    });

    it('should return correct number of days for 90-day period', async () => {
      const req = createMockRequest({ query: { userId: 'sales-001', days: '90' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.dailyData).toHaveLength(90);
      expect(response.data.period).toBe(90);
    });

    it('should sort daily data by date ascending', async () => {
      const req = createMockRequest({ query: { userId: 'sales-001', days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const dates = response.data.dailyData.map((d: { date: string }) => d.date);

      // Check dates are sorted ascending
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] > dates[i - 1]).toBe(true);
      }
    });
  });

  describe('Sales Member Info', () => {
    it('should include sales member name when found', async () => {
      mockSalesTeamService.getSalesTeamMember.mockResolvedValue({
        name: 'John Smith',
        email: 'john@eneos.co.th',
        phone: '0891234567',
      });

      const req = createMockRequest({ query: { userId: 'sales-001', days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.name).toBe('John Smith');
    });

    it('should return "Unknown" when sales member not found', async () => {
      mockSalesTeamService.getSalesTeamMember.mockResolvedValue(null);

      const req = createMockRequest({ query: { userId: 'nonexistent-user', days: '7' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.name).toBe('Unknown');
    });
  });

  describe('Error Handling', () => {
    it('should handle getAllLeads error gracefully with empty data', async () => {
      // Note: getAllLeads() catches errors internally and returns empty array (graceful degradation)
      mockLeadsService.getAllLeads.mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({ query: { userId: 'sales-001' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getSalesPerformanceTrend(req, res, next);

      // Should return 200 with zero values (graceful degradation)
      expect(res.status).toHaveBeenCalledWith(200);
      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);

      // All days should have 0 values
      const totalClaimed = response.data.dailyData.reduce(
        (sum: number, d: { claimed: number }) => sum + d.claimed, 0
      );
      expect(totalClaimed).toBe(0);
    });
  });
});
