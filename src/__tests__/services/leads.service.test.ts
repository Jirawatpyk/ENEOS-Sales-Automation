/**
 * Leads Service Tests (Supabase)
 * Story 9-1a: AC #8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===========================================
// Mock Setup (vi.hoisted)
// ===========================================

const { mockSupabase, mockChain } = vi.hoisted(() => {
  const mockChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockChain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { mockSupabase, mockChain };
});

vi.mock('../../lib/supabase.js', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    addStatusHistory: vi.fn().mockResolvedValue(undefined),
    getStatusHistory: vi.fn().mockResolvedValue([]),
    getSalesTeamMember: vi.fn().mockResolvedValue(null),
  },
  SheetsService: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    features: {
      deduplication: true,
      aiEnrichment: true,
      lineNotifications: true,
    },
  },
}));

// ===========================================
// Test Data
// ===========================================

const mockSupabaseLead = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  customer_name: 'Test Customer',
  phone: '0812345678',
  company: 'Test Co',
  industry_ai: 'Manufacturing',
  website: 'https://test.com',
  capital: '10M',
  status: 'new',
  sales_owner_id: null,
  sales_owner_name: null,
  workflow_id: 'wf-123',
  brevo_campaign_id: null,
  campaign_name: 'Campaign 1',
  email_subject: 'Subject',
  source: 'Brevo',
  lead_id: 'contact-1',
  event_id: 'event-1',
  clicked_at: '2026-01-01T00:00:00Z',
  talking_point: 'Good company',
  closed_at: null,
  lost_at: null,
  unreachable_at: null,
  contacted_at: null,
  version: 1,
  lead_source: 'Website',
  job_title: 'Engineer',
  city: 'Bangkok',
  juristic_id: null,
  dbd_sector: null,
  province: null,
  full_address: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ===========================================
// Tests
// ===========================================

import {
  addLead,
  getLeadById,
  updateLeadWithLock,
  claimLead,
  updateLeadStatus,
  getLeadsWithPagination,
  getLeadsCountByStatus,
  lookupCampaignId,
  getAllLeads,
  getAllLeadsByEmail,
  getLeadsByDateRange,
  supabaseLeadToLeadRow,
  buildLeadDedupKey,
} from '../../services/leads.service.js';
import { RaceConditionError } from '../../types/index.js';

describe('leads.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chainable mocks
    Object.values(mockChain).forEach((fn) => {
      if (typeof fn.mockReturnThis === 'function') {
        fn.mockReturnThis();
      }
    });
    mockChain.single.mockResolvedValue({ data: null, error: null });
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(mockChain);
  });

  // ===========================================
  // addLead (AC #1)
  // ===========================================

  describe('addLead', () => {
    it('should insert lead and return SupabaseLead with UUID', async () => {
      mockChain.single.mockResolvedValue({
        data: mockSupabaseLead,
        error: null,
      });

      const result = await addLead({
        email: 'test@example.com',
        customerName: 'Test Customer',
        company: 'Test Co',
        campaignId: 'wf-123',
      });

      expect(result).toEqual(mockSupabaseLead);
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockSupabase.from).toHaveBeenCalledWith('leads');
      expect(mockChain.insert).toHaveBeenCalled();
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
    });

    it('should throw AppError on DB insert failure', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'insert failed' },
      });

      await expect(
        addLead({ email: 'fail@example.com', customerName: 'Fail' })
      ).rejects.toThrow('Failed to add lead');
    });
  });

  // ===========================================
  // getLeadById
  // ===========================================

  describe('getLeadById', () => {
    it('should return lead when found', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: mockSupabaseLead,
        error: null,
      });

      const result = await getLeadById('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toEqual(mockSupabaseLead);
      expect(mockChain.eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return null when not found', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getLeadById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw AppError on DB query error', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'connection failed' },
      });

      await expect(getLeadById('some-id')).rejects.toThrow('Failed to get lead');
    });
  });

  // ===========================================
  // updateLeadWithLock (AC #3)
  // ===========================================

  describe('updateLeadWithLock', () => {
    it('should update and return updated lead on version match', async () => {
      const updatedLead = { ...mockSupabaseLead, status: 'contacted', version: 2 };
      mockChain.single.mockResolvedValue({
        data: updatedLead,
        error: null,
      });

      const result = await updateLeadWithLock(
        mockSupabaseLead.id,
        { status: 'contacted' as const },
        1
      );

      expect(result.version).toBe(2);
      expect(result.status).toBe('contacted');
      // Should have two .eq() calls (id and version)
      expect(mockChain.eq).toHaveBeenCalledTimes(2);
    });

    it('should throw RaceConditionError on version mismatch', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned', code: 'PGRST116' },
      });

      await expect(
        updateLeadWithLock(mockSupabaseLead.id, { status: 'contacted' as const }, 1)
      ).rejects.toThrow(RaceConditionError);
    });
  });

  // ===========================================
  // claimLead (AC #4)
  // ===========================================

  describe('claimLead', () => {
    it('should claim unclaimed lead successfully', async () => {
      // Step 1: getLeadById (informational read — not a lock)
      mockChain.maybeSingle.mockResolvedValue({
        data: mockSupabaseLead,
        error: null,
      });
      // Step 2: Atomic UPDATE with version + ownership guard
      const claimedLead = {
        ...mockSupabaseLead,
        sales_owner_id: 'user-1',
        sales_owner_name: 'Sales User',
        status: 'contacted',
        version: 2,
        contacted_at: '2026-01-15T00:00:00Z',
      };
      mockChain.single.mockResolvedValue({
        data: claimedLead,
        error: null,
      });

      const result = await claimLead(
        mockSupabaseLead.id,
        'user-1',
        'Sales User',
        'contacted'
      );

      expect(result.success).toBe(true);
      expect(result.isNewClaim).toBe(true);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.lead.salesOwnerId).toBe('user-1');
    });

    it('should return alreadyClaimed when lead owned by someone else', async () => {
      const ownedLead = {
        ...mockSupabaseLead,
        sales_owner_id: 'other-user',
        sales_owner_name: 'Other User',
      };
      mockChain.maybeSingle.mockResolvedValue({
        data: ownedLead,
        error: null,
      });

      const result = await claimLead(
        mockSupabaseLead.id,
        'user-1',
        'Sales User',
        'contacted'
      );

      expect(result.alreadyClaimed).toBe(true);
      expect(result.owner).toBe('Other User');
    });

    it('should allow owner to update their own lead', async () => {
      const ownedLead = {
        ...mockSupabaseLead,
        sales_owner_id: 'user-1',
        sales_owner_name: 'Sales User',
        status: 'contacted',
        contacted_at: '2026-01-10T00:00:00Z',
      };
      mockChain.maybeSingle.mockResolvedValue({
        data: ownedLead,
        error: null,
      });
      const updatedLead = {
        ...ownedLead,
        status: 'closed',
        closed_at: '2026-01-15T00:00:00Z',
        version: 2,
      };
      mockChain.single.mockResolvedValue({
        data: updatedLead,
        error: null,
      });

      const result = await claimLead(
        mockSupabaseLead.id,
        'user-1',
        'Sales User',
        'closed'
      );

      expect(result.success).toBe(true);
      expect(result.isNewClaim).toBe(false);
    });

    it('should throw on lead not found', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        claimLead('nonexistent', 'user-1', 'User', 'contacted')
      ).rejects.toThrow('Lead not found');
    });

    it('should handle concurrent claim via version mismatch', async () => {
      // Step 1: getLeadById returns unclaimed lead
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: mockSupabaseLead,
        error: null,
      });
      // Step 2: Atomic UPDATE fails (version changed — someone else claimed)
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows', code: 'PGRST116' },
      });
      // Step 3: Re-fetch reveals lead claimed by other user
      const claimedByOther = {
        ...mockSupabaseLead,
        sales_owner_id: 'other',
        sales_owner_name: 'Other User',
        version: 2,
      };
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: claimedByOther,
        error: null,
      });

      const result = await claimLead(
        mockSupabaseLead.id,
        'user-1',
        'Sales User',
        'contacted'
      );

      expect(result.alreadyClaimed).toBe(true);
      expect(result.owner).toBe('Other User');
    });
  });

  // ===========================================
  // updateLeadStatus (AC #5)
  // ===========================================

  describe('updateLeadStatus', () => {
    it('should update status for lead owner', async () => {
      const ownedLead = {
        ...mockSupabaseLead,
        sales_owner_id: 'user-1',
        sales_owner_name: 'Sales User',
        status: 'contacted',
      };
      mockChain.maybeSingle.mockResolvedValue({
        data: ownedLead,
        error: null,
      });
      const updatedLead = { ...ownedLead, status: 'closed', version: 2 };
      mockChain.single.mockResolvedValue({
        data: updatedLead,
        error: null,
      });

      const result = await updateLeadStatus(
        mockSupabaseLead.id,
        'user-1',
        'closed'
      );

      expect(result.status).toBe('closed');
    });

    it('should throw NOT_OWNER for unauthorized update', async () => {
      const ownedLead = {
        ...mockSupabaseLead,
        sales_owner_id: 'other-user',
        sales_owner_name: 'Other',
      };
      mockChain.maybeSingle.mockResolvedValue({
        data: ownedLead,
        error: null,
      });

      await expect(
        updateLeadStatus(mockSupabaseLead.id, 'user-1', 'closed')
      ).rejects.toThrow('Not authorized');
    });

    it('should throw when lead not found', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        updateLeadStatus('nonexistent', 'user-1', 'closed')
      ).rejects.toThrow('Lead not found');
    });
  });

  // ===========================================
  // getLeadsWithPagination (AC #5)
  // ===========================================

  describe('getLeadsWithPagination', () => {
    it('should return paginated leads with total count', async () => {
      // Mock the thenable chain for count query
      const mockCountChain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };
      // Make countChain resolve via then (it's a Promise-like)
      const countPromise = Promise.resolve({ count: 5, error: null });
      Object.assign(mockCountChain, { then: countPromise.then.bind(countPromise) });

      const mockDataChain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };
      const dataPromise = Promise.resolve({ data: [mockSupabaseLead], error: null });
      Object.assign(mockDataChain, { then: dataPromise.then.bind(dataPromise) });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        // First call = count, second call = data
        return callCount === 1 ? mockCountChain : mockDataChain;
      });

      const result = await getLeadsWithPagination(1, 20);

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(1);
    });

    it('should apply status filter', async () => {
      const mockFiltered: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };

      const countP = Promise.resolve({ count: 2, error: null });
      const dataP = Promise.resolve({ data: [mockSupabaseLead], error: null });

      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          const c = { ...mockFiltered };
          Object.assign(c, { then: countP.then.bind(countP) });
          return c;
        }
        const d = { ...mockFiltered };
        Object.assign(d, { then: dataP.then.bind(dataP) });
        return d;
      });

      const result = await getLeadsWithPagination(1, 20, { status: 'new' });

      expect(result.total).toBe(2);
    });

    it('should return empty on no results', async () => {
      const emptyChain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };

      const countP = Promise.resolve({ count: 0, error: null });
      const dataP = Promise.resolve({ data: [], error: null });

      let i = 0;
      mockSupabase.from.mockImplementation(() => {
        i++;
        if (i === 1) {
          const c = { ...emptyChain };
          Object.assign(c, { then: countP.then.bind(countP) });
          return c;
        }
        const d = { ...emptyChain };
        Object.assign(d, { then: dataP.then.bind(dataP) });
        return d;
      });

      const result = await getLeadsWithPagination(1, 20);

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('should sanitize search input to prevent filter injection', async () => {
      const mockSearchChain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };

      const countP = Promise.resolve({ count: 0, error: null });
      const dataP = Promise.resolve({ data: [], error: null });

      let idx = 0;
      mockSupabase.from.mockImplementation(() => {
        idx++;
        if (idx === 1) {
          const c = { ...mockSearchChain };
          Object.assign(c, { then: countP.then.bind(countP) });
          return c;
        }
        const d = { ...mockSearchChain };
        Object.assign(d, { then: dataP.then.bind(dataP) });
        return d;
      });

      // Malicious input with comma injection attempt
      await getLeadsWithPagination(1, 20, { search: 'x%,status.eq.closed,company.ilike.%' });

      // The .or() should receive sanitized input (no commas, no %)
      // Periods are kept (safe inside ILIKE %...% pattern)
      expect(mockSearchChain.or).toHaveBeenCalledWith(
        expect.stringContaining('xstatus.eq.closedcompany.ilike.')
      );
      // Should NOT contain raw commas (injection vector)
      const orArg = mockSearchChain.or.mock.calls[0][0] as string;
      // Only 2 commas allowed (separating the 3 ILIKE conditions)
      const commaCount = (orArg.match(/,/g) || []).length;
      expect(commaCount).toBe(2);
    });
  });

  // ===========================================
  // getLeadsCountByStatus
  // ===========================================

  describe('getLeadsCountByStatus', () => {
    it('should return counts per status using parallel count queries', async () => {
      // Each status gets its own count query chain
      // The function calls supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', X)
      // for each of the 6 statuses in parallel
      const statusCounts: Record<string, number> = {
        new: 5,
        claimed: 0,
        contacted: 3,
        closed: 2,
        lost: 0,
        unreachable: 1,
      };

      let callIdx = 0;
      const statuses = ['new', 'claimed', 'contacted', 'closed', 'lost', 'unreachable'];
      mockSupabase.from.mockImplementation(() => {
        const currentStatus = statuses[callIdx % statuses.length];
        callIdx++;
        const chain: Record<string, ReturnType<typeof vi.fn>> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(),
        };
        const countPromise = Promise.resolve({
          count: statusCounts[currentStatus],
          error: null,
        });
        chain.eq.mockReturnValue({
          then: countPromise.then.bind(countPromise),
          catch: countPromise.catch.bind(countPromise),
        });
        return chain;
      });

      const result = await getLeadsCountByStatus();

      // Only statuses with count > 0 are included
      expect(result).toEqual({ new: 5, contacted: 3, closed: 2, unreachable: 1 });
      // Should make 6 calls (one per status)
      expect(mockSupabase.from).toHaveBeenCalledTimes(6);
    });
  });

  // ===========================================
  // lookupCampaignId (AC #6)
  // ===========================================

  describe('lookupCampaignId', () => {
    it('should return campaign_id when found', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: { campaign_id: 'camp-123' },
        error: null,
      });

      const result = await lookupCampaignId('test@example.com');

      expect(result).toBe('camp-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('campaign_events');
    });

    it('should return null when not found', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await lookupCampaignId('unknown@example.com');

      expect(result).toBeNull();
    });

    it('should throw AppError on DB error', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(lookupCampaignId('test@example.com')).rejects.toThrow(
        'Failed to lookup campaign id'
      );
    });
  });

  // ===========================================
  // getAllLeads
  // ===========================================

  describe('getAllLeads', () => {
    it('should return leads as LeadRow[]', async () => {
      const chainPromise = Promise.resolve({
        data: [mockSupabaseLead],
        error: null,
      });
      mockChain.order.mockReturnValue({
        then: chainPromise.then.bind(chainPromise),
        catch: chainPromise.catch.bind(chainPromise),
      });

      const result = await getAllLeads();

      expect(result).toHaveLength(1);
      expect(result[0].rowNumber).toBe(0); // No row number in Supabase
      expect(result[0].email).toBe('test@example.com');
    });
  });

  // ===========================================
  // getAllLeadsByEmail
  // ===========================================

  describe('getAllLeadsByEmail', () => {
    it('should return selected lead fields', async () => {
      const selectPromise = Promise.resolve({
        data: [{ id: 'uuid-1', customer_name: 'Test', email: 'test@test.com', phone: '0812345678', company: 'Co' }],
        error: null,
      });
      mockChain.select.mockReturnValue({
        then: selectPromise.then.bind(selectPromise),
        catch: selectPromise.catch.bind(selectPromise),
      });

      const result = await getAllLeadsByEmail();

      expect(result).toHaveLength(1);
    });
  });

  // ===========================================
  // getLeadsByDateRange
  // ===========================================

  describe('getLeadsByDateRange', () => {
    it('should return leads within date range', async () => {
      const orderPromise = Promise.resolve({
        data: [mockSupabaseLead],
        error: null,
      });
      mockChain.order.mockReturnValue({
        then: orderPromise.then.bind(orderPromise),
        catch: orderPromise.catch.bind(orderPromise),
      });

      const result = await getLeadsByDateRange(
        '2026-01-01T00:00:00Z',
        '2026-12-31T23:59:59Z'
      );

      expect(result).toHaveLength(1);
      expect(mockChain.gte).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00Z');
      expect(mockChain.lte).toHaveBeenCalledWith('created_at', '2026-12-31T23:59:59Z');
    });
  });

  // ===========================================
  // DB Error Handling
  // ===========================================

  describe('Supabase error handling', () => {
    it('should propagate DB errors correctly for addLead', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'unique constraint violated' },
      });

      await expect(
        addLead({ email: 'dup@test.com', customerName: 'Dup' })
      ).rejects.toThrow('Failed to add lead: unique constraint violated');
    });

    it('should propagate DB errors for getLeadById', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'timeout' },
      });

      await expect(getLeadById('any-id')).rejects.toThrow('timeout');
    });

    it('should propagate DB errors for getLeadsByDateRange', async () => {
      const orderPromise = Promise.resolve({
        data: null,
        error: { message: 'connection refused' },
      });
      mockChain.order.mockReturnValue({
        then: orderPromise.then.bind(orderPromise),
        catch: orderPromise.catch.bind(orderPromise),
      });

      await expect(
        getLeadsByDateRange('2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z')
      ).rejects.toThrow('Failed to get leads by date range');
    });
  });

  // ===========================================
  // Helper functions
  // ===========================================

  describe('buildLeadDedupKey', () => {
    it('should build key in lead:{email}:{source} format', () => {
      expect(buildLeadDedupKey('Test@Example.com', 'Brevo')).toBe('lead:test@example.com:Brevo');
    });

    it('should use unknown for empty source', () => {
      expect(buildLeadDedupKey('test@test.com', '')).toBe('lead:test@test.com:unknown');
    });
  });

  describe('supabaseLeadToLeadRow', () => {
    it('should convert SupabaseLead to LeadRow', () => {
      const result = supabaseLeadToLeadRow(mockSupabaseLead);

      expect(result.rowNumber).toBe(0);
      expect(result.version).toBe(1);
      expect(result.email).toBe('test@example.com');
      expect(result.customerName).toBe('Test Customer');
      expect(result.leadUUID).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.workflowId).toBe('wf-123');
      expect(result.campaignId).toBe('wf-123'); // backward compat
    });
  });
});
