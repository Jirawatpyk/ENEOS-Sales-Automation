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

const { mockGetAllCampaignStats, mockGetCampaignStatsById, mockGetCampaignEvents } = vi.hoisted(() => ({
  mockGetAllCampaignStats: vi.fn(),
  mockGetCampaignStatsById: vi.fn(),
  mockGetCampaignEvents: vi.fn(),
}));

vi.mock('../../services/campaign-stats.service.js', () => ({
  recordCampaignEvent: mockRecordCampaignEvent,
  healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 10 }),
  getAllCampaignStats: mockGetAllCampaignStats,
  getCampaignStatsById: mockGetCampaignStatsById,
  getCampaignEvents: mockGetCampaignEvents,
}));

const { mockGetUserByEmail } = vi.hoisted(() => ({
  mockGetUserByEmail: vi.fn().mockResolvedValue({ role: 'admin', status: 'active' }),
}));

vi.mock('../../services/sales-team.service.js', () => ({
  getSalesTeamMember: vi.fn().mockResolvedValue(null),
  getUserByEmail: mockGetUserByEmail,
}));

// Mock Google Auth for admin routes
const { mockGoogleVerifyIdToken } = vi.hoisted(() => ({
  mockGoogleVerifyIdToken: vi.fn().mockResolvedValue({
    getPayload: () => ({
      email: 'admin@eneos.co.th',
      name: 'Admin User',
      sub: 'google-admin-123',
    }),
  }),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockGoogleVerifyIdToken,
  })),
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
  getStats: vi.fn().mockReturnValue({ total: 0 }),
  checkOrThrow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/supabase.js', () => ({
  supabase: {},
  checkSupabaseHealth: vi.fn().mockResolvedValue(true),
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
      // Must have `event` key to enter campaign event flow (otherwise → automation handler → 200)
      const invalidPayload = { event: 'click', foo: 'bar' };

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

// ===========================================
// Story 5-2: Admin Campaign Stats Routes
// ===========================================

const mockCampaignStats = {
  campaignId: 100,
  campaignName: 'BMF2026 Launch',
  delivered: 1000,
  opened: 450,
  clicked: 120,
  uniqueOpens: 400,
  uniqueClicks: 100,
  openRate: 40,
  clickRate: 10,
  hardBounce: 0,
  softBounce: 0,
  unsubscribe: 0,
  spam: 0,
  firstEvent: '2026-01-15T10:00:00.000Z',
  lastUpdated: '2026-01-30T15:30:00.000Z',
};

const mockPagination = {
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const mockEventItem = {
  eventId: 1001,
  email: 'user@example.com',
  event: 'click',
  eventAt: '2026-01-30T10:00:00.000Z',
  url: 'https://example.com/promo',
};

describe('Campaign Stats Admin Routes (Story 5-2)', () => {
  const validToken = 'valid-admin-token';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth mocks
    mockGoogleVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'admin@eneos.co.th',
        name: 'Admin User',
        sub: 'google-admin-123',
      }),
    });
    mockGetUserByEmail.mockResolvedValue({ role: 'admin', status: 'active' });
  });

  describe('GET /api/admin/campaigns/stats', () => {
    it('should return 200 with campaign stats list', async () => {
      mockGetAllCampaignStats.mockResolvedValue({
        data: [mockCampaignStats],
        pagination: mockPagination,
      });

      const response = await request(app)
        .get('/api/admin/campaigns/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should pass query params to service', async () => {
      mockGetAllCampaignStats.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await request(app)
        .get('/api/admin/campaigns/stats')
        .query({
          page: 2,
          limit: 50,
          search: 'BMF',
          sortBy: 'Delivered',
          sortOrder: 'asc',
        })
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockGetAllCampaignStats).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 50,
          search: 'BMF',
          sortBy: 'Delivered',
          sortOrder: 'asc',
        })
      );
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/admin/campaigns/stats');

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid sortBy', async () => {
      const response = await request(app)
        .get('/api/admin/campaigns/stats')
        .query({ sortBy: 'Invalid' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/admin/campaigns/:id/stats', () => {
    it('should return 200 with single campaign stats', async () => {
      mockGetCampaignStatsById.mockResolvedValue(mockCampaignStats);

      const response = await request(app)
        .get('/api/admin/campaigns/100/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.campaignId).toBe(100);
    });

    it('should return 404 when campaign not found', async () => {
      mockGetCampaignStatsById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/campaigns/999/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid campaign ID', async () => {
      const response = await request(app)
        .get('/api/admin/campaigns/invalid/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/admin/campaigns/100/stats');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/campaigns/:id/events', () => {
    it('should return 200 with campaign events', async () => {
      mockGetCampaignStatsById.mockResolvedValue(mockCampaignStats);
      mockGetCampaignEvents.mockResolvedValue({
        data: [mockEventItem],
        pagination: { ...mockPagination, limit: 50 },
      });

      const response = await request(app)
        .get('/api/admin/campaigns/100/events')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].eventId).toBe(1001);
    });

    it('should pass query params to service', async () => {
      mockGetCampaignStatsById.mockResolvedValue(mockCampaignStats);
      mockGetCampaignEvents.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await request(app)
        .get('/api/admin/campaigns/100/events')
        .query({
          page: 2,
          limit: 25,
          event: 'click',
          dateFrom: '2026-01-15',
        })
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockGetCampaignEvents).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          page: 2,
          limit: 25,
          event: 'click',
          dateFrom: '2026-01-15',
        })
      );
    });

    it('should return 404 when campaign not found', async () => {
      mockGetCampaignStatsById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/campaigns/999/events')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid event type', async () => {
      const response = await request(app)
        .get('/api/admin/campaigns/100/events')
        .query({ event: 'bounce' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/admin/campaigns/100/events');

      expect(response.status).toBe(401);
    });
  });

  describe('Response Format (AC4)', () => {
    it('should use standard ApiResponse format with pagination', async () => {
      mockGetAllCampaignStats.mockResolvedValue({
        data: [mockCampaignStats],
        pagination: mockPagination,
      });

      const response = await request(app)
        .get('/api/admin/campaigns/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');

      // Check pagination metadata
      const pagination = response.body.data.pagination;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('hasNext');
      expect(pagination).toHaveProperty('hasPrev');
    });

    it('should return time values in ISO 8601 format', async () => {
      mockGetAllCampaignStats.mockResolvedValue({
        data: [mockCampaignStats],
        pagination: mockPagination,
      });

      const response = await request(app)
        .get('/api/admin/campaigns/stats')
        .set('Authorization', `Bearer ${validToken}`);

      const campaign = response.body.data.data[0];
      // Check ISO 8601 format
      expect(campaign.firstEvent).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(campaign.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
