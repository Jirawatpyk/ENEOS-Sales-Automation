/**
 * Team Management Controller Tests
 * Tests for GET/PATCH/POST /api/admin/sales-team endpoints (Story 7-4 + 7-4b)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Hoisted mocks
const { mockSheetsService } = vi.hoisted(() => {
  return {
    mockSheetsService: {
      getAllSalesTeamMembers: vi.fn(),
      getSalesTeamMemberById: vi.fn(),
      updateSalesTeamMember: vi.fn(),
      createSalesTeamMember: vi.fn(),
      getUnlinkedLINEAccounts: vi.fn(),
      linkLINEAccount: vi.fn(),
    },
  };
});

vi.mock('../../../services/sheets.service.js', () => ({
  sheetsService: mockSheetsService,
}));

import {
  getSalesTeamList,
  getSalesTeamMemberById,
  updateSalesTeamMember,
  createSalesTeamMember,
  getUnlinkedLINEAccounts,
  linkLINEAccount,
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
      user: { email: 'admin@eneos.co.th', name: 'Admin', role: 'admin', googleId: '123' },
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
      mockSheetsService.getAllSalesTeamMembers.mockResolvedValue(activeMembers);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllSalesTeamMembers).toHaveBeenCalledWith({
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
      mockSheetsService.getAllSalesTeamMembers.mockResolvedValue(inactiveMembers);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllSalesTeamMembers).toHaveBeenCalledWith({
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
      mockSheetsService.getAllSalesTeamMembers.mockResolvedValue(adminMembers);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllSalesTeamMembers).toHaveBeenCalledWith({
        status: 'active',
        role: 'admin',
      });
    });

    it('should return all members when status=all', async () => {
      mockReq.query = { status: 'all' };
      mockSheetsService.getAllSalesTeamMembers.mockResolvedValue(mockTeamMembers);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getAllSalesTeamMembers).toHaveBeenCalledWith({
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
      const error = new Error('Sheets API error');
      mockSheetsService.getAllSalesTeamMembers.mockRejectedValue(error);

      await getSalesTeamList(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/admin/sales-team/:lineUserId (getSalesTeamMemberById)', () => {
    it('should return a single member by lineUserId', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockSheetsService.getSalesTeamMemberById.mockResolvedValue(mockTeamMembers[0]);

      await getSalesTeamMemberById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getSalesTeamMemberById).toHaveBeenCalledWith('Uabc123xyz');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTeamMembers[0],
      });
    });

    it('should return 404 when member not found', async () => {
      mockReq.params = { lineUserId: 'Unotfound' };
      mockSheetsService.getSalesTeamMemberById.mockResolvedValue(null);

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
      mockSheetsService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        email: 'newemail@eneos.co.th',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedMember,
      });
    });

    it('should reject email with invalid domain', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { email: 'test@gmail.com' };

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('@eneos.co.th'),
        })
      );
    });

    it('should allow updating role to admin', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { role: 'admin' };
      const updatedMember = { ...mockTeamMembers[0], role: 'admin' };
      mockSheetsService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        role: 'admin',
      });
    });

    it('should allow updating status to inactive', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { status: 'inactive' };
      const updatedMember = { ...mockTeamMembers[0], status: 'inactive' };
      mockSheetsService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        status: 'inactive',
      });
    });

    it('should allow setting email to null (clear email)', async () => {
      mockReq.params = { lineUserId: 'Uabc123xyz' };
      mockReq.body = { email: null };
      const updatedMember = { ...mockTeamMembers[0], email: null };
      mockSheetsService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
        email: null,
      });
    });

    it('should return 404 when member not found', async () => {
      mockReq.params = { lineUserId: 'Unotfound' };
      mockReq.body = { email: 'test@eneos.co.th' };
      mockSheetsService.updateSalesTeamMember.mockResolvedValue(null);

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
      mockSheetsService.updateSalesTeamMember.mockResolvedValue(updatedMember);

      await updateSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.updateSalesTeamMember).toHaveBeenCalledWith('Uabc123xyz', {
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
        role: 'sales',
      };

      const createdMember = {
        lineUserId: null,
        name: 'สมชาย ทดสอบ',
        email: 'somchai.test@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
        status: 'active',
        createdAt: '2026-01-27T10:00:00Z',
      };

      mockSheetsService.createSalesTeamMember.mockResolvedValue(createdMember);

      await createSalesTeamMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.createSalesTeamMember).toHaveBeenCalledWith({
        name: 'สมชาย ทดสอบ',
        email: 'somchai.test@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
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
        role: 'sales',
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
        role: 'sales',
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
        role: 'sales',
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
        role: 'sales',
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
        role: 'sales',
      };

      const createdMember = {
        lineUserId: null,
        name: 'Test User',
        email: 'test@eneos.co.th',
        phone: null,
        role: 'sales',
        status: 'active',
        createdAt: '2026-01-27T10:00:00Z',
      };

      mockSheetsService.createSalesTeamMember.mockResolvedValue(createdMember);

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
        role: 'sales',
      };

      const error = new Error('Email already exists');
      error.name = 'DUPLICATE_EMAIL';
      mockSheetsService.createSalesTeamMember.mockRejectedValue(error);

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

      mockSheetsService.createSalesTeamMember.mockResolvedValue(createdMember);

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
        role: 'sales',
      };

      const createdMember = {
        lineUserId: null,
        name: 'Test User',
        email: 'test@eneos.co.th',
        phone: '0812345678', // Normalized
        role: 'sales',
        status: 'active',
        createdAt: '2026-01-27T10:00:00Z',
      };

      mockSheetsService.createSalesTeamMember.mockResolvedValue(createdMember);

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

      mockSheetsService.getUnlinkedLINEAccounts.mockResolvedValue(unlinkedAccounts);

      await getUnlinkedLINEAccounts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.getUnlinkedLINEAccounts).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: unlinkedAccounts,
        total: 2,
      });
    });

    it('should return empty array when no unlinked accounts (AC10)', async () => {
      mockSheetsService.getUnlinkedLINEAccounts.mockResolvedValue([]);

      await getUnlinkedLINEAccounts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        total: 0,
      });
    });

    it('should pass errors to next middleware', async () => {
      const error = new Error('Sheets API error');
      mockSheetsService.getUnlinkedLINEAccounts.mockRejectedValue(error);

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

      mockSheetsService.linkLINEAccount.mockResolvedValue(linkedMember);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSheetsService.linkLINEAccount).toHaveBeenCalledWith(
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

      mockSheetsService.linkLINEAccount.mockResolvedValue(null);

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
      mockSheetsService.linkLINEAccount.mockRejectedValue(error);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'LINE account already linked to Another User',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 for LINE account not found', async () => {
      mockReq.params = { email: 'test@eneos.co.th' };
      mockReq.body = { targetLineUserId: 'Unonexistent' };

      const error = new Error('LINE account not found: Unonexistent');
      error.name = 'LINE_ACCOUNT_NOT_FOUND';
      mockSheetsService.linkLINEAccount.mockRejectedValue(error);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'LINE account not found: Unonexistent',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass errors to next middleware', async () => {
      mockReq.params = { email: 'test@eneos.co.th' };
      mockReq.body = { targetLineUserId: 'Uabc123xyz' };

      const error = new Error('Sheets API error');
      mockSheetsService.linkLINEAccount.mockRejectedValue(error);

      await linkLINEAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
