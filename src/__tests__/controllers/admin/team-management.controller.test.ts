/**
 * Team Management Controller Tests
 * Tests for GET/PATCH/POST /api/admin/sales-team endpoints (Story 7-4 + 7-4b)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Hoisted mocks
const { mockSalesTeamService } = vi.hoisted(() => {
  return {
    mockSalesTeamService: {
      getAllSalesTeamMembers: vi.fn(),
      getSalesTeamMemberById: vi.fn(),
      updateSalesTeamMember: vi.fn(),
      createSalesTeamMember: vi.fn(),
      getUnlinkedLINEAccounts: vi.fn(),
      linkLINEAccount: vi.fn(),
      // Story 13-1: Invite & role sync
      inviteSalesTeamMember: vi.fn(),
      syncRoleToSupabaseAuth: vi.fn(),
      getUserByEmail: vi.fn(),
    },
  };
});

vi.mock('../../../services/sales-team.service.js', () => ({
  ...mockSalesTeamService,
}));

import {
  getSalesTeamList,
  getSalesTeamMemberById,
  updateSalesTeamMember,
  createSalesTeamMember,
  getUnlinkedLINEAccounts,
  linkLINEAccount,
  inviteSalesTeamMember,
} from '../../../controllers/admin/team-management.controller.js';

describe('Team Management Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockTeamMembers = [
    {
      lineUserId: 'Uabc123xyz',
      name: 'สมชาย ใจดี',
      email: 'somchai@eneos.co.th',
      phone: '0812345678',
      role: 'sales',
      status: 'active',
      createdAt: '2026-01-15T10:30:00Z',
    },
    {
      lineUserId: 'Udef456uvw',
      name: 'สมหญิง รักดี',
      email: 'somying@eneos.co.th',
      phone: '0898765432',
      role: 'admin',
      status: 'active',
      createdAt: '2026-01-10T08:00:00Z',
    },
    {
      lineUserId: 'Ughi789rst',
      name: 'วิชัย สุขสันต์',
      email: 'wichai@eneos.co.th',
      phone: '0867891234',
      role: 'sales',
      status: 'inactive',
      createdAt: '2026-01-05T14:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { email: 'admin@eneos.co.th', role: 'admin', authUserId: '123', memberId: '123' },
      requestId: 'test-request-id',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('GET /api/admin/sales-team (getSalesTeamList)', () => {
    it('should return all active members by default', async () => {
      const activeMembers = mockTeamMembers.filter((m) => m.status === 'active');
      mockSalesTeamService.getAllSalesTeamMembers.mockResolvedValue(activeMembers);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.getAllSalesTeamMembers).toHaveBeenCalledWith({
        status: 'active',
        role: undefined,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: activeMembers,
        total: 2,
      });
    });

    it('should filter by status when provided', async () => {
      mockReq.query = { status: 'inactive' };
      const inactiveMembers = mockTeamMembers.filter((m) => m.status === 'inactive');
      mockSalesTeamService.getAllSalesTeamMembers.mockResolvedValue(inactiveMembers);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.getAllSalesTeamMembers).toHaveBeenCalledWith({
        status: 'inactive',
        role: undefined,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: inactiveMembers,
        total: 1,
      });
    });

    it('should filter by role when provided', async () => {
      mockReq.query = { role: 'admin' };
      const adminMembers = mockTeamMembers.filter((m) => m.role === 'admin' && m.status === 'active');
      mockSalesTeamService.getAllSalesTeamMembers.mockResolvedValue(adminMembers);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.getAllSalesTeamMembers).toHaveBeenCalledWith({
        status: 'active',
        role: 'admin',
      });
    });

    it('should return all members when status=all', async () => {
      mockReq.query = { status: 'all' };
      mockSalesTeamService.getAllSalesTeamMembers.mockResolvedValue(mockTeamMembers);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.getAllSalesTeamMembers).toHaveBeenCalledWith({
        status: 'all',
        role: undefined,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTeamMembers,
        total: 3,
      });
    });

    it('should pass errors to next middleware', async () => {
      const error = new Error('Database error');
      mockSalesTeamService.getAllSalesTeamMembers.mockRejectedValue(error);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/admin/sales-team/:lineUserId (getSalesTeamMemberById)', () => {
    it('should return a single member by lineUserId', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockSalesTeamService.getSalesTeamMemberById.mockResolvedValue(mockTeamMembers[0]);

      await getSalesTeamMemberById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.getSalesTeamMemberById).toHaveBeenCalledWith('Uabc123xyz');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTeamMembers[0],
      });
    });

    it('should return 404 when member not found', async () => {
      mockReq.params = { lineUserId: 'Unotfound' };
      mockSalesTeamService.getSalesTeamMemberById.mockResolvedValue(null);

      await getSalesTeamMemberById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Sales team member not found',
      });
    });
  });

  describe('PATCH /api/admin/sales-team/:lineUserId (updateSalesTeamMember)', () => {
    it('should update member email with valid domain', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { email: 'newemail@eneos.co.th' };
      const updatedMember = { ...mockTeamMembers[0], email: 'newemail@eneos.co.th' };
      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        email: 'newemail@eneos.co.th',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedMember,
      });
    });

    it('should accept any email domain (Story 13-1: no @eneos.co.th restriction)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { email: 'test@gmail.com' };
      const updatedMember = { ...mockTeamMembers[0], email: 'test@gmail.com' };
      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        email: 'test@gmail.com',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should allow updating role to admin', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { role: 'admin' };
      const updatedMember = { ...mockTeamMembers[0], role: 'admin' };
      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        role: 'admin',
      });
    });

    it('should allow updating status to inactive', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { status: 'inactive' };
      const updatedMember = { ...mockTeamMembers[0], status: 'inactive' };
      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        status: 'inactive',
      });
    });

    it('should allow setting email to null (clear email)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { email: null };
      const updatedMember = { ...mockTeamMembers[0], email: null };
      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        email: null,
      });
    });

    it('should return 404 when member not found', async () => {
      mockReq.params = { lineUserId: 'Unotfound' };
      mockReq.body = { email: 'test@eneos.co.th' };
      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(null);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Sales team member not found',
      });
    });

    it('should reject invalid role value', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { role: 'superadmin' };

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject invalid status value', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { status: 'pending' };

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle partial updates (phone only)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { phone: '0891112222' };
      const updatedMember = { ...mockTeamMembers[0], phone: '0891112222' };
      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        phone: '0891112222',
      });
    });
  });

  describe('POST /api/admin/sales-team (createSalesTeamMember) - Story 7-4b', () => {
    it('should create member with valid data (AC7)', async () => {
      mockReq.body = {
        name: 'สมชาย ทดสอบ',
        email: 'somchai.test@eneos.co.th',
        phone: '0812345678',
        role: 'viewer',
      };

      const createdMember = {
        lineUserId: null,
        name: 'สมชาย ทดสอบ',
        email: 'somchai.test@eneos.co.th',
        phone: '0812345678',
        role: 'viewer',
        status: 'active',
        createdAt: '2026-01-27T10:00:00Z',
      };

      mockSalesTeamService.createSalesTeamMember.mockResolvedValue(createdMember);

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.createSalesTeamMember).toHaveBeenCalledWith({
        name: 'สมชาย ทดสอบ',
        email: 'somchai.test@eneos.co.th',
        phone: '0812345678',
        role: 'viewer',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdMember,
      });
    });

    it('should reject missing required field: name (AC4)', async () => {
      mockReq.body = {
        email: 'test@eneos.co.th',
        role: 'viewer',
      };

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Name is required'),
        })
      );
    });

    it('should reject missing required field: email (AC3)', async () => {
      mockReq.body = {
        name: 'Test User',
        role: 'viewer',
      };

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Email is required'),
        })
      );
    });

    it('should reject invalid email domain (AC3)', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@gmail.com',
        role: 'viewer',
      };

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('@eneos.co.th'),
        })
      );
    });

    it('should reject invalid Thai phone format (AC5)', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@eneos.co.th',
        phone: '123',
        role: 'viewer',
      };

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('phone'),
        })
      );
    });

    it('should allow empty phone (optional field) (AC5)', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@eneos.co.th',
        role: 'viewer',
      };

      const createdMember = {
        lineUserId: null,
        name: 'Test User',
        email: 'test@eneos.co.th',
        phone: null,
        role: 'viewer',
        status: 'active',
        createdAt: '2026-01-27T10:00:00Z',
      };

      mockSalesTeamService.createSalesTeamMember.mockResolvedValue(createdMember);

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdMember,
      });
    });

    it('should return 409 for duplicate email (AC6)', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'duplicate@eneos.co.th',
        role: 'viewer',
      };

      const error = new Error('Email already exists');
      error.name = 'DUPLICATE_EMAIL';
      mockSalesTeamService.createSalesTeamMember.mockRejectedValue(error);

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email already exists',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should create admin role member', async () => {
      mockReq.body = {
        name: 'Admin User',
        email: 'admin@eneos.co.th',
        role: 'admin',
      };

      const createdMember = {
        lineUserId: null,
        name: 'Admin User',
        email: 'admin@eneos.co.th',
        phone: null,
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-27T10:00:00Z',
      };

      mockSalesTeamService.createSalesTeamMember.mockResolvedValue(createdMember);

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdMember,
      });
    });

    it('should reject invalid role value', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@eneos.co.th',
        role: 'superadmin',
      };

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should normalize phone with hyphens (AC7, Task 1.5)', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@eneos.co.th',
        phone: '081-234-5678',
        role: 'viewer',
      };

      const createdMember = {
        lineUserId: null,
        name: 'Test User',
        email: 'test@eneos.co.th',
        phone: '0812345678', // Normalized
        role: 'viewer',
        status: 'active',
        createdAt: '2026-01-27T10:00:00Z',
      };

      mockSalesTeamService.createSalesTeamMember.mockResolvedValue(createdMember);

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdMember,
      });
    });
  });

  describe('GET /api/admin/sales-team/unlinked-line-accounts (getUnlinkedLINEAccounts) - Story 7-4b', () => {
    it('should return list of unlinked LINE accounts (AC9, AC13)', async () => {
      const unlinkedAccounts = [
        {
          lineUserId: 'Uunlinked123',
          name: 'Unlinked User 1',
          createdAt: '2026-01-20T10:00:00Z',
        },
        {
          lineUserId: 'Uunlinked456',
          name: 'Unlinked User 2',
          createdAt: '2026-01-21T14:30:00Z',
        },
      ];

      mockSalesTeamService.getUnlinkedLINEAccounts.mockResolvedValue(unlinkedAccounts);

      await getUnlinkedLINEAccounts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.getUnlinkedLINEAccounts).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: unlinkedAccounts,
        total: 2,
      });
    });

    it('should return empty array when no unlinked accounts (AC10)', async () => {
      mockSalesTeamService.getUnlinkedLINEAccounts.mockResolvedValue([]);

      await getUnlinkedLINEAccounts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        total: 0,
      });
    });

    it('should pass errors to next middleware', async () => {
      const error = new Error('Database error');
      mockSalesTeamService.getUnlinkedLINEAccounts.mockRejectedValue(error);

      await getUnlinkedLINEAccounts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('PATCH /api/admin/sales-team/email/:email/link (linkLINEAccount) - Story 7-4b', () => {
    it('should link LINE account successfully (AC11)', async () => {
      mockReq.params = { email: 'test@eneos.co.th' };
      mockReq.body = { targetLineUserId: 'Uabc123xyz' };

      const linkedMember = {
        lineUserId: 'Uabc123xyz',
        name: 'Test User',
        email: 'test@eneos.co.th',
        phone: '0812345678',
        role: 'sales' as const,
        createdAt: '2026-01-25T10:00:00Z',
        status: 'active' as const,
      };

      mockSalesTeamService.linkLINEAccount.mockResolvedValue(linkedMember);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.linkLINEAccount).toHaveBeenCalledWith(
        'test@eneos.co.th',
        'Uabc123xyz'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: linkedMember,
      });
    });

    it('should reject missing targetLineUserId', async () => {
      mockReq.params = { email: 'test@eneos.co.th' };
      mockReq.body = {};

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('targetLineUserId'),
        })
      );
    });

    it('should return 404 when member not found', async () => {
      mockReq.params = { email: 'notfound@eneos.co.th' };
      mockReq.body = { targetLineUserId: 'Uabc123xyz' };

      mockSalesTeamService.linkLINEAccount.mockResolvedValue(null);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard member not found or already linked',
      });
    });

    it('should return 409 for already-linked LINE account (AC15)', async () => {
      mockReq.params = { email: 'test@eneos.co.th' };
      mockReq.body = { targetLineUserId: 'Uabc123xyz' };

      const error = new Error('LINE account already linked to Another User');
      error.name = 'ALREADY_LINKED';
      mockSalesTeamService.linkLINEAccount.mockRejectedValue(error);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'LINE account already linked to Another User',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 409 for LINK_FAILED (race condition)', async () => {
      mockReq.params = { email: 'test@eneos.co.th' };
      mockReq.body = { targetLineUserId: 'Uabc123xyz' };

      const error = new Error('Member not found or already linked');
      error.name = 'LINK_FAILED';
      mockSalesTeamService.linkLINEAccount.mockRejectedValue(error);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Member not found or already linked',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass errors to next middleware', async () => {
      mockReq.params = { email: 'test@eneos.co.th' };
      mockReq.body = { targetLineUserId: 'Uabc123xyz' };

      const error = new Error('Database error');
      mockSalesTeamService.linkLINEAccount.mockRejectedValue(error);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ===========================================
  // Story 13-1: Admin User Management Tests
  // ===========================================

  describe('POST /api/admin/sales-team/invite (inviteSalesTeamMember) - Story 13-1', () => {
    it('should invite user successfully (Task 8.1)', async () => {
      mockReq.body = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'viewer',
      };

      const inviteResult = {
        member: {
          lineUserId: null,
          name: 'New User',
          email: 'newuser@example.com',
          phone: null,
          role: 'viewer',
          status: 'active',
          createdAt: '2026-02-12T10:00:00Z',
        },
        authInviteSent: true,
      };

      mockSalesTeamService.inviteSalesTeamMember.mockResolvedValue(inviteResult);

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.inviteSalesTeamMember).toHaveBeenCalledWith(
        'newuser@example.com',
        'New User',
        'viewer'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          member: inviteResult.member,
          authInviteSent: true,
        },
      });
    });

    it('should invite admin user successfully', async () => {
      mockReq.body = {
        email: 'admin2@company.com',
        name: 'Admin Two',
        role: 'admin',
      };

      const inviteResult = {
        member: {
          lineUserId: null,
          name: 'Admin Two',
          email: 'admin2@company.com',
          phone: null,
          role: 'admin',
          status: 'active',
          createdAt: '2026-02-12T10:00:00Z',
        },
        authInviteSent: true,
      };

      mockSalesTeamService.inviteSalesTeamMember.mockResolvedValue(inviteResult);

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.inviteSalesTeamMember).toHaveBeenCalledWith(
        'admin2@company.com',
        'Admin Two',
        'admin'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 409 for duplicate email (Task 8.2)', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'viewer',
      };

      const error = new Error('User already exists');
      error.name = 'DUPLICATE_EMAIL';
      mockSalesTeamService.inviteSalesTeamMember.mockRejectedValue(error);

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'User already exists',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return success with authInviteSent=false when Supabase invite fails (Task 8.3)', async () => {
      mockReq.body = {
        email: 'user@example.com',
        name: 'User Name',
        role: 'viewer',
      };

      const inviteResult = {
        member: {
          lineUserId: null,
          name: 'User Name',
          email: 'user@example.com',
          phone: null,
          role: 'viewer',
          status: 'active',
          createdAt: '2026-02-12T10:00:00Z',
        },
        authInviteSent: false, // Supabase invite failed but record created
      };

      mockSalesTeamService.inviteSalesTeamMember.mockResolvedValue(inviteResult);

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          member: inviteResult.member,
          authInviteSent: false,
        },
      });
    });

    it('should reject missing email', async () => {
      mockReq.body = {
        name: 'No Email',
        role: 'viewer',
      };

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject invalid email format', async () => {
      mockReq.body = {
        email: 'not-an-email',
        name: 'Bad Email',
        role: 'viewer',
      };

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing name', async () => {
      mockReq.body = {
        email: 'user@example.com',
        role: 'viewer',
      };

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject name too short', async () => {
      mockReq.body = {
        email: 'user@example.com',
        name: 'X',
        role: 'viewer',
      };

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid role (not admin/viewer)', async () => {
      mockReq.body = {
        email: 'user@example.com',
        name: 'Valid Name',
        role: 'sales',
      };

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Role must be admin or viewer'),
          }),
        })
      );
    });

    it('should accept any email domain (no @eneos.co.th restriction)', async () => {
      mockReq.body = {
        email: 'user@gmail.com',
        name: 'Gmail User',
        role: 'viewer',
      };

      const inviteResult = {
        member: {
          lineUserId: null,
          name: 'Gmail User',
          email: 'user@gmail.com',
          phone: null,
          role: 'viewer',
          status: 'active',
          createdAt: '2026-02-12T10:00:00Z',
        },
        authInviteSent: true,
      };

      mockSalesTeamService.inviteSalesTeamMember.mockResolvedValue(inviteResult);

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should pass unexpected errors to next middleware', async () => {
      mockReq.body = {
        email: 'user@example.com',
        name: 'Valid Name',
        role: 'viewer',
      };

      const error = new Error('Unexpected DB error');
      mockSalesTeamService.inviteSalesTeamMember.mockRejectedValue(error);

      await inviteSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('PATCH /api/admin/sales-team/:lineUserId - Self-disable prevention (Story 13-1 Task 4)', () => {
    it('should block self-disable (Task 8.8)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { status: 'inactive' };
      // req.user.email matches the target member's email
      mockReq.user = { email: 'somchai@eneos.co.th', role: 'admin', authUserId: '123', memberId: '123' };

      mockSalesTeamService.getSalesTeamMemberById.mockResolvedValue({
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        phone: '0812345678',
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-15T10:30:00Z',
      });

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SELF_DISABLE',
          message: 'Cannot disable your own account',
        },
      });
      // Should NOT call updateSalesTeamMember service
      expect(mockSalesTeamService.updateSalesTeamMember).not.toHaveBeenCalled();
    });

    it('should allow disabling another user (Task 8.7)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { status: 'inactive' };
      // req.user.email does NOT match target
      mockReq.user = { email: 'admin@eneos.co.th', role: 'admin', authUserId: '456', memberId: '456' };

      mockSalesTeamService.getSalesTeamMemberById.mockResolvedValue({
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
        status: 'active',
        createdAt: '2026-01-15T10:30:00Z',
      });

      const disabledMember = {
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
        status: 'inactive',
        createdAt: '2026-01-15T10:30:00Z',
      };

      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(disabledMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: disabledMember,
      });
    });

    it('should allow re-enabling a disabled user (Task 8.9)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { status: 'active' };

      const enabledMember = {
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
        status: 'active',
        createdAt: '2026-01-15T10:30:00Z',
      };

      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(enabledMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        status: 'active',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: enabledMember,
      });
    });
  });

  describe('PATCH /api/admin/sales-team/:lineUserId - Role sync (Story 13-1 Task 2)', () => {
    it('should trigger role sync when role changes and member has auth_user_id (Task 8.5)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { role: 'admin' };

      const updatedMember = {
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        phone: '0812345678',
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-15T10:30:00Z',
      };

      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);
      mockSalesTeamService.getUserByEmail.mockResolvedValue({
        id: 'uuid-001',
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        role: 'admin',
        status: 'active',
        authUserId: 'auth-uuid-abc',
      });
      mockSalesTeamService.syncRoleToSupabaseAuth.mockResolvedValue(undefined);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Wait for fire-and-forget promises to settle
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockSalesTeamService.getUserByEmail).toHaveBeenCalledWith('somchai@eneos.co.th');
      expect(mockSalesTeamService.syncRoleToSupabaseAuth).toHaveBeenCalledWith('auth-uuid-abc', 'admin');
    });

    it('should skip role sync when member has no auth_user_id (Task 8.6)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { role: 'viewer' };

      const updatedMember = {
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        phone: '0812345678',
        role: 'viewer',
        status: 'active',
        createdAt: '2026-01-15T10:30:00Z',
      };

      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);
      mockSalesTeamService.getUserByEmail.mockResolvedValue({
        id: 'uuid-001',
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        role: 'viewer',
        status: 'active',
        authUserId: null, // Not yet logged in
      });

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Wait for fire-and-forget promises to settle
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockSalesTeamService.getUserByEmail).toHaveBeenCalledWith('somchai@eneos.co.th');
      // syncRoleToSupabaseAuth should NOT be called because authUserId is null
      expect(mockSalesTeamService.syncRoleToSupabaseAuth).not.toHaveBeenCalled();
    });

    it('should not trigger role sync when only status changes (not role)', async () => {
      mockReq.params = { lineUserId: 'Udef456uvw' };
      mockReq.body = { status: 'inactive' };
      // Use different email so self-disable check passes
      mockReq.user = { email: 'admin@eneos.co.th', role: 'admin', authUserId: '456', memberId: '456' };

      mockSalesTeamService.getSalesTeamMemberById.mockResolvedValue({
        lineUserId: 'Udef456uvw',
        name: 'Other User',
        email: 'other@eneos.co.th',
        phone: null,
        role: 'viewer',
        status: 'active',
        createdAt: '2026-01-10T08:00:00Z',
      });

      const updatedMember = {
        lineUserId: 'Udef456uvw',
        name: 'Other User',
        email: 'other@eneos.co.th',
        phone: null,
        role: 'viewer',
        status: 'inactive',
        createdAt: '2026-01-10T08:00:00Z',
      };

      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      // getUserByEmail should NOT be called for status-only changes
      expect(mockSalesTeamService.getUserByEmail).not.toHaveBeenCalled();
      expect(mockSalesTeamService.syncRoleToSupabaseAuth).not.toHaveBeenCalled();
    });

    it('should accept viewer role in update schema (AC-5)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { role: 'viewer' };

      const updatedMember = { ...mockTeamMembers[0], role: 'viewer' };
      mockSalesTeamService.updateSalesTeamMember.mockResolvedValue(updatedMember);
      mockSalesTeamService.getUserByEmail.mockResolvedValue({ authUserId: null });

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSalesTeamService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        role: 'viewer',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
