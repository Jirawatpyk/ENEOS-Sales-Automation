/**
 * Activity Log Controller Tests
 * Tests for GET /api/admin/activity-log endpoint (Story 7-7)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Hoisted mocks
const { mockSheetsService } = vi.hoisted(() => {
  return {
    mockSheetsService: {
      getAllStatusHistory: vi.fn(),
    },
  };
});

vi.mock('../../../services/sheets.service.js', () => ({
  sheetsService: mockSheetsService,
}));

import { getActivityLog } from '../../../controllers/admin/activity-log.controller.js';

describe('Activity Log Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockActivityEntries = [
    {
      id: 'lead_abc123_2026-01-19T10:30:00Z',
      leadUUID: 'lead_abc123',
      rowNumber: 5,
      companyName: 'บริษัท เทสต์ จำกัด',
      status: 'contacted',
      changedById: 'Uabc123xyz',
      changedByName: 'สมชาย ใจดี',
      timestamp: '2026-01-19T10:30:00Z',
      notes: null,
    },
    {
      id: 'lead_def456_2026-01-19T09:00:00Z',
      leadUUID: 'lead_def456',
      rowNumber: 8,
      companyName: 'บริษัท ตัวอย่าง จำกัด',
      status: 'closed',
      changedById: 'Udef456uvw',
      changedByName: 'สมหญิง รักดี',
      timestamp: '2026-01-19T09:00:00Z',
      notes: 'ปิดการขายสำเร็จ',
    },
    {
      id: 'lead_ghi789_2026-01-18T15:00:00Z',
      leadUUID: 'lead_ghi789',
      rowNumber: 12,
      companyName: 'บริษัท ทดสอบ จำกัด',
      status: 'new',
      changedById: 'System',
      changedByName: 'System',
      timestamp: '2026-01-18T15:00:00Z',
      notes: 'Lead created from Brevo webhook',
    },
  ];

  const mockChangedByOptions = [
    { id: 'Uabc123xyz', name: 'สมชาย ใจดี' },
    { id: 'Udef456uvw', name: 'สมหญิง รักดี' },
    { id: 'System', name: 'System' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { email: 'admin@eneos.co.th', name: 'Admin', role: 'admin', googleId: '123' },
      requestId: 'test-request-id',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('GET /api/admin/activity-log (getActivityLog)', () => {
    it('should return activity log with default pagination', async () => {
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 3,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        from: undefined,
        to: undefined,
        status: undefined,
        changedBy: undefined,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          entries: mockActivityEntries,
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
          filters: {
            changedByOptions: mockChangedByOptions,
          },
        },
      });
    });

    it('should handle custom pagination params', async () => {
      mockReq.query = { page: '2', limit: '10' };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 25,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        from: undefined,
        to: undefined,
        status: undefined,
        changedBy: undefined,
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            pagination: expect.objectContaining({
              page: 2,
              limit: 10,
              total: 25,
              totalPages: 3,
              hasNext: true,
              hasPrev: true,
            }),
          }),
        })
      );
    });

    it('should filter by date range (from/to)', async () => {
      mockReq.query = {
        from: '2026-01-18',
        to: '2026-01-19',
      };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 3,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        from: '2026-01-18',
        to: '2026-01-19',
        status: undefined,
        changedBy: undefined,
      });
    });

    it('should filter by single status', async () => {
      mockReq.query = { status: 'contacted' };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: [mockActivityEntries[0]],
        total: 1,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        from: undefined,
        to: undefined,
        status: ['contacted'],
        changedBy: undefined,
      });
    });

    it('should filter by multiple statuses', async () => {
      mockReq.query = { status: 'contacted,closed' };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries.slice(0, 2),
        total: 2,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        from: undefined,
        to: undefined,
        status: ['contacted', 'closed'],
        changedBy: undefined,
      });
    });

    it('should filter by changedBy (sales person)', async () => {
      mockReq.query = { changedBy: 'Uabc123xyz' };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: [mockActivityEntries[0]],
        total: 1,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        from: undefined,
        to: undefined,
        status: undefined,
        changedBy: 'Uabc123xyz',
      });
    });

    it('should filter by changedBy=System', async () => {
      mockReq.query = { changedBy: 'System' };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: [mockActivityEntries[2]],
        total: 1,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        from: undefined,
        to: undefined,
        status: undefined,
        changedBy: 'System',
      });
    });

    it('should combine multiple filters', async () => {
      mockReq.query = {
        page: '1',
        limit: '50',
        from: '2026-01-18',
        to: '2026-01-19',
        status: 'contacted,closed',
        changedBy: 'Uabc123xyz',
      };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: [mockActivityEntries[0]],
        total: 1,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        from: '2026-01-18',
        to: '2026-01-19',
        status: ['contacted', 'closed'],
        changedBy: 'Uabc123xyz',
      });
    });

    it('should return 400 for invalid status value', async () => {
      mockReq.query = { status: 'invalid_status' };

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('invalid_status'),
          }),
        })
      );
    });

    it('should return 400 for invalid page number', async () => {
      mockReq.query = { page: '-1' };

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for limit exceeding max', async () => {
      mockReq.query = { limit: '200' };

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return empty entries when no matching data', async () => {
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: [],
        total: 0,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          entries: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          filters: {
            changedByOptions: mockChangedByOptions,
          },
        },
      });
    });

    it('should pass errors to next middleware', async () => {
      const error = new Error('Sheets API error');
      mockSheetsService.getAllStatusHistory.mockRejectedValue(error);

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should include pagination metadata correctly', async () => {
      // Test with 50 total items, page 2, limit 20
      mockReq.query = { page: '2', limit: '20' };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 50,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: {
              page: 2,
              limit: 20,
              total: 50,
              totalPages: 3,
              hasNext: true,
              hasPrev: true,
            },
          }),
        })
      );
    });

    it('should return hasNext=false on last page', async () => {
      mockReq.query = { page: '3', limit: '20' };
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 50,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: expect.objectContaining({
              hasNext: false,
              hasPrev: true,
            }),
          }),
        })
      );
    });

    it('should include changedByOptions in response for filter dropdown', async () => {
      mockSheetsService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 3,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filters: {
              changedByOptions: mockChangedByOptions,
            },
          }),
        })
      );
    });
  });
});
