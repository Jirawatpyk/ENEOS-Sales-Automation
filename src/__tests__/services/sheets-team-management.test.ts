/**
 * Sheets Service - Team Management Tests
 * Tests for getAllSalesTeamMembers, getSalesTeamMemberById, updateSalesTeamMember (Story 7-4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const { mockSheets, mockAuth, mockCircuitBreaker } = vi.hoisted(() => {
  return {
    mockSheets: {
      spreadsheets: {
        values: {
          get: vi.fn(),
          update: vi.fn(),
        },
      },
    },
    mockAuth: {},
    mockCircuitBreaker: {
      execute: vi.fn((fn: () => Promise<unknown>) => fn()),
    },
  };
});

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => mockAuth),
    },
    sheets: vi.fn(() => mockSheets),
  },
}));

vi.mock('../../utils/retry.js', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
  CircuitBreaker: vi.fn(() => mockCircuitBreaker),
}));

vi.mock('../../config/index.js', () => ({
  config: {
    google: {
      serviceAccountEmail: 'test@test.iam.gserviceaccount.com',
      privateKey: 'test-key',
      sheetId: 'test-sheet-id',
      sheets: {
        leads: 'Leads',
        dedup: 'Deduplication_Log',
        salesTeam: 'Sales_Team',
        statusHistory: 'Status_History',
      },
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  sheetsLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { sheetsService } from '../../services/sheets.service.js';

describe('SheetsService - Team Management', () => {
  const mockTeamRows = [
    ['Uabc123xyz', 'สมชาย ใจดี', 'somchai@eneos.co.th', '0812345678', 'sales', '2026-01-15T10:30:00Z', 'active'],
    ['Udef456uvw', 'สมหญิง รักดี', 'somying@eneos.co.th', '0898765432', 'admin', '2026-01-10T08:00:00Z', 'active'],
    ['Ughi789rst', 'วิชัย สุขสันต์', 'wichai@eneos.co.th', '0867891234', 'sales', '2026-01-05T14:00:00Z', 'inactive'],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSalesTeamMembers', () => {
    it('should return all members with status and createdAt (status=all)', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      // Pass status='all' to get all members regardless of status
      const result = await sheetsService.getAllSalesTeamMembers({ status: 'all' });

      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id',
        range: 'Sales_Team!A2:G',
      });
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
        createdAt: '2026-01-15T10:30:00Z',
        status: 'active',
      });
    });

    it('should return only active members by default (no filter)', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      // No filter = default to status='active'
      const result = await sheetsService.getAllSalesTeamMembers();

      expect(result).toHaveLength(2); // 2 active members
      expect(result.every((m) => m.status === 'active')).toBe(true);
    });

    it('should filter by status=active', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      const result = await sheetsService.getAllSalesTeamMembers({ status: 'active' });

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.status === 'active')).toBe(true);
    });

    it('should filter by status=inactive', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      const result = await sheetsService.getAllSalesTeamMembers({ status: 'inactive' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('วิชัย สุขสันต์');
    });

    it('should return all members when status=all', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      const result = await sheetsService.getAllSalesTeamMembers({ status: 'all' });

      expect(result).toHaveLength(3);
    });

    it('should filter by role=admin', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      const result = await sheetsService.getAllSalesTeamMembers({ role: 'admin' });

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('admin');
    });

    it('should filter by role=sales (combined with default active filter)', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      // Only role filter = still applies default status='active'
      const result = await sheetsService.getAllSalesTeamMembers({ role: 'sales' });

      // Only 1 active member with role='sales' (the inactive one is filtered out)
      expect(result).toHaveLength(1);
      expect(result.every((m) => m.role === 'sales')).toBe(true);
      expect(result.every((m) => m.status === 'active')).toBe(true);
    });

    it('should filter by role=sales with status=all', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      // Explicitly pass status='all' to get all sales members regardless of status
      const result = await sheetsService.getAllSalesTeamMembers({ role: 'sales', status: 'all' });

      expect(result).toHaveLength(2); // 2 members with role='sales'
      expect(result.every((m) => m.role === 'sales')).toBe(true);
    });

    it('should combine status and role filters', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      const result = await sheetsService.getAllSalesTeamMembers({
        status: 'active',
        role: 'sales',
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('สมชาย ใจดี');
    });

    it('should handle missing optional fields', async () => {
      const rowWithMissingFields = [
        ['Utest', 'Test User', '', '', '', '', ''],
      ];
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: rowWithMissingFields },
      });

      const result = await sheetsService.getAllSalesTeamMembers({ status: 'all' });

      expect(result[0]).toEqual({
        lineUserId: 'Utest',
        name: 'Test User',
        email: null,
        phone: null,
        role: 'sales',
        createdAt: '',
        status: 'active',
      });
    });

    it('should return empty array when no data', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const result = await sheetsService.getAllSalesTeamMembers();

      expect(result).toEqual([]);
    });
  });

  describe('getSalesTeamMemberById', () => {
    it('should return member by lineUserId', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      const result = await sheetsService.getSalesTeamMemberById('Uabc123xyz');

      expect(result).toEqual({
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'somchai@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
        createdAt: '2026-01-15T10:30:00Z',
        status: 'active',
      });
    });

    it('should return null when member not found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      const result = await sheetsService.getSalesTeamMemberById('Unotfound');

      expect(result).toBeNull();
    });
  });

  describe('updateSalesTeamMember', () => {
    it('should update member email', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await sheetsService.updateSalesTeamMember('Uabc123xyz', {
        email: 'newemail@eneos.co.th',
      });

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id',
        range: 'Sales_Team!A2:G2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'Uabc123xyz',
            'สมชาย ใจดี',
            'newemail@eneos.co.th',
            '0812345678',
            'sales',
            '2026-01-15T10:30:00Z',
            'active',
          ]],
        },
      });

      expect(result).toEqual({
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'newemail@eneos.co.th',
        phone: '0812345678',
        role: 'sales',
        createdAt: '2026-01-15T10:30:00Z',
        status: 'active',
      });
    });

    it('should update member role', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await sheetsService.updateSalesTeamMember('Uabc123xyz', {
        role: 'admin',
      });

      expect(result?.role).toBe('admin');
    });

    it('should update member status to inactive', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await sheetsService.updateSalesTeamMember('Uabc123xyz', {
        status: 'inactive',
      });

      expect(result?.status).toBe('inactive');
    });

    it('should update member status to active', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await sheetsService.updateSalesTeamMember('Ughi789rst', {
        status: 'active',
      });

      expect(result?.status).toBe('active');
    });

    it('should allow setting email to null', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await sheetsService.updateSalesTeamMember('Uabc123xyz', {
        email: null,
      });

      expect(result?.email).toBeNull();
    });

    it('should return null when member not found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });

      const result = await sheetsService.updateSalesTeamMember('Unotfound', {
        email: 'test@eneos.co.th',
      });

      expect(result).toBeNull();
      expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
    });

    it('should update multiple fields at once', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockTeamRows },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await sheetsService.updateSalesTeamMember('Uabc123xyz', {
        email: 'new@eneos.co.th',
        phone: '0891112222',
        role: 'admin',
        status: 'inactive',
      });

      expect(result).toEqual({
        lineUserId: 'Uabc123xyz',
        name: 'สมชาย ใจดี',
        email: 'new@eneos.co.th',
        phone: '0891112222',
        role: 'admin',
        createdAt: '2026-01-15T10:30:00Z',
        status: 'inactive',
      });
    });
  });
});
