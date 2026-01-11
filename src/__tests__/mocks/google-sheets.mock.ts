/**
 * Google Sheets API Mocks
 */

import { vi } from 'vitest';

// Mock lead data
export const mockLeadRow = {
  rowNumber: 42,
  date: '2024-01-15T10:30:00.000Z',
  customerName: 'สมชาย ใจดี',
  email: 'somchai@scg.com',
  phone: '0812345678',
  company: 'SCG',
  industryAI: 'อุตสาหกรรมก่อสร้าง',
  website: 'https://scg.com',
  capital: '50,000,000 บาท',
  status: 'new' as const,
  salesOwnerId: null,
  salesOwnerName: null,
  campaignId: '12345',
  campaignName: 'ENEOS Q1 2024',
  emailSubject: 'สินค้าใหม่จาก ENEOS',
  source: 'Brevo',
  leadId: '67890',
  eventId: 'evt-123',
  clickedAt: '2024-01-15T10:30:00.000Z',
  talkingPoint: 'SCG เป็นบริษัทก่อสร้างขนาดใหญ่ น่าจะสนใจน้ำมันเครื่องจักร',
  closedAt: null,
  lostAt: null,
  unreachableAt: null,
};

export const mockClaimedLeadRow = {
  ...mockLeadRow,
  status: 'contacted' as const,
  salesOwnerId: 'U123456789',
  salesOwnerName: 'วิภา รักงาน',
};

// Mock Google Sheets API responses
export const mockSheetsAppendResponse = {
  data: {
    updates: {
      updatedRange: 'Leads!A42:W42',
      updatedRows: 1,
      updatedColumns: 23,
      updatedCells: 23,
    },
  },
};

export const mockSheetsGetResponse = {
  data: {
    values: [
      [
        mockLeadRow.date,
        mockLeadRow.customerName,
        mockLeadRow.email,
        mockLeadRow.phone,
        mockLeadRow.company,
        mockLeadRow.industryAI,
        mockLeadRow.website,
        mockLeadRow.capital,
        mockLeadRow.status,
        mockLeadRow.salesOwnerId || '',
        mockLeadRow.salesOwnerName || '',
        mockLeadRow.campaignId,
        mockLeadRow.campaignName,
        mockLeadRow.emailSubject,
        mockLeadRow.source,
        mockLeadRow.leadId,
        mockLeadRow.eventId,
        mockLeadRow.clickedAt,
        mockLeadRow.talkingPoint,
        mockLeadRow.closedAt || '',
        mockLeadRow.lostAt || '',
        mockLeadRow.unreachableAt || '',
        '1', // version
      ],
    ],
  },
};

// Create mock sheets service
export function createMockSheetsService() {
  return {
    addLead: vi.fn().mockResolvedValue(42),
    getRow: vi.fn().mockResolvedValue(mockLeadRow),
    updateLeadWithLock: vi.fn().mockResolvedValue(mockLeadRow),
    claimLead: vi.fn().mockResolvedValue({
      success: true,
      lead: mockLeadRow,
      alreadyClaimed: false,
    }),
    updateLeadStatus: vi.fn().mockResolvedValue(mockLeadRow),
    checkDuplicate: vi.fn().mockResolvedValue(false),
    markAsProcessed: vi.fn().mockResolvedValue(undefined),
    getSalesTeamMember: vi.fn().mockResolvedValue(null),
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 100 }),
  };
}
