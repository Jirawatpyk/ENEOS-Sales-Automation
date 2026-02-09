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

vi.mock('../../services/leads.service.js', () => ({
  getAllLeads: () => mockGetAllLeads(),
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
  // Table drawing methods
  fillColor: vi.fn().mockReturnThis(),
  rect: vi.fn().mockReturnThis(),
  fill: vi.fn().mockReturnThis(),
  strokeColor: vi.fn().mockReturnThis(),
  lineWidth: vi.fn().mockReturnThis(),
  stroke: vi.fn().mockReturnThis(),
  moveTo: vi.fn().mockReturnThis(),
  lineTo: vi.fn().mockReturnThis(),
  // Clipping methods
  save: vi.fn().mockReturnThis(),
  restore: vi.fn().mockReturnThis(),
  clip: vi.fn().mockReturnThis(),
  y: 100, // Mock current Y position
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
  leadSource: null,
  jobTitle: null,
  city: null,
  leadUUID: null,
  createdAt: null,
  updatedAt: null,
  contactedAt: null,
  juristicId: null,
  dbdSector: null,
  province: null,
  fullAddress: null,
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
        expect.stringMatching(/^attachment; filename=leads_export_\d{4}-\d{2}-\d{2}\.xlsx$/)
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
        expect.stringMatching(/^attachment; filename=leads_export_\d{4}-\d{2}-\d{2}\.csv$/)
      );
      // Story 0-15: UTF-8 BOM added to CSV export
      expect(res.send).toHaveBeenCalledWith('\uFEFF' + 'mock-csv-data');
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
        expect.stringMatching(/^attachment; filename=leads_export_\d{4}-\d{2}-\d{2}\.pdf$/)
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

  // ===========================================
  // Story 0-15: New Export Column Tests
  // ===========================================

  describe('Story 0-15: Export with Grounding Fields', () => {
    it('should export all 23 columns in correct order', async () => {
      const { default: ExcelJS } = await import('exceljs');

      const mockLeads: LeadRow[] = [
        createSampleLead({
          rowNumber: 2,
          company: 'AJINOMOTO CO., (THAILAND) LTD.',
          dbdSector: 'F&B-M',
          juristicId: '0105536049046',
          province: 'กรุงเทพมหานคร',
          fullAddress: '123 ถนนพระราม 9',
          leadSource: 'Google Ads',
          jobTitle: 'Purchasing Manager',
          city: 'Bangkok',
          contactedAt: getDateISO(),
        }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { type: 'leads', format: 'xlsx' } });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();
      const buffer = (res.send as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Parse Excel buffer and verify columns
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet('Leads');

      const headers = worksheet!.getRow(1).values as (string | undefined)[];
      expect(headers).toEqual([
        undefined, // Excel 1-indexed
        'Row',
        'Company',
        'DBD Sector',
        'Industry',
        'Juristic ID',
        'Capital',
        'Location',
        'Full Address',
        'Contact Name',
        'Phone',
        'Email',
        'Job Title',
        'Website',
        'Lead Source',
        'Status',
        'Sales Owner',
        'Campaign',
        'Source',
        'Talking Point',
        'Created Date',
        'Clicked At',
        'Contacted At',
        'Closed At',
      ]);

      const dataRow = worksheet!.getRow(2).values as (string | number | null | undefined)[];
      expect(dataRow[3]).toBe('F&B-M'); // DBD Sector column
      expect(dataRow[5]).toBe('0105536049046'); // Juristic ID column
      expect(dataRow[7]).toBe('กรุงเทพมหานคร'); // Location (province prioritized)
    });

    it('should handle null grounding fields with empty strings', async () => {
      const { default: ExcelJS } = await import('exceljs');

      const mockLeads: LeadRow[] = [
        createSampleLead({
          rowNumber: 2,
          company: 'Test Company',
          dbdSector: null, // Explicitly null
          juristicId: null,
          province: null,
          fullAddress: null,
          leadSource: null,
          jobTitle: null,
          city: null,
        }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { type: 'leads', format: 'xlsx' } });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();
      const buffer = (res.send as ReturnType<typeof vi.fn>).mock.calls[0][0];

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet('Leads');

      const dataRow = worksheet!.getRow(2).values as (string | number | null | undefined)[];
      expect(dataRow[3]).toBe(''); // DBD Sector should be empty string, not null
      expect(dataRow[5]).toBe(''); // Juristic ID should be empty string
      expect(dataRow[7]).toBe(''); // Location should be empty string
      expect(dataRow[8]).toBe(''); // Full Address should be empty string
      expect(dataRow[12]).toBe(''); // Job Title should be empty string
      expect(dataRow[14]).toBe(''); // Lead Source should be empty string
    });

    it('should prioritize province over city in Location column', async () => {
      const { default: ExcelJS } = await import('exceljs');

      const testCases = [
        {
          name: 'Both province and city',
          province: 'กรุงเทพมหานคร',
          city: 'Bangkok',
          expected: 'กรุงเทพมหานคร', // Province wins
        },
        {
          name: 'Only city',
          province: null,
          city: 'Bangkok',
          expected: 'Bangkok',
        },
        {
          name: 'Only province',
          province: 'เชียงใหม่',
          city: null,
          expected: 'เชียงใหม่',
        },
        {
          name: 'Neither',
          province: null,
          city: null,
          expected: '',
        },
      ];

      for (const testCase of testCases) {
        const mockLeads: LeadRow[] = [
          createSampleLead({
            rowNumber: 2,
            province: testCase.province,
            city: testCase.city,
          }),
        ];

        mockGetAllLeads.mockResolvedValue(mockLeads);

        const req = createMockRequest({ query: { type: 'leads', format: 'xlsx' } });
        const res = createMockResponse();
        const next = createMockNext();

        await exportData(req, res, next);

        const buffer = (res.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet('Leads');

        const dataRow = worksheet!.getRow(2).values as (string | number | null | undefined)[];
        expect(dataRow[7]).toBe(testCase.expected);
      }
    });

    it('should filter by status=claimed', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ rowNumber: 2, status: 'new', salesOwnerId: null }),
        createSampleLead({ rowNumber: 3, status: 'contacted', salesOwnerId: 'sales-001' }),
        createSampleLead({ rowNumber: 4, status: 'closed', salesOwnerId: 'sales-002' }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { type: 'leads', format: 'xlsx', status: 'claimed' } });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();

      // Verify filterByStatus was called correctly via checking exported data count
      const { default: ExcelJS } = await import('exceljs');
      const buffer = (res.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet('Leads');

      // Should have 2 claimed leads (row 3 and 4) + header row
      expect(worksheet!.rowCount).toBe(3); // Header + 2 data rows
    });

    it('should filter by status=contacted (test alternative status)', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ rowNumber: 2, status: 'new', salesOwnerId: null }),
        createSampleLead({ rowNumber: 3, status: 'contacted', salesOwnerId: 'sales-001' }),
        createSampleLead({ rowNumber: 4, status: 'contacted', salesOwnerId: null }),
        createSampleLead({ rowNumber: 5, status: 'closed', salesOwnerId: 'sales-002' }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { type: 'leads', format: 'xlsx', status: 'contacted' } });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();

      const { default: ExcelJS } = await import('exceljs');
      const buffer = (res.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet('Leads');

      // Should have rows 3, 4 (contacted) + header
      expect(worksheet!.rowCount).toBe(3); // Header + 2 data rows
    });

    it('should include new fields in CSV export', async () => {
      const { parse } = await import('json2csv');

      const mockLeads: LeadRow[] = [
        createSampleLead({
          rowNumber: 2,
          dbdSector: 'F&B-M',
          juristicId: '0105536049046',
          leadSource: 'Google Ads',
        }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { type: 'leads', format: 'csv' } });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(res.send).toHaveBeenCalled();

      // Verify parse was called with data containing new fields
      expect(parse).toHaveBeenCalled();
      const parseArgs = (parse as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Check first row has new column keys
      expect(parseArgs[0]).toHaveProperty('DBD Sector');
      expect(parseArgs[0]).toHaveProperty('Juristic ID');
      expect(parseArgs[0]).toHaveProperty('Location');
      expect(parseArgs[0]).toHaveProperty('Full Address');
      expect(parseArgs[0]).toHaveProperty('Job Title');
      expect(parseArgs[0]).toHaveProperty('Lead Source');
      expect(parseArgs[0]).toHaveProperty('Contacted At');
    });

    it('should include new fields in PDF export', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({
          rowNumber: 2,
          company: 'AJINOMOTO',
          dbdSector: 'F&B-M',
          juristicId: '0105536049046',
          customerName: 'John Doe',
          salesOwnerName: 'Sales Person',
        }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { type: 'leads', format: 'pdf' } });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      expect(mockPdfDoc.text).toHaveBeenCalled();

      // Get all text calls and join them to check all content
      const textCalls = (mockPdfDoc.text as ReturnType<typeof vi.fn>).mock.calls;
      const allText = textCalls.map(call => call[0]).join('\n');

      // Verify table headers and data are present
      expect(allText).toContain('Company'); // Table header
      expect(allText).toContain('Juristic ID'); // Table header
      expect(allText).toContain('AJINOMOTO'); // Data value
      expect(allText).toContain('0105536049046'); // Data value (without label in table format)
      expect(allText).toContain('John Doe'); // Data value
      expect(allText).toContain('Sales Person'); // Data value
    });
  });
});
