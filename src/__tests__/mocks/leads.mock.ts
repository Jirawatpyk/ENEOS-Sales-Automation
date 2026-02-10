/**
 * Lead Mock Data
 * Shared mock objects for lead-related tests
 */

// Mock lead data (LeadRow format)
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
  leadSource: null,
  jobTitle: null,
  city: null,
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
