/**
 * Activity Log Controller Tests
 * Tests for GET /api/admin/activity-log endpoint (Story 7-7)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { AdminApiResponse } from '../../../types/admin.types.js';
import type { ActivityLogResponse } from '../../../types/admin.types.js';

// Hoisted mocks
const { mockStatusHistoryService } = vi.hoisted(() => {
  return {
    mockStatusHistoryService: {
      getAllStatusHistory: vi.fn(),
    },
  };
});

vi.mock('../../../services/status-history.service.js', () => ({
  statusHistoryService: mockStatusHistoryService,
}));

import { getActivityLog } from '../../../controllers/admin/activity-log.controller.js';

describe('Activity Log Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  // Mock LeadRow data (what service returns)
  const mockLeadRows = {
    lead_abc123: {
      rowNumber: 5,
      version: 1,
      date: '2026-01-19',
      customerName: 'คุณสมชาย',
      email: 'somchai@test.co.th',
      phone: '0812345678',
      company: 'บริษัท เทสต์ จำกัด',
      industryAI: 'Manufacturing',
      website: 'https://test.co.th',
      capital: '5,000,000 บาท',
      status: 'contacted' as const,
      salesOwnerId: 'Uabc123xyz',
      salesOwnerName: 'สมชาย ใจดี',
      campaignId: 'campaign_001',
      campaignName: 'Campaign Test',
      emailSubject: 'Test Subject',
      source: 'brevo',
      leadId: 'lead_001',
      eventId: 'evt_001',
      clickedAt: '2026-01-19T10:00:00Z',
      talkingPoint: 'ENEOS has premium lubricants',
      closedAt: null,
      lostAt: null,
      unreachableAt: null,
      leadSource: 'email',
      jobTitle: 'Manager',
      city: 'Bangkok',
      leadUUID: 'lead_abc123',
      createdAt: '2026-01-19T10:00:00Z',
      updatedAt: '2026-01-19T10:30:00Z',
      contactedAt: '2026-01-19T10:30:00Z',
      juristicId: '0123456789012',
      dbdSector: 'MFG-A',
      province: 'กรุงเทพมหานคร',
      fullAddress: '123 ถนนทดสอบ เขตบางรัก กรุงเทพฯ 10500',
    },
    lead_def456: {
      rowNumber: 8,
      version: 1,
      date: '2026-01-19',
      customerName: 'คุณสมหญิง',
      email: 'somying@example.co.th',
      phone: '0898765432',
      company: 'บริษัท ตัวอย่าง จำกัด',
      industryAI: 'Trading',
      website: 'https://example.co.th',
      capital: '10,000,000 บาท',
      status: 'closed' as const,
      salesOwnerId: 'Udef456uvw',
      salesOwnerName: 'สมหญิง รักดี',
      campaignId: 'campaign_002',
      campaignName: 'Campaign Example',
      emailSubject: 'Example Subject',
      source: 'brevo',
      leadId: 'lead_002',
      eventId: 'evt_002',
      clickedAt: '2026-01-19T08:00:00Z',
      talkingPoint: 'ENEOS quality oils for trading',
      closedAt: '2026-01-19T09:00:00Z',
      lostAt: null,
      unreachableAt: null,
      leadSource: 'email',
      jobTitle: 'CEO',
      city: 'Chiang Mai',
      leadUUID: 'lead_def456',
      createdAt: '2026-01-19T08:00:00Z',
      updatedAt: '2026-01-19T09:00:00Z',
      contactedAt: '2026-01-19T08:30:00Z',
      juristicId: '0987654321098',
      dbdSector: 'TRD-B',
      province: 'เชียงใหม่',
      fullAddress: '456 ถนนตัวอย่าง เมืองเชียงใหม่ 50200',
    },
    lead_ghi789: {
      rowNumber: 12,
      version: 1,
      date: '2026-01-18',
      customerName: 'คุณทดสอบ',
      email: 'test@test.co.th',
      phone: '0801234567',
      company: 'บริษัท ทดสอบ จำกัด',
      industryAI: 'Construction',
      website: null,
      capital: null,
      status: 'new' as const,
      salesOwnerId: null,
      salesOwnerName: null,
      campaignId: 'campaign_003',
      campaignName: 'Campaign Test 3',
      emailSubject: 'Test Subject 3',
      source: 'brevo',
      leadId: 'lead_003',
      eventId: 'evt_003',
      clickedAt: '2026-01-18T15:00:00Z',
      talkingPoint: null,
      closedAt: null,
      lostAt: null,
      unreachableAt: null,
      leadSource: 'email',
      jobTitle: null,
      city: null,
      leadUUID: 'lead_ghi789',
      createdAt: '2026-01-18T15:00:00Z',
      updatedAt: null,
      contactedAt: null,
      juristicId: null,
      dbdSector: null,
      province: null,
      fullAddress: null,
    },
  };

  const mockActivityEntries = [
    {
      id: 'lead_abc123_2026-01-19T10:30:00Z',
      leadUUID: 'lead_abc123',
      rowNumber: 5,
      companyName: 'บริษัท เทสต์ จำกัด',
      status: 'contacted' as const,
      changedById: 'Uabc123xyz',
      changedByName: 'สมชาย ใจดี',
      timestamp: '2026-01-19T10:30:00Z',
      notes: null,
      lead: mockLeadRows.lead_abc123,
    },
    {
      id: 'lead_def456_2026-01-19T09:00:00Z',
      leadUUID: 'lead_def456',
      rowNumber: 8,
      companyName: 'บริษัท ตัวอย่าง จำกัด',
      status: 'closed' as const,
      changedById: 'Udef456uvw',
      changedByName: 'สมหญิง รักดี',
      timestamp: '2026-01-19T09:00:00Z',
      notes: 'ปิดการขายสำเร็จ',
      lead: mockLeadRows.lead_def456,
    },
    {
      id: 'lead_ghi789_2026-01-18T15:00:00Z',
      leadUUID: 'lead_ghi789',
      rowNumber: 12,
      companyName: 'บริษัท ทดสอบ จำกัด',
      status: 'new' as const,
      changedById: 'System',
      changedByName: 'System',
      timestamp: '2026-01-18T15:00:00Z',
      notes: 'Lead created from Brevo webhook',
      lead: mockLeadRows.lead_ghi789,
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 3,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatusHistoryService.getAllStatusHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        from: undefined,
        to: undefined,
        status: undefined,
        changedBy: undefined,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            entries: expect.arrayContaining([
              expect.objectContaining({
                id: 'lead_abc123_2026-01-19T10:30:00Z',
                leadUUID: 'lead_abc123',
                rowNumber: 5,
                companyName: 'บริษัท เทสต์ จำกัด',
                status: 'contacted',
                lead: expect.objectContaining({
                  row: 5,
                  leadUuid: 'lead_abc123',
                  company: 'บริษัท เทสต์ จำกัด',
                  customerName: 'คุณสมชาย',
                  email: 'somchai@test.co.th',
                  // Verify grounding fields are transformed
                  juristicId: '0123456789012',
                  dbdSector: 'MFG-A',
                  province: 'กรุงเทพมหานคร',
                  fullAddress: '123 ถนนทดสอบ เขตบางรัก กรุงเทพฯ 10500',
                }),
              }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 20,
              total: 3,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            }),
            filters: expect.objectContaining({
              changedByOptions: mockChangedByOptions,
            }),
          }),
        })
      );
    });

    it('should handle custom pagination params', async () => {
      mockReq.query = { page: '2', limit: '10' };
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 25,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatusHistoryService.getAllStatusHistory).toHaveBeenCalledWith({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 3,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatusHistoryService.getAllStatusHistory).toHaveBeenCalledWith({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: [mockActivityEntries[0]],
        total: 1,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatusHistoryService.getAllStatusHistory).toHaveBeenCalledWith({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries.slice(0, 2),
        total: 2,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatusHistoryService.getAllStatusHistory).toHaveBeenCalledWith({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: [mockActivityEntries[0]],
        total: 1,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatusHistoryService.getAllStatusHistory).toHaveBeenCalledWith({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: [mockActivityEntries[2]],
        total: 1,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatusHistoryService.getAllStatusHistory).toHaveBeenCalledWith({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: [mockActivityEntries[0]],
        total: 1,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatusHistoryService.getAllStatusHistory).toHaveBeenCalledWith({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
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
      mockStatusHistoryService.getAllStatusHistory.mockRejectedValue(error);

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should transform LeadRow to LeadItem in ALL entries', async () => {
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
        entries: mockActivityEntries,
        total: 3,
        changedByOptions: mockChangedByOptions,
      });

      await getActivityLog(mockReq as Request, mockRes as Response, mockNext);

      // Type-safe mock call access
      const jsonMock = mockRes.json as unknown as vi.Mock<[AdminApiResponse<ActivityLogResponse>]>;
      const responseData = jsonMock.mock.calls[0][0];

      // Verify ALL entries are transformed (not just first)
      expect(responseData.data.entries).toHaveLength(3);

      responseData.data.entries.forEach((entry: any, index: number) => {
        expect(entry.lead).toBeDefined();
        expect(entry.lead).toHaveProperty('row');
        expect(entry.lead).toHaveProperty('company');
        expect(entry.lead).toHaveProperty('industry'); // LeadItem field
        expect(entry.lead).toHaveProperty('owner'); // LeadItem structure
        // Grounding fields in all entries
        expect(entry.lead).toHaveProperty('juristicId');
        expect(entry.lead).toHaveProperty('dbdSector');
        expect(entry.lead).toHaveProperty('province');
        expect(entry.lead).toHaveProperty('fullAddress');
      });

      // Verify specific first entry details
      const firstEntry = responseData.data.entries[0];
      expect(firstEntry.lead).toMatchObject({
        row: 5,
        leadUuid: 'lead_abc123',
        company: 'บริษัท เทสต์ จำกัด',
        customerName: 'คุณสมชาย',
        email: 'somchai@test.co.th',
        juristicId: '0123456789012',
        dbdSector: 'MFG-A',
        province: 'กรุงเทพมหานคร',
        fullAddress: '123 ถนนทดสอบ เขตบางรัก กรุงเทพฯ 10500',
      });
    });

    it('should include pagination metadata correctly', async () => {
      // Test with 50 total items, page 2, limit 20
      mockReq.query = { page: '2', limit: '20' };
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
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
      mockStatusHistoryService.getAllStatusHistory.mockResolvedValue({
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
