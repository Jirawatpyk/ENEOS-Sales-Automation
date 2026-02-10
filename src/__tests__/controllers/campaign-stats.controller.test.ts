/**
 * Campaign Stats Controller Tests
 * Story 5-2 Task 1.5: 20+ test cases for controller
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getCampaignStats,
  getCampaignById,
  getCampaignEvents,
} from '../../controllers/admin/campaign-stats.controller.js';

// ===========================================
// Mock Setup
// ===========================================

const mockCampaignStatsService = vi.hoisted(() => ({
  getAllCampaignStats: vi.fn(),
  getCampaignStatsById: vi.fn(),
  getCampaignEvents: vi.fn(),
}));

vi.mock('../../services/campaign-stats.service.js', () => ({
  getAllCampaignStats: mockCampaignStatsService.getAllCampaignStats,
  getCampaignStatsById: mockCampaignStatsService.getCampaignStatsById,
  getCampaignEvents: mockCampaignStatsService.getCampaignEvents,
}));

vi.mock('../../utils/logger.js', () => ({
  campaignLogger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// ===========================================
// Test Helpers
// ===========================================

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    params: {},
    user: { email: 'test@eneos.co.th', name: 'Test User', role: 'admin' },
    ...overrides,
  } as Request;
}

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

// ===========================================
// Mock Data
// ===========================================

const mockCampaignStatsItem = {
  campaignId: 100,
  campaignName: 'BMF2026 Launch',
  delivered: 1000,
  opened: 450,
  clicked: 120,
  uniqueOpens: 400,
  uniqueClicks: 100,
  openRate: 40,
  clickRate: 10,
  hardBounce: 0,
  softBounce: 0,
  unsubscribe: 0,
  spam: 0,
  firstEvent: '2026-01-15T10:00:00.000Z',
  lastUpdated: '2026-01-30T15:30:00.000Z',
};

const mockEventItem = {
  eventId: 1001,
  email: 'user@example.com',
  event: 'click',
  eventAt: '2026-01-30T10:00:00.000Z',
  url: 'https://example.com/promo',
};

const mockPagination = {
  page: 1,
  limit: 20,
  total: 5,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

// ===========================================
// Tests
// ===========================================

describe('campaign-stats.controller', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
  });

  // ===========================================
  // getCampaignStats Tests
  // ===========================================

  describe('getCampaignStats', () => {
    it('should return 200 with campaign stats on success', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [mockCampaignStatsItem],
        pagination: mockPagination,
      });

      await getCampaignStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          data: [mockCampaignStatsItem],
          pagination: mockPagination,
        },
      });
    });

    it('should pass pagination params to service', async () => {
      const req = createMockRequest({
        query: { page: '2', limit: '50' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: { ...mockPagination, page: 2, limit: 50 },
      });

      await getCampaignStats(req, res, mockNext);

      expect(mockCampaignStatsService.getAllCampaignStats).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 50,
        })
      );
    });

    it('should pass search param to service', async () => {
      const req = createMockRequest({
        query: { search: 'BMF' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignStats(req, res, mockNext);

      expect(mockCampaignStatsService.getAllCampaignStats).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'BMF',
        })
      );
    });

    it('should pass date range params to service', async () => {
      const req = createMockRequest({
        query: { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignStats(req, res, mockNext);

      expect(mockCampaignStatsService.getAllCampaignStats).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        })
      );
    });

    it('should pass sort params to service', async () => {
      const req = createMockRequest({
        query: { sortBy: 'Delivered', sortOrder: 'asc' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignStats(req, res, mockNext);

      expect(mockCampaignStatsService.getAllCampaignStats).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'Delivered',
          sortOrder: 'asc',
        })
      );
    });

    it('should return 400 for invalid sortBy', async () => {
      const req = createMockRequest({
        query: { sortBy: 'Invalid_Field' },
      });
      const res = createMockResponse();

      await getCampaignStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should return 400 for invalid page number', async () => {
      const req = createMockRequest({
        query: { page: '0' },
      });
      const res = createMockResponse();

      await getCampaignStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next on service error', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Service error');

      mockCampaignStatsService.getAllCampaignStats.mockRejectedValue(error);

      await getCampaignStats(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ===========================================
  // getCampaignById Tests
  // ===========================================

  describe('getCampaignById', () => {
    it('should return 200 with campaign on success', async () => {
      const req = createMockRequest({
        params: { id: '100' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(mockCampaignStatsItem);

      await getCampaignById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCampaignStatsItem,
      });
    });

    it('should return 404 when campaign not found', async () => {
      const req = createMockRequest({
        params: { id: '999' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(null);

      await getCampaignById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
          }),
        })
      );
    });

    it('should return 400 for invalid campaign ID', async () => {
      const req = createMockRequest({
        params: { id: 'abc' },
      });
      const res = createMockResponse();

      await getCampaignById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should return 400 for negative campaign ID', async () => {
      const req = createMockRequest({
        params: { id: '-1' },
      });
      const res = createMockResponse();

      await getCampaignById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next on service error', async () => {
      const req = createMockRequest({
        params: { id: '100' },
      });
      const res = createMockResponse();
      const error = new Error('Service error');

      mockCampaignStatsService.getCampaignStatsById.mockRejectedValue(error);

      await getCampaignById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ===========================================
  // getCampaignEvents Tests
  // ===========================================

  describe('getCampaignEvents', () => {
    it('should return 200 with events on success', async () => {
      const req = createMockRequest({
        params: { id: '100' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(mockCampaignStatsItem);
      mockCampaignStatsService.getCampaignEvents.mockResolvedValue({
        data: [mockEventItem],
        pagination: { ...mockPagination, limit: 50 },
      });

      await getCampaignEvents(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          data: [mockEventItem],
          pagination: expect.objectContaining({ limit: 50 }),
        },
      });
    });

    it('should pass pagination params to service', async () => {
      const req = createMockRequest({
        params: { id: '100' },
        query: { page: '2', limit: '25' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(mockCampaignStatsItem);
      mockCampaignStatsService.getCampaignEvents.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignEvents(req, res, mockNext);

      expect(mockCampaignStatsService.getCampaignEvents).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          page: 2,
          limit: 25,
        })
      );
    });

    it('should pass event filter to service', async () => {
      const req = createMockRequest({
        params: { id: '100' },
        query: { event: 'click' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(mockCampaignStatsItem);
      mockCampaignStatsService.getCampaignEvents.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignEvents(req, res, mockNext);

      expect(mockCampaignStatsService.getCampaignEvents).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          event: 'click',
        })
      );
    });

    it('should pass date range params to service', async () => {
      const req = createMockRequest({
        params: { id: '100' },
        query: { dateFrom: '2026-01-15', dateTo: '2026-01-30' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(mockCampaignStatsItem);
      mockCampaignStatsService.getCampaignEvents.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignEvents(req, res, mockNext);

      expect(mockCampaignStatsService.getCampaignEvents).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          dateFrom: '2026-01-15',
          dateTo: '2026-01-30',
        })
      );
    });

    it('should return 404 when campaign not found', async () => {
      const req = createMockRequest({
        params: { id: '999' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(null);

      await getCampaignEvents(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
          }),
        })
      );
    });

    it('should return 400 for invalid campaign ID', async () => {
      const req = createMockRequest({
        params: { id: 'invalid' },
      });
      const res = createMockResponse();

      await getCampaignEvents(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid event type', async () => {
      const req = createMockRequest({
        params: { id: '100' },
        query: { event: 'bounce' },
      });
      const res = createMockResponse();

      await getCampaignEvents(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should call next on service error', async () => {
      const req = createMockRequest({
        params: { id: '100' },
      });
      const res = createMockResponse();
      const error = new Error('Service error');

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(mockCampaignStatsItem);
      mockCampaignStatsService.getCampaignEvents.mockRejectedValue(error);

      await getCampaignEvents(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ===========================================
  // TEA Guardrail Tests - Story 5-2 (Automate)
  // ===========================================

  describe('Guardrail: getCampaignStats Edge Cases', () => {
    it('[P1] should handle empty search parameter (returns all)', async () => {
      const req = createMockRequest({
        query: { search: '' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [mockCampaignStatsItem],
        pagination: mockPagination,
      });

      await getCampaignStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      // Empty search should pass to service (service decides behavior)
      expect(mockCampaignStatsService.getAllCampaignStats).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '',
        })
      );
    });

    it('[P1] should handle service returning empty data array', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: { ...mockPagination, total: 0, totalPages: 1 },
      });

      await getCampaignStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          data: [],
          pagination: expect.objectContaining({ total: 0 }),
        },
      });
    });

    it('[P2] should pass all query params simultaneously', async () => {
      const req = createMockRequest({
        query: {
          page: '2',
          limit: '10',
          search: 'test',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
          sortBy: 'Delivered',
          sortOrder: 'asc',
        },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignStats(req, res, mockNext);

      expect(mockCampaignStatsService.getAllCampaignStats).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'test',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        sortBy: 'Delivered',
        sortOrder: 'asc',
      });
    });
  });

  describe('Guardrail: getCampaignById Edge Cases', () => {
    it('[P1] should return 400 for zero campaign ID', async () => {
      const req = createMockRequest({
        params: { id: '0' },
      });
      const res = createMockResponse();

      await getCampaignById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('[P2] should handle very large campaign ID', async () => {
      const req = createMockRequest({
        params: { id: '999999999' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(null);

      await getCampaignById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Guardrail: getCampaignEvents Edge Cases', () => {
    it('[P1] should handle campaign exists but has no events', async () => {
      const req = createMockRequest({
        params: { id: '100' },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(mockCampaignStatsItem);
      mockCampaignStatsService.getCampaignEvents.mockResolvedValue({
        data: [],
        pagination: { ...mockPagination, total: 0, totalPages: 1 },
      });

      await getCampaignEvents(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          data: [],
          pagination: expect.objectContaining({ total: 0 }),
        },
      });
    });

    it('[P2] should pass all filter params to service', async () => {
      const req = createMockRequest({
        params: { id: '100' },
        query: {
          page: '3',
          limit: '25',
          event: 'click',
          dateFrom: '2026-01-15',
          dateTo: '2026-01-30',
        },
      });
      const res = createMockResponse();

      mockCampaignStatsService.getCampaignStatsById.mockResolvedValue(mockCampaignStatsItem);
      mockCampaignStatsService.getCampaignEvents.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignEvents(req, res, mockNext);

      expect(mockCampaignStatsService.getCampaignEvents).toHaveBeenCalledWith(
        100,
        {
          page: 3,
          limit: 25,
          event: 'click',
          dateFrom: '2026-01-15',
          dateTo: '2026-01-30',
        }
      );
    });
  });

  describe('Guardrail: Request User Context', () => {
    it('[P2] should not crash when req.user is undefined', async () => {
      const req = createMockRequest({
        user: undefined,
      });
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      // Should not throw even if user is undefined
      await getCampaignStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('[P2] should not crash when req.user.email is undefined', async () => {
      const req = createMockRequest({
        user: { name: 'Test', role: 'admin' } as any, // Missing email
      });
      const res = createMockResponse();

      mockCampaignStatsService.getAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await getCampaignStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
