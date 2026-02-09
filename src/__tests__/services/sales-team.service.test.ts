/**
 * Sales Team Service Tests (Supabase)
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

// Import after mocks
import {
  getSalesTeamMember,
  getUserByEmail,
  getSalesTeamAll,
  getAllSalesTeamMembers,
  getSalesTeamMemberById,
  updateSalesTeamMember,
  createSalesTeamMember,
  getUnlinkedLINEAccounts,
  linkLINEAccount,
  getUnlinkedDashboardMembers,
} from '../../services/sales-team.service.js';

// ===========================================
// Test Data
// ===========================================

const mockSalesTeamRow = {
  id: 'uuid-001',
  line_user_id: 'U1234567890',
  name: 'Test Sales',
  email: 'test@eneos.co.th',
  phone: '0812345678',
  role: 'sales',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
};

const mockAdminRow = {
  id: 'uuid-002',
  line_user_id: 'U0000000001',
  name: 'Admin User',
  email: 'admin@eneos.co.th',
  phone: '0898765432',
  role: 'admin',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
};

// ===========================================
// Tests
// ===========================================

describe('Sales Team Service (Supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain to return self for method chaining
    for (const key of Object.keys(mockSupabase)) {
      mockSupabase[key].mockReturnValue(mockSupabase);
    }
  });

  // =========================================
  // getSalesTeamMember()
  // =========================================

  describe('getSalesTeamMember', () => {
    it('should return member when found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: {
          line_user_id: 'U1234567890',
          name: 'Test Sales',
          email: 'test@eneos.co.th',
          phone: '0812345678',
        },
        error: null,
      });

      const result = await getSalesTeamMember('U1234567890');

      expect(result).toEqual({
        lineUserId: 'U1234567890',
        name: 'Test Sales',
        email: 'test@eneos.co.th',
        phone: '0812345678',
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('sales_team');
      expect(mockSupabase.eq).toHaveBeenCalledWith('line_user_id', 'U1234567890');
    });

    it('should return null when not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getSalesTeamMember('U9999999999');

      expect(result).toBeNull();
    });

    it('should throw on Supabase error', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'connection error', code: '500' },
      });

      await expect(getSalesTeamMember('U1234567890')).rejects.toThrow();
    });
  });

  // =========================================
  // getUserByEmail()
  // =========================================

  describe('getUserByEmail', () => {
    it('should return active admin with role and status', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockAdminRow,
        error: null,
      });

      const result = await getUserByEmail('admin@eneos.co.th');

      expect(result).toEqual({
        lineUserId: 'U0000000001',
        name: 'Admin User',
        email: 'admin@eneos.co.th',
        phone: '0898765432',
        role: 'admin',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'active',
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'admin@eneos.co.th');
    });

    it('should return active sales member', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockSalesTeamRow,
        error: null,
      });

      const result = await getUserByEmail('test@eneos.co.th');

      expect(result?.role).toBe('sales');
      expect(result?.status).toBe('active');
    });

    it('should return inactive user (blocks login in middleware)', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { ...mockSalesTeamRow, status: 'inactive' },
        error: null,
      });

      const result = await getUserByEmail('test@eneos.co.th');

      expect(result?.status).toBe('inactive');
    });

    it('should return null when not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getUserByEmail('unknown@eneos.co.th');

      expect(result).toBeNull();
    });

    it('should lowercase email for lookup', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await getUserByEmail('Admin@ENEOS.co.th');

      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'admin@eneos.co.th');
    });
  });

  // =========================================
  // getAllSalesTeamMembers()
  // =========================================

  describe('getAllSalesTeamMembers', () => {
    it('should return all members without filter', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockSalesTeamRow, mockAdminRow],
        error: null,
      });

      const result = await getAllSalesTeamMembers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Sales');
      expect(result[1].name).toBe('Admin User');
    });

    it('should filter by status=active', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockSalesTeamRow],
        error: null,
      });

      await getAllSalesTeamMembers({ status: 'active' });

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should filter by role=admin', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockAdminRow],
        error: null,
      });

      await getAllSalesTeamMembers({ role: 'admin' });

      expect(mockSupabase.eq).toHaveBeenCalledWith('role', 'admin');
    });

    it('should skip filter when status=all', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockSalesTeamRow],
        error: null,
      });

      // Reset eq mock to track calls after the fact
      mockSupabase.eq.mockClear();

      await getAllSalesTeamMembers({ status: 'all' });

      // eq should NOT have been called with 'status'
      const statusCalls = mockSupabase.eq.mock.calls.filter(
        (call: unknown[]) => call[0] === 'status'
      );
      expect(statusCalls).toHaveLength(0);
    });
  });

  // =========================================
  // getSalesTeamMemberById()
  // =========================================

  describe('getSalesTeamMemberById', () => {
    it('should return full member details', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockSalesTeamRow,
        error: null,
      });

      const result = await getSalesTeamMemberById('U1234567890');

      expect(result).toEqual({
        lineUserId: 'U1234567890',
        name: 'Test Sales',
        email: 'test@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'active',
      });
    });

    it('should return null when not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getSalesTeamMemberById('U9999999999');

      expect(result).toBeNull();
    });
  });

  // =========================================
  // updateSalesTeamMember()
  // =========================================

  describe('updateSalesTeamMember', () => {
    it('should update and return member', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockSalesTeamRow, email: 'updated@eneos.co.th' },
        error: null,
      });

      const result = await updateSalesTeamMember('U1234567890', {
        email: 'updated@eneos.co.th',
      });

      expect(result?.email).toBe('updated@eneos.co.th');
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('line_user_id', 'U1234567890');
    });

    it('should return null when no rows matched (PGRST116)', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows matched' },
      });

      const result = await updateSalesTeamMember('U9999999999', { role: 'admin' });

      expect(result).toBeNull();
    });

    it('should throw DUPLICATE_EMAIL on 23505', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'unique violation' },
      });

      await expect(
        updateSalesTeamMember('U1234567890', { email: 'existing@eneos.co.th' })
      ).rejects.toThrow('Email already exists');
    });

    it('should lowercase email in update', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: mockSalesTeamRow,
        error: null,
      });

      await updateSalesTeamMember('U1234567890', { email: 'Test@ENEOS.co.th' });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@eneos.co.th' })
      );
    });
  });

  // =========================================
  // createSalesTeamMember()
  // =========================================

  describe('createSalesTeamMember', () => {
    it('should create and return new member', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockSalesTeamRow, line_user_id: null },
        error: null,
      });

      const result = await createSalesTeamMember({
        name: 'New Member',
        email: 'new@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
      });

      expect(result.name).toBe('Test Sales');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@eneos.co.th',
          line_user_id: null,
        })
      );
    });

    it('should throw DUPLICATE_EMAIL on 23505', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'unique violation' },
      });

      await expect(
        createSalesTeamMember({
          name: 'Duplicate',
          email: 'existing@eneos.co.th',
          role: 'sales',
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should set DUPLICATE_EMAIL as error name', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'unique violation' },
      });

      try {
        await createSalesTeamMember({
          name: 'Duplicate',
          email: 'existing@eneos.co.th',
          role: 'sales',
        });
      } catch (err: unknown) {
        expect((err as Error).name).toBe('DUPLICATE_EMAIL');
      }
    });
  });

  // =========================================
  // getUnlinkedLINEAccounts()
  // =========================================

  describe('getUnlinkedLINEAccounts', () => {
    it('should return LINE accounts without email', async () => {
      mockSupabase.is.mockResolvedValueOnce({
        data: [
          { line_user_id: 'U111', name: 'LINE Only', created_at: '2026-01-01T00:00:00Z' },
        ],
        error: null,
      });

      const result = await getUnlinkedLINEAccounts();

      expect(result).toEqual([
        { lineUserId: 'U111', name: 'LINE Only', createdAt: '2026-01-01T00:00:00Z' },
      ]);
      expect(mockSupabase.not).toHaveBeenCalledWith('line_user_id', 'is', null);
      expect(mockSupabase.is).toHaveBeenCalledWith('email', null);
    });

    it('should return empty array when none', async () => {
      mockSupabase.is.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getUnlinkedLINEAccounts();

      expect(result).toEqual([]);
    });
  });

  // =========================================
  // linkLINEAccount()
  // =========================================

  describe('linkLINEAccount', () => {
    it('should link LINE account and delete old row', async () => {
      // linkLINEAccount makes 3 supabase calls:
      // 1. select().eq().maybeSingle() → find LINE account
      // 2. update().eq().is().select().single() → update dashboard member
      // 3. delete().eq() → delete LINE-only row
      mockSupabase.maybeSingle.mockImplementation(() => {
        // Only the first maybeSingle call (step 1)
        return Promise.resolve({
          data: { id: 'line-row-id', line_user_id: 'U111', email: null, name: 'LINE User' },
          error: null,
        });
      });
      mockSupabase.single.mockImplementation(() => {
        // Step 2: update result
        return Promise.resolve({
          data: { ...mockSalesTeamRow, line_user_id: 'U111' },
          error: null,
        });
      });
      // Step 3: delete — eq at the end of delete chain returns a resolved value
      // But eq is also called in steps 1 and 2, so we can't use mockResolvedValueOnce on it.
      // The delete() chain ends with .eq() which should resolve. We mock delete chain to just resolve.
      mockSupabase.delete.mockReturnValue(mockSupabase);

      const result = await linkLINEAccount('test@eneos.co.th', 'U111');

      expect(result).not.toBeNull();
      expect(result?.lineUserId).toBe('U111'); // Updated from mockSalesTeamRow with line_user_id: 'U111'
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it('should return null when target LINE account not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await linkLINEAccount('test@eneos.co.th', 'U9999');

      expect(result).toBeNull();
    });

    it('should throw ALREADY_LINKED when target has email', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'line-row-id', line_user_id: 'U111', email: 'taken@eneos.co.th', name: 'Taken' },
        error: null,
      });

      await expect(
        linkLINEAccount('test@eneos.co.th', 'U111')
      ).rejects.toThrow('LINE account already linked to another member');
    });

    it('should throw LINK_FAILED when update fails (race condition)', async () => {
      // 1. Target found (no email → not linked)
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'line-row-id', line_user_id: 'U111', email: null, name: 'LINE User' },
        error: null,
      });
      // 2. Update fails (race: someone already linked)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });

      await expect(
        linkLINEAccount('test@eneos.co.th', 'U111')
      ).rejects.toThrow('Member not found or already linked');
    });
  });

  // =========================================
  // getUnlinkedDashboardMembers()
  // =========================================

  describe('getUnlinkedDashboardMembers', () => {
    it('should return dashboard members without LINE account', async () => {
      mockSupabase.is.mockResolvedValueOnce({
        data: [
          { ...mockSalesTeamRow, line_user_id: null, email: 'dash@eneos.co.th' },
        ],
        error: null,
      });

      const result = await getUnlinkedDashboardMembers();

      expect(result).toHaveLength(1);
      expect(result[0].lineUserId).toBeNull();
      expect(result[0].email).toBe('dash@eneos.co.th');
    });

    it('should return empty array when none', async () => {
      mockSupabase.is.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getUnlinkedDashboardMembers();

      expect(result).toEqual([]);
    });
  });

  // =========================================
  // getSalesTeamAll()
  // =========================================

  describe('getSalesTeamAll', () => {
    it('should return all LINE-linked members', async () => {
      mockSupabase.not.mockResolvedValueOnce({
        data: [
          { line_user_id: 'U111', name: 'Sales 1', email: null, phone: null },
          { line_user_id: 'U222', name: 'Sales 2', email: 'sales2@eneos.co.th', phone: '0812345678' },
        ],
        error: null,
      });

      const result = await getSalesTeamAll();

      expect(result).toHaveLength(2);
      expect(result[0].lineUserId).toBe('U111');
      expect(result[1].email).toBe('sales2@eneos.co.th');
    });
  });
});
