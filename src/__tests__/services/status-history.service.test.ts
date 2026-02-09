/**
 * Status History Service Tests (Supabase)
 * Story 9-3: AC #6 — Zero googleapis mocking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const { mockSupabase, mockLogger } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'from', 'select', 'insert', 'upsert', 'update', 'delete',
    'eq', 'neq', 'in', 'not', 'is', 'or', 'order', 'range',
    'limit', 'gte', 'lte', 'maybeSingle', 'single',
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return { mockSupabase: chain, mockLogger };
});

vi.mock('../../lib/supabase.js', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => mockLogger),
}));

vi.mock('../../services/leads.service.js', () => ({
  supabaseLeadToLeadRow: vi.fn((s) => ({
    ...s,
    rowNumber: 0,
    version: s.version || 1,
    customerName: s.customer_name,
    email: s.email,
  })),
}));

// Import after mocks
import {
  addStatusHistory,
  getStatusHistory,
  getAllStatusHistory,
} from '../../services/status-history.service.js';

// ===========================================
// Test Data
// ===========================================

const mockHistoryRow = {
  id: 'history-uuid-1',
  lead_id: 'lead-uuid-1',
  status: 'contacted',
  changed_by_id: 'U1234567890',
  changed_by_name: 'Sales Person',
  notes: null,
  created_at: '2026-01-15T10:00:00Z',
};

const mockLeadRow = {
  id: 'lead-uuid-1',
  email: 'test@example.com',
  customer_name: 'Test Company',
  phone: '0812345678',
  company: 'Test Corp',
  industry_ai: 'IT',
  status: 'contacted',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

// ===========================================
// Tests
// ===========================================

describe('Status History Service (Supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain to return self for method chaining
    for (const key of Object.keys(mockSupabase)) {
      mockSupabase[key].mockReturnValue(mockSupabase);
    }
  });

  // =========================================
  // addStatusHistory() — AC #4 Fire-and-forget
  // =========================================

  describe('addStatusHistory', () => {
    it('should insert status history entry', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await addStatusHistory({
        leadUUID: 'lead-uuid-1',
        status: 'contacted',
        changedById: 'U1234567890',
        changedByName: 'Sales Person',
        timestamp: '2026-01-15T10:00:00Z',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('status_history');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        lead_id: 'lead-uuid-1',
        status: 'contacted',
        changed_by_id: 'U1234567890',
        changed_by_name: 'Sales Person',
        notes: null,
      });
    });

    it('should not throw when insert fails (fire-and-forget)', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { code: '23503', message: 'foreign key violation' },
      });

      // Should NOT throw
      await addStatusHistory({
        leadUUID: 'nonexistent-id',
        status: 'new',
        changedById: 'System',
        changedByName: 'System',
        timestamp: new Date().toISOString(),
      });

      // Verify logger.error was called
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to add status history entry',
        expect.objectContaining({
          leadUUID: 'nonexistent-id',
          status: 'new',
        })
      );
    });

    it('should not throw on network error (fire-and-forget)', async () => {
      mockSupabase.insert.mockRejectedValueOnce(new Error('Network timeout'));

      // Should NOT throw
      await addStatusHistory({
        leadUUID: 'lead-uuid-1',
        status: 'closed',
        changedById: 'U1234567890',
        changedByName: 'Sales Person',
        timestamp: new Date().toISOString(),
      });

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should include notes if provided', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await addStatusHistory({
        leadUUID: 'lead-uuid-1',
        status: 'lost',
        changedById: 'U1234567890',
        changedByName: 'Sales Person',
        timestamp: new Date().toISOString(),
        notes: 'Customer not interested',
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Customer not interested',
        })
      );
    });
  });

  // =========================================
  // getStatusHistory()
  // =========================================

  describe('getStatusHistory', () => {
    it('should return sorted entries for a lead', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { ...mockHistoryRow, status: 'new', created_at: '2026-01-01T00:00:00Z', changed_by_id: 'System', changed_by_name: 'System' },
          mockHistoryRow,
        ],
        error: null,
      });

      const result = await getStatusHistory('lead-uuid-1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('new');
      expect(result[1].status).toBe('contacted');
      expect(result[0].leadUUID).toBe('lead-uuid-1');
      expect(result[0].timestamp).toBe('2026-01-01T00:00:00Z');

      expect(mockSupabase.eq).toHaveBeenCalledWith('lead_id', 'lead-uuid-1');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should return empty array when no history', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getStatusHistory('lead-uuid-1');

      expect(result).toEqual([]);
    });

    it('should throw on Supabase error', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'query failed', code: '500' },
      });

      await expect(getStatusHistory('lead-uuid-1')).rejects.toThrow();
    });

    it('should handle null changed_by fields', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { ...mockHistoryRow, changed_by_id: null, changed_by_name: null },
        ],
        error: null,
      });

      const result = await getStatusHistory('lead-uuid-1');

      expect(result[0].changedById).toBe('');
      expect(result[0].changedByName).toBe('');
    });
  });

  // =========================================
  // getAllStatusHistory()
  // =========================================

  describe('getAllStatusHistory', () => {
    it('should return paginated entries with lead data and changedByOptions', async () => {
      // 1. Main query with count
      mockSupabase.range.mockResolvedValueOnce({
        data: [mockHistoryRow],
        count: 1,
        error: null,
      });
      // 2. Lead data query
      mockSupabase.in.mockResolvedValueOnce({
        data: [mockLeadRow],
        error: null,
      });
      // 3. ChangedBy options query
      mockSupabase.not.mockResolvedValueOnce({
        data: [
          { changed_by_id: 'U1234567890', changed_by_name: 'Sales Person' },
          { changed_by_id: 'System', changed_by_name: 'System' },
        ],
        error: null,
      });

      const result = await getAllStatusHistory({ page: 1, limit: 20 });

      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.entries[0].leadUUID).toBe('lead-uuid-1');
      expect(result.entries[0].lead).toBeDefined();
      expect(result.changedByOptions).toHaveLength(2);
      expect(result.changedByOptions[0]).toEqual({ id: 'U1234567890', name: 'Sales Person' });
    });

    it('should apply date filters', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });
      mockSupabase.not.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getAllStatusHistory({
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', '2026-01-01');
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', '2026-01-31');
    });

    it('should apply status filter', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });
      mockSupabase.not.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getAllStatusHistory({
        status: ['contacted', 'closed'],
      });

      expect(mockSupabase.in).toHaveBeenCalledWith('status', ['contacted', 'closed']);
    });

    it('should apply changedBy filter', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });
      mockSupabase.not.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getAllStatusHistory({
        changedBy: 'U1234567890',
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith('changed_by_id', 'U1234567890');
    });

    it('should handle pagination offset correctly', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });
      mockSupabase.not.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getAllStatusHistory({ page: 3, limit: 10 });

      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29);
    });

    it('should deduplicate changedByOptions', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });
      mockSupabase.not.mockResolvedValueOnce({
        data: [
          { changed_by_id: 'U111', changed_by_name: 'Sales 1' },
          { changed_by_id: 'U111', changed_by_name: 'Sales 1' },
          { changed_by_id: 'U222', changed_by_name: 'Sales 2' },
        ],
        error: null,
      });

      const result = await getAllStatusHistory({});

      expect(result.changedByOptions).toHaveLength(2);
    });
  });
});
