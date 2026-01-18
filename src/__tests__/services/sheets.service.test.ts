/**
 * Google Sheets Service Tests
 * Comprehensive tests for all sheets operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockLeadRow, mockClaimedLeadRow, mockSheetsAppendResponse, mockSheetsGetResponse } from '../mocks/google-sheets.mock.js';

// Use vi.hoisted to define mocks before vi.mock hoisting
const { mockSheets } = vi.hoisted(() => ({
  mockSheets: {
    spreadsheets: {
      values: {
        append: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
      },
      get: vi.fn(),
    },
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn().mockReturnValue(mockSheets),
  },
}));

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {
    google: {
      serviceAccountEmail: 'test@test.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      sheetId: 'test-sheet-id',
      sheets: {
        leads: 'Leads',
        dedup: 'Deduplication_Log',
        salesTeam: 'Sales_Team',
      },
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  sheetsLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock retry utility
vi.mock('../../utils/retry.js', () => ({
  withRetry: vi.fn((fn) => fn()),
  CircuitBreaker: vi.fn().mockImplementation(() => ({
    execute: vi.fn((fn) => fn()),
  })),
}));

// Import after mocks
import { SheetsService } from '../../services/sheets.service.js';

describe('SheetsService', () => {
  let service: SheetsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SheetsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // Lead Operations
  // ===========================================

  describe('addLead', () => {
    it('should add a new lead and return row number', async () => {
      mockSheets.spreadsheets.values.append.mockResolvedValue(mockSheetsAppendResponse);

      const lead = {
        email: 'test@example.com',
        company: 'Test Company',
        customerName: 'Test User',
        phone: '0812345678',
      };

      const rowNumber = await service.addLead(lead);

      expect(rowNumber).toBe(42);
      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: 'test-sheet-id',
          range: 'Leads!A:AD', // Updated for contactedAt column
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
        })
      );
    });

    it('should handle missing updatedRange gracefully', async () => {
      mockSheets.spreadsheets.values.append.mockResolvedValue({
        data: { updates: {} },
      });

      const rowNumber = await service.addLead({ email: 'test@example.com' });

      expect(rowNumber).toBe(0);
    });

    it('should use default values for missing lead fields', async () => {
      mockSheets.spreadsheets.values.append.mockResolvedValue(mockSheetsAppendResponse);

      await service.addLead({ email: 'test@example.com' });

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            values: [expect.arrayContaining(['test@example.com'])],
          },
        })
      );
    });
  });

  describe('getRow', () => {
    it('should return lead data for existing row', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);

      const lead = await service.getRow(42);

      expect(lead).not.toBeNull();
      expect(lead?.rowNumber).toBe(42);
      expect(lead?.email).toBe(mockLeadRow.email);
      expect(lead?.company).toBe(mockLeadRow.company);
    });

    it('should return null for non-existent row', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const lead = await service.getRow(999);

      expect(lead).toBeNull();
    });

    it('should return null when values is undefined', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {},
      });

      const lead = await service.getRow(999);

      expect(lead).toBeNull();
    });

    it('should handle empty row array', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [[]] },
      });

      const lead = await service.getRow(42);

      expect(lead).toBeNull();
    });
  });

  describe('updateLeadWithLock', () => {
    it('should update lead successfully', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const updates = { status: 'contacted' as const };
      const result = await service.updateLeadWithLock(42, updates);

      expect(result.status).toBe('contacted');
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
    });

    it('should throw error when row not found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      await expect(service.updateLeadWithLock(999, {})).rejects.toThrow('Row 999 not found');
    });

    it('should throw RaceConditionError on version mismatch', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);

      await expect(
        service.updateLeadWithLock(42, {}, 99) // Expected version 99, but current is 1
      ).rejects.toThrow('Version mismatch');
    });

    it('should increment version on update', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.updateLeadWithLock(42, { company: 'Updated Company' });

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            values: [expect.arrayContaining(['2'])], // Version incremented from 1 to 2
          },
        })
      );
    });
  });

  describe('claimLead', () => {
    it('should claim unclaimed lead successfully', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await service.claimLead(42, 'U123', 'John Doe', 'contacted');

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.lead.salesOwnerId).toBe('U123');
    });

    it('should reject claim if already claimed by another user', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 9),
              'U999', // Different owner
              'Another User',
              ...mockSheetsGetResponse.data.values[0].slice(11),
            ],
          ],
        },
      });

      const result = await service.claimLead(42, 'U123', 'John Doe', 'contacted');

      expect(result.success).toBe(false);
      expect(result.alreadyClaimed).toBe(true);
      expect(result.owner).toBe('Another User');
    });

    it('should allow owner to update their own lead', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 9),
              'U123', // Same owner
              'John Doe',
              ...mockSheetsGetResponse.data.values[0].slice(11),
            ],
          ],
        },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await service.claimLead(42, 'U123', 'John Doe', 'closed');

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(false);
    });

    it('should throw error when row not found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      await expect(service.claimLead(999, 'U123', 'John', 'contacted')).rejects.toThrow('Row 999 not found');
    });

    it('should set closedAt timestamp when status is closed', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.claimLead(42, 'U123', 'John', 'closed');

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            values: [expect.arrayContaining(['closed'])],
          },
        })
      );
    });

    it('should set contactedAt timestamp when status is contacted', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.claimLead(42, 'U123', 'John', 'contacted');

      // Verify update was called with contactedAt in the row data
      const updateCall = mockSheets.spreadsheets.values.update.mock.calls[0][0];
      const rowData = updateCall.requestBody.values[0];

      // contactedAt is at index 29 (column AD)
      expect(rowData[29]).toBeTruthy(); // contactedAt should be set
      expect(rowData[8]).toBe('contacted'); // status should be 'contacted'
    });

    it('should set lostAt timestamp when status is lost', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.claimLead(42, 'U123', 'John', 'lost');

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
    });

    it('should set unreachableAt timestamp when status is unreachable', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.claimLead(42, 'U123', 'John', 'unreachable');

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
    });
  });

  describe('updateLeadStatus', () => {
    it('should update status when user is owner', async () => {
      mockSheets.spreadsheets.values.get
        .mockResolvedValueOnce({
          data: {
            values: [
              [
                ...mockSheetsGetResponse.data.values[0].slice(0, 9),
                'U123',
                'John Doe',
                ...mockSheetsGetResponse.data.values[0].slice(11),
              ],
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              [
                ...mockSheetsGetResponse.data.values[0].slice(0, 9),
                'U123',
                'John Doe',
                ...mockSheetsGetResponse.data.values[0].slice(11),
              ],
            ],
          },
        });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const result = await service.updateLeadStatus(42, 'U123', 'closed');

      expect(result.status).toBe('closed');
    });

    it('should throw error when user is not owner', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 9),
              'U999', // Different owner
              'Another User',
              ...mockSheetsGetResponse.data.values[0].slice(11),
            ],
          ],
        },
      });

      await expect(service.updateLeadStatus(42, 'U123', 'closed')).rejects.toThrow(
        'User U123 is not the owner of this lead'
      );
    });

    it('should throw error when row not found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      await expect(service.updateLeadStatus(999, 'U123', 'closed')).rejects.toThrow('Row 999 not found');
    });
  });

  // ===========================================
  // Deduplication Operations
  // ===========================================

  describe('checkDuplicate', () => {
    it('should return true when key exists', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['key1'], ['key2'], ['test-key']] },
      });

      const result = await service.checkDuplicate('test-key');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['key1'], ['key2']] },
      });

      const result = await service.checkDuplicate('new-key');

      expect(result).toBe(false);
    });

    it('should return false when sheet is empty', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const result = await service.checkDuplicate('any-key');

      expect(result).toBe(false);
    });

    it('should handle undefined values', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {},
      });

      const result = await service.checkDuplicate('any-key');

      expect(result).toBe(false);
    });
  });

  describe('markAsProcessed', () => {
    it('should add dedup entry to sheet', async () => {
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      await service.markAsProcessed('test-key', 'test@example.com', '12345');

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: 'test-sheet-id',
          range: 'Deduplication_Log!A:D',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['test-key', 'test@example.com', '12345', expect.any(String)]],
          },
        })
      );
    });
  });

  // ===========================================
  // Sales Team Operations
  // ===========================================

  describe('getSalesTeamMember', () => {
    it('should return member when found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U123', 'John Doe', 'john@example.com', '0812345678'],
            ['U456', 'Jane Doe', 'jane@example.com', '0898765432'],
          ],
        },
      });

      const member = await service.getSalesTeamMember('U123');

      expect(member).toEqual({
        lineUserId: 'U123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0812345678',
      });
    });

    it('should return null when member not found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [['U456', 'Jane Doe']],
        },
      });

      const member = await service.getSalesTeamMember('U999');

      expect(member).toBeNull();
    });

    it('should return null when sheet is empty', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const member = await service.getSalesTeamMember('U123');

      expect(member).toBeNull();
    });

    it('should handle missing email and phone', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [['U123', 'John Doe']],
        },
      });

      const member = await service.getSalesTeamMember('U123');

      expect(member).toEqual({
        lineUserId: 'U123',
        name: 'John Doe',
        email: undefined,
        phone: undefined,
      });
    });
  });

  // ===========================================
  // UUID-based Lead Lookup (Migration Support)
  // ===========================================

  describe('findLeadByUUID', () => {
    // Helper to create a mock row with specific UUID
    const createMockRowWithUUID = (uuid: string) => {
      const baseRow = [...mockSheetsGetResponse.data.values[0]];
      baseRow[26] = uuid; // Set leadUUID at index 26
      return baseRow;
    };

    it('should find lead by UUID and return correct row number', async () => {
      const testUUID = 'lead_550e8400-e29b-41d4-a716-446655440000';
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            createMockRowWithUUID('lead_other-uuid'),
            createMockRowWithUUID(testUUID),
            createMockRowWithUUID('lead_another-uuid'),
          ],
        },
      });

      const lead = await service.findLeadByUUID(testUUID);

      expect(lead).not.toBeNull();
      expect(lead?.rowNumber).toBe(3); // Row 3 (index 1 + 2 for header)
      expect(lead?.leadUUID).toBe(testUUID);
    });

    it('should return null when UUID not found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            createMockRowWithUUID('lead_other-uuid'),
          ],
        },
      });

      const lead = await service.findLeadByUUID('lead_nonexistent-uuid');

      expect(lead).toBeNull();
    });

    it('should return null when sheet is empty', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const lead = await service.findLeadByUUID('lead_any-uuid');

      expect(lead).toBeNull();
    });

    it('should handle undefined values gracefully', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {},
      });

      const lead = await service.findLeadByUUID('lead_any-uuid');

      expect(lead).toBeNull();
    });

    it('should find lead in first row correctly', async () => {
      const testUUID = 'lead_first-row-uuid';
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            createMockRowWithUUID(testUUID),
          ],
        },
      });

      const lead = await service.findLeadByUUID(testUUID);

      expect(lead).not.toBeNull();
      expect(lead?.rowNumber).toBe(2); // Row 2 (first data row after header)
    });
  });

  // ===========================================
  // Health Check
  // ===========================================

  describe('healthCheck', () => {
    it('should return healthy when API responds', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { spreadsheetId: 'test-sheet-id' },
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy when API fails', async () => {
      mockSheets.spreadsheets.get.mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });
  });
});
