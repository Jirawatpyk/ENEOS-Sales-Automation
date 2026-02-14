/**
 * ENEOS Sales Automation - CSV Export Tests
 * Story 6.8: Export to CSV
 *
 * Tests CSV-specific functionality: BOM prefix, Thai characters,
 * filters, performance, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { LeadRow } from '../../../types/index.js';

const mockGetAllLeads = vi.fn();

vi.mock('../../../services/leads.service.js', () => ({
  getAllLeads: () => mockGetAllLeads(),
}));

// Mock json2csv - track actual input
const mockParse = vi.fn((data: Record<string, unknown>[]) => {
  // Return CSV-like string with headers
  if (!data || data.length === 0) {
    return '';
  }
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((row) => Object.values(row).join(','));
  return [headers, ...rows].join('\n');
});

vi.mock('json2csv', () => ({
  parse: (data: Record<string, unknown>[]) => mockParse(data),
}));

// Import after mocking
import { exportData } from '../../../controllers/admin/export.controller.js';

// ===========================================
// Test Helpers
// ===========================================

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    query: {
      type: 'leads',
      format: 'csv',
    },
    params: {},
    user: {
      email: 'admin@eneos.co.th',
      role: 'admin',
      authUserId: 'auth-uuid-admin',
      memberId: 'member-uuid-admin',
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

const createMockLead = (overrides: Partial<LeadRow> = {}): LeadRow => ({
  rowNumber: 2,
  company: 'บริษัท ทดสอบ จำกัด', // Thai company name
  customerName: 'สมชาย ใจดี', // Thai name
  email: 'test@example.com',
  phone: '0812345678',
  status: 'new',
  industryAI: 'อุตสาหกรรม', // Thai industry
  talkingPoint: 'น้ำมันหล่อลื่นคุณภาพสูง', // Thai talking point
  salesOwnerId: 'U123',
  salesOwnerName: 'Sales Person',
  campaignId: 'C001',
  campaignName: 'Campaign 2026',
  date: '2026-01-15',
  website: 'https://example.com',
  capital: '10,000,000',
  source: 'brevo',
  leadId: 'L001',
  eventId: 'E001',
  clickedAt: '2026-01-15T10:00:00Z',
  closedAt: '',
  lostAt: '',
  unreachableAt: '',
  version: 1,
  leadSource: 'email',
  jobTitle: 'Manager',
  city: 'Bangkok',
  leadUuid: 'lead_test-uuid',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  contactedAt: '',
  juristicId: '0123456789012',
  dbdSector: 'Manufacturing',
  province: 'Bangkok',
  fullAddress: '123 Test Street',
  emailSubject: 'Test Subject',
  ...overrides,
});

describe('Export CSV - Story 6.8', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC#2: CSV Download with correct headers
  describe('AC#2: CSV Download', () => {
    it('should return CSV with UTF-8 BOM prefix', async () => {
      // GIVEN: Admin user with valid session and leads data
      mockGetAllLeads.mockResolvedValue([createMockLead()]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Requesting CSV export
      await exportData(req, res, next);

      // THEN: Response is sent with BOM prefix
      expect(res.send).toHaveBeenCalled();
      const csvContent = (res.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(csvContent.charCodeAt(0)).toBe(0xfeff); // BOM character
    });

    it('should set correct Content-Type header', async () => {
      // GIVEN: Valid leads data
      mockGetAllLeads.mockResolvedValue([createMockLead()]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Requesting CSV export
      await exportData(req, res, next);

      // THEN: Content-Type is text/csv with UTF-8 charset
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8'
      );
    });

    it('should set Content-Disposition with .csv filename', async () => {
      // GIVEN: Valid leads data
      mockGetAllLeads.mockResolvedValue([createMockLead()]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Requesting CSV export
      await exportData(req, res, next);

      // THEN: Content-Disposition has .csv extension
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv')
      );
    });
  });

  // AC#3: Thai Character Support
  describe('AC#3: Thai Character Support', () => {
    it('should include Thai characters correctly in CSV output', async () => {
      // GIVEN: Lead with Thai text
      const thaiLead = createMockLead({
        company: 'บริษัท เอเนโอส ประเทศไทย จำกัด',
        customerName: 'นายสมชาย ใจดี',
        industryAI: 'พลังงานและปิโตรเคมี',
        talkingPoint: 'น้ำมันหล่อลื่นคุณภาพสูงสำหรับอุตสาหกรรม',
      });
      mockGetAllLeads.mockResolvedValue([thaiLead]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Requesting CSV export
      await exportData(req, res, next);

      // THEN: mockParse was called with Thai data
      expect(mockParse).toHaveBeenCalled();
      const calledData = mockParse.mock.calls[0][0];
      expect(calledData[0]['Company']).toBe('บริษัท เอเนโอส ประเทศไทย จำกัด');
      expect(calledData[0]['Contact Name']).toBe('นายสมชาย ใจดี');
    });
  });

  // AC#4: All Filters Applied
  describe('AC#4: Filter Application', () => {
    const leads = [
      createMockLead({ rowNumber: 2, date: '2026-01-10', status: 'new', salesOwnerId: 'U1', campaignId: 'C1' }),
      createMockLead({ rowNumber: 3, date: '2026-01-20', status: 'contacted', salesOwnerId: 'U2', campaignId: 'C2' }),
      createMockLead({ rowNumber: 4, date: '2026-01-30', status: 'closed', salesOwnerId: 'U1', campaignId: 'C1' }),
    ];

    beforeEach(() => {
      mockGetAllLeads.mockResolvedValue(leads);
    });

    it('should apply date range filter', async () => {
      // GIVEN: Request with date range
      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'csv',
          startDate: '2026-01-15',
          endDate: '2026-01-25',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Requesting with date range
      await exportData(req, res, next);

      // THEN: Only leads within date range are included
      expect(mockParse).toHaveBeenCalled();
      const calledData = mockParse.mock.calls[0][0];
      expect(calledData.length).toBe(1); // Only 2026-01-20 lead
    });

    it('should apply status filter', async () => {
      // GIVEN: Request with status filter
      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'csv',
          status: 'new',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Requesting with status filter
      await exportData(req, res, next);

      // THEN: Only leads with matching status are included
      expect(mockParse).toHaveBeenCalled();
      const calledData = mockParse.mock.calls[0][0];
      expect(calledData.length).toBe(1);
      expect(calledData[0]['Status']).toBe('new');
    });

    it('should apply owner filter', async () => {
      // GIVEN: Request with owner filter
      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'csv',
          owner: 'U1',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Requesting with owner filter
      await exportData(req, res, next);

      // THEN: Only leads with matching owner are included
      expect(mockParse).toHaveBeenCalled();
      const calledData = mockParse.mock.calls[0][0];
      expect(calledData.length).toBe(2); // U1 has 2 leads
    });

    it('should apply campaign filter', async () => {
      // GIVEN: Request with campaign filter
      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'csv',
          campaign: 'C2',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Requesting with campaign filter
      await exportData(req, res, next);

      // THEN: Only leads with matching campaign are included
      expect(mockParse).toHaveBeenCalled();
      const calledData = mockParse.mock.calls[0][0];
      expect(calledData.length).toBe(1);
    });
  });

  // AC#7: Large Dataset Performance
  describe('AC#7: Large Dataset Handling', () => {
    it('should export 10,000 rows within 5 seconds', async () => {
      // GIVEN: 10,000 leads
      const manyLeads = Array.from({ length: 10000 }, (_, i) =>
        createMockLead({ rowNumber: i + 2, email: `lead${i}@example.com` })
      );
      mockGetAllLeads.mockResolvedValue(manyLeads);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Timing the export
      const startTime = Date.now();
      await exportData(req, res, next);
      const endTime = Date.now();

      // THEN: Export completes within 5 seconds
      expect(res.send).toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  // CSV Escaping Edge Cases
  describe('CSV Escaping', () => {
    it('should handle values containing commas', async () => {
      // GIVEN: Lead with comma in company name
      const leadWithComma = createMockLead({
        company: 'Company, Inc.',
      });
      mockGetAllLeads.mockResolvedValue([leadWithComma]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Exporting to CSV
      await exportData(req, res, next);

      // THEN: json2csv handles escaping (library behavior)
      expect(mockParse).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    it('should handle empty values correctly', async () => {
      // GIVEN: Lead with null/empty fields
      const leadWithNulls = createMockLead({
        website: '',
        jobTitle: '',
        capital: '',
      });
      mockGetAllLeads.mockResolvedValue([leadWithNulls]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Exporting to CSV
      await exportData(req, res, next);

      // THEN: Export succeeds without errors
      expect(res.send).toHaveBeenCalled();
    });

    it('should handle values containing quotes', async () => {
      // GIVEN: Lead with quotes in company name
      const leadWithQuotes = createMockLead({
        company: 'Company "Test" Ltd.',
      });
      mockGetAllLeads.mockResolvedValue([leadWithQuotes]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Exporting to CSV
      await exportData(req, res, next);

      // THEN: Export succeeds
      expect(mockParse).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    it('should handle values containing newlines', async () => {
      // GIVEN: Lead with newline in talking point
      const leadWithNewline = createMockLead({
        talkingPoint: 'First line\nSecond line',
      });
      mockGetAllLeads.mockResolvedValue([leadWithNewline]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Exporting to CSV
      await exportData(req, res, next);

      // THEN: Export succeeds
      expect(mockParse).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });
  });

  // AC#5: Field Selection Integration
  describe('AC#5: Field Selection', () => {
    it('should export only selected columns when fields param provided', async () => {
      // GIVEN: Lead data and request with fields param
      mockGetAllLeads.mockResolvedValue([createMockLead()]);
      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'csv',
          fields: 'Company,Email,Status',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Exporting with field selection
      await exportData(req, res, next);

      // THEN: Only selected columns are included
      expect(mockParse).toHaveBeenCalled();
      const calledData = mockParse.mock.calls[0][0];
      expect(calledData.length).toBe(1);
      const columns = Object.keys(calledData[0]);
      expect(columns).toEqual(['Company', 'Email', 'Status']);
      expect(columns).not.toContain('Phone');
      expect(columns).not.toContain('Industry');
    });

    it('should export all columns when no fields param provided (backward compatibility)', async () => {
      // GIVEN: Lead data and request without fields param
      mockGetAllLeads.mockResolvedValue([createMockLead()]);
      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'csv',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Exporting without field selection
      await exportData(req, res, next);

      // THEN: All columns are included
      expect(mockParse).toHaveBeenCalled();
      const calledData = mockParse.mock.calls[0][0];
      const columns = Object.keys(calledData[0]);
      // Verify it has more columns than just 3
      expect(columns.length).toBeGreaterThan(10);
      expect(columns).toContain('Company');
      expect(columns).toContain('Email');
      expect(columns).toContain('Phone');
      expect(columns).toContain('Status');
      expect(columns).toContain('Industry');
    });

    it('should handle invalid field names gracefully', async () => {
      // GIVEN: Request with some invalid field names
      mockGetAllLeads.mockResolvedValue([createMockLead()]);
      const req = createMockRequest({
        query: {
          type: 'leads',
          format: 'csv',
          fields: 'Company,InvalidColumn,Email',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // WHEN: Exporting with invalid field
      await exportData(req, res, next);

      // THEN: Only valid columns are included
      expect(mockParse).toHaveBeenCalled();
      const calledData = mockParse.mock.calls[0][0];
      const columns = Object.keys(calledData[0]);
      expect(columns).toContain('Company');
      expect(columns).toContain('Email');
      expect(columns).not.toContain('InvalidColumn');
    });
  });
});
