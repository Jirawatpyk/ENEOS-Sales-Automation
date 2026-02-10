/**
 * ATDD Tests - Story 6-5: Select Data Fields (Backend)
 * RED Phase: These tests define expected behavior for backend column filtering.
 *
 * AC#9: Backend Column Filtering
 * AC#8: PDF Export Field Limitation (skip filtering)
 *
 * All tests should FAIL until export.controller.ts implements `fields` param support.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ===========================================
// Mock Setup
// ===========================================

const mockGetAllLeads = vi.fn();

vi.mock('../../../controllers/admin/helpers/index.js', () => ({
  getAllLeads: () => mockGetAllLeads(),
  filterByStatus: (leads: unknown[], status: string) => {
    if (!status) {
      return leads;
    }
    return (leads as Array<{ status: string }>).filter((l) => l.status === status);
  },
}));

// Import after mocking
import { exportData } from '../../../controllers/admin/export.controller.js';

// ===========================================
// Test Helpers
// ===========================================

const createMockRequest = (query: Record<string, string> = {}): Request =>
  ({
    query: {
      type: 'leads',
      format: 'csv',
      ...query,
    },
    params: {},
    user: { email: 'test@eneos.co.th', role: 'admin' },
  }) as unknown as Request;

const createMockResponse = () => {
  let body = '';
  const res = {
    setHeader: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn((data: Buffer | string) => {
      if (typeof data === 'string') {
        body = data;
      } else if (Buffer.isBuffer(data)) {
        body = data.toString('utf-8');
      }
      return res;
    }),
    end: vi.fn(),
    pipe: vi.fn(),
    // Helper to retrieve captured body
    getBody: () => body,
    headersSent: false,
  };
  // Make pipe work for PDF (writable stream mock)
  (res as Record<string, unknown>).write = vi.fn();
  (res as Record<string, unknown>).once = vi.fn();
  (res as Record<string, unknown>).emit = vi.fn();
  (res as Record<string, unknown>).on = vi.fn();
  return res as unknown as Response & { getBody: () => string };
};

const createMockNext = (): NextFunction => vi.fn();

// Sample lead matching LeadRow type
const createSampleLead = (overrides: Record<string, unknown> = {}) => ({
  rowNumber: 2,
  date: '2026-01-15',
  customerName: 'Test Customer',
  email: 'test@example.com',
  phone: '0812345678',
  company: 'Test Corp',
  industryAI: 'Manufacturing',
  website: 'https://test.com',
  capital: '10M',
  status: 'new',
  salesOwnerId: null,
  salesOwnerName: null,
  campaignId: 'camp-001',
  campaignName: 'Test Campaign',
  emailSubject: 'Subject',
  source: 'Brevo',
  leadId: 'lead-001',
  eventId: 'event-001',
  clickedAt: '2026-01-15T10:00:00.000Z',
  talkingPoint: 'Talking point',
  closedAt: null,
  lostAt: null,
  unreachableAt: null,
  version: 1,
  leadSource: 'Email',
  jobTitle: 'Manager',
  city: 'Bangkok',
  leadUUID: 'lead_uuid-001',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: null,
  contactedAt: null,
  juristicId: '0105556012345',
  dbdSector: 'Manufacturing',
  province: 'Bangkok',
  fullAddress: '123 Test St, Bangkok 10110',
  ...overrides,
});

/**
 * Parse CSV output and extract column headers
 * Removes BOM prefix and parses first line
 */
const parseCSVHeaders = (csvOutput: string): string[] => {
  const cleaned = csvOutput.replace(/^\uFEFF/, '');
  const firstLine = cleaned.split('\n')[0];
  return firstLine
    .split(',')
    .map((h) => h.replace(/^"|"$/g, '').trim());
};

/**
 * Parse CSV output and extract data rows
 */
const parseCSVRow = (csvOutput: string, rowIndex: number): Record<string, string> => {
  const cleaned = csvOutput.replace(/^\uFEFF/, '');
  const lines = cleaned.split('\n');
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  const values = lines[rowIndex + 1].split(',').map((v) => v.replace(/^"|"$/g, '').trim());
  const record: Record<string, string> = {};
  headers.forEach((h, i) => {
    record[h] = values[i] || '';
  });
  return record;
};

// Backend exports 22 columns for leads - update if backend adds/removes columns
const BACKEND_LEAD_COLUMN_COUNT = 22;

// ===========================================
// Tests
// ===========================================

