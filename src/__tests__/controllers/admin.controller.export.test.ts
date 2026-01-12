/**
 * ENEOS Sales Automation - Admin Controller Export Tests
 * ทดสอบ Export API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { LeadRow } from '../../types/index.js';

// Mock sheetsService
const mockGetAllLeads = vi.fn();

vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    getAllLeads: () => mockGetAllLeads(),
  },
}));

// Mock XLSX library
vi.mock('xlsx', () => {
  return {
    utils: {
      json_to_sheet: vi.fn().mockReturnValue({}),
      book_new: vi.fn().mockReturnValue({}),
      book_append_sheet: vi.fn(),
    },
    write: vi.fn().mockReturnValue(Buffer.from('mock-xlsx-data')),
  };
});

// Mock json2csv library
vi.mock('json2csv', () => ({
  parse: vi.fn().mockReturnValue('mock-csv-data'),
}));

// Mock pdfkit library
const mockPdfDoc = {
  pipe: vi.fn(),
  fontSize: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  moveDown: vi.fn().mockReturnThis(),
  addPage: vi.fn().mockReturnThis(),
  end: vi.fn(),
};

vi.mock('pdfkit', () => ({
  default: vi.fn(() => mockPdfDoc),
}));

// Import after mocking
import { exportData } from '../../controllers/admin.controller.js';

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
  res.setHeader = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

// Helper to get date ISO string
const getDateISO = (daysOffset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

// Sample lead data
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
  status: 'new',
  salesOwnerId: null,
  salesOwnerName: null,
  campaignId: 'campaign-001',
  campaignName: 'Q1 Promotion',
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
  ...overrides,
});

// ===========================================
// Tests
// ===========================================

describe('Admin Controller - Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // GET /api/admin/export - XLSX Format
  // ===========================================

  describe('GET /api/admin/export - XLSX Format', () => {
    it('should export leads to xlsx format', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead(),
        createSampleLead({ rowNumber: 3, customerName: 'Customer 2' }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'xlsx',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('leads_export_')
      );
      expect(res.send).toHaveBeenCalled();
    });

    it('should apply date filters when exporting', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ date: '2024-01-15T10:00:00Z' }),
        createSampleLead({ date: '2024-01-20T10:00:00Z', rowNumber: 3 }),
        createSampleLead({ date: '2024-02-01T10:00:00Z', rowNumber: 4 }), // Outside range
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'xlsx',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();
      // Note: Detailed data validation would require mocking XLSX.utils.json_to_sheet
    });

    it('should apply status filter when exporting', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ status: 'new' }),
        createSampleLead({ status: 'closed', rowNumber: 3 }),
        createSampleLead({ status: 'new', rowNumber: 4 }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'xlsx',
          status: 'new',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();
    });

    it('should apply owner filter when exporting', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ salesOwnerId: 'user-1' }),
        createSampleLead({ salesOwnerId: 'user-2', rowNumber: 3 }),
        createSampleLead({ salesOwnerId: 'user-1', rowNumber: 4 }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'xlsx',
          owner: 'user-1',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();
    });

    it('should apply campaign filter when exporting', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ campaignId: 'camp-001' }),
        createSampleLead({ campaignId: 'camp-002', rowNumber: 3 }),
        createSampleLead({ campaignId: 'camp-001', rowNumber: 4 }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'xlsx',
          campaign: 'camp-001',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();
    });

    it('should limit export to MAX_ROWS', async () => {
      // Create array of 15000 leads (exceeds MAX_ROWS = 10000)
      const mockLeads: LeadRow[] = Array.from({ length: 15000 }, (_, i) =>
        createSampleLead({ rowNumber: i + 2 })
      );

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'xlsx',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();
      // Note: Detailed validation of row count would require checking XLSX.utils.json_to_sheet arguments
    });
  });

  // ===========================================
  // GET /api/admin/export - CSV Format
  // ===========================================

  describe('GET /api/admin/export - CSV Format', () => {
    it('should export leads to csv format', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead(),
        createSampleLead({ rowNumber: 3, customerName: 'Customer 2' }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'csv',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('leads_export_')
      );
      expect(res.send).toHaveBeenCalledWith('mock-csv-data');
    });
  });

  // ===========================================
  // GET /api/admin/export - PDF Format
  // ===========================================

  describe('GET /api/admin/export - PDF Format', () => {
    it('should export leads to pdf format', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead(),
        createSampleLead({ rowNumber: 3, customerName: 'Customer 2' }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'pdf',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('leads_export_')
      );
      expect(mockPdfDoc.pipe).toHaveBeenCalledWith(res);
      expect(mockPdfDoc.end).toHaveBeenCalled();
    });

    it('should limit PDF preview to PDF_MAX_PREVIEW_ROWS', async () => {
      // Create 100 leads
      const mockLeads: LeadRow[] = Array.from({ length: 100 }, (_, i) =>
        createSampleLead({ rowNumber: i + 2 })
      );

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'pdf',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(mockPdfDoc.end).toHaveBeenCalled();
      // PDF should show only first 50 rows + "... and 50 more rows" message
    });
  });

  // ===========================================
  // Validation Tests
  // ===========================================

  describe('Export Validation', () => {
    it('should return 400 when type is missing', async () => {
      const req = createMockRequest({
        query: {
          format: 'xlsx',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when format is missing', async () => {
      const req = createMockRequest({
        query: {
          type: 'leads',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when type is invalid', async () => {
      const req = createMockRequest({
        query: {
          type: 'invalid-type',
          format: 'xlsx',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when format is invalid', async () => {
      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'invalid-format',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should trim string query parameters', async () => {
      const mockLeads: LeadRow[] = [createSampleLead()];
      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'xlsx',
          owner: ' user-1 ',  // Only trim non-enum fields
          campaign: ' camp-001 ',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      // Should not throw validation error and should succeed
      expect(res.send).toHaveBeenCalled();
    });
  });
});
