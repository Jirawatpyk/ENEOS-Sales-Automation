/**
 * Brevo Webhook Mocks
 */

// ===========================================
// Brevo Automation Payload (Lead Webhook)
// Note: Brevo Automation ไม่ส่ง event field มา
// ===========================================

export const mockBrevoAutomationPayload = {
  // NO event field - this is from Brevo Automation
  email: 'somchai@scg.com',
  id: 12345,
  date: '2024-01-15T10:30:00.000Z',
  ts: 1705315800,
  'message-id': 'msg-abc-123',
  ts_event: 1705315800,
  subject: 'สินค้าใหม่จาก ENEOS',
  tag: 'q1-campaign',
  sending_ip: '192.168.1.1',
  ts_epoch: 1705315800,
  contact_id: 67890,
  workflow_id: 12345,
  FIRSTNAME: 'สมชาย',
  LASTNAME: 'ใจดี',
  PHONE: '081-234-5678',
  COMPANY: 'SCG',
};

// Alias for backward compatibility
export const mockBrevoClickPayload = mockBrevoAutomationPayload;

// ===========================================
// Brevo Campaign Payloads (Campaign Webhook)
// Note: Brevo Campaigns ส่ง event field มา
// ===========================================

export const mockBrevoCampaignClickPayload = {
  event: 'click',
  email: 'somchai@scg.com',
  id: 12345,
  date: '2024-01-15T10:30:00.000Z',
  ts: 1705315800,
  'message-id': 'msg-abc-123',
  ts_event: 1705315800,
  subject: 'สินค้าใหม่จาก ENEOS',
  tag: 'q1-campaign',
  sending_ip: '192.168.1.1',
  ts_epoch: 1705315800,
  contact_id: 67890,
  campaign_id: 12345,
  campaign_name: 'ENEOS Q1 2024',
  link: 'https://eneos.co.th/products',
  FIRSTNAME: 'สมชาย',
  LASTNAME: 'ใจดี',
  PHONE: '081-234-5678',
  COMPANY: 'SCG',
};

// Mock Brevo open event payload (Campaign webhook)
export const mockBrevoOpenPayload = {
  event: 'opened',
  email: 'somchai@scg.com',
  id: 12346,
  date: '2024-01-15T10:25:00.000Z',
  ts: 1705315500,
  'message-id': 'msg-abc-124',
  ts_event: 1705315500,
  subject: 'สินค้าใหม่จาก ENEOS',
  contact_id: 67890,
  campaign_id: 12345,
  campaign_name: 'ENEOS Q1 2024',
};

// Mock invalid payload (missing required fields)
export const mockInvalidPayload = {
  event: 'click',
  // Missing email
  id: 12345,
};

// Normalized expected output
export const mockNormalizedPayload = {
  email: 'somchai@scg.com',
  firstname: 'สมชาย',
  lastname: 'ใจดี',
  phone: '081-234-5678',
  company: 'SCG',
  campaignId: '12345',
  campaignName: 'Workflow 12345',
  subject: 'สินค้าใหม่จาก ENEOS',
  contactId: '67890',
  eventId: 'msg-abc-123',
  clickedAt: '2024-01-15T10:30:00.000Z',
};