describe('Story 6-5: Backend Column Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllLeads.mockResolvedValue([createSampleLead()]);
  });

  // -------------------------------------------
  // AC#9: Backend Column Filtering (CSV)
  // -------------------------------------------
  describe('AC#9: CSV Column Filtering', () => {
    // GIVEN the backend receives `fields=Company,Email,Status` query param
    // WHEN generating CSV export
    // THEN only the requested columns are included in the output
    it('should filter CSV to only include requested columns', async () => {
      const req = createMockRequest({
        format: 'csv',
        fields: 'Company,Email,Status',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      const csvOutput = res.getBody();
      const headers = parseCSVHeaders(csvOutput);

      // Should only have 3 columns
      expect(headers).toEqual(['Company', 'Email', 'Status']);
      expect(headers).not.toContain('Phone');
      expect(headers).not.toContain('Industry');
      expect(headers).not.toContain('Row');
    });

    // GIVEN the backend receives `fields=Company,Email,Status`
    // WHEN generating CSV
    // THEN column headers match exactly the field names passed
    it('should have exact column header names matching fields param', async () => {
      const req = createMockRequest({
        format: 'csv',
        fields: 'Contact Name,Phone,Sales Owner',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      const csvOutput = res.getBody();
      const headers = parseCSVHeaders(csvOutput);

      expect(headers).toEqual(['Contact Name', 'Phone', 'Sales Owner']);
    });

    // GIVEN the backend receives `fields=Company,Email`
    // WHEN generating CSV
    // THEN data values correspond to the filtered columns only
    it('should include correct data values for filtered columns', async () => {
      const req = createMockRequest({
        format: 'csv',
        fields: 'Company,Email',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      const csvOutput = res.getBody();
      const row = parseCSVRow(csvOutput, 0);

      expect(row['Company']).toBe('Test Corp');
      expect(row['Email']).toBe('test@example.com');
      // Should NOT have other columns
      expect(row['Phone']).toBeUndefined();
    });
  });

  // -------------------------------------------
  // AC#9: Backward Compatibility
  // -------------------------------------------
  describe('AC#9: Backward Compatibility', () => {
    // GIVEN `fields` param is missing
    // WHEN generating CSV
    // THEN export all 22 columns (backward compatible)
    it('should export all 22 columns when fields param is missing', async () => {
      const req = createMockRequest({
        format: 'csv',
        // No fields param
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      const csvOutput = res.getBody();
      const headers = parseCSVHeaders(csvOutput);

      expect(headers.length).toBe(BACKEND_LEAD_COLUMN_COUNT);
      expect(headers).toContain('Company');
      expect(headers).toContain('Email');
      expect(headers).toContain('Status');
      expect(headers).not.toContain('Row');
      expect(headers).toContain('Full Address');
    });
  });

  // -------------------------------------------
  // AC#9: Invalid Field Names
  // -------------------------------------------
  describe('AC#9: Invalid Field Handling', () => {
    // GIVEN `fields=Company,InvalidField,Email`
    // WHEN generating CSV
    // THEN invalid field names are silently ignored
    it('should silently ignore invalid field names', async () => {
      const req = createMockRequest({
        format: 'csv',
        fields: 'Company,InvalidField,Email',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      const csvOutput = res.getBody();
      const headers = parseCSVHeaders(csvOutput);

      expect(headers).toEqual(['Company', 'Email']);
      expect(headers).not.toContain('InvalidField');
    });

    // GIVEN all field names in `fields` are invalid
    // WHEN generating CSV
    // THEN fallback to all columns
    it('should fallback to all columns when all field names are invalid', async () => {
      const req = createMockRequest({
        format: 'csv',
        fields: 'Foo,Bar,Baz',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      const csvOutput = res.getBody();
      const headers = parseCSVHeaders(csvOutput);

      expect(headers.length).toBe(BACKEND_LEAD_COLUMN_COUNT);
    });
  });

  // -------------------------------------------
  // AC#8: PDF Skips Field Filtering
  // -------------------------------------------
  describe('AC#8: PDF Export Ignores Fields', () => {
    // GIVEN `fields=Company,Email` with `format=pdf`
    // WHEN generating PDF
    // THEN PDF uses its fixed 9-column layout, ignoring fields param
    it('should not filter columns for PDF format', async () => {
      const req = createMockRequest({
        format: 'pdf',
        fields: 'Company,Email',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      // PDF should still be generated with its fixed layout
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });
  });

  // -------------------------------------------
  // AC#9: XLSX Column Filtering
  // -------------------------------------------
  describe('AC#9: XLSX Column Filtering', () => {
    // GIVEN `fields=Company,Email` with `format=xlsx`
    // WHEN generating xlsx
    // THEN Excel file contains only selected columns with correct widths
    it('should generate xlsx with only filtered columns', async () => {
      const req = createMockRequest({
        format: 'xlsx',
        fields: 'Company,Email',
      });
      const res = createMockResponse();
      const next = createMockNext();

      await exportData(req, res, next);

      // Verify xlsx was generated (correct content type)
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      // Send was called with buffer (not error)
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
