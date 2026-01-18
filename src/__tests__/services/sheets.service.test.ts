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
        statusHistory: 'Status_History',
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

    // BUG FIX: Ensure contactedAt is set for Closing Time calculation
    it('should set contactedAt when claiming with closed status (for Closing Time)', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.claimLead(42, 'U123', 'John', 'closed');

      const updateCall = mockSheets.spreadsheets.values.update.mock.calls[0][0];
      const rowData = updateCall.requestBody.values[0];

      // contactedAt is at index 29 (column AD)
      expect(rowData[29]).toBeTruthy(); // contactedAt should be set
      // closedAt is at index 19 (column T)
      expect(rowData[19]).toBeTruthy(); // closedAt should be set
      expect(rowData[8]).toBe('closed'); // status should be 'closed'
    });

    it('should set contactedAt when claiming with lost status (for Closing Time)', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.claimLead(42, 'U123', 'John', 'lost');

      const updateCall = mockSheets.spreadsheets.values.update.mock.calls[0][0];
      const rowData = updateCall.requestBody.values[0];

      // contactedAt is at index 29 (column AD)
      expect(rowData[29]).toBeTruthy(); // contactedAt should be set
      // lostAt is at index 20 (column U)
      expect(rowData[20]).toBeTruthy(); // lostAt should be set
      expect(rowData[8]).toBe('lost'); // status should be 'lost'
    });

    it('should set contactedAt when claiming with unreachable status (for Closing Time)', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockSheetsGetResponse);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.claimLead(42, 'U123', 'John', 'unreachable');

      const updateCall = mockSheets.spreadsheets.values.update.mock.calls[0][0];
      const rowData = updateCall.requestBody.values[0];

      // contactedAt is at index 29 (column AD)
      expect(rowData[29]).toBeTruthy(); // contactedAt should be set
      // unreachableAt is at index 21 (column V)
      expect(rowData[21]).toBeTruthy(); // unreachableAt should be set
      expect(rowData[8]).toBe('unreachable'); // status should be 'unreachable'
    });

    it('should preserve existing contactedAt when claiming with closed status', async () => {
      const existingContactedAt = '2026-01-15T10:00:00.000Z';
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 29),
              existingContactedAt, // Existing contactedAt
            ],
          ],
        },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.claimLead(42, 'U123', 'John', 'closed');

      const updateCall = mockSheets.spreadsheets.values.update.mock.calls[0][0];
      const rowData = updateCall.requestBody.values[0];

      // contactedAt should preserve existing value
      expect(rowData[29]).toBe(existingContactedAt);
    });

    it('should throw RaceConditionError when version changes between read and write (concurrent claim)', async () => {
      // Simulate race condition: another user claims the lead between getRow and updateLeadWithLock
      // First getRow (in claimLead) returns version 1
      // Second getRow (inside updateLeadWithLock) returns version 2 (someone else updated)
      const version1Response = mockSheetsGetResponse;
      const version2Response = {
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 22),
              '2', // Version changed from 1 to 2
              ...mockSheetsGetResponse.data.values[0].slice(23),
            ],
          ],
        },
      };

      mockSheets.spreadsheets.values.get
        .mockResolvedValueOnce(version1Response) // claimLead reads version 1
        .mockResolvedValueOnce(version2Response); // updateLeadWithLock reads version 2

      await expect(service.claimLead(42, 'U123', 'John Doe', 'contacted')).rejects.toThrow(
        'Version mismatch'
      );
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

    it('should throw RaceConditionError when version changes between read and write (concurrent update)', async () => {
      // Simulate race condition: another user updates the lead between getRow and updateLeadWithLock
      // First getRow (in updateLeadStatus) returns version 1 with owner U123
      // Second getRow (inside updateLeadWithLock) returns version 2 (someone else updated)
      const version1WithOwner = {
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 9),
              'U123', // Owner
              'John Doe',
              ...mockSheetsGetResponse.data.values[0].slice(11, 22),
              '1', // Version 1
              ...mockSheetsGetResponse.data.values[0].slice(23),
            ],
          ],
        },
      };
      const version2WithOwner = {
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 9),
              'U123', // Owner
              'John Doe',
              ...mockSheetsGetResponse.data.values[0].slice(11, 22),
              '2', // Version changed to 2
              ...mockSheetsGetResponse.data.values[0].slice(23),
            ],
          ],
        },
      };

      mockSheets.spreadsheets.values.get
        .mockResolvedValueOnce(version1WithOwner) // updateLeadStatus reads version 1
        .mockResolvedValueOnce(version2WithOwner); // updateLeadWithLock reads version 2

      await expect(service.updateLeadStatus(42, 'U123', 'closed')).rejects.toThrow(
        'Version mismatch'
      );
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
  // Status History Operations
  // ===========================================

  describe('addStatusHistory', () => {
    it('should add status history entry successfully', async () => {
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      await service.addStatusHistory({
        leadUUID: 'lead_abc123',
        status: 'contacted',
        changedById: 'U123',
        changedByName: 'John Doe',
        timestamp: '2026-01-18T10:00:00.000Z',
        notes: 'First contact',
      });

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: 'test-sheet-id',
          range: 'Status_History!A:F',
          valueInputOption: 'RAW',
          requestBody: {
            values: [['lead_abc123', 'contacted', 'U123', 'John Doe', '2026-01-18T10:00:00.000Z', 'First contact']],
          },
        })
      );
    });

    it('should log error but not throw when write fails (fire-and-forget)', async () => {
      mockSheets.spreadsheets.values.append.mockRejectedValue(new Error('API Error'));

      // Should not throw
      await expect(service.addStatusHistory({
        leadUUID: 'lead_abc123',
        status: 'contacted',
        changedById: 'U123',
        changedByName: 'John Doe',
        timestamp: '2026-01-18T10:00:00.000Z',
      })).resolves.toBeUndefined();
    });

    it('should handle empty notes gracefully', async () => {
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      await service.addStatusHistory({
        leadUUID: 'lead_abc123',
        status: 'new',
        changedById: 'System',
        changedByName: 'System',
        timestamp: '2026-01-18T10:00:00.000Z',
      });

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            values: [['lead_abc123', 'new', 'System', 'System', '2026-01-18T10:00:00.000Z', '']],
          },
        })
      );
    });
  });

  describe('getStatusHistory', () => {
    it('should return history entries for a lead sorted by timestamp', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['lead_abc123', 'contacted', 'U123', 'John', '2026-01-18T10:00:00.000Z', ''],
            ['lead_abc123', 'new', 'System', 'System', '2026-01-18T08:00:00.000Z', 'Created'],
            ['lead_xyz999', 'new', 'System', 'System', '2026-01-18T09:00:00.000Z', ''], // Different lead
            ['lead_abc123', 'closed', 'U123', 'John', '2026-01-18T12:00:00.000Z', 'Deal done'],
          ],
        },
      });

      const history = await service.getStatusHistory('lead_abc123');

      expect(history).toHaveLength(3);
      // Should be sorted by timestamp ascending (oldest first)
      expect(history[0].status).toBe('new');
      expect(history[1].status).toBe('contacted');
      expect(history[2].status).toBe('closed');
    });

    it('should return empty array when no history found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['lead_xyz999', 'new', 'System', 'System', '2026-01-18T08:00:00.000Z', ''],
          ],
        },
      });

      const history = await service.getStatusHistory('lead_abc123');

      expect(history).toEqual([]);
    });

    it('should return empty array when sheet is empty', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const history = await service.getStatusHistory('lead_abc123');

      expect(history).toEqual([]);
    });

    it('should handle missing notes field', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['lead_abc123', 'new', 'System', 'System', '2026-01-18T08:00:00.000Z'], // Missing notes column
          ],
        },
      });

      const history = await service.getStatusHistory('lead_abc123');

      expect(history).toHaveLength(1);
      expect(history[0].notes).toBeUndefined();
    });
  });

  // ===========================================
  // Status History Integration Tests
  // ===========================================

  describe('Status History Integration', () => {
    it('should record initial "new" status when addLead is called (fire-and-forget)', async () => {
      // Mock the append for both leads and status history
      mockSheets.spreadsheets.values.append.mockResolvedValue(mockSheetsAppendResponse);

      const addStatusHistorySpy = vi.spyOn(service, 'addStatusHistory');

      await service.addLead({
        email: 'test@example.com',
        company: 'Test Company',
        customerName: 'Test User',
      });

      // Verify addStatusHistory was called with initial "new" status
      expect(addStatusHistorySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'new',
          changedById: 'System',
          changedByName: 'System',
          notes: 'Lead created from webhook',
        })
      );

      addStatusHistorySpy.mockRestore();
    });

    it('should record status history when claimLead is called (fire-and-forget)', async () => {
      // Mock lead with UUID for history recording
      const leadWithUUID = {
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 26),
              'lead_test123', // leadUUID at index 26
              '2026-01-18T08:00:00.000Z', // createdAt
              '2026-01-18T08:00:00.000Z', // updatedAt
              '', // contactedAt
            ],
          ],
        },
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(leadWithUUID);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      const addStatusHistorySpy = vi.spyOn(service, 'addStatusHistory');

      await service.claimLead(42, 'U123', 'John Doe', 'contacted');

      // Verify addStatusHistory was called
      expect(addStatusHistorySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          leadUUID: 'lead_test123',
          status: 'contacted',
          changedById: 'U123',
          changedByName: 'John Doe',
        })
      );

      addStatusHistorySpy.mockRestore();
    });

    it('should record status history when updateLeadStatus is called (fire-and-forget)', async () => {
      // Mock lead with UUID and owner for status update
      const ownedLeadWithUUID = {
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 9),
              'U123', // salesOwnerId
              'John Doe', // salesOwnerName
              ...mockSheetsGetResponse.data.values[0].slice(11, 26),
              'lead_test456', // leadUUID at index 26
              '2026-01-18T08:00:00.000Z', // createdAt
              '2026-01-18T08:00:00.000Z', // updatedAt
              '2026-01-18T09:00:00.000Z', // contactedAt
            ],
          ],
        },
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(ownedLeadWithUUID);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      const addStatusHistorySpy = vi.spyOn(service, 'addStatusHistory');

      await service.updateLeadStatus(42, 'U123', 'closed');

      // Verify addStatusHistory was called
      expect(addStatusHistorySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          leadUUID: 'lead_test456',
          status: 'closed',
          changedById: 'U123',
          changedByName: 'John Doe',
        })
      );

      addStatusHistorySpy.mockRestore();
    });

    it('should record status history for legacy leads after UUID is generated', async () => {
      // Mock lead WITHOUT initial UUID (legacy lead)
      // updateLeadWithLock will generate a UUID for it
      const legacyLeadWithoutUUID = {
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 26),
              '', // NO leadUUID initially
              '', // createdAt
              '', // updatedAt
              '', // contactedAt
            ],
          ],
        },
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(legacyLeadWithoutUUID);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      const addStatusHistorySpy = vi.spyOn(service, 'addStatusHistory');

      await service.claimLead(42, 'U123', 'John Doe', 'contacted');

      // Verify addStatusHistory WAS called because updateLeadWithLock generates UUID for legacy leads
      expect(addStatusHistorySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'contacted',
          changedById: 'U123',
          changedByName: 'John Doe',
        })
      );
      // UUID should be generated (starts with 'lead_')
      expect(addStatusHistorySpy.mock.calls[0][0].leadUUID).toMatch(/^lead_/);

      addStatusHistorySpy.mockRestore();
    });

    it('claimLead should succeed even when addStatusHistory fails (fire-and-forget)', async () => {
      // Mock lead with UUID for history recording
      const leadWithUUID = {
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 26),
              'lead_test123',
              '', // createdAt
              '', // updatedAt
              '', // contactedAt
            ],
          ],
        },
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(leadWithUUID);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});
      // Make status history append fail
      mockSheets.spreadsheets.values.append.mockRejectedValue(new Error('History write failed'));

      // claimLead should still succeed
      const result = await service.claimLead(42, 'U123', 'John Doe', 'contacted');

      expect(result.success).toBe(true);
      expect(result.lead).toBeDefined();
      // The update to the lead should still have happened
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
    });

    it('updateLeadStatus should succeed even when addStatusHistory fails (fire-and-forget)', async () => {
      // Mock lead with owner and UUID
      const ownedLeadWithUUID = {
        data: {
          values: [
            [
              ...mockSheetsGetResponse.data.values[0].slice(0, 9),
              'U123', // Sales_Owner_ID
              'John Doe', // Sales_Owner_Name
              ...mockSheetsGetResponse.data.values[0].slice(11, 26),
              'lead_test456',
              '', // createdAt
              '', // updatedAt
              '', // contactedAt
            ],
          ],
        },
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(ownedLeadWithUUID);
      mockSheets.spreadsheets.values.update.mockResolvedValue({});
      // Make status history append fail
      mockSheets.spreadsheets.values.append.mockRejectedValue(new Error('History write failed'));

      // updateLeadStatus should still succeed (returns LeadRow directly)
      const lead = await service.updateLeadStatus(42, 'U123', 'closed');

      expect(lead).toBeDefined();
      expect(lead.status).toBe('closed');
      // The update to the lead should still have happened
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
    });

    it('addLead should succeed even when status history append fails (fire-and-forget)', async () => {
      // First append succeeds (lead creation)
      // Second append fails (status history)
      mockSheets.spreadsheets.values.append
        .mockResolvedValueOnce(mockSheetsAppendResponse) // Lead append succeeds
        .mockRejectedValueOnce(new Error('Status history write failed')); // History append fails

      // addLead should still succeed (returns rowNumber)
      const rowNumber = await service.addLead({
        email: 'test@example.com',
        company: 'Test Company',
        customerName: 'Test User',
      });

      expect(rowNumber).toBe(42); // From mockSheetsAppendResponse
      // Lead was created successfully despite status history failure
      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================
  // getSalesTeamAll
  // ===========================================

  describe('getSalesTeamAll', () => {
    it('should return all sales team members', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U123', 'John Doe', 'john@example.com', '0812345678', 'admin'],
            ['U456', 'Jane Smith', 'jane@example.com', '0898765432', 'sales'],
            ['U789', 'Bob Wilson', 'bob@example.com', '0823456789'],
          ],
        },
      });

      const members = await service.getSalesTeamAll();

      expect(members).toHaveLength(3);
      expect(members[0]).toEqual({
        lineUserId: 'U123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0812345678',
        role: 'admin',
      });
      expect(members[1]).toEqual({
        lineUserId: 'U456',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0898765432',
        role: 'sales',
      });
      // Default role should be 'sales' if not specified
      expect(members[2].role).toBe('sales');
    });

    it('should return empty array when no members', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const members = await service.getSalesTeamAll();

      expect(members).toEqual([]);
    });

    it('should filter out rows without LINE User ID', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U123', 'John Doe', 'john@example.com', '0812345678', 'admin'],
            ['', 'Empty Row', '', ''],  // Should be filtered out
            ['U456', 'Jane Smith', 'jane@example.com', '0898765432', 'sales'],
          ],
        },
      });

      const members = await service.getSalesTeamAll();

      expect(members).toHaveLength(2);
      expect(members[0].lineUserId).toBe('U123');
      expect(members[1].lineUserId).toBe('U456');
    });

    it('should handle undefined values array', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {},
      });

      const members = await service.getSalesTeamAll();

      expect(members).toEqual([]);
    });

    it('should handle missing email and phone', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U123', 'John Doe'],  // Only ID and name
          ],
        },
      });

      const members = await service.getSalesTeamAll();

      expect(members[0]).toEqual({
        lineUserId: 'U123',
        name: 'John Doe',
        email: undefined,
        phone: undefined,
        role: 'sales',  // Default role
      });
    });
  });

  // ===========================================
  // getUserByEmail
  // ===========================================

  describe('getUserByEmail', () => {
    it('should return user when email found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U123', 'John Doe', 'john@example.com', '0812345678', 'admin'],
            ['U456', 'Jane Smith', 'jane@example.com', '0898765432', 'sales'],
          ],
        },
      });

      const user = await service.getUserByEmail('john@example.com');

      expect(user).not.toBeNull();
      expect(user?.lineUserId).toBe('U123');
      expect(user?.name).toBe('John Doe');
      expect(user?.email).toBe('john@example.com');
      expect(user?.phone).toBe('0812345678');
      expect(user?.role).toBe('admin');
    });

    it('should find email case-insensitively', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U123', 'John Doe', 'John@Example.COM', '0812345678', 'admin'],
          ],
        },
      });

      const user = await service.getUserByEmail('john@example.com');

      expect(user).not.toBeNull();
      expect(user?.email).toBe('John@Example.COM');
    });

    it('should return null when email not found', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U456', 'Jane Smith', 'jane@example.com', '0898765432', 'sales'],
          ],
        },
      });

      const user = await service.getUserByEmail('notfound@example.com');

      expect(user).toBeNull();
    });

    it('should return null when sheet is empty', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const user = await service.getUserByEmail('john@example.com');

      expect(user).toBeNull();
    });

    it('should return null when values is undefined', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {},
      });

      const user = await service.getUserByEmail('john@example.com');

      expect(user).toBeNull();
    });

    it('should use default role "sales" when role is not specified', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U123', 'John Doe', 'john@example.com', '0812345678'],  // No role column
          ],
        },
      });

      const user = await service.getUserByEmail('john@example.com');

      expect(user).not.toBeNull();
      expect(user?.role).toBe('sales');
    });

    it('should skip rows without email', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['U123', 'No Email User'],  // No email
            ['U456', 'Jane Smith', 'jane@example.com', '0898765432', 'sales'],
          ],
        },
      });

      const user = await service.getUserByEmail('jane@example.com');

      expect(user).not.toBeNull();
      expect(user?.lineUserId).toBe('U456');
    });
  });

  // ===========================================
  // getLeadsCountByStatus
  // ===========================================

  describe('getLeadsCountByStatus', () => {
    it('should return count for each status', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['2026-01-18', 'Customer1', 'email1@test.com', '', 'Company1', '', '', '', 'new'],
            ['2026-01-18', 'Customer2', 'email2@test.com', '', 'Company2', '', '', '', 'contacted'],
            ['2026-01-18', 'Customer3', 'email3@test.com', '', 'Company3', '', '', '', 'contacted'],
            ['2026-01-18', 'Customer4', 'email4@test.com', '', 'Company4', '', '', '', 'closed'],
            ['2026-01-18', 'Customer5', 'email5@test.com', '', 'Company5', '', '', '', 'lost'],
            ['2026-01-18', 'Customer6', 'email6@test.com', '', 'Company6', '', '', '', 'unreachable'],
          ],
        },
      });

      const counts = await service.getLeadsCountByStatus();

      expect(counts).toEqual({
        new: 1,
        claimed: 0,
        contacted: 2,
        closed: 1,
        lost: 1,
        unreachable: 1,
      });
    });

    it('should return all zeros when sheet is empty', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const counts = await service.getLeadsCountByStatus();

      expect(counts).toEqual({
        new: 0,
        claimed: 0,
        contacted: 0,
        closed: 0,
        lost: 0,
        unreachable: 0,
      });
    });

    it('should treat missing status as "new"', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['2026-01-18', 'Customer1', 'email1@test.com', '', 'Company1', '', '', ''],  // Status column missing
            ['2026-01-18', 'Customer2', 'email2@test.com', '', 'Company2', '', '', '', 'contacted'],
          ],
        },
      });

      const counts = await service.getLeadsCountByStatus();

      expect(counts.new).toBe(1);
      expect(counts.contacted).toBe(1);
    });

    it('should ignore invalid status values', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['2026-01-18', 'Customer1', 'email1@test.com', '', 'Company1', '', '', '', 'invalid_status'],
            ['2026-01-18', 'Customer2', 'email2@test.com', '', 'Company2', '', '', '', 'contacted'],
          ],
        },
      });

      const counts = await service.getLeadsCountByStatus();

      // 'invalid_status' should be ignored (not counted)
      expect(counts.contacted).toBe(1);
      expect(counts.new).toBe(0);  // Not treated as 'new' because status column exists
    });

    it('should handle undefined values array', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {},
      });

      const counts = await service.getLeadsCountByStatus();

      expect(counts).toEqual({
        new: 0,
        claimed: 0,
        contacted: 0,
        closed: 0,
        lost: 0,
        unreachable: 0,
      });
    });

    it('should count claimed status separately', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['2026-01-18', 'Customer1', 'email1@test.com', '', 'Company1', '', '', '', 'claimed'],
            ['2026-01-18', 'Customer2', 'email2@test.com', '', 'Company2', '', '', '', 'claimed'],
            ['2026-01-18', 'Customer3', 'email3@test.com', '', 'Company3', '', '', '', 'new'],
          ],
        },
      });

      const counts = await service.getLeadsCountByStatus();

      expect(counts.claimed).toBe(2);
      expect(counts.new).toBe(1);
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
