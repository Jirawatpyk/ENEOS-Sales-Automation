/**
 * Team Management Controller Tests
 * Tests for GET/PATCH /api/admin/sales-team endpoints (Story 7-4)
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
});
