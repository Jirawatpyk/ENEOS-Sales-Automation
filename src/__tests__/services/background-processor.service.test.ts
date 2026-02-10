/**
 * Background Processor Service Tests
 * Tests for async lead processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NormalizedBrevoPayload, CompanyAnalysis } from '../../types/index.js';

// Mock all dependencies
const mockStartProcessing = vi.fn();
const mockUpdateProgress = vi.fn();
const mockComplete = vi.fn();
const mockFail = vi.fn();

const mockAnalyzeCompany = vi.fn();
const mockAddLead = vi.fn();
const mockLookupCampaignId = vi.fn();
const mockPushLeadNotification = vi.fn();
const mockDLQAdd = vi.fn();

vi.mock('../../services/processing-status.service.js', () => ({
  processingStatusService: {
    startProcessing: mockStartProcessing,
    updateProgress: mockUpdateProgress,
    complete: mockComplete,
    fail: mockFail,
  },
}));

vi.mock('../../services/gemini.service.js', () => ({
  GeminiService: vi.fn().mockImplementation(() => ({
    analyzeCompany: mockAnalyzeCompany,
  })),
}));

vi.mock('../../services/leads.service.js', () => ({
  addLead: mockAddLead,
  lookupCampaignId: mockLookupCampaignId,
}));

vi.mock('../../services/line.service.js', () => ({
  LineService: vi.fn().mockImplementation(() => ({
    pushLeadNotification: mockPushLeadNotification,
  })),
}));

vi.mock('../../services/dead-letter-queue.service.js', () => ({
  deadLetterQueue: {
    add: mockDLQAdd,
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    features: {
      aiEnrichment: true,
      lineNotifications: true,
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/email-parser.js', () => ({
  extractDomain: vi.fn((email: string) => email.split('@')[1] || 'example.com'),
}));

vi.mock('../../utils/phone-formatter.js', () => ({
  formatPhone: vi.fn((phone: string) => phone),
}));

vi.mock('../../utils/date-formatter.js', () => ({
  formatDateForSheets: vi.fn(() => '2024-01-15'),
}));

describe('Background Processor Service', () => {
  let processLeadInBackground: typeof import('../../services/background-processor.service.js').processLeadInBackground;
  let processLeadAsync: typeof import('../../services/background-processor.service.js').processLeadAsync;

  const mockPayload: NormalizedBrevoPayload = {
    event: 'click',
    email: 'test@example.com',
    firstname: 'John',
    lastname: 'Doe',
    phone: '0812345678',
    company: 'Test Corp',
    campaignId: '12345',
    campaignName: 'Test Campaign',
    subject: 'Test Subject',
    contactId: 'contact-123',
    eventId: 'event-456',
    clickedAt: '2024-01-15T10:00:00Z',
  };

  const mockAIAnalysis: CompanyAnalysis = {
    industry: 'Technology',
    talkingPoint: 'Tech company focusing on innovation',
    website: 'https://example.com',
    registeredCapital: '10,000,000 บาท',
    keywords: ['B2B', 'Tech'],
    juristicId: '0123456789012',
    dbdSector: 'Software Development',
    province: 'Bangkok',
    fullAddress: '123 Tech Street, Bangkok',
    confidence: 0.95,
    confidenceFactors: {
      hasRealDomain: true,
      hasDBDData: true,
      keywordMatch: true,
      geminiConfident: true,
      dataCompleteness: 1.0,
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import after mocks are set up
    const bgModule = await import('../../services/background-processor.service.js');
    processLeadInBackground = bgModule.processLeadInBackground;
    processLeadAsync = bgModule.processLeadAsync;

    // Setup default mock responses
    mockAnalyzeCompany.mockResolvedValue(mockAIAnalysis);
    mockLookupCampaignId.mockResolvedValue({ campaignId: 'campaign-abc-123', campaignName: 'Campaign ABC' });
    mockAddLead.mockResolvedValue({
      id: 'lead-uuid-123',
      version: 1,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    }); // SupabaseLead object
    mockPushLeadNotification.mockResolvedValue(undefined);
  });

  describe('processLeadInBackground', () => {
    it('should complete full processing flow successfully', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      await processLeadInBackground(mockPayload, correlationId);

      // Verify status updates
      expect(mockStartProcessing).toHaveBeenCalledWith(correlationId);
      expect(mockComplete).toHaveBeenCalledWith(
        correlationId,
        0, // No row number in Supabase
        'Technology', // industry
        0.95, // confidence
        expect.any(Number) // duration
      );

      // Verify services called
      expect(mockAnalyzeCompany).toHaveBeenCalledWith('example.com', 'Test Corp');
      expect(mockAddLead).toHaveBeenCalled();
      expect(mockPushLeadNotification).toHaveBeenCalled();
    });

    it('should use defaults when AI analysis fails', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockAnalyzeCompany.mockRejectedValue(new Error('Gemini API timeout'));

      await processLeadInBackground(mockPayload, correlationId);

      // Should still complete with defaults
      expect(mockComplete).toHaveBeenCalledWith(
        correlationId,
        0, // No row number in Supabase
        'Unknown', // default industry
        0, // default confidence
        expect.any(Number)
      );

      // Should still save to sheets
      expect(mockAddLead).toHaveBeenCalled();
    });

    it('should continue when LINE notification fails', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockPushLeadNotification.mockRejectedValue(new Error('LINE API error'));

      await processLeadInBackground(mockPayload, correlationId);

      // Should still complete despite LINE error
      expect(mockComplete).toHaveBeenCalledWith(
        correlationId,
        0, // No row number in Supabase
        'Technology',
        0.95,
        expect.any(Number)
      );
    });

    it('should fail when Sheets save fails (critical error)', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockAddLead.mockRejectedValue(new Error('Sheets API error'));

      await processLeadInBackground(mockPayload, correlationId);

      // Should mark as failed
      expect(mockFail).toHaveBeenCalledWith(
        correlationId,
        'Sheets API error',
        expect.any(Number)
      );

      // Should add to DLQ
      expect(mockDLQAdd).toHaveBeenCalledWith(
        'brevo_webhook',
        mockPayload,
        expect.any(Error),
        correlationId
      );
    });

    it('should call services in correct order', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      const callOrder: string[] = [];

      mockStartProcessing.mockImplementation(() => callOrder.push('startProcessing'));
      mockAnalyzeCompany.mockImplementation(async () => {
        callOrder.push('analyzeCompany');
        return mockAIAnalysis;
      });
      mockLookupCampaignId.mockImplementation(async () => {
        callOrder.push('lookupCampaignId');
        return { campaignId: 'campaign-abc-123', campaignName: 'Campaign ABC' };
      });
      mockAddLead.mockImplementation(async () => {
        callOrder.push('addLead');
        return { id: 'lead-uuid-123', version: 1, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' };
      });
      mockPushLeadNotification.mockImplementation(async () => {
        callOrder.push('pushLeadNotification');
      });
      mockComplete.mockImplementation(() => callOrder.push('complete'));

      await processLeadInBackground(mockPayload, correlationId);

      // startProcessing must come first, addLead after parallel enrichment, LINE after save
      expect(callOrder[0]).toBe('startProcessing');
      // analyzeCompany and lookupCampaignId run in parallel — both before addLead
      expect(callOrder).toContain('analyzeCompany');
      expect(callOrder).toContain('lookupCampaignId');
      const addLeadIndex = callOrder.indexOf('addLead');
      expect(addLeadIndex).toBeGreaterThan(callOrder.indexOf('analyzeCompany'));
      expect(addLeadIndex).toBeGreaterThan(callOrder.indexOf('lookupCampaignId'));
      expect(callOrder.indexOf('pushLeadNotification')).toBeGreaterThan(addLeadIndex);
      expect(callOrder[callOrder.length - 1]).toBe('complete');
    });

    it('should format lead data correctly', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      await processLeadInBackground(mockPayload, correlationId);

      expect(mockAddLead).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'John Doe',
          email: 'test@example.com',
          phone: '0812345678',
          company: 'Test Corp',
          industryAI: 'Technology',
          status: 'new',
          workflowId: '12345',
          campaignId: 'campaign-abc-123',
          brevoCampaignId: 'campaign-abc-123',
          campaignName: 'Campaign ABC',
          source: 'Brevo',
        })
      );
    });

    it('should handle missing optional fields', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      const minimalPayload: NormalizedBrevoPayload = {
        event: 'click',
        email: 'test@example.com',
        firstname: '',
        lastname: '',
        phone: '',
        company: '',
        campaignId: '12345',
        campaignName: 'Test Campaign',
        subject: 'Test Subject',
        contactId: 'contact-123',
        eventId: 'event-456',
        clickedAt: '2024-01-15T10:00:00Z',
      };

      await processLeadInBackground(minimalPayload, correlationId);

      expect(mockAddLead).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'ไม่ระบุ',
          company: 'ไม่ระบุ',
        })
      );
    });

    it('should pass correlation ID to all services', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      await processLeadInBackground(mockPayload, correlationId);

      expect(mockStartProcessing).toHaveBeenCalledWith(correlationId);
      expect(mockComplete).toHaveBeenCalledWith(
        correlationId,
        expect.any(Number),
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('processLeadAsync', () => {
    it('should call processLeadInBackground without awaiting', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      // Should not throw even if background processing fails
      expect(() => {
        processLeadAsync(mockPayload, correlationId);
      }).not.toThrow();

      // Should return immediately (no await)
      // We can't easily verify async behavior, but at least check it doesn't crash
    });

    it('should handle multiple concurrent calls', () => {
      const id1 = '550e8400-e29b-41d4-a716-446655440000';
      const id2 = '660e8400-e29b-41d4-a716-446655440001';
      const id3 = '770e8400-e29b-41d4-a716-446655440002';

      expect(() => {
        processLeadAsync(mockPayload, id1);
        processLeadAsync(mockPayload, id2);
        processLeadAsync(mockPayload, id3);
      }).not.toThrow();
    });
  });

  describe('feature flags', () => {
    it('should skip AI analysis when feature disabled', async () => {
      const { config } = await import('../../config/index.js');
      config.features.aiEnrichment = false;

      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      await processLeadInBackground(mockPayload, correlationId);

      // AI should not be called
      expect(mockAnalyzeCompany).not.toHaveBeenCalled();

      // But should still complete with defaults
      expect(mockComplete).toHaveBeenCalledWith(
        correlationId,
        0, // No row number in Supabase
        'Unknown', // default
        0, // default
        expect.any(Number)
      );

      // Reset
      config.features.aiEnrichment = true;
    });

    it('should skip LINE notification when feature disabled', async () => {
      const { config } = await import('../../config/index.js');
      config.features.lineNotifications = false;

      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      await processLeadInBackground(mockPayload, correlationId);

      // LINE should not be called
      expect(mockPushLeadNotification).not.toHaveBeenCalled();

      // But should still complete
      expect(mockComplete).toHaveBeenCalled();

      // Reset
      config.features.lineNotifications = true;
    });
  });

  describe('error handling', () => {
    it('should catch and log unexpected errors', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockAddLead.mockRejectedValue(new Error('Unexpected error'));

      // Should not throw
      await expect(processLeadInBackground(mockPayload, correlationId)).resolves.not.toThrow();

      // Should mark as failed
      expect(mockFail).toHaveBeenCalled();

      // Should add to DLQ
      expect(mockDLQAdd).toHaveBeenCalled();
    });

    it('should handle non-Error objects', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockAddLead.mockRejectedValue('String error');

      await processLeadInBackground(mockPayload, correlationId);

      // Should still fail gracefully
      expect(mockFail).toHaveBeenCalled();
    });
  });

  describe('duration tracking', () => {
    it('should track processing duration on success', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      await processLeadInBackground(mockPayload, correlationId);

      expect(mockComplete).toHaveBeenCalledWith(
        correlationId,
        expect.any(Number),
        expect.any(String),
        expect.any(Number),
        expect.any(Number) // duration should be a number
      );

      // Duration should be reasonable (< 10 seconds for mocked services)
      const duration = mockComplete.mock.calls[0][4];
      expect(duration).toBeGreaterThanOrEqual(0); // Mocked services can be 0ms
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should track processing duration on failure', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockAddLead.mockRejectedValue(new Error('Test error'));

      await processLeadInBackground(mockPayload, correlationId);

      expect(mockFail).toHaveBeenCalledWith(
        correlationId,
        expect.any(String),
        expect.any(Number) // duration
      );
    });
  });

  describe('parallel enrichment (Gemini + lookupCampaignId)', () => {
    it('should run Gemini and lookupCampaignId in parallel', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockAnalyzeCompany.mockResolvedValue(mockAIAnalysis);
      mockLookupCampaignId.mockResolvedValue({ campaignId: 'campaign-123', campaignName: 'Test Campaign' });

      await processLeadInBackground(mockPayload, correlationId);

      // Both should be called
      expect(mockAnalyzeCompany).toHaveBeenCalledWith('example.com', 'Test Corp');
      expect(mockLookupCampaignId).toHaveBeenCalledWith(mockPayload.email);

      // Lead should have workflowId, campaignId from lookup, and brevoCampaignId
      expect(mockAddLead).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: mockPayload.campaignId,
          campaignId: 'campaign-123',
          brevoCampaignId: 'campaign-123',
          campaignName: 'Test Campaign',
        })
      );
    });

    it('should save lead even if lookupCampaignId fails', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockLookupCampaignId.mockRejectedValue(new Error('DB error'));

      await processLeadInBackground(mockPayload, correlationId);

      expect(mockAddLead).toHaveBeenCalledWith(
        expect.objectContaining({
          brevoCampaignId: null,
        })
      );
      // Should still complete successfully
      expect(mockComplete).toHaveBeenCalled();
    });

    it('should save lead even if both Gemini and lookupCampaignId fail', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockAnalyzeCompany.mockRejectedValue(new Error('Gemini timeout'));
      mockLookupCampaignId.mockRejectedValue(new Error('DB error'));

      await processLeadInBackground(mockPayload, correlationId);

      expect(mockAddLead).toHaveBeenCalledWith(
        expect.objectContaining({
          industryAI: 'Unknown', // default
          brevoCampaignId: null,
        })
      );
      expect(mockComplete).toHaveBeenCalled();
    });

    it('should run only lookupCampaignId when AI is disabled', async () => {
      const { config } = await import('../../config/index.js');
      config.features.aiEnrichment = false;

      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockLookupCampaignId.mockResolvedValue({ campaignId: 'campaign-456', campaignName: 'Campaign 456' });

      await processLeadInBackground(mockPayload, correlationId);

      // AI should NOT be called
      expect(mockAnalyzeCompany).not.toHaveBeenCalled();
      // Lookup should still be called
      expect(mockLookupCampaignId).toHaveBeenCalledWith(mockPayload.email);

      expect(mockAddLead).toHaveBeenCalledWith(
        expect.objectContaining({
          industryAI: 'Unknown', // default (no AI)
          brevoCampaignId: 'campaign-456',
          campaignName: 'Campaign 456',
        })
      );

      // Reset
      config.features.aiEnrichment = true;
    });

    it('should set brevoCampaignId to null when lookup returns null', async () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      mockLookupCampaignId.mockResolvedValue(null);

      await processLeadInBackground(mockPayload, correlationId);

      expect(mockAddLead).toHaveBeenCalledWith(
        expect.objectContaining({
          brevoCampaignId: null,
        })
      );
    });
  });
});
