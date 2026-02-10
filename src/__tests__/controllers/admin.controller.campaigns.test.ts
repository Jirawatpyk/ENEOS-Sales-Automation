/**
 * ENEOS Sales Automation - Admin Controller Campaigns Tests
 * ทดสอบ Campaigns API endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { LeadRow } from '../../types/index.js';

const mockGetAllLeads = vi.fn();

vi.mock('../../services/leads.service.js', () => ({
  getAllLeads: () => mockGetAllLeads(),
}));

// Import after mocking
import {
  getCampaigns,
  getCampaignDetail,
} from '../../controllers/admin.controller.js';

// ===========================================
// Test Helpers
// ===========================================

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    query: {},
    params: {},
    user: {
      email: 'test@eneos.co.th',
      name: 'Test User',
      role: 'admin',
      googleId: 'google-123',
    },
    ...overrides,
  }) as Request;

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

// Helper to get date ISO string
const getDateISO = (daysOffset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

// Sample lead data
const createSampleLead = (overrides: Partial<LeadRow> = {}): LeadRow => ({
  rowNumber: 2,
  date: getDateISO(),
  customerName: 'Test Customer',
  email: 'customer@test.com',
  phone: '0812345678',
  company: 'Test Company',
  industryAI: 'Manufacturing',
  website: 'https://test.com',
  capital: '10M',
  status: 'new',
  salesOwnerId: null,
  salesOwnerName: null,
  campaignId: 'campaign-001',
  workflowId: 'campaign-001',
  brevoCampaignId: null,
  campaignName: 'Q1 Promotion',
  emailSubject: 'Test Subject',
  source: 'Brevo',
  leadId: 'lead-001',
  eventId: 'event-001',
  clickedAt: getDateISO(),
  talkingPoint: 'Test talking point',
  closedAt: null,
  lostAt: null,
  unreachableAt: null,
  leadSource: null,
  jobTitle: null,
  city: null,
  leadUUID: null,
  createdAt: null,
  updatedAt: null,
  contactedAt: null,
  juristicId: null,
  dbdSector: null,
  province: null,
  version: 1,
  ...overrides,
});

// ===========================================
// Tests
// ===========================================

describe('Admin Controller - Campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // GET /api/admin/campaigns
  // ===========================================

  describe('GET /api/admin/campaigns', () => {
    it('should return campaigns list with default params', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ campaignId: 'camp-001', campaignName: 'Campaign 1', status: 'new' }),
        createSampleLead({ campaignId: 'camp-001', campaignName: 'Campaign 1', status: 'claimed', rowNumber: 3 }),
        createSampleLead({ campaignId: 'camp-001', campaignName: 'Campaign 1', status: 'closed', rowNumber: 4 }),
        createSampleLead({ campaignId: 'camp-002', campaignName: 'Campaign 2', status: 'new', rowNumber: 5 }),
        createSampleLead({ campaignId: 'camp-002', campaignName: 'Campaign 2', status: 'closed', rowNumber: 6 }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { period: 'quarter' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaigns(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.campaigns).toBeInstanceOf(Array);
      expect(response.data.campaigns.length).toBe(2);
      expect(response.data.totals).toBeDefined();
      expect(response.data.totals.campaigns).toBe(2);
      expect(response.data.totals.leads).toBe(5);
      expect(response.data.totals.closed).toBe(2);
      expect(response.data.period).toBeDefined();
      expect(response.data.period.type).toBe('quarter');
    });

    it('should group by brevoCampaignId when available (same workflow_id, different campaigns)', async () => {
      // All leads share workflow_id "11" but have different brevoCampaignId
      const mockLeads: LeadRow[] = [
        createSampleLead({ campaignId: '11', workflowId: '11', brevoCampaignId: '150', campaignName: 'Oil Solutions', status: 'new' }),
        createSampleLead({ campaignId: '11', workflowId: '11', brevoCampaignId: '200', campaignName: 'Lubricant Promo', status: 'new', rowNumber: 3 }),
        createSampleLead({ campaignId: '11', workflowId: '11', brevoCampaignId: '300', campaignName: 'Industrial Q1', status: 'closed', rowNumber: 4 }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { period: 'quarter' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaigns(req, res, next);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      // Should be 3 campaigns (grouped by brevoCampaignId), not 1 (grouped by workflow_id)
      expect(response.data.campaigns.length).toBe(3);
      expect(response.data.totals.campaigns).toBe(3);
      const names = response.data.campaigns.map((c: { name: string }) => c.name).sort();
      expect(names).toEqual(['Industrial Q1', 'Lubricant Promo', 'Oil Solutions']);
    });

    it('should filter campaigns by period', async () => {
      const now = new Date();
      const thisMonday = new Date(now);
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      thisMonday.setDate(now.getDate() - diffToMonday);
      thisMonday.setHours(0, 0, 0, 0);

      const mockLeads: LeadRow[] = [
        createSampleLead({ date: getDateISO(-90), campaignId: 'camp-old', rowNumber: 2 }), // 90 days ago (out of range)
        createSampleLead({ date: thisMonday.toISOString(), campaignId: 'camp-recent', rowNumber: 3 }), // This week (in range)
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { period: 'week' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaigns(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.campaigns.length).toBe(1);
      expect(response.data.campaigns[0].id).toBe('camp-recent');
    });

    it('should sort campaigns by conversionRate desc', async () => {
      const mockLeads: LeadRow[] = [
        // Campaign 1: 1/2 = 50% conversion
        createSampleLead({ campaignId: 'camp-001', campaignName: 'Campaign 1', status: 'closed', rowNumber: 2 }),
        createSampleLead({ campaignId: 'camp-001', campaignName: 'Campaign 1', status: 'new', rowNumber: 3 }),
        // Campaign 2: 1/3 = 33% conversion
        createSampleLead({ campaignId: 'camp-002', campaignName: 'Campaign 2', status: 'closed', rowNumber: 4 }),
        createSampleLead({ campaignId: 'camp-002', campaignName: 'Campaign 2', status: 'new', rowNumber: 5 }),
        createSampleLead({ campaignId: 'camp-002', campaignName: 'Campaign 2', status: 'lost', rowNumber: 6 }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ query: { sortBy: 'conversionRate', sortOrder: 'desc' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaigns(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const campaigns = response.data.campaigns;

      expect(campaigns[0].id).toBe('camp-001');
      expect(campaigns[0].stats.conversionRate).toBeGreaterThan(campaigns[1].stats.conversionRate);
    });

    it('should return empty campaigns array when no leads', async () => {
      mockGetAllLeads.mockResolvedValue([]);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaigns(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.campaigns).toEqual([]);
      expect(response.data.totals.campaigns).toBe(0);
      expect(response.data.totals.leads).toBe(0);
    });

    it('should return 400 when validation fails', async () => {
      const req = createMockRequest({ query: { period: 'invalid-period' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaigns(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle custom period with startDate and endDate', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ date: '2024-01-15T10:00:00Z', campaignId: 'camp-001' }),
        createSampleLead({ date: '2024-01-20T10:00:00Z', campaignId: 'camp-001', rowNumber: 3 }),
        createSampleLead({ date: '2024-02-01T10:00:00Z', campaignId: 'camp-002', rowNumber: 4 }), // Outside range
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({
        query: {
          period: 'custom',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaigns(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.data.campaigns.length).toBe(1);
      expect(response.data.campaigns[0].id).toBe('camp-001');
    });
  });

  // ===========================================
  // GET /api/admin/campaigns/:campaignId
  // ===========================================

  describe('GET /api/admin/campaigns/:campaignId', () => {
    it('should return campaign detail', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ campaignId: 'camp-001', status: 'new', rowNumber: 2 }),
        createSampleLead({ campaignId: 'camp-001', status: 'claimed', rowNumber: 3, salesOwnerId: 'user-1', salesOwnerName: 'John' }),
        createSampleLead({ campaignId: 'camp-001', status: 'closed', rowNumber: 4, salesOwnerId: 'user-1', salesOwnerName: 'John' }),
        createSampleLead({ campaignId: 'camp-001', status: 'closed', rowNumber: 5, salesOwnerId: 'user-2', salesOwnerName: 'Jane' }),
        createSampleLead({ campaignId: 'camp-002', status: 'new', rowNumber: 6 }), // Different campaign
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ params: { campaignId: 'camp-001' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaignDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.campaign).toBeDefined();
      expect(response.data.campaign.id).toBe('camp-001');
      expect(response.data.stats).toBeDefined();
      expect(response.data.stats.leads).toBe(4);
      expect(response.data.stats.closed).toBe(2);
      expect(response.data.leadsByStatus).toBeDefined();
      expect(response.data.leadsBySales).toBeDefined();
      expect(response.data.leadsBySales.length).toBe(2);
      expect(response.data.dailyTrend).toBeInstanceOf(Array);
      expect(response.data.recentLeads).toBeInstanceOf(Array);
    });

    it('should return 404 when campaign not found', async () => {
      mockGetAllLeads.mockResolvedValue([
        createSampleLead({ campaignId: 'camp-001' }),
      ]);

      const req = createMockRequest({ params: { campaignId: 'camp-999' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaignDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when campaignId is invalid', async () => {
      const req = createMockRequest({ params: { campaignId: '' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaignDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should calculate campaign stats correctly', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({ campaignId: 'camp-001', status: 'new' }), // No owner
        createSampleLead({ campaignId: 'camp-001', status: 'claimed', salesOwnerId: 'user-1', rowNumber: 3 }), // Has owner
        createSampleLead({ campaignId: 'camp-001', status: 'contacted', salesOwnerId: 'user-1', rowNumber: 4 }), // Has owner
        createSampleLead({ campaignId: 'camp-001', status: 'closed', salesOwnerId: 'user-1', rowNumber: 5 }), // Has owner
        createSampleLead({ campaignId: 'camp-001', status: 'closed', salesOwnerId: 'user-2', rowNumber: 6 }), // Has owner
        createSampleLead({ campaignId: 'camp-001', status: 'lost', salesOwnerId: 'user-1', rowNumber: 7 }), // Has owner
        createSampleLead({ campaignId: 'camp-001', status: 'unreachable', salesOwnerId: 'user-1', rowNumber: 8 }), // Has owner
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ params: { campaignId: 'camp-001' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaignDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const stats = response.data.stats;

      expect(stats.leads).toBe(7);
      expect(stats.claimed).toBe(6); // Count leads with salesOwnerId (not status)
      expect(stats.contacted).toBe(1);
      expect(stats.closed).toBe(2);
      expect(stats.lost).toBe(1);
      expect(stats.unreachable).toBe(1);
      expect(stats.conversionRate).toBeCloseTo(28.57, 1); // 2/7 * 100
      expect(stats.claimRate).toBeCloseTo(85.71, 1); // 6/7 * 100
    });

    it('should group leads by sales correctly', async () => {
      const mockLeads: LeadRow[] = [
        createSampleLead({
          campaignId: 'camp-001',
          salesOwnerId: 'user-1',
          salesOwnerName: 'John',
          status: 'claimed',
        }),
        createSampleLead({
          campaignId: 'camp-001',
          salesOwnerId: 'user-1',
          salesOwnerName: 'John',
          status: 'closed',
          rowNumber: 3,
        }),
        createSampleLead({
          campaignId: 'camp-001',
          salesOwnerId: 'user-2',
          salesOwnerName: 'Jane',
          status: 'closed',
          rowNumber: 4,
        }),
      ];

      mockGetAllLeads.mockResolvedValue(mockLeads);

      const req = createMockRequest({ params: { campaignId: 'camp-001' } });
      const res = createMockResponse();
      const next = createMockNext();

      await getCampaignDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      const response = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const leadsBySales = response.data.leadsBySales;

      expect(leadsBySales.length).toBe(2);

      const john = leadsBySales.find((s: { name: string }) => s.name === 'John');
      expect(john.count).toBe(2);
      expect(john.closed).toBe(1);

      const jane = leadsBySales.find((s: { name: string }) => s.name === 'Jane');
      expect(jane.count).toBe(1);
      expect(jane.closed).toBe(1);
    });
  });
});
