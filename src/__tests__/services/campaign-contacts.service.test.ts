/**
 * ENEOS Sales Automation - Campaign Contacts Service Tests
 * Unit tests for Campaign_Contacts sheet storage and upsert logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const { mockSheets } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockAppend = vi.fn();
  const mockUpdate = vi.fn();

  return {
    mockSheets: {
      spreadsheets: {
        values: {
          get: mockGet,
          append: mockAppend,
          update: mockUpdate,
        },
      },
    },
  };
});

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn().mockReturnValue(mockSheets),
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    google: {
      serviceAccountEmail: 'test@test.iam.gserviceaccount.com',
      privateKey: 'test-key',
      sheetId: 'test-sheet-id',
      sheets: {
        campaignContacts: 'Campaign_Contacts',
      },
    },
    isProd: false,
    isDev: true,
    logLevel: 'error',
  },
}));

vi.mock('../../utils/retry.js', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
  CircuitBreaker: vi.fn().mockImplementation(() => ({
    execute: vi.fn((fn: () => Promise<unknown>) => fn()),
  })),
}));

// ===========================================
// Import After Mocks
// ===========================================

import { campaignContactsService } from '../../services/campaign-contacts.service.js';
import type { NormalizedBrevoPayload } from '../../types/index.js';

// ===========================================
// Test Data
// ===========================================

function createTestContact(overrides: Partial<NormalizedBrevoPayload> = {}): NormalizedBrevoPayload {
  return {
    email: 'john@example.com',
    firstname: 'John',
    lastname: 'Doe',
    phone: '0812345678',
    company: 'Acme Corp',
    campaignId: '100',
    campaignName: 'Test Campaign',
    subject: 'Subject',
    contactId: '999',
    eventId: 'msg-123',
    clickedAt: '2026-02-04 10:00:00',
    jobTitle: 'Manager',
    leadSource: 'Brevo Automation',
    city: 'Bangkok',
    website: 'https://acme.com',
    ...overrides,
  };
}

// ===========================================
// Tests
// ===========================================

describe('CampaignContactsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('storeCampaignContact', () => {
    it('should store a new contact when no existing contact found', async () => {
      // No existing contacts
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Email', 'Firstname']] }, // header only
      });
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      const contact = createTestContact();
      const result = await campaignContactsService.storeCampaignContact(contact);

      expect(result.success).toBe(true);
      expect(result.isUpdate).toBe(false);
      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledTimes(1);

      // Verify row data
      const appendCall = mockSheets.spreadsheets.values.append.mock.calls[0][0];
      const row = appendCall.requestBody.values[0];
      expect(row[0]).toBe('john@example.com'); // Email
      expect(row[1]).toBe('John'); // Firstname
      expect(row[2]).toBe('Doe'); // Lastname
      expect(row[3]).toBe('0812345678'); // Phone
      expect(row[4]).toBe('Acme Corp'); // Company
      expect(row[5]).toBe('Manager'); // Job_Title
      expect(row[6]).toBe('Bangkok'); // City
      expect(row[7]).toBe('https://acme.com'); // Website
      expect(row[8]).toBe('100'); // Campaign_ID
      expect(row[9]).toBe('Test Campaign'); // Campaign_Name
      expect(row[12]).toBe('Brevo Automation'); // Lead_Source
      // Created_At and Updated_At should be ISO strings
      expect(row[13]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // Created_At
      expect(row[14]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // Updated_At
    });

    it('should update existing contact (upsert) when email + campaign_id match', async () => {
      const existingRow = [
        'john@example.com', 'OldFirst', 'OldLast', '0899999999', 'Old Corp',
        'Old Title', 'Old City', 'https://old.com', '100', 'Test Campaign',
        '2026-02-01', '', 'Old Source', '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z',
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Email', 'Firstname'], // header
            existingRow,
          ],
        },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const contact = createTestContact();
      const result = await campaignContactsService.storeCampaignContact(contact);

      expect(result.success).toBe(true);
      expect(result.isUpdate).toBe(true);
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledTimes(1);
      expect(mockSheets.spreadsheets.values.append).not.toHaveBeenCalled();

      // Verify Created_At is preserved (immutable)
      const updateCall = mockSheets.spreadsheets.values.update.mock.calls[0][0];
      const updatedRow = updateCall.requestBody.values[0];
      expect(updatedRow[13]).toBe('2026-02-01T00:00:00.000Z'); // Created_At preserved
      expect(updatedRow[14]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // Updated_At refreshed
      expect(updatedRow[14]).not.toBe('2026-02-01T00:00:00.000Z'); // Should be updated
    });

    it('should store contact with email only when no other attributes', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Email', 'Firstname']] },
      });
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      const contact = createTestContact({
        firstname: '',
        lastname: '',
        phone: '',
        company: '',
        jobTitle: '',
        city: '',
        website: '',
        leadSource: '',
      });

      const result = await campaignContactsService.storeCampaignContact(contact);

      expect(result.success).toBe(true);
      const row = mockSheets.spreadsheets.values.append.mock.calls[0][0].requestBody.values[0];
      expect(row[0]).toBe('john@example.com');
      expect(row[1]).toBe('');
      expect(row[2]).toBe('');
      expect(row[4]).toBe('');
    });

    it('should return error on Sheets API failure', async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValue(new Error('Sheets API error'));

      const contact = createTestContact();
      const result = await campaignContactsService.storeCampaignContact(contact);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sheets API error');
    });

    it('should match by case-insensitive email for dedup', async () => {
      const existingRow = [
        'JOHN@EXAMPLE.COM', 'John', 'Doe', '', '', '', '', '', '100', 'Test',
        '', '', '', '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z',
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Email', 'Firstname'],
            existingRow,
          ],
        },
      });
      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      const contact = createTestContact({ email: 'john@example.com' });
      const result = await campaignContactsService.storeCampaignContact(contact);

      expect(result.success).toBe(true);
      expect(result.isUpdate).toBe(true);
    });

    it('should NOT match when email matches but campaign_id differs', async () => {
      const existingRow = [
        'john@example.com', 'John', 'Doe', '', '', '', '', '', '200', 'Other Campaign',
        '', '', '', '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z',
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Email', 'Firstname'],
            existingRow,
          ],
        },
      });
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      const contact = createTestContact({ campaignId: '100' });
      const result = await campaignContactsService.storeCampaignContact(contact);

      expect(result.success).toBe(true);
      expect(result.isUpdate).toBe(false);
      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllContactsByEmail', () => {
    it('should return all contacts as map keyed by email', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Email', 'Firstname'], // header
            ['john@example.com', 'John', 'Doe', '', 'Acme', '', '', '', '100', 'Test', '', '', '', '', ''],
            ['jane@example.com', 'Jane', 'Smith', '', 'Beta Corp', '', '', '', '100', 'Test', '', '', '', '', ''],
            ['other@example.com', 'Other', 'Person', '', 'Gamma', '', '', '', '200', 'Other', '', '', '', '', ''],
          ],
        },
      });

      const contacts = await campaignContactsService.getAllContactsByEmail();

      // All contacts returned (no campaign_id filter)
      expect(contacts.size).toBe(3);
      expect(contacts.get('john@example.com')).toEqual(
        expect.objectContaining({
          firstname: 'John',
          lastname: 'Doe',
          company: 'Acme',
        })
      );
      expect(contacts.get('jane@example.com')).toEqual(
        expect.objectContaining({
          firstname: 'Jane',
          lastname: 'Smith',
          company: 'Beta Corp',
        })
      );
      expect(contacts.get('other@example.com')).toEqual(
        expect.objectContaining({
          firstname: 'Other',
          lastname: 'Person',
          company: 'Gamma',
        })
      );
    });

    it('should return empty map when no contacts exist', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Email', 'Firstname']] },
      });

      const contacts = await campaignContactsService.getAllContactsByEmail();

      expect(contacts.size).toBe(0);
    });

    it('should return empty map on sheet read error', async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValue(new Error('API error'));

      const contacts = await campaignContactsService.getAllContactsByEmail();

      expect(contacts.size).toBe(0);
    });
  });
});
