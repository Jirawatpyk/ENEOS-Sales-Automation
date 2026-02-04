/**
 * ENEOS Sales Automation - Campaign Stats Service Tests
 * Unit tests for Brevo Campaign Events processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NormalizedCampaignEvent } from '../../validators/campaign-event.validator.js';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const { mockSheetsClient, mockGetContactsForCampaign } = vi.hoisted(() => ({
  mockSheetsClient: {
    spreadsheets: {
      values: {
        get: vi.fn(),
        append: vi.fn(),
        update: vi.fn(),
      },
    },
  },
  mockGetContactsForCampaign: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn(() => mockSheetsClient),
  },
}));

vi.mock('../../services/campaign-contacts.service.js', () => ({
  campaignContactsService: {
    getContactsForCampaign: mockGetContactsForCampaign,
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    google: {
      serviceAccountEmail: 'test@test.iam.gserviceaccount.com',
      privateKey: 'test-private-key',
      sheetId: 'test-sheet-id',
      sheets: {
        leads: 'Leads',
        dedup: 'Deduplication_Log',
        salesTeam: 'Sales_Team',
        statusHistory: 'Status_History',
        campaignEvents: 'Campaign_Events',
        campaignStats: 'Campaign_Stats',
        campaignContacts: 'Campaign_Contacts',
      },
    },
    logLevel: 'error',
    isDev: true,
    isProd: false,
  },
}));

// ===========================================
// Import Service After Mocks
// ===========================================

import {
  campaignStatsService,
  CampaignStatsService,
} from '../../services/campaign-stats.service.js';

// ===========================================
// Test Data
// ===========================================

const createMockEvent = (overrides?: Partial<NormalizedCampaignEvent>): NormalizedCampaignEvent => ({
  eventId: 12345,
  campaignId: 100,
  campaignName: 'Test Campaign',
  email: 'test@example.com',
  event: 'click',
  eventAt: '2026-01-30 10:00:00',
  sentAt: '2026-01-30 09:00:00',
  url: 'https://example.com/link',
  tag: 'promo',
  segmentIds: [1, 2],
  ...overrides,
});

// ===========================================
// Service Tests
// ===========================================

describe('CampaignStatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkDuplicateEvent', () => {
    it('should return false when event does not exist', async () => {
      // Sheet now returns Event_ID and Event columns
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['11111', '100', 'Test', 'a@b.com', 'click'],
            ['22222', '100', 'Test', 'a@b.com', 'delivered'],
          ],
        },
      });

      const result = await campaignStatsService.checkDuplicateEvent(99999, 'click');
      expect(result).toBe(false);
    });

    it('should return true when event already exists', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['12345', '100', 'Test', 'a@b.com', 'click'],
            ['67890', '100', 'Test', 'a@b.com', 'delivered'],
          ],
        },
      });

      const result = await campaignStatsService.checkDuplicateEvent(12345, 'click');
      expect(result).toBe(true);
    });

    it('should handle empty sheet', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const result = await campaignStatsService.checkDuplicateEvent(12345, 'click');
      expect(result).toBe(false);
    });

    it('should handle null response', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: null },
      });

      const result = await campaignStatsService.checkDuplicateEvent(12345, 'click');
      expect(result).toBe(false);
    });

    // Story 5-10: Composite key deduplication (Event_ID + Event_Type)
    it('should return false when same eventId but different eventType (AC#1)', async () => {
      // GIVEN: Event 12345 exists with type 'click'
      // Sheet data: [Event_ID, Campaign_ID, Campaign_Name, Email, Event]
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['12345', '100', 'Test', 'a@b.com', 'click'], // existing click event
          ],
        },
      });

      // WHEN: Checking for same eventId but 'delivered' type
      const result = await campaignStatsService.checkDuplicateEvent(12345, 'delivered');

      // THEN: Should NOT be duplicate (different event type)
      expect(result).toBe(false);
    });

    it('should return true when same eventId AND same eventType (AC#3)', async () => {
      // GIVEN: Event 12345 exists with type 'click'
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['12345', '100', 'Test', 'a@b.com', 'click'], // existing click event
          ],
        },
      });

      // WHEN: Checking for same eventId AND same type
      const result = await campaignStatsService.checkDuplicateEvent(12345, 'click');

      // THEN: Should be duplicate
      expect(result).toBe(true);
    });

    it('should allow all event types for same eventId (AC#2)', async () => {
      // GIVEN: Event 12345 exists with 'delivered' type only
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['12345', '100', 'Test', 'a@b.com', 'delivered'],
          ],
        },
      });

      // WHEN: Checking 'opened' and 'click' for same eventId
      const openedResult = await campaignStatsService.checkDuplicateEvent(12345, 'opened');

      // Reset mock for next call with updated data (simulating opened was added)
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event'],
            ['12345', '100', 'Test', 'a@b.com', 'delivered'],
            ['12345', '100', 'Test', 'a@b.com', 'opened'],
          ],
        },
      });
      const clickResult = await campaignStatsService.checkDuplicateEvent(12345, 'click');

      // THEN: Both should NOT be duplicates
      expect(openedResult).toBe(false);
      expect(clickResult).toBe(false);
    });
  });

  describe('writeCampaignEvent', () => {
    it('should append event to Campaign_Events sheet', async () => {
      mockSheetsClient.spreadsheets.values.append.mockResolvedValue({
        data: { updates: { updatedRange: 'Campaign_Events!A2:K2' } },
      });

      const event = createMockEvent();
      await campaignStatsService.writeCampaignEvent(event);

      expect(mockSheetsClient.spreadsheets.values.append).toHaveBeenCalledTimes(1);
      const callArgs = mockSheetsClient.spreadsheets.values.append.mock.calls[0][0];
      expect(callArgs.range).toContain('Campaign_Events');
    });

    it('should include all event fields in the row', async () => {
      mockSheetsClient.spreadsheets.values.append.mockResolvedValue({
        data: { updates: { updatedRange: 'Campaign_Events!A2:K2' } },
      });

      const event = createMockEvent();
      await campaignStatsService.writeCampaignEvent(event);

      const callArgs = mockSheetsClient.spreadsheets.values.append.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[0]).toBe(12345); // Event_ID
      expect(row[1]).toBe(100); // Campaign_ID
      expect(row[2]).toBe('Test Campaign'); // Campaign_Name
      expect(row[3]).toBe('test@example.com'); // Email
      expect(row[4]).toBe('click'); // Event
      expect(row[5]).toBe('2026-01-30 10:00:00'); // Event_At
      expect(row[6]).toBe('2026-01-30 09:00:00'); // Sent_At
      expect(row[7]).toBe('https://example.com/link'); // URL
      expect(row[8]).toBe('promo'); // Tag
      expect(row[9]).toBe('[1,2]'); // Segment_IDs (JSON string)
    });
  });

  describe('getCampaignStats', () => {
    it('should return null when campaign does not exist', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });

      const result = await campaignStatsService.getCampaignStats(999);
      expect(result).toBeNull();
    });

    it('should return stats row when campaign exists', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked'],
            ['100', 'Test Campaign', '50', '20', '10'],
          ],
        },
      });

      const result = await campaignStatsService.getCampaignStats(100);
      expect(result).not.toBeNull();
      expect(result?.row).toBeDefined();
      expect(result?.rowIndex).toBe(1);
    });
  });

  describe('recordCampaignEvent', () => {
    it('should return duplicate status for existing event', async () => {
      // checkDuplicateEvent returns true (same eventId + same eventType)
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['12345', '100', 'Test', 'a@b.com', 'click'], // existing event with 'click' type
          ],
        },
      });

      const event = createMockEvent({ eventId: 12345, event: 'click' });
      const result = await campaignStatsService.recordCampaignEvent(event);

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
    });

    it('should record new event and update stats with unique count', async () => {
      // checkDuplicateEvent returns false (event doesn't exist)
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [['header']] },
      });
      // writeCampaignEvent
      mockSheetsClient.spreadsheets.values.append.mockResolvedValueOnce({
        data: { updates: { updatedRange: 'Campaign_Events!A2:K2' } },
      });
      // countUniqueEmailsForEvent - returns 1 unique email (new flow)
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign', 'test@example.com', 'click'],
          ],
        },
      });
      // getCampaignStats (inside updateCampaignStatsWithUniqueCount)
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [['header']] },
      });
      // createNewCampaignStatsWithUniqueCount via append
      mockSheetsClient.spreadsheets.values.append.mockResolvedValueOnce({
        data: { updates: { updatedRange: 'Campaign_Stats!A2:O2' } },
      });

      const event = createMockEvent();
      const result = await campaignStatsService.recordCampaignEvent(event);

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockSheetsClient.spreadsheets.values.get.mockRejectedValue(
        new Error('API Error')
      );

      const event = createMockEvent();
      const result = await campaignStatsService.recordCampaignEvent(event);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ===========================================
  // New Tests for Race Condition Fix (Issue #4)
  // ===========================================

  describe('countUniqueEmailsForEvent', () => {
    it('should count unique emails for a campaign event type', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign', 'user1@example.com', 'click'],
            ['100', 'Campaign', 'user2@example.com', 'click'],
            ['100', 'Campaign', 'user1@example.com', 'click'], // duplicate email
            ['100', 'Campaign', 'user3@example.com', 'opened'], // different event
          ],
        },
      });

      const result = await campaignStatsService.countUniqueEmailsForEvent(100, 'click');
      expect(result).toBe(2); // user1 and user2 (not user3 which is 'opened')
    });

    it('should return 0 for campaign with no events of type', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign', 'user1@example.com', 'delivered'],
          ],
        },
      });

      const result = await campaignStatsService.countUniqueEmailsForEvent(100, 'click');
      expect(result).toBe(0);
    });

    it('should be case-insensitive for email counting', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign', 'USER@EXAMPLE.COM', 'click'],
            ['100', 'Campaign', 'user@example.com', 'click'], // same email different case
          ],
        },
      });

      const result = await campaignStatsService.countUniqueEmailsForEvent(100, 'click');
      expect(result).toBe(1); // Should count as 1 unique email
    });

    it('should differentiate by campaign ID', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign A', 'user1@example.com', 'click'],
            ['200', 'Campaign B', 'user2@example.com', 'click'], // different campaign
          ],
        },
      });

      const result = await campaignStatsService.countUniqueEmailsForEvent(100, 'click');
      expect(result).toBe(1); // Only campaign 100
    });
  });

  describe('updateCampaignStatsWithUniqueCount', () => {
    it('should set unique count directly from parameter', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '100', '50', '20', '30', '10', '30', '10', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'click' });
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 15); // Set unique to 15

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[4]).toBe(21); // Clicked incremented by 1
      expect(row[6]).toBe(15); // Unique_Clicks SET to 15 (not incremented)
    });

    it('should create new row with unique count for new campaign', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });
      mockSheetsClient.spreadsheets.values.append.mockResolvedValue({
        data: { updates: { updatedRange: 'Campaign_Stats!A2:O2' } },
      });

      const event = createMockEvent({ event: 'opened' });
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 1);

      const callArgs = mockSheetsClient.spreadsheets.values.append.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[3]).toBe(1); // Opened = 1
      expect(row[5]).toBe(1); // Unique_Opens = 1
    });
  });

  // ===========================================
  // Rate Precision Tests (Issue #3)
  // ===========================================

  describe('Rate Calculation Precision', () => {
    it('should calculate rates with 2 decimal precision', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '7', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      // 3 unique opens out of 7 delivered = 42.857...%
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 3);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      // 3/7 * 100 = 42.857... → should be 42.86 with 2 decimal precision
      expect(row[7]).toBe(42.86);
    });

    it('should handle exact percentage without decimal', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '4', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      // 1 unique open out of 4 delivered = 25%
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 1);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[7]).toBe(25); // Exact 25%
    });
  });

  // ===========================================
  // Story 5-2: READ Operations Tests
  // ===========================================

  describe('getAllCampaignStats', () => {
    const mockStatsData = [
      ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
      ['100', 'BMF2026 Launch', '1000', '450', '120', '400', '100', '40', '10', '0', '0', '0', '0', '2026-01-15T10:00:00.000Z', '2026-01-30T15:30:00.000Z'],
      ['101', 'Q1 Promo', '500', '200', '50', '180', '45', '36', '9', '0', '0', '0', '0', '2026-01-10T08:00:00.000Z', '2026-01-28T12:00:00.000Z'],
      ['102', 'Welcome Series', '250', '100', '30', '90', '25', '36', '10', '0', '0', '0', '0', '2026-01-20T14:00:00.000Z', '2026-01-29T09:00:00.000Z'],
    ];

    it('should return empty array when no campaigns exist', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });

      const result = await campaignStatsService.getAllCampaignStats();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should return all campaigns with pagination metadata', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({ page: 1, limit: 20 });

      expect(result.data.length).toBe(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should apply pagination correctly', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({ page: 1, limit: 2 });

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should filter by search term (case-insensitive)', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({ search: 'bmf' });

      expect(result.data.length).toBe(1);
      expect(result.data[0].campaignName).toBe('BMF2026 Launch');
    });

    it('should filter by dateFrom', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({
        dateFrom: '2026-01-15',
      });

      expect(result.data.length).toBe(2); // BMF2026 Launch and Welcome Series
    });

    it('should filter by dateTo', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({
        dateTo: '2026-01-12',
      });

      expect(result.data.length).toBe(1); // Only Q1 Promo (2026-01-10)
    });

    it('should filter by date range', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({
        dateFrom: '2026-01-12',
        dateTo: '2026-01-18',
      });

      expect(result.data.length).toBe(1); // Only BMF2026 Launch
    });

    it('should sort by Last_Updated descending by default', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats();

      // Newest updated first: BMF2026 (30th), Welcome (29th), Q1 (28th)
      expect(result.data[0].campaignName).toBe('BMF2026 Launch');
      expect(result.data[2].campaignName).toBe('Q1 Promo');
    });

    it('should sort by Campaign_Name ascending', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({
        sortBy: 'Campaign_Name',
        sortOrder: 'asc',
      });

      expect(result.data[0].campaignName).toBe('BMF2026 Launch');
      expect(result.data[1].campaignName).toBe('Q1 Promo');
      expect(result.data[2].campaignName).toBe('Welcome Series');
    });

    it('should sort by Delivered descending', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({
        sortBy: 'Delivered',
        sortOrder: 'desc',
      });

      expect(result.data[0].delivered).toBe(1000);
      expect(result.data[1].delivered).toBe(500);
      expect(result.data[2].delivered).toBe(250);
    });

    it('should sort by Open_Rate', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({
        sortBy: 'Open_Rate',
        sortOrder: 'desc',
      });

      expect(result.data[0].openRate).toBe(40);
      expect(result.data[1].openRate).toBe(36);
    });

    it('should correctly parse campaign stats item fields', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats();
      const campaign = result.data.find((c) => c.campaignId === 100);

      expect(campaign).toBeDefined();
      expect(campaign?.campaignId).toBe(100);
      expect(campaign?.campaignName).toBe('BMF2026 Launch');
      expect(campaign?.delivered).toBe(1000);
      expect(campaign?.opened).toBe(450);
      expect(campaign?.clicked).toBe(120);
      expect(campaign?.uniqueOpens).toBe(400);
      expect(campaign?.uniqueClicks).toBe(100);
      expect(campaign?.openRate).toBe(40);
      expect(campaign?.clickRate).toBe(10);
      expect(campaign?.hardBounce).toBe(0);
      expect(campaign?.firstEvent).toBe('2026-01-15T10:00:00.000Z');
      expect(campaign?.lastUpdated).toBe('2026-01-30T15:30:00.000Z');
    });
  });

  describe('getCampaignStatsById', () => {
    it('should return null when campaign not found', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });

      const result = await campaignStatsService.getCampaignStatsById(999);

      expect(result).toBeNull();
    });

    it('should return campaign stats when found', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '1000', '450', '120', '400', '100', '40', '10', '5', '2', '1', '0', '2026-01-15T10:00:00.000Z', '2026-01-30T15:30:00.000Z'],
          ],
        },
      });

      const result = await campaignStatsService.getCampaignStatsById(100);

      expect(result).not.toBeNull();
      expect(result?.campaignId).toBe(100);
      expect(result?.campaignName).toBe('Test Campaign');
      expect(result?.delivered).toBe(1000);
      expect(result?.hardBounce).toBe(5);
      expect(result?.softBounce).toBe(2);
      expect(result?.unsubscribe).toBe(1);
      expect(result?.spam).toBe(0);
    });

    it('should include all future columns even if 0', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test', '100', '50', '20', '40', '15', '40', '15', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });

      const result = await campaignStatsService.getCampaignStatsById(100);

      expect(result?.hardBounce).toBe(0);
      expect(result?.softBounce).toBe(0);
      expect(result?.unsubscribe).toBe(0);
      expect(result?.spam).toBe(0);
    });
  });

  describe('getCampaignEvents', () => {
    const mockEventsData = [
      ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event', 'Event_At', 'Sent_At', 'URL', 'Tag', 'Segment_IDs', 'Created_At'],
      ['1001', '100', 'BMF2026', 'user1@example.com', 'delivered', '2026-01-30T10:00:00.000Z', '2026-01-30T09:55:00.000Z', '', '', '[]', '2026-01-30T10:00:00.000Z'],
      ['1002', '100', 'BMF2026', 'user1@example.com', 'opened', '2026-01-30T10:05:00.000Z', '', '', '', '[]', '2026-01-30T10:05:00.000Z'],
      ['1003', '100', 'BMF2026', 'user1@example.com', 'click', '2026-01-30T10:10:00.000Z', '', 'https://example.com/promo', '', '[]', '2026-01-30T10:10:00.000Z'],
      ['1004', '200', 'Other Campaign', 'user2@example.com', 'delivered', '2026-01-30T11:00:00.000Z', '', '', '', '[]', '2026-01-30T11:00:00.000Z'],
      ['1005', '100', 'BMF2026', 'user2@example.com', 'opened', '2026-01-29T08:00:00.000Z', '', '', '', '[]', '2026-01-29T08:00:00.000Z'],
    ];

    it('should return empty array when no events for campaign', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });

      const result = await campaignStatsService.getCampaignEvents(999);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should return events for specific campaign only', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100);

      expect(result.data.length).toBe(4); // Events for campaign 100 only
      expect(result.pagination.total).toBe(4);
    });

    it('should apply pagination correctly', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100, { page: 1, limit: 2 });

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(4);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should filter by event type', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100, { event: 'opened' });

      expect(result.data.length).toBe(2); // Two opened events for campaign 100
      expect(result.data.every((e) => e.event === 'opened')).toBe(true);
    });

    it('should filter by dateFrom', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100, {
        dateFrom: '2026-01-30',
      });

      expect(result.data.length).toBe(3); // Only events on Jan 30
    });

    it('should filter by dateTo', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100, {
        dateTo: '2026-01-29T23:59:59.999Z',
      });

      expect(result.data.length).toBe(1); // Only the Jan 29 event
    });

    it('should sort events by eventAt descending', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100);

      // Newest first
      expect(new Date(result.data[0].eventAt).getTime()).toBeGreaterThan(
        new Date(result.data[result.data.length - 1].eventAt).getTime()
      );
    });

    it('should correctly parse event item fields', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100);
      const clickEvent = result.data.find((e) => e.event === 'click');

      expect(clickEvent).toBeDefined();
      expect(clickEvent?.eventId).toBe(1003);
      expect(clickEvent?.email).toBe('user1@example.com');
      expect(clickEvent?.event).toBe('click');
      expect(clickEvent?.eventAt).toBe('2026-01-30T10:10:00.000Z');
      expect(clickEvent?.url).toBe('https://example.com/promo');
    });

    it('should return null URL for non-click events', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100);
      const deliveredEvent = result.data.find((e) => e.event === 'delivered');

      expect(deliveredEvent?.url).toBeNull();
    });

    // Story 5-11 AC6: Contact data join tests
    it('AC6: should include contact data from Campaign_Contacts', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      // Mock contacts for campaign 100
      const contactsMap = new Map([
        ['user1@example.com', {
          email: 'user1@example.com',
          firstname: 'John',
          lastname: 'Doe',
          company: 'Acme Corp',
          phone: '', jobTitle: '', city: '', website: '',
          campaignId: '100', campaignName: 'BMF2026',
          eventAt: '', url: '', leadSource: '',
          createdAt: '', updatedAt: '',
        }],
      ]);
      mockGetContactsForCampaign.mockResolvedValue(contactsMap);

      const result = await campaignStatsService.getCampaignEvents(100);

      // Events by user1 should have contact data
      const user1Events = result.data.filter((e) => e.email === 'user1@example.com');
      expect(user1Events.length).toBeGreaterThan(0);
      for (const event of user1Events) {
        expect(event.firstname).toBe('John');
        expect(event.lastname).toBe('Doe');
        expect(event.company).toBe('Acme Corp');
      }

      // Events by user2 should have empty contact data
      const user2Events = result.data.filter((e) => e.email === 'user2@example.com');
      for (const event of user2Events) {
        expect(event.firstname).toBe('');
        expect(event.lastname).toBe('');
        expect(event.company).toBe('');
      }
    });

    it('AC6: should return empty contact fields when no contacts exist', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });
      mockGetContactsForCampaign.mockResolvedValue(new Map());

      const result = await campaignStatsService.getCampaignEvents(100);

      for (const event of result.data) {
        expect(event.firstname).toBe('');
        expect(event.lastname).toBe('');
        expect(event.company).toBe('');
      }
    });

    it('AC6: should include firstname, lastname, company in all event items', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100);

      for (const event of result.data) {
        expect(event).toHaveProperty('firstname');
        expect(event).toHaveProperty('lastname');
        expect(event).toHaveProperty('company');
      }
    });
  });

  // ===========================================
  // Performance Tests (AC5)
  // ===========================================

  describe('Performance (AC5)', () => {
    /**
     * Generate mock campaign stats data for performance testing
     * @param count Number of campaigns to generate
     */
    const generateMockCampaigns = (count: number) => {
      const header = [
        'Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked',
        'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate',
        'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam',
        'First_Event', 'Last_Updated',
      ];

      const rows = [];
      for (let i = 1; i <= count; i++) {
        rows.push([
          i,                                    // Campaign_ID
          `Campaign ${i}`,                      // Campaign_Name
          1000 + i,                             // Delivered
          400 + i,                              // Opened
          100 + i,                              // Clicked
          350 + i,                              // Unique_Opens
          80 + i,                               // Unique_Clicks
          35 + (i % 10),                        // Open_Rate
          8 + (i % 5),                          // Click_Rate
          0,                                    // Hard_Bounce
          0,                                    // Soft_Bounce
          0,                                    // Unsubscribe
          0,                                    // Spam
          `2026-01-${String(1 + (i % 28)).padStart(2, '0')}T10:00:00.000Z`, // First_Event
          `2026-01-30T15:${String(i % 60).padStart(2, '0')}:00.000Z`,       // Last_Updated
        ]);
      }

      return [header, ...rows];
    };

    it('should process 100 campaigns in under 2 seconds (AC5)', async () => {
      const mockData = generateMockCampaigns(100);
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockData },
      });

      const startTime = Date.now();
      const result = await campaignStatsService.getAllCampaignStats({
        page: 1,
        limit: 100,
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert performance requirement: < 2000ms (2 seconds)
      expect(duration).toBeLessThan(2000);
      expect(result.data.length).toBe(100);
      expect(result.pagination.total).toBe(100);
    });

    it('should process 100 campaigns with search filter in under 2 seconds', async () => {
      const mockData = generateMockCampaigns(100);
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockData },
      });

      const startTime = Date.now();
      const result = await campaignStatsService.getAllCampaignStats({
        page: 1,
        limit: 100,
        search: 'Campaign 5', // Should match Campaign 5, 50, 51-59
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
      // Search should filter results
      expect(result.data.every((c) => c.campaignName.includes('Campaign 5'))).toBe(true);
    });

    it('should process 100 campaigns with sorting in under 2 seconds', async () => {
      const mockData = generateMockCampaigns(100);
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockData },
      });

      const startTime = Date.now();
      const result = await campaignStatsService.getAllCampaignStats({
        page: 1,
        limit: 100,
        sortBy: 'Delivered',
        sortOrder: 'desc',
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
      expect(result.data.length).toBe(100);
      // Verify sorting - first should have highest delivered count
      expect(result.data[0].delivered).toBeGreaterThanOrEqual(result.data[99].delivered);
    });

    it('should process 100 campaigns with date range filter in under 2 seconds', async () => {
      const mockData = generateMockCampaigns(100);
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockData },
      });

      const startTime = Date.now();
      const result = await campaignStatsService.getAllCampaignStats({
        page: 1,
        limit: 100,
        dateFrom: '2026-01-10',
        dateTo: '2026-01-20',
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
      // All returned campaigns should be within date range
      result.data.forEach((campaign) => {
        const eventDate = new Date(campaign.firstEvent);
        expect(eventDate.getTime()).toBeGreaterThanOrEqual(new Date('2026-01-10').getTime());
        expect(eventDate.getTime()).toBeLessThanOrEqual(new Date('2026-01-20').getTime());
      });
    });

    it('should handle 200 campaigns with pagination efficiently', async () => {
      const mockData = generateMockCampaigns(200);
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockData },
      });

      const startTime = Date.now();
      const result = await campaignStatsService.getAllCampaignStats({
        page: 2,
        limit: 50,
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
      expect(result.data.length).toBe(50);
      expect(result.pagination.total).toBe(200);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(4);
    });
  });

  // ===========================================
  // Guardrail Tests - Edge Cases & Resilience
  // ===========================================

  describe('Guardrail: Rate Calculation Edge Cases', () => {
    it('[P1] should return 0 rates when delivered is 0', async () => {
      // Simulates a scenario where no deliveries but somehow opens/clicks exist (data corruption)
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test', '0', '5', '3', '2', '1', '0', '0', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 3);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      // With 0 delivered, rates should be 0 (not NaN or Infinity)
      expect(row[7]).toBe(0); // Open_Rate
      expect(row[8]).toBe(0); // Click_Rate
    });

    it('[P2] should calculate rates correctly with large numbers', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test', '100000', '50000', '10000', '0', '0', '0', '0', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      // 33333 unique opens / 100000 delivered = 33.33%
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 33333);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[5]).toBe(33333); // Unique_Opens set directly
      expect(row[7]).toBe(33.33); // Open_Rate with 2 decimal precision
    });
  });

  describe('Guardrail: countUniqueEmailsForEvent Edge Cases', () => {
    it('[P1] should count empty email rows as 1 unique (empty string)', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'],
            ['100', 'Test', '', 'opened'],      // empty email
            ['100', 'Test', '', 'opened'],      // same empty email
            ['100', 'Test', 'a@b.com', 'opened'],
          ],
        },
      });

      const result = await campaignStatsService.countUniqueEmailsForEvent(100, 'opened');
      // 2 unique: '' and 'a@b.com'
      expect(result).toBe(2);
    });

    it('[P1] should handle sparse rows with missing columns', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'],
            ['100', 'Test'],                    // Only 2 columns (sparse row)
            ['100', 'Test', 'a@b.com', 'opened'], // Full row
          ],
        },
      });

      const result = await campaignStatsService.countUniqueEmailsForEvent(100, 'opened');
      // Sparse row has undefined email and event, should not match
      expect(result).toBe(1);
    });

    it('[P2] should return 0 when no events exist for campaign', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });

      const result = await campaignStatsService.countUniqueEmailsForEvent(999, 'opened');
      expect(result).toBe(0);
    });

    it('[P2] should be case-insensitive for email matching', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'],
            ['100', 'Test', 'User@Example.COM', 'opened'],
            ['100', 'Test', 'user@example.com', 'opened'],
          ],
        },
      });

      const result = await campaignStatsService.countUniqueEmailsForEvent(100, 'opened');
      // Both should count as 1 unique (case insensitive)
      expect(result).toBe(1);
    });
  });

  describe('Guardrail: Partial Failure Scenarios', () => {
    it('[P0] should return error when writeCampaignEvent fails after duplicate check passes', async () => {
      // Step 1: duplicate check passes
      mockSheetsClient.spreadsheets.values.get
        .mockResolvedValueOnce({ data: { values: [['header']] } }); // checkDuplicate - no rows
      // Step 2: write fails
      mockSheetsClient.spreadsheets.values.append
        .mockRejectedValueOnce(new Error('Sheets quota exceeded'));

      const event = createMockEvent();
      const result = await campaignStatsService.recordCampaignEvent(event);

      // Write failure is a hard error - event not recorded
      expect(result.success).toBe(false);
      expect(result.error).toContain('Sheets quota exceeded');
    });

    it('[P1] should return success when countUnique fails after write succeeds (stats stale)', async () => {
      // Step 1: duplicate check passes
      mockSheetsClient.spreadsheets.values.get
        .mockResolvedValueOnce({ data: { values: [['header']] } }); // checkDuplicate
      // Step 2: write succeeds
      mockSheetsClient.spreadsheets.values.append
        .mockResolvedValueOnce({ data: {} });
      // Step 3: countUnique fails
      mockSheetsClient.spreadsheets.values.get
        .mockRejectedValueOnce(new Error('Network timeout'));

      const event = createMockEvent();
      const result = await campaignStatsService.recordCampaignEvent(event);

      // Event was written (source of truth) — return success even though stats failed
      // Stats can be reconciled later from Campaign_Events
      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(false);
    });

    it('[P1] should return success when updateStats fails after countUnique succeeds (stats stale)', async () => {
      // Step 1: duplicate check
      mockSheetsClient.spreadsheets.values.get
        .mockResolvedValueOnce({ data: { values: [['header']] } }); // checkDuplicate
      // Step 2: write succeeds
      mockSheetsClient.spreadsheets.values.append
        .mockResolvedValueOnce({ data: {} });
      // Step 3: countUnique succeeds
      mockSheetsClient.spreadsheets.values.get
        .mockResolvedValueOnce({
          data: { values: [['header'], ['100', 'Test', 'test@test.com', 'click']] },
        });
      // Step 4: getCampaignStats (inside updateStatsWithUniqueCount)
      mockSheetsClient.spreadsheets.values.get
        .mockResolvedValueOnce({ data: { values: [['header']] } }); // no existing stats
      // Step 5: createNew fails
      mockSheetsClient.spreadsheets.values.append
        .mockRejectedValueOnce(new Error('Stats sheet locked'));

      const event = createMockEvent();
      const result = await campaignStatsService.recordCampaignEvent(event);

      // Event was written (source of truth) — return success even though stats failed
      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(false);
    });
  });

  describe('Guardrail: checkDuplicateEvent Edge Cases', () => {
    it('[P1] should handle malformed eventId in sheet (non-numeric)', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header'], ['abc'], ['12345'], ['not_a_number']] },
      });

      // NaN !== 12345 so malformed rows should not match
      const result = await campaignStatsService.checkDuplicateEvent(12345);
      expect(result).toBe(true);
    });

    it('[P1] should handle empty sheet (no data rows)', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });

      const result = await campaignStatsService.checkDuplicateEvent(12345);
      expect(result).toBe(false);
    });

    it('[P2] should handle null/undefined values in response', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: null },
      });

      const result = await campaignStatsService.checkDuplicateEvent(12345);
      expect(result).toBe(false);
    });
  });

  describe('Guardrail: updateExistingCampaignStats Padding', () => {
    it('[P1] should pad short rows to 15 columns', async () => {
      // Existing row with only 5 columns (missing most fields)
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked'],
            ['100', 'Short Row', '10', '5', '2'],  // Only 5 columns
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'delivered' });
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 0);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      // Row should be padded to 15 columns
      expect(row.length).toBe(15);
      // Delivered should be incremented (10 + 1 = 11)
      expect(row[2]).toBe(11);
    });
  });

  describe('Guardrail: Future Event Types in New Flow', () => {
    it('[P1] should increment hard_bounce in updateCampaignStatsWithUniqueCount', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },  // No existing stats
      });
      mockSheetsClient.spreadsheets.values.append.mockResolvedValue({});

      const event = createMockEvent({ event: 'hard_bounce' });
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 0);

      const callArgs = mockSheetsClient.spreadsheets.values.append.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[9]).toBe(1);   // Hard_Bounce = 1
      expect(row[10]).toBe(0);  // Soft_Bounce = 0
    });

    it('[P1] should increment soft_bounce in updateCampaignStatsWithUniqueCount', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });
      mockSheetsClient.spreadsheets.values.append.mockResolvedValue({});

      const event = createMockEvent({ event: 'soft_bounce' });
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 0);

      const callArgs = mockSheetsClient.spreadsheets.values.append.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[10]).toBe(1); // Soft_Bounce = 1
    });

    it('[P1] should increment unsubscribe in updateCampaignStatsWithUniqueCount', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });
      mockSheetsClient.spreadsheets.values.append.mockResolvedValue({});

      const event = createMockEvent({ event: 'unsubscribe' });
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 0);

      const callArgs = mockSheetsClient.spreadsheets.values.append.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[11]).toBe(1); // Unsubscribe = 1
    });

    it('[P1] should increment spam in updateCampaignStatsWithUniqueCount', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });
      mockSheetsClient.spreadsheets.values.append.mockResolvedValue({});

      const event = createMockEvent({ event: 'spam' });
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 0);

      const callArgs = mockSheetsClient.spreadsheets.values.append.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[12]).toBe(1); // Spam = 1
    });
  });

  describe('Guardrail: healthCheck', () => {
    it('[P1] should return healthy:true when sheets are accessible', async () => {
      mockSheetsClient.spreadsheets = {
        ...mockSheetsClient.spreadsheets,
        get: vi.fn().mockResolvedValue({ data: { spreadsheetId: 'test-id' } }),
      };

      const result = await campaignStatsService.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('[P1] should return healthy:false when sheets are inaccessible', async () => {
      mockSheetsClient.spreadsheets = {
        ...mockSheetsClient.spreadsheets,
        get: vi.fn().mockRejectedValue(new Error('Service unavailable')),
      };

      const result = await campaignStatsService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================
  // TEA Guardrail Tests - Story 5-2 (Automate)
  // ===========================================

  describe('Guardrail: Pagination Boundary Conditions', () => {
    const mockStatsData = [
      ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
      ['100', 'Campaign A', '100', '50', '20', '40', '15', '40', '15', '0', '0', '0', '0', '2026-01-15T10:00:00.000Z', '2026-01-30T15:30:00.000Z'],
      ['101', 'Campaign B', '200', '100', '50', '80', '40', '40', '20', '0', '0', '0', '0', '2026-01-10T08:00:00.000Z', '2026-01-28T12:00:00.000Z'],
    ];

    it('[P1] should return empty array when page exceeds totalPages', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      // There are only 2 campaigns, with limit=20 that's 1 page
      // Requesting page 5 should return empty
      const result = await campaignStatsService.getAllCampaignStats({ page: 5, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.page).toBe(5);
    });

    it('[P1] should return all data when limit exceeds total', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({ page: 1, limit: 100 });

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('[P2] should handle page 2 with exact boundary (limit = total)', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      // 2 campaigns, limit=2, page=2 should be empty
      const result = await campaignStatsService.getAllCampaignStats({ page: 2, limit: 2 });

      expect(result.data).toEqual([]);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('Guardrail: Sorting with Missing/Empty Date Fields', () => {
    it('[P1] should handle rows with empty firstEvent in sorting', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Campaign A', '100', '50', '20', '40', '15', '40', '15', '0', '0', '0', '0', '', '2026-01-30T15:30:00.000Z'],  // Empty firstEvent
            ['101', 'Campaign B', '200', '100', '50', '80', '40', '40', '20', '0', '0', '0', '0', '2026-01-10T08:00:00.000Z', '2026-01-28T12:00:00.000Z'],
          ],
        },
      });

      // Should not throw - empty string becomes Invalid Date with NaN timestamp
      const result = await campaignStatsService.getAllCampaignStats({
        sortBy: 'First_Event',
        sortOrder: 'asc',
      });

      expect(result.data.length).toBe(2);
      // Empty date (NaN) comparison behavior may vary, but should not crash
    });

    it('[P1] should handle rows with empty lastUpdated in sorting', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Campaign A', '100', '50', '20', '40', '15', '40', '15', '0', '0', '0', '0', '2026-01-15T10:00:00.000Z', ''],  // Empty lastUpdated
            ['101', 'Campaign B', '200', '100', '50', '80', '40', '40', '20', '0', '0', '0', '0', '2026-01-10T08:00:00.000Z', '2026-01-28T12:00:00.000Z'],
          ],
        },
      });

      // Default sort is by Last_Updated desc
      const result = await campaignStatsService.getAllCampaignStats();

      expect(result.data.length).toBe(2);
      // Empty date rows should not crash the sort
    });
  });

  describe('Guardrail: Row Parsing with Sparse/Missing Data', () => {
    it('[P1] should skip rows with empty campaignId (row[0])', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered'],
            ['', 'Empty ID Campaign', '100'],  // Empty campaign ID - should be skipped
            ['100', 'Valid Campaign', '200'],
          ],
        },
      });

      const result = await campaignStatsService.getAllCampaignStats();

      // Only valid campaign should be returned
      expect(result.data.length).toBe(1);
      expect(result.data[0].campaignId).toBe(100);
    });

    it('[P1] should handle row with only 2 columns (sparse)', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Sparse Row'],  // Only 2 columns
          ],
        },
      });

      const result = await campaignStatsService.getAllCampaignStats();

      expect(result.data.length).toBe(1);
      expect(result.data[0].campaignId).toBe(100);
      expect(result.data[0].campaignName).toBe('Sparse Row');
      // Missing columns should default to 0 or empty string
      expect(result.data[0].delivered).toBe(0);
      expect(result.data[0].firstEvent).toBe('');
    });

    it('[P2] should handle getCampaignEvents with sparse event rows', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event', 'Event_At', 'Sent_At', 'URL', 'Tag', 'Segment_IDs', 'Created_At'],
            ['1001', '100'],  // Sparse row - missing most fields
            ['1002', '100', 'BMF2026', 'user@test.com', 'click', '2026-01-30T10:00:00.000Z', '', 'https://example.com', '', '[]', '2026-01-30T10:00:00.000Z'],
          ],
        },
      });

      const result = await campaignStatsService.getCampaignEvents(100);

      // Both rows match campaign 100, but sparse row should have defaults
      expect(result.data.length).toBe(2);
    });
  });

  describe('Guardrail: Search Edge Cases', () => {
    const mockStatsData = [
      ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
      ['100', 'BMF2026 Launch', '100', '50', '20', '40', '15', '40', '15', '0', '0', '0', '0', '2026-01-15T10:00:00.000Z', '2026-01-30T15:30:00.000Z'],
      ['101', 'Q1 Promo', '200', '100', '50', '80', '40', '40', '20', '0', '0', '0', '0', '2026-01-10T08:00:00.000Z', '2026-01-28T12:00:00.000Z'],
    ];

    it('[P2] should treat empty search string as no filter (return all)', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({ search: '' });

      // Empty string search should match all (includes('') is always true)
      expect(result.data.length).toBe(2);
    });

    it('[P2] should handle whitespace-only search', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({ search: '   ' });

      // Whitespace search matches campaigns with spaces in name
      // 'bmf2026 launch'.includes('   ') = false (no triple space)
      expect(result.data.length).toBe(0);
    });

    it('[P2] should handle special characters in search', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockStatsData },
      });

      const result = await campaignStatsService.getAllCampaignStats({ search: '*' });

      // Asterisk is literal, not wildcard
      expect(result.data.length).toBe(0);
    });
  });

  describe('Guardrail: Rate Precision Edge Cases', () => {
    it('[P1] should handle very small open rates (0.01%)', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test', '10000', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      // 1 unique open / 10000 delivered = 0.01%
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 1);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[7]).toBe(0.01); // 0.01% with 2 decimal precision
    });

    it('[P2] should handle rates that round to 100%', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test', '100', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      // 100 unique opens / 100 delivered = 100%
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 100);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      expect(row[7]).toBe(100); // Exactly 100%
    });

    it('[P2] should handle rates over 100% (data anomaly)', async () => {
      // This can happen if unique count > delivered (data corruption)
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test', '50', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      // 75 unique opens / 50 delivered = 150% (anomaly)
      await campaignStatsService.updateCampaignStatsWithUniqueCount(event, 75);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      // Service doesn't validate this, just calculates
      expect(row[7]).toBe(150); // 150% (allowed, flags data issue)
    });
  });

  describe('Guardrail: getCampaignEvents Date Filtering Edge Cases', () => {
    const mockEventsData = [
      ['Event_ID', 'Campaign_ID', 'Campaign_Name', 'Email', 'Event', 'Event_At', 'Sent_At', 'URL', 'Tag', 'Segment_IDs', 'Created_At'],
      ['1001', '100', 'BMF2026', 'user1@test.com', 'click', '2026-01-15T00:00:00.000Z', '', '', '', '[]', '2026-01-15T00:00:00.000Z'],
      ['1002', '100', 'BMF2026', 'user2@test.com', 'click', '2026-01-15T23:59:59.999Z', '', '', '', '[]', '2026-01-15T23:59:59.999Z'],
      ['1003', '100', 'BMF2026', 'user3@test.com', 'click', '2026-01-16T00:00:00.000Z', '', '', '', '[]', '2026-01-16T00:00:00.000Z'],
    ];

    it('[P1] should include events at exact dateFrom boundary', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100, {
        dateFrom: '2026-01-15T00:00:00.000Z',
      });

      // Should include event at exactly 2026-01-15T00:00:00.000Z
      expect(result.data.some((e) => e.eventId === 1001)).toBe(true);
    });

    it('[P1] should include events at exact dateTo boundary', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockEventsData },
      });

      const result = await campaignStatsService.getCampaignEvents(100, {
        dateTo: '2026-01-15T23:59:59.999Z',
      });

      // Should include event at exactly 2026-01-15T23:59:59.999Z
      expect(result.data.some((e) => e.eventId === 1002)).toBe(true);
      // Should NOT include event at 2026-01-16
      expect(result.data.some((e) => e.eventId === 1003)).toBe(false);
    });
  });
});
