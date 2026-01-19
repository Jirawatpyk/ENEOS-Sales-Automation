/**
 * Team Controller Tests
 * Tests for GET /api/admin/sales-team
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock sheetsService
const mockGetSalesTeamAll = vi.fn();

vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    getSalesTeamAll: () => mockGetSalesTeamAll(),
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocking
import { getSalesTeam } from '../../controllers/admin/team.controller.js';

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

// Sample team member data
const createSampleTeamMember = (overrides = {}) => ({
  lineUserId: 'U123abc',
  name: 'Test Sales',
  email: 'sales@eneos.co.th',
  phone: '0812345678',
  ...overrides,
});

// ===========================================
// Tests
// ===========================================

describe('Team Controller - getSalesTeam', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  describe('GET /api/admin/sales-team', () => {
    it('should return sales team list successfully', async () => {
      const teamMembers = [
        createSampleTeamMember({ lineUserId: 'U001', name: 'Alice' }),
        createSampleTeamMember({ lineUserId: 'U002', name: 'Bob' }),
        createSampleTeamMember({ lineUserId: 'U003', name: 'Charlie' }),
      ];
      mockGetSalesTeamAll.mockResolvedValue(teamMembers);

      await getSalesTeam(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            team: expect.arrayContaining([
              expect.objectContaining({ id: 'U001', name: 'Alice' }),
              expect.objectContaining({ id: 'U002', name: 'Bob' }),
              expect.objectContaining({ id: 'U003', name: 'Charlie' }),
            ]),
          },
        })
      );
    });

    it('should return empty array when no team members', async () => {
      mockGetSalesTeamAll.mockResolvedValue([]);

      await getSalesTeam(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          team: [],
        },
      });
    });

    it('should transform team data to frontend format', async () => {
      const teamMembers = [
        createSampleTeamMember({
          lineUserId: 'U123',
          name: 'Sales Person',
          email: 'sales@test.com',
          phone: '0999999999',
        }),
      ];
      mockGetSalesTeamAll.mockResolvedValue(teamMembers);

      await getSalesTeam(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          team: [
            {
              id: 'U123',
              name: 'Sales Person',
              email: 'sales@test.com',
            },
          ],
        },
      });
    });

    it('should handle member without email', async () => {
      const teamMembers = [
        createSampleTeamMember({
          lineUserId: 'U456',
          name: 'No Email Person',
          email: null,
        }),
      ];
      mockGetSalesTeamAll.mockResolvedValue(teamMembers);

      await getSalesTeam(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          team: [
            {
              id: 'U456',
              name: 'No Email Person',
              email: null,
            },
          ],
        },
      });
    });

    it('should handle member with empty string email', async () => {
      const teamMembers = [
        createSampleTeamMember({
          lineUserId: 'U789',
          name: 'Empty Email Person',
          email: '',
        }),
      ];
      mockGetSalesTeamAll.mockResolvedValue(teamMembers);

      await getSalesTeam(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          team: [
            {
              id: 'U789',
              name: 'Empty Email Person',
              email: null,
            },
          ],
        },
      });
    });

    it('should handle sheets service error', async () => {
      const error = new Error('Google Sheets API error');
      mockGetSalesTeamAll.mockRejectedValue(error);

      await getSalesTeam(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle network timeout error', async () => {
      const error = new Error('ETIMEDOUT');
      mockGetSalesTeamAll.mockRejectedValue(error);

      await getSalesTeam(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
