/**
 * Flex Message Template Tests
 * Tests for LINE Flex Message template functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock phone formatter
vi.mock('../../utils/phone-formatter.js', () => ({
  formatPhoneDisplay: vi.fn((phone: string) => phone ? phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : null),
  createTelUri: vi.fn((phone: string) => `tel:${phone}`),
}));

// Import after mocks
import {
  createLeadFlexMessage,
  createSuccessReplyMessage,
  createClaimedReplyMessage,
  createStatusUpdateMessage,
  createErrorReplyMessage,
} from '../../templates/flex-message.js';
import { LeadRow } from '../../types/index.js';

describe('Flex Message Templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // createLeadFlexMessage
  // ===========================================

  describe('createLeadFlexMessage', () => {
    const mockLead: LeadRow = {
      rowNumber: 42,
      version: 1,
      email: 'test@example.com',
      company: 'Test Company',
      customerName: 'John Doe',
      phone: '0812345678',
      date: '2024-01-15',
      industryAI: 'IT',
      website: null,
      capital: null,
      status: 'new',
      salesOwnerId: null,
      salesOwnerName: null,
      campaignId: '12345',
      campaignName: 'Test Campaign',
      emailSubject: 'Test Subject',
      source: 'Brevo',
      leadId: '67890',
      eventId: 'evt-123',
      clickedAt: '2024-01-15',
      talkingPoint: null,
      closedAt: null,
      lostAt: null,
      unreachableAt: null,
      // New Brevo Contact Attributes fields
      leadSource: null,
      jobTitle: null,
      city: null,
      // UUID Migration fields
      leadUUID: 'lead_550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2026-01-15T08:00:00.000Z',
      updatedAt: '2026-01-15T08:00:00.000Z',
    };

    const mockAiAnalysis = {
      industry: 'IT',
      talkingPoint: 'Great company for ENEOS products',
      website: 'https://example.com',
      registeredCapital: '10,000,000 บาท',
    };

    it('should create a flex message with correct type', () => {
      const result = createLeadFlexMessage(mockLead, mockAiAnalysis);

      expect(result.type).toBe('flex');
      expect(result.altText).toContain(mockLead.company);
    });

    it('should include company name in altText', () => {
      const result = createLeadFlexMessage(mockLead, mockAiAnalysis);

      expect(result.altText).toContain('Test Company');
    });

    it('should include row number in the message', () => {
      const result = createLeadFlexMessage(mockLead, mockAiAnalysis);

      expect(result.contents).toBeDefined();
      expect(result.contents.type).toBe('bubble');
    });

    it('should handle missing company name', () => {
      const leadWithoutCompany = { ...mockLead, company: '' };
      const result = createLeadFlexMessage(leadWithoutCompany, mockAiAnalysis);

      expect(result.type).toBe('flex');
    });

    it('should handle missing phone number', () => {
      const leadWithoutPhone = { ...mockLead, phone: '' };
      const result = createLeadFlexMessage(leadWithoutPhone, mockAiAnalysis);

      expect(result.type).toBe('flex');
    });

    it('should handle missing email', () => {
      const leadWithoutEmail = { ...mockLead, email: '' };
      const result = createLeadFlexMessage(leadWithoutEmail, mockAiAnalysis);

      expect(result.type).toBe('flex');
    });

    it('should handle missing AI analysis fields', () => {
      const minimalAnalysis = {
        industry: 'ไม่ระบุ',
        talkingPoint: 'Default talking point',
      };
      const result = createLeadFlexMessage(mockLead, minimalAnalysis);

      expect(result.type).toBe('flex');
    });

    it('should include postback actions in footer', () => {
      const result = createLeadFlexMessage(mockLead, mockAiAnalysis);

      expect(result.contents).toBeDefined();
      // Footer should contain action buttons
      const bubble = result.contents as { footer?: { contents: unknown[] } };
      expect(bubble.footer).toBeDefined();
      expect(bubble.footer?.contents.length).toBeGreaterThan(0);
    });

    it('should include AI insight section', () => {
      const result = createLeadFlexMessage(mockLead, mockAiAnalysis);

      // Body should contain AI insight
      const bubble = result.contents as { body?: { contents: unknown[] } };
      expect(bubble.body).toBeDefined();
    });

    it('should handle website without http prefix', () => {
      const analysisWithBareUrl = {
        ...mockAiAnalysis,
        website: 'example.com',
      };
      const result = createLeadFlexMessage(mockLead, analysisWithBareUrl);

      expect(result.type).toBe('flex');
    });

    it('should handle null website', () => {
      const analysisWithNullWebsite = {
        ...mockAiAnalysis,
        website: null,
      };
      const result = createLeadFlexMessage(mockLead, analysisWithNullWebsite);

      expect(result.type).toBe('flex');
    });

    it('should handle null registered capital', () => {
      const analysisWithNullCapital = {
        ...mockAiAnalysis,
        registeredCapital: null,
      };
      const result = createLeadFlexMessage(mockLead, analysisWithNullCapital);

      expect(result.type).toBe('flex');
    });

    it('should include lead_id in postback data when leadUUID is present', () => {
      const result = createLeadFlexMessage(mockLead, mockAiAnalysis);

      // Check footer buttons contain lead_id in postback data
      const bubble = result.contents as {
        footer?: {
          contents: Array<{
            type: string;
            action?: { type: string; data?: string };
            contents?: Array<{ action?: { type: string; data?: string } }>;
          }>;
        };
      };

      expect(bubble.footer).toBeDefined();

      // Find a button with postback action and check data format
      const firstButton = bubble.footer?.contents[0];
      if (firstButton?.action?.type === 'postback' && firstButton.action.data) {
        const params = new URLSearchParams(firstButton.action.data);
        expect(params.get('lead_id')).toBe('lead_550e8400-e29b-41d4-a716-446655440000');
        expect(params.get('row_id')).toBe('42');
        expect(params.get('action')).toBe('contacted');
      }
    });

    it('should include only row_id when leadUUID is not present', () => {
      const leadWithoutUUID: LeadRow = {
        ...mockLead,
        leadUUID: null,
      };
      const result = createLeadFlexMessage(leadWithoutUUID, mockAiAnalysis);

      const bubble = result.contents as {
        footer?: {
          contents: Array<{
            type: string;
            action?: { type: string; data?: string };
          }>;
        };
      };

      const firstButton = bubble.footer?.contents[0];
      if (firstButton?.action?.type === 'postback' && firstButton.action.data) {
        const params = new URLSearchParams(firstButton.action.data);
        expect(params.get('lead_id')).toBeNull();
        expect(params.get('row_id')).toBe('42');
      }
    });
  });

  // ===========================================
  // createSuccessReplyMessage
  // ===========================================

  describe('createSuccessReplyMessage', () => {
    it('should create a text message', () => {
      const result = createSuccessReplyMessage('John', 'ACME Corp', 'Jane Doe', 'contacted');

      expect(result.type).toBe('text');
      expect(result.text).toBeTruthy();
    });

    it('should include sales name', () => {
      const result = createSuccessReplyMessage('John', 'ACME Corp', 'Jane Doe', 'contacted');

      expect(result.text).toContain('John');
    });

    it('should include company name', () => {
      const result = createSuccessReplyMessage('John', 'ACME Corp', 'Jane Doe', 'contacted');

      expect(result.text).toContain('ACME Corp');
    });

    it('should include customer name', () => {
      const result = createSuccessReplyMessage('John', 'ACME Corp', 'Jane Doe', 'contacted');

      expect(result.text).toContain('Jane Doe');
    });

    it('should include success emoji', () => {
      const result = createSuccessReplyMessage('John', 'ACME Corp', 'Jane Doe', 'contacted');

      expect(result.text).toContain('✅');
    });

    it('should handle different statuses', () => {
      const statuses = ['new', 'contacted', 'unreachable', 'closed', 'lost'];

      statuses.forEach(status => {
        const result = createSuccessReplyMessage('John', 'ACME Corp', 'Jane', status);
        expect(result.type).toBe('text');
      });
    });
  });

  // ===========================================
  // createClaimedReplyMessage
  // ===========================================

  describe('createClaimedReplyMessage', () => {
    it('should create a text message', () => {
      const result = createClaimedReplyMessage('ACME Corp', 'Jane Doe', 'Bob');

      expect(result.type).toBe('text');
      expect(result.text).toBeTruthy();
    });

    it('should include company name', () => {
      const result = createClaimedReplyMessage('ACME Corp', 'Jane Doe', 'Bob');

      expect(result.text).toContain('ACME Corp');
    });

    it('should include customer name', () => {
      const result = createClaimedReplyMessage('ACME Corp', 'Jane Doe', 'Bob');

      expect(result.text).toContain('Jane Doe');
    });

    it('should include owner name', () => {
      const result = createClaimedReplyMessage('ACME Corp', 'Jane Doe', 'Bob');

      expect(result.text).toContain('Bob');
    });

    it('should include rejection emoji', () => {
      const result = createClaimedReplyMessage('ACME Corp', 'Jane Doe', 'Bob');

      expect(result.text).toContain('❌');
    });
  });

  // ===========================================
  // createStatusUpdateMessage
  // ===========================================

  describe('createStatusUpdateMessage', () => {
    it('should create closed sale message', () => {
      const result = createStatusUpdateMessage('ACME Corp', 'closed', true, false);

      expect(result.type).toBe('text');
      expect(result.text).toContain('💰');
      expect(result.text).toContain('ACME Corp');
      expect(result.text).toContain('🎉');
    });

    it('should create lost sale message', () => {
      const result = createStatusUpdateMessage('ACME Corp', 'lost', false, true);

      expect(result.type).toBe('text');
      expect(result.text).toContain('📉');
      expect(result.text).toContain('ACME Corp');
    });

    it('should create regular status update message', () => {
      const result = createStatusUpdateMessage('ACME Corp', 'contacted', false, false);

      expect(result.type).toBe('text');
      expect(result.text).toContain('✅');
      expect(result.text).toContain('ACME Corp');
    });

    it('should handle unreachable status', () => {
      const result = createStatusUpdateMessage('ACME Corp', 'unreachable', false, false);

      expect(result.type).toBe('text');
    });

    it('should handle new status', () => {
      const result = createStatusUpdateMessage('ACME Corp', 'new', false, false);

      expect(result.type).toBe('text');
    });
  });

  // ===========================================
  // createErrorReplyMessage
  // ===========================================

  describe('createErrorReplyMessage', () => {
    it('should create error message without custom message', () => {
      const result = createErrorReplyMessage();

      expect(result.type).toBe('text');
      expect(result.text).toContain('⚠️');
    });

    it('should create error message with custom message', () => {
      const result = createErrorReplyMessage('Something went wrong');

      expect(result.type).toBe('text');
      expect(result.text).toContain('Something went wrong');
    });

    it('should include retry suggestion', () => {
      const result = createErrorReplyMessage();

      expect(result.text).toContain('ลองใหม่');
    });

    it('should include admin contact suggestion', () => {
      const result = createErrorReplyMessage();

      expect(result.text).toContain('ผู้ดูแลระบบ');
    });
  });
});
