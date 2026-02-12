/**
 * Sales Team Service Tests (Supabase)
 * Story 9-3: AC #6 — Zero googleapis mocking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const { mockSupabase, mockLogger, mockAuthAdmin } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'from', 'select', 'insert', 'upsert', 'update', 'delete',
    'eq', 'neq', 'in', 'not', 'is', 'or', 'order', 'range',
    'limit', 'gte', 'lte', 'maybeSingle', 'single',
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Story 13-1: Mock Supabase Auth Admin API
  const mockAuthAdmin = {
    inviteUserByEmail: vi.fn(),
    updateUserById: vi.fn(),
  };
  // Attach auth.admin to the chain so supabase.auth.admin.* works
  (chain as Record<string, unknown>).auth = { admin: mockAuthAdmin };

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return { mockSupabase: chain, mockLogger, mockAuthAdmin };
});

vi.mock('../../lib/supabase.js', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => mockLogger),
}));

// Import after mocks
import {
  ensureSalesTeamMember,
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
  autoLinkAuthUser,
  inviteSalesTeamMember,
  syncRoleToSupabaseAuth,
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
      // Skip non-function properties (e.g., 'auth' object)
      if (typeof mockSupabase[key]?.mockReturnValue === 'function') {
        mockSupabase[key].mockReturnValue(mockSupabase);
      }
    }
  });

  // =========================================
  // ensureSalesTeamMember()
  // =========================================

  describe('ensureSalesTeamMember', () => {
    it('should upsert new member with line_user_id and name only', async () => {
      mockSupabase.upsert.mockResolvedValueOnce({ data: null, error: null });

      await ensureSalesTeamMember('U_NEW_USER', 'New Sales');

      expect(mockSupabase.from).toHaveBeenCalledWith('sales_team');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        { line_user_id: 'U_NEW_USER', name: 'New Sales' },
        { onConflict: 'line_user_id' },
      );
    });

    it('should not throw on duplicate (upsert updates name)', async () => {
      mockSupabase.upsert.mockResolvedValueOnce({ data: null, error: null });

      await expect(ensureSalesTeamMember('U_EXISTING', 'Updated Name')).resolves.toBeUndefined();
    });

    it('should log warning on Supabase error and not throw', async () => {
      mockSupabase.upsert.mockResolvedValueOnce({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      });

      await expect(ensureSalesTeamMember('U_ERR', 'Error User')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to ensure sales team member',
        expect.objectContaining({ lineUserId: 'U_ERR' }),
      );
    });

    it('should catch unexpected exceptions and not throw', async () => {
      mockSupabase.upsert.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(ensureSalesTeamMember('U_CRASH', 'Crash User')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ensureSalesTeamMember failed (non-fatal)',
        expect.objectContaining({ lineUserId: 'U_CRASH', error: 'Network timeout' }),
      );
    });

    it('should handle non-Error exceptions gracefully', async () => {
      mockSupabase.upsert.mockRejectedValueOnce('string error');

      await expect(ensureSalesTeamMember('U_STR', 'Str Err')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ensureSalesTeamMember failed (non-fatal)',
        expect.objectContaining({ error: 'Unknown' }),
      );
    });
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
        id: 'uuid-002',
        lineUserId: 'U0000000001',
        name: 'Admin User',
        email: 'admin@eneos.co.th',
        phone: '0898765432',
        role: 'admin',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'active',
        authUserId: null,
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
  // autoLinkAuthUser()
  // =========================================

  describe('autoLinkAuthUser', () => {
    it('should update auth_user_id with race-safe IS NULL guard', async () => {
      mockSupabase.is.mockResolvedValueOnce({ data: null, error: null });

      await autoLinkAuthUser('member-uuid-001', 'auth-uuid-abc');

      expect(mockSupabase.from).toHaveBeenCalledWith('sales_team');
      expect(mockSupabase.update).toHaveBeenCalledWith({ auth_user_id: 'auth-uuid-abc' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'member-uuid-001');
      expect(mockSupabase.is).toHaveBeenCalledWith('auth_user_id', null);
    });

    it('should not throw on Supabase error (fire-and-forget)', async () => {
      mockSupabase.is.mockResolvedValueOnce({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      });

      await expect(autoLinkAuthUser('member-001', 'auth-001')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'autoLinkAuthUser: DB update failed (non-fatal)',
        expect.objectContaining({ memberId: 'member-001' }),
      );
    });

    it('should catch unexpected exceptions and not throw', async () => {
      mockSupabase.is.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(autoLinkAuthUser('member-002', 'auth-002')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'autoLinkAuthUser failed (non-fatal)',
        expect.objectContaining({ memberId: 'member-002', error: 'Network timeout' }),
      );
    });

    it('should handle non-Error exceptions gracefully', async () => {
      mockSupabase.is.mockRejectedValueOnce('string error');

      await expect(autoLinkAuthUser('member-003', 'auth-003')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'autoLinkAuthUser failed (non-fatal)',
        expect.objectContaining({ error: 'Unknown' }),
      );
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

  // =========================================
  // inviteSalesTeamMember() — Story 13-1
  // =========================================

  describe('inviteSalesTeamMember', () => {
    it('should create sales_team record FIRST then invite via Supabase Auth', async () => {
      // getUserByEmail returns null (new user)
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // createSalesTeamMember: insert().select().single()
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          line_user_id: null,
          name: 'New User',
          email: 'new@example.com',
          phone: null,
          role: 'viewer',
          status: 'active',
          created_at: '2026-02-12T10:00:00Z',
        },
        error: null,
      });
      // Supabase Auth invite succeeds
      mockAuthAdmin.inviteUserByEmail.mockResolvedValueOnce({ data: {}, error: null });

      const result = await inviteSalesTeamMember('new@example.com', 'New User', 'viewer');

      expect(result.member.email).toBe('new@example.com');
      expect(result.member.role).toBe('viewer');
      expect(result.authInviteSent).toBe(true);
      expect(mockAuthAdmin.inviteUserByEmail).toHaveBeenCalledWith('new@example.com', {
        data: { role: 'viewer' },
      });
    });

    it('should return authInviteSent=false when Supabase invite fails', async () => {
      // getUserByEmail returns null (new user)
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // createSalesTeamMember succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          line_user_id: null,
          name: 'User',
          email: 'user@example.com',
          phone: null,
          role: 'viewer',
          status: 'active',
          created_at: '2026-02-12T10:00:00Z',
        },
        error: null,
      });
      // Supabase Auth invite fails
      mockAuthAdmin.inviteUserByEmail.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email rate limit exceeded' },
      });

      const result = await inviteSalesTeamMember('user@example.com', 'User', 'viewer');

      expect(result.member.email).toBe('user@example.com');
      expect(result.authInviteSent).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Supabase invite failed, sales_team record kept',
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });

    it('should return authInviteSent=false when Supabase invite throws', async () => {
      // getUserByEmail returns null (new user)
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // createSalesTeamMember succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          line_user_id: null,
          name: 'User',
          email: 'user@example.com',
          phone: null,
          role: 'viewer',
          status: 'active',
          created_at: '2026-02-12T10:00:00Z',
        },
        error: null,
      });
      // Supabase Auth invite throws exception
      mockAuthAdmin.inviteUserByEmail.mockRejectedValueOnce(new Error('Network error'));

      const result = await inviteSalesTeamMember('user@example.com', 'User', 'viewer');

      expect(result.authInviteSent).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Supabase invite error, sales_team record kept',
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });

    it('should throw DUPLICATE_EMAIL when user already fully registered', async () => {
      // getUserByEmail returns existing user WITH authUserId
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: {
          ...mockSalesTeamRow,
          auth_user_id: 'auth-uuid-existing',
        },
        error: null,
      });

      await expect(
        inviteSalesTeamMember('test@eneos.co.th', 'Test', 'viewer')
      ).rejects.toThrow('User already exists');
    });

    it('should re-invite when email exists but no auth_user_id (Task 1.5)', async () => {
      // getUserByEmail returns existing user WITHOUT authUserId
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: {
          ...mockSalesTeamRow,
          auth_user_id: null,
        },
        error: null,
      });
      // Supabase Auth invite succeeds (re-invite)
      mockAuthAdmin.inviteUserByEmail.mockResolvedValueOnce({ data: {}, error: null });

      const result = await inviteSalesTeamMember('test@eneos.co.th', 'Test', 'viewer');

      // Should NOT call createSalesTeamMember (skip record creation)
      expect(mockSupabase.insert).not.toHaveBeenCalled();
      expect(result.member.email).toBe('test@eneos.co.th');
      expect(result.authInviteSent).toBe(true);
    });

    it('should normalize admin role correctly', async () => {
      // getUserByEmail returns null
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // createSalesTeamMember succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          line_user_id: null,
          name: 'Admin',
          email: 'admin@example.com',
          phone: null,
          role: 'admin',
          status: 'active',
          created_at: '2026-02-12T10:00:00Z',
        },
        error: null,
      });
      mockAuthAdmin.inviteUserByEmail.mockResolvedValueOnce({ data: {}, error: null });

      const result = await inviteSalesTeamMember('admin@example.com', 'Admin', 'admin');

      expect(result.member.role).toBe('admin');
      expect(mockAuthAdmin.inviteUserByEmail).toHaveBeenCalledWith('admin@example.com', {
        data: { role: 'admin' },
      });
    });
  });

  // =========================================
  // syncRoleToSupabaseAuth() — Story 13-1
  // =========================================

  describe('syncRoleToSupabaseAuth', () => {
    it('should update app_metadata.role via Supabase Auth Admin', async () => {
      mockAuthAdmin.updateUserById.mockResolvedValueOnce({ data: {}, error: null });

      await syncRoleToSupabaseAuth('auth-uuid-123', 'admin');

      expect(mockAuthAdmin.updateUserById).toHaveBeenCalledWith('auth-uuid-123', {
        app_metadata: { role: 'admin' },
      });
    });

    it('should skip when authUserId is null', async () => {
      await syncRoleToSupabaseAuth(null, 'admin');

      expect(mockAuthAdmin.updateUserById).not.toHaveBeenCalled();
    });

    it('should not throw on Supabase error (fire-and-forget)', async () => {
      mockAuthAdmin.updateUserById.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      await expect(syncRoleToSupabaseAuth('auth-uuid-456', 'viewer')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to sync role to Supabase Auth',
        expect.objectContaining({ authUserId: 'auth-uuid-456', role: 'viewer' }),
      );
    });

    it('should catch unexpected exceptions and not throw', async () => {
      mockAuthAdmin.updateUserById.mockRejectedValueOnce(new Error('Network error'));

      await expect(syncRoleToSupabaseAuth('auth-uuid-789', 'admin')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'syncRoleToSupabaseAuth failed (non-fatal)',
        expect.objectContaining({ authUserId: 'auth-uuid-789' }),
      );
    });
  });
});
