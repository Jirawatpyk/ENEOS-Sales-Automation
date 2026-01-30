/**
 * ENEOS Sales Automation - Campaign Routes Integration Tests
 * Tests for POST /webhook/brevo/campaign endpoint
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const { mockRecordCampaignEvent } = vi.hoisted(() => ({
  mockRecordCampaignEvent: vi.fn(),
}));

const { mockSheetsClient } = vi.hoisted(() => ({
  mockSheetsClient: {
    spreadsheets: {
      values: {
        get: vi.fn().mockResolvedValue({ data: { values: [] } }),
        append: vi.fn().mockResolvedValue({ data: { updates: { updatedRange: 'A1' } } }),
        update: vi.fn().mockResolvedValue({}),
      },
      get: vi.fn().mockResolvedValue({ data: { spreadsheetId: 'test' } }),
    },
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn(() => mockSheetsClient),
  },
}));

vi.mock('../../services/campaign-stats.service.js', () => ({
  campaignStatsService: {
    recordCampaignEvent: mockRecordCampaignEvent,
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 10 }),
  },
  CampaignStatsService: vi.fn(),
}));

vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 10 }),
    getAllLeads: vi.fn().mockResolvedValue([]),
    getSalesTeamMember: vi.fn().mockResolvedValue(null),
  },
  SheetsService: vi.fn(),
}));

vi.mock('../../services/gemini.service.js', () => ({
  geminiService: {
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 10 }),
    analyzeCompany: vi.fn().mockResolvedValue({
      industry: 'Technology',
      talkingPoint: 'ENEOS has quality products',
    }),
  },
}));

vi.mock('../../services/line.service.js', () => ({
  lineService: {
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 10 }),
    pushMessage: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../services/redis.service.js', () => ({
  redisService: {
    isConnected: vi.fn().mockReturnValue(false),
    disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/dead-letter-queue.service.js', () => ({
  deadLetterQueue: {
    getStats: vi.fn().mockReturnValue({ total: 0 }),
    getAll: vi.fn().mockReturnValue([]),
    remove: vi.fn().mockReturnValue(true),
    clear: vi.fn().mockReturnValue(0),
  },
  addFailedBrevoWebhook: vi.fn().mockReturnValue('dlq-123'),
}));

vi.mock('../../services/deduplication.service.js', () => ({
  deduplicationService: {
    getStats: vi.fn().mockReturnValue({ total: 0 }),
    checkOrThrow: vi.fn().mockResolvedValue(undefined),
  },
}));

// ===========================================
// Import App After Mocks
// ===========================================

import app from '../../app.js';

// ===========================================
// Test Data
// ===========================================

const validPayload = {
  camp_id: 123,
  'campaign name': 'Test Campaign',
  email: 'test@example.com',
  event: 'click',
  id: 456,
  URL: 'https://example.com/link',
  date_event: '2026-01-30 10:00:00',
  date_sent: '2026-01-30 09:00:00',
  segment_ids: [1, 2],
  tag: 'promo',
};

// ===========================================
// Integration Tests
// ===========================================

describe('Campaign Routes Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /webhook/brevo/campaign', () => {
    it('should accept valid campaign event payload', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 456,
        campaignId: 123,
      });

      const response = await request(app)
        .post('/webhook/brevo/campaign')
        .send(validPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event received');
    });

    it('should return 400 for invalid payload', async () => {
      const invalidPayload = { foo: 'bar' };

      const response = await request(app)
        .post('/webhook/brevo/campaign')
        .send(invalidPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid payload');
    });

    it('should return 200 immediately for all events (non-blocking)', async () => {
      // Even for duplicate events, response is "Event received" immediately
      // Duplicate detection happens asynchronously after response
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: true,
        eventId: 456,
        campaignId: 123,
      });

      const response = await request(app)
        .post('/webhook/brevo/campaign')
        .send(validPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event received');
    });

    it('should return 200 for disabled event types', async () => {
      const disabledEvent = {
        camp_id: 123,
        email: 'test@example.com',
        event: 'hard_bounce',
        id: 789,
      };

      const response = await request(app)
        .post('/webhook/brevo/campaign')
        .send(disabledEvent)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('not enabled');
      expect(mockRecordCampaignEvent).not.toHaveBeenCalled();
    });

    it('should handle delivered event', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 100,
        campaignId: 123,
      });

      const deliveredPayload = {
        camp_id: 123,
        email: 'test@example.com',
        event: 'delivered',
        id: 100,
      };

      const response = await request(app)
        .post('/webhook/brevo/campaign')
        .send(deliveredPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(mockRecordCampaignEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'delivered',
        })
      );
    });

    it('should handle opened event', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 200,
        campaignId: 123,
      });

      const openedPayload = {
        camp_id: 123,
        email: 'test@example.com',
        event: 'opened',
        id: 200,
      };

      const response = await request(app)
        .post('/webhook/brevo/campaign')
        .send(openedPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(mockRecordCampaignEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'opened',
        })
      );
    });

    it('should handle click event with URL', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 456,
        campaignId: 123,
      });

      const response = await request(app)
        .post('/webhook/brevo/campaign')
        .send(validPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(mockRecordCampaignEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'click',
          url: 'https://example.com/link',
        })
      );
    });
  });

  describe('GET /webhook/brevo/campaign', () => {
    it('should return verification response', async () => {
      const response = await request(app)
        .get('/webhook/brevo/campaign');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Campaign webhook endpoint is active');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
