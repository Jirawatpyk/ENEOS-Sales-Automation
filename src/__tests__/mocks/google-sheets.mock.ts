/**
 * Google Sheets API Mocks
 */

import { vi } from 'vitest';

// Mock lead data
export const mockLeadRow = {
  rowNumber: 42,
  version: 1,
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
  // New Brevo Contact Attributes fields
  leadSource: null,
  jobTitle: null,
  city: null,
  // UUID Migration fields
  leadUUID: 'lead_mock-uuid-12345678-1234-1234-1234-123456789012',
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-15T10:30:00.000Z',
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
        mockLeadRow.date,                       // 0: A - date
        mockLeadRow.customerName,               // 1: B - customerName
        mockLeadRow.email,                      // 2: C - email
        mockLeadRow.phone,                      // 3: D - phone
        mockLeadRow.company,                    // 4: E - company
        mockLeadRow.industryAI,                 // 5: F - industryAI
        mockLeadRow.website,                    // 6: G - website
        mockLeadRow.capital,                    // 7: H - capital
        mockLeadRow.status,                     // 8: I - status
        mockLeadRow.salesOwnerId || '',         // 9: J - salesOwnerId
        mockLeadRow.salesOwnerName || '',       // 10: K - salesOwnerName
        mockLeadRow.campaignId,                 // 11: L - campaignId
        mockLeadRow.campaignName,               // 12: M - campaignName
        mockLeadRow.emailSubject,               // 13: N - emailSubject
        mockLeadRow.source,                     // 14: O - source
        mockLeadRow.leadId,                     // 15: P - leadId (Brevo)
        mockLeadRow.eventId,                    // 16: Q - eventId
        mockLeadRow.clickedAt,                  // 17: R - clickedAt
        mockLeadRow.talkingPoint,               // 18: S - talkingPoint
        mockLeadRow.closedAt || '',             // 19: T - closedAt
        mockLeadRow.lostAt || '',               // 20: U - lostAt
        mockLeadRow.unreachableAt || '',        // 21: V - unreachableAt
        '1',                                    // 22: W - version
        mockLeadRow.leadSource || '',           // 23: X - leadSource
        mockLeadRow.jobTitle || '',             // 24: Y - jobTitle
        mockLeadRow.city || '',                 // 25: Z - city
        mockLeadRow.leadUUID || '',             // 26: AA - leadUUID
        mockLeadRow.createdAt || '',            // 27: AB - createdAt
        mockLeadRow.updatedAt || '',            // 28: AC - updatedAt
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
