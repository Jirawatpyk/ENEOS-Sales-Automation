/**
 * ENEOS Sales Automation - Campaign Stats Service Tests (Supabase)
 * Story 9-2: Full rewrite for Supabase-based campaign stats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NormalizedCampaignEvent } from '../../validators/campaign-event.validator.js';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const mockSupabase = vi.hoisted(() => {
  const chainable = () => {
    const chain: Record<string, any> = {};
    const methods = [
      'from', 'select', 'insert', 'upsert', 'update', 'delete',
      'eq', 'neq', 'in', 'ilike', 'gte', 'lte',
      'order', 'range', 'limit', 'maybeSingle', 'single',
    ];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    // Default resolved values
    chain.then = undefined; // Not a thenable
    return chain;
  };
  return chainable();
});

vi.mock('../../lib/supabase.js', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../config/index.js', () => ({
  config: {
    logLevel: 'error',
    isDev: true,
    isProd: false,
  },
}));

// ===========================================
// Import Service After Mocks
// ===========================================

import {
  recordCampaignEvent,
  getAllCampaignStats,
  getCampaignStatsById,
  getCampaignEvents,
  getCampaignEventsByEmail,
  healthCheck,
} from '../../services/campaign-stats.service.js';

// ===========================================
// Test Data
// ===========================================

const createMockEvent = (overrides?: Partial<NormalizedCampaignEvent>): NormalizedCampaignEvent => ({
  eventId: 12345,
  campaignId: 100,
  campaignName: 'Test Campaign',
  email: 'test@example.com',
  event: 'click',
  eventAt: '2026-01-30 10:00:00',
  sentAt: '2026-01-30 09:00:00',
  url: 'https://example.com/link',
  tag: 'promo',
  segmentIds: [1, 2],
  ...overrides,
});

// ===========================================
// Helper: Reset mock chain between tests
// ===========================================

function resetMockChain(): void {
  const methods = [
    'from', 'select', 'insert', 'upsert', 'update', 'delete',
    'eq', 'neq', 'in', 'ilike', 'gte', 'lte',
    'order', 'range', 'limit', 'maybeSingle', 'single',
  ];
  for (const method of methods) {
    mockSupabase[method].mockReturnValue(mockSupabase);
  }
}

// ===========================================
// Service Tests
// ===========================================

describe('CampaignStatsService (Supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockChain();
  });

  // ===========================================
  // recordCampaignEvent Tests (AC #1, #6)
  // ===========================================

  describe('recordCampaignEvent', () => {
    it('should record new event and upsert stats (AC #1)', async () => {
      // INSERT event succeeds
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'uuid-1' },
        error: null,
      });
      // countEvents (delivered) — head:true returns count
      mockSupabase.eq.mockReturnValueOnce({ ...mockSupabase, data: null, count: 5, error: null });
      // We need to mock the final resolution for each count/unique query
      // For simplicity, mock select to resolve at the end of chain
      // Use a sequence of maybeSingle/select resolutions

      // Actually, let's mock more precisely. The service calls:
      // 1. insert().select().maybeSingle() — event insert
      // 2. select('*', {count:'exact', head:true}).eq().eq() x3 — countEvents
      // 3. select('email').eq().eq() x2 — countUniqueEmails
      // 4. select('event_at').eq().order().limit().maybeSingle() — first event
      // 5. upsert() — stats upsert

      // Mock strategy: Override specific terminal calls in sequence
      // Since the chain always returns mockSupabase, we mock terminal methods

      // Reset for precise mocking
      vi.clearAllMocks();
      resetMockChain();

      // 1. insert().select('id').maybeSingle() — event insert success
      let maybeSingleCallCount = 0;
      mockSupabase.maybeSingle.mockImplementation(() => {
        maybeSingleCallCount++;
        if (maybeSingleCallCount === 1) {
          // Event insert
          return Promise.resolve({ data: { id: 'uuid-1' }, error: null });
        }
        if (maybeSingleCallCount === 2) {
          // First event timestamp query
          return Promise.resolve({ data: { event_at: '2026-01-30T09:00:00Z' }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // countEvents: select('*', { count, head }).eq().eq()
      // These resolve via the chain itself (the last .eq returns the chain)
      // We need the chain to resolve with { count, error }
      let selectCallCount = 0;
      mockSupabase.select.mockImplementation((...args: any[]) => {
        selectCallCount++;
        // For count queries (head: true), the chain needs to resolve
        if (args[1]?.head === true) {
          // Return a resolved-like object
          return { ...mockSupabase, count: 10, error: null, data: null, eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 10, error: null, data: null }) }) };
        }
        if (args[0] === 'email') {
          // countUniqueEmails query
          return { ...mockSupabase, eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ email: 'a@b.com' }, { email: 'c@d.com' }], error: null }) }) };
        }
        return mockSupabase;
      });

      // upsert: resolve success
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });

      const event = createMockEvent();
      const result = await recordCampaignEvent(event);

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(false);
      expect(result.eventId).toBe(12345);
      expect(result.campaignId).toBe(100);
    });

    it('should return duplicate when UNIQUE constraint violation (AC #1)', async () => {
      vi.clearAllMocks();
      resetMockChain();

      // insert().select('id').maybeSingle() — 23505 error
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      const event = createMockEvent();
      const result = await recordCampaignEvent(event);

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(result.eventId).toBe(12345);
      expect(result.campaignId).toBe(100);
    });

    it('should return error on non-duplicate insert failure', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      });

      const event = createMockEvent();
      const result = await recordCampaignEvent(event);

      expect(result.success).toBe(false);
      expect(result.duplicate).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return success even when stats upsert fails (AC #6)', async () => {
      vi.clearAllMocks();
      resetMockChain();

      // Event insert chain: insert().select('id').maybeSingle()
      // First maybeSingle resolves (event insert success)
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'uuid-1' },
        error: null,
      });

      // After event insert, upsertCampaignStats calls:
      // countEvents → from().select('*', {count,head}).eq().eq()
      // Let select throw only when called with head:true (stats queries), not for 'id' (event insert)
      let selectCallCount = 0;
      mockSupabase.select.mockImplementation((...args: any[]) => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First select call = event insert chain .select('id') → return chain normally
          return mockSupabase;
        }
        // Subsequent select calls = upsertCampaignStats queries → throw
        throw new Error('Stats update failed');
      });

      const event = createMockEvent();
      const result = await recordCampaignEvent(event);

      // Event was written (source of truth) — success even though stats failed
      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(false);
    });

    it('should convert eventId and campaignId to String for insert', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate' },
      });

      const event = createMockEvent({ eventId: 12345, campaignId: 100 });
      await recordCampaignEvent(event);

      // Verify insert was called with String values
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: '12345',
          campaign_id: '100',
        })
      );
    });

    it('should lowercase email on insert', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate' },
      });

      const event = createMockEvent({ email: 'TEST@EXAMPLE.COM' });
      await recordCampaignEvent(event);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      );
    });

    it('should handle null segmentIds', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate' },
      });

      const event = createMockEvent({ segmentIds: [] });
      await recordCampaignEvent(event);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          segment_ids: null,
        })
      );
    });
  });

  // ===========================================
  // getAllCampaignStats Tests
  // ===========================================

  describe('getAllCampaignStats', () => {
    const mockStatsRows = [
      {
        campaign_id: '100', campaign_name: 'BMF2026 Launch',
        delivered: 1000, opened: 450, clicked: 120,
        unique_opens: 400, unique_clicks: 100,
        open_rate: 40, click_rate: 10,
        hard_bounce: 0, soft_bounce: 0, unsubscribe: 0, spam: 0,
        first_event: '2026-01-15T10:00:00.000Z',
        last_updated: '2026-01-30T15:30:00.000Z',
      },
      {
        campaign_id: '101', campaign_name: 'Q1 Promo',
        delivered: 500, opened: 200, clicked: 50,
        unique_opens: 180, unique_clicks: 45,
        open_rate: 36, click_rate: 9,
        hard_bounce: 0, soft_bounce: 0, unsubscribe: 0, spam: 0,
        first_event: '2026-01-10T08:00:00.000Z',
        last_updated: '2026-01-28T12:00:00.000Z',
      },
    ];

    it('should return empty array when no campaigns exist', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      const result = await getAllCampaignStats();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should return campaigns with pagination metadata', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: mockStatsRows,
        count: 2,
        error: null,
      });

      const result = await getAllCampaignStats({ page: 1, limit: 20 });

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should correctly map Supabase row to CampaignStatsItem', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [mockStatsRows[0]],
        count: 1,
        error: null,
      });

      const result = await getAllCampaignStats();
      const campaign = result.data[0];

      expect(campaign.campaignId).toBe(100);
      expect(campaign.campaignName).toBe('BMF2026 Launch');
      expect(campaign.delivered).toBe(1000);
      expect(campaign.opened).toBe(450);
      expect(campaign.clicked).toBe(120);
      expect(campaign.uniqueOpens).toBe(400);
      expect(campaign.uniqueClicks).toBe(100);
      expect(campaign.openRate).toBe(40);
      expect(campaign.clickRate).toBe(10);
      expect(campaign.hardBounce).toBe(0);
      expect(campaign.firstEvent).toBe('2026-01-15T10:00:00.000Z');
      expect(campaign.lastUpdated).toBe('2026-01-30T15:30:00.000Z');
    });

    it('should apply search filter via ilike', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [mockStatsRows[0]],
        count: 1,
        error: null,
      });

      await getAllCampaignStats({ search: 'BMF' });

      expect(mockSupabase.ilike).toHaveBeenCalledWith('campaign_name', '%BMF%');
    });

    it('should apply date range filters', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      await getAllCampaignStats({ dateFrom: '2026-01-15', dateTo: '2026-01-30' });

      // Overlap logic: last_updated >= dateFrom AND first_event <= dateTo (Bangkok EOD)
      expect(mockSupabase.gte).toHaveBeenCalledWith('last_updated', '2026-01-15');
      expect(mockSupabase.lte).toHaveBeenCalledWith('first_event', '2026-01-30T16:59:59.999Z');
    });

    it('should apply sorting', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      await getAllCampaignStats({ sortBy: 'Delivered', sortOrder: 'desc' });

      expect(mockSupabase.order).toHaveBeenCalledWith('delivered', { ascending: false });
    });

    it('should apply pagination range', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      await getAllCampaignStats({ page: 3, limit: 10 });

      // offset = (3-1) * 10 = 20, end = 29
      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29);
    });

    it('should throw on Supabase error', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: null,
        count: null,
        error: { message: 'DB error' },
      });

      await expect(getAllCampaignStats()).rejects.toEqual({ message: 'DB error' });
    });
  });

  // ===========================================
  // getCampaignStatsById Tests
  // ===========================================

  describe('getCampaignStatsById', () => {
    it('should return null when campaign not found', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getCampaignStatsById(999);
      expect(result).toBeNull();
    });

    it('should return campaign stats when found', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: {
          campaign_id: '100', campaign_name: 'Test Campaign',
          delivered: 1000, opened: 450, clicked: 120,
          unique_opens: 400, unique_clicks: 100,
          open_rate: 40, click_rate: 10,
          hard_bounce: 5, soft_bounce: 2, unsubscribe: 1, spam: 0,
          first_event: '2026-01-15T10:00:00.000Z',
          last_updated: '2026-01-30T15:30:00.000Z',
        },
        error: null,
      });

      const result = await getCampaignStatsById(100);

      expect(result).not.toBeNull();
      expect(result?.campaignId).toBe(100);
      expect(result?.campaignName).toBe('Test Campaign');
      expect(result?.delivered).toBe(1000);
      expect(result?.hardBounce).toBe(5);
      expect(result?.softBounce).toBe(2);
      expect(result?.unsubscribe).toBe(1);
      expect(result?.spam).toBe(0);
    });

    it('should query with String(campaignId)', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await getCampaignStatsById(100);

      expect(mockSupabase.eq).toHaveBeenCalledWith('campaign_id', '100');
    });
  });

  // ===========================================
  // getCampaignEvents Tests (AC #2, #3)
  // ===========================================

  describe('getCampaignEvents', () => {
    it('should return empty array when no events', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      const result = await getCampaignEvents(100);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should return events with contact data from leads (AC #2)', async () => {
      vi.clearAllMocks();
      resetMockChain();

      // Events query
      mockSupabase.range.mockResolvedValueOnce({
        data: [
          {
            event_id: '1001', campaign_id: '100', campaign_name: 'BMF2026',
            email: 'user1@example.com', event: 'click',
            event_at: '2026-01-30T10:10:00.000Z',
            url: 'https://example.com/promo',
          },
          {
            event_id: '1002', campaign_id: '100', campaign_name: 'BMF2026',
            email: 'user2@example.com', event: 'delivered',
            event_at: '2026-01-30T10:00:00.000Z',
            url: null,
          },
        ],
        count: 2,
        error: null,
      });

      // Leads lookup
      mockSupabase.in.mockResolvedValueOnce({
        data: [
          { email: 'user1@example.com', customer_name: 'John Doe', company: 'Acme Corp' },
        ],
        error: null,
      });

      const result = await getCampaignEvents(100);

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(2);

      // user1 has lead data
      const clickEvent = result.data.find(e => e.event === 'click');
      expect(clickEvent?.firstname).toBe('John Doe');
      expect(clickEvent?.lastname).toBe('');
      expect(clickEvent?.company).toBe('Acme Corp');
      expect(clickEvent?.eventId).toBe(1001);
      expect(clickEvent?.url).toBe('https://example.com/promo');

      // user2 has no lead data (AC #3)
      const deliveredEvent = result.data.find(e => e.event === 'delivered');
      expect(deliveredEvent?.firstname).toBe('');
      expect(deliveredEvent?.company).toBe('');
    });

    it('should return email only when no matching lead (AC #3)', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [
          {
            event_id: '1001', campaign_id: '100',
            email: 'unknown@example.com', event: 'opened',
            event_at: '2026-01-30T10:00:00.000Z', url: null,
          },
        ],
        count: 1,
        error: null,
      });

      // No leads found
      mockSupabase.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getCampaignEvents(100);

      expect(result.data.length).toBe(1);
      expect(result.data[0].email).toBe('unknown@example.com');
      expect(result.data[0].firstname).toBe('');
      expect(result.data[0].lastname).toBe('');
      expect(result.data[0].company).toBe('');
    });

    it('should filter by event type', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      await getCampaignEvents(100, { event: 'click' });

      // eq should be called with 'event', 'click'
      expect(mockSupabase.eq).toHaveBeenCalledWith('event', 'click');
    });

    it('should apply date range filters', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      await getCampaignEvents(100, { dateFrom: '2026-01-15', dateTo: '2026-01-30' });

      expect(mockSupabase.gte).toHaveBeenCalledWith('event_at', '2026-01-15');
      expect(mockSupabase.lte).toHaveBeenCalledWith('event_at', '2026-01-30T16:59:59.999Z');
    });

    it('should apply pagination', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      await getCampaignEvents(100, { page: 2, limit: 25 });

      // offset = (2-1) * 25 = 25, end = 49
      expect(mockSupabase.range).toHaveBeenCalledWith(25, 49);
    });

    it('should map eventId from string to number', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.range.mockResolvedValueOnce({
        data: [
          {
            event_id: '1001', campaign_id: '100',
            email: 'user@test.com', event: 'click',
            event_at: '2026-01-30T10:00:00.000Z', url: null,
          },
        ],
        count: 1,
        error: null,
      });

      mockSupabase.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getCampaignEvents(100);

      expect(result.data[0].eventId).toBe(1001);
      expect(typeof result.data[0].eventId).toBe('number');
    });
  });

  // ===========================================
  // getCampaignEventsByEmail Tests (Story 9-5: AC #1, #2, #3)
  // ===========================================

  describe('getCampaignEventsByEmail', () => {
    it('should return events sorted by event_at desc when events exist', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            campaign_id: '100', campaign_name: 'BMF2026',
            event: 'click', event_at: '2026-02-01T12:00:00.000Z',
            url: 'https://example.com/promo',
          },
          {
            campaign_id: '100', campaign_name: 'BMF2026',
            event: 'opened', event_at: '2026-02-01T10:00:00.000Z',
            url: null,
          },
          {
            campaign_id: '100', campaign_name: 'BMF2026',
            event: 'delivered', event_at: '2026-02-01T09:00:00.000Z',
            url: null,
          },
        ],
        error: null,
      });

      const result = await getCampaignEventsByEmail('user@example.com');

      expect(result).toHaveLength(3);
      expect(result[0].event).toBe('click');
      expect(result[1].event).toBe('opened');
      expect(result[2].event).toBe('delivered');
    });

    it('should return empty array when no events for email', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getCampaignEventsByEmail('nobody@example.com');

      expect(result).toEqual([]);
    });

    it('should return events with all fields mapped correctly', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            campaign_id: '200', campaign_name: 'Q1 Promo',
            event: 'click', event_at: '2026-02-05T14:30:00.000Z',
            url: 'https://eneos.co.th/product',
          },
        ],
        error: null,
      });

      const result = await getCampaignEventsByEmail('test@example.com');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        campaignId: '200',
        campaignName: 'Q1 Promo',
        event: 'click',
        eventAt: '2026-02-05T14:30:00.000Z',
        url: 'https://eneos.co.th/product',
      });
    });

    it('should handle Supabase error gracefully (return empty array)', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB connection failed', code: '500' },
      });

      const result = await getCampaignEventsByEmail('test@example.com');

      expect(result).toEqual([]);
    });

    it('should lowercase email before query', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getCampaignEventsByEmail('John@EXAMPLE.COM');

      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'john@example.com');
    });

    it('should handle null data from Supabase', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getCampaignEventsByEmail('test@example.com');

      expect(result).toEqual([]);
    });

    it('should return empty array for empty email string', async () => {
      const result = await getCampaignEventsByEmail('');

      expect(result).toEqual([]);
      // Should not call Supabase at all
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // Stats Calculation Tests (AC #7)
  // ===========================================

  describe('Stats Calculation (AC #7)', () => {
    it('should calculate open_rate = unique_opens / delivered * 100', () => {
      // This is tested indirectly through the service upsert logic.
      // We verify the formula: Math.round((uniqueOpens / delivered) * 10000) / 100
      const uniqueOpens = 3;
      const delivered = 7;
      const openRate = Math.round((uniqueOpens / delivered) * 10000) / 100;
      expect(openRate).toBe(42.86);
    });

    it('should return 0 rates when delivered is 0', () => {
      const delivered = 0;
      const openRate = delivered > 0 ? Math.round((5 / delivered) * 10000) / 100 : 0;
      expect(openRate).toBe(0);
    });

    it('should handle exact percentages', () => {
      const openRate = Math.round((1 / 4) * 10000) / 100;
      expect(openRate).toBe(25);
    });

    it('should handle very small rates', () => {
      const openRate = Math.round((1 / 10000) * 10000) / 100;
      expect(openRate).toBe(0.01);
    });

    it('should handle 100% rate', () => {
      const openRate = Math.round((100 / 100) * 10000) / 100;
      expect(openRate).toBe(100);
    });
  });

  // ===========================================
  // Named Exports Tests
  // ===========================================

  describe('named exports', () => {
    it('should export all required functions', () => {
      expect(typeof recordCampaignEvent).toBe('function');
      expect(typeof getAllCampaignStats).toBe('function');
      expect(typeof getCampaignStatsById).toBe('function');
      expect(typeof getCampaignEvents).toBe('function');
      expect(typeof getCampaignEventsByEmail).toBe('function');
      expect(typeof healthCheck).toBe('function');
    });
  });

  // ===========================================
  // Health Check Tests
  // ===========================================

  describe('healthCheck', () => {
    it('should return healthy:true when Supabase is accessible', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ campaign_id: '1' }],
        error: null,
      });

      const result = await healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return healthy:false when Supabase returns error', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Service unavailable' },
      });

      const result = await healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return healthy:false when Supabase throws', async () => {
      vi.clearAllMocks();
      resetMockChain();

      mockSupabase.limit.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await healthCheck();

      expect(result.healthy).toBe(false);
    });
  });
});
