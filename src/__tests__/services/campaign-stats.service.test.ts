/**
 * ENEOS Sales Automation - Campaign Stats Service Tests
 * Unit tests for Brevo Campaign Events processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NormalizedCampaignEvent } from '../../validators/campaign-event.validator.js';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const { mockSheetsClient } = vi.hoisted(() => ({
  mockSheetsClient: {
    spreadsheets: {
      values: {
        get: vi.fn(),
        append: vi.fn(),
        update: vi.fn(),
      },
    },
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn(() => mockSheetsClient),
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
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header'], ['11111'], ['22222']] },
      });

      const result = await campaignStatsService.checkDuplicateEvent(99999);
      expect(result).toBe(false);
    });

    it('should return true when event already exists', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header'], ['12345'], ['67890']] },
      });

      const result = await campaignStatsService.checkDuplicateEvent(12345);
      expect(result).toBe(true);
    });

    it('should handle empty sheet', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const result = await campaignStatsService.checkDuplicateEvent(12345);
      expect(result).toBe(false);
    });

    it('should handle null response', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: null },
      });

      const result = await campaignStatsService.checkDuplicateEvent(12345);
      expect(result).toBe(false);
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

  describe('checkIsFirstEventForEmail', () => {
    // Note: Range B:E returns [Campaign_ID, Campaign_Name, Email, Event]
    it('should return true when email has no previous event of this type', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign', 'other@example.com', 'click'],
            ['100', 'Campaign', 'test@example.com', 'delivered'],
          ],
        },
      });

      const result = await campaignStatsService.checkIsFirstEventForEmail(
        100,
        'test@example.com',
        'click'
      );
      expect(result).toBe(true);
    });

    it('should return false when email already has this event type', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign', 'test@example.com', 'click'],
            ['100', 'Campaign', 'other@example.com', 'click'],
          ],
        },
      });

      const result = await campaignStatsService.checkIsFirstEventForEmail(
        100,
        'test@example.com',
        'click'
      );
      expect(result).toBe(false);
    });

    it('should be case-insensitive for email', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign', 'TEST@EXAMPLE.COM', 'click'],
          ],
        },
      });

      const result = await campaignStatsService.checkIsFirstEventForEmail(
        100,
        'test@example.com',
        'click'
      );
      expect(result).toBe(false);
    });

    it('should differentiate by campaign', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Email', 'Event'], // header
            ['100', 'Campaign', 'test@example.com', 'click'], // Campaign 100
          ],
        },
      });

      // Different campaign should return true
      const result = await campaignStatsService.checkIsFirstEventForEmail(
        200, // Different campaign
        'test@example.com',
        'click'
      );
      expect(result).toBe(true);
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

  describe('updateCampaignStats', () => {
    it('should create new row for new campaign', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['header']] },
      });
      mockSheetsClient.spreadsheets.values.append.mockResolvedValue({
        data: { updates: { updatedRange: 'Campaign_Stats!A2:O2' } },
      });

      const event = createMockEvent({ event: 'delivered' });
      await campaignStatsService.updateCampaignStats(event, true);

      expect(mockSheetsClient.spreadsheets.values.append).toHaveBeenCalledTimes(1);
    });

    it('should update existing row for existing campaign', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '50', '20', '10', '15', '8', '30', '16', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'delivered' });
      await campaignStatsService.updateCampaignStats(event, true);

      expect(mockSheetsClient.spreadsheets.values.update).toHaveBeenCalledTimes(1);
    });

    it('should increment Delivered count for delivered event', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '50', '20', '10', '15', '8', '30', '16', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'delivered' });
      await campaignStatsService.updateCampaignStats(event, true);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];
      expect(row[2]).toBe(51); // Delivered count incremented
    });

    it('should increment Opened count and Unique_Opens for first open', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '50', '20', '10', '15', '8', '30', '16', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      await campaignStatsService.updateCampaignStats(event, true); // isFirstForEmail = true

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];
      expect(row[3]).toBe(21); // Opened count incremented
      expect(row[5]).toBe(16); // Unique_Opens incremented
    });

    it('should increment Opened count but NOT Unique_Opens for repeat open', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '50', '20', '10', '15', '8', '30', '16', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      await campaignStatsService.updateCampaignStats(event, false); // isFirstForEmail = false

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];
      expect(row[3]).toBe(21); // Opened count incremented
      expect(row[5]).toBe(15); // Unique_Opens NOT incremented
    });

    it('should recalculate Open_Rate and Click_Rate', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Campaign_ID', 'Campaign_Name', 'Delivered', 'Opened', 'Clicked', 'Unique_Opens', 'Unique_Clicks', 'Open_Rate', 'Click_Rate', 'Hard_Bounce', 'Soft_Bounce', 'Unsubscribe', 'Spam', 'First_Event', 'Last_Updated'],
            ['100', 'Test Campaign', '100', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '2026-01-01', '2026-01-30'],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({});

      const event = createMockEvent({ event: 'opened' });
      await campaignStatsService.updateCampaignStats(event, true);

      const callArgs = mockSheetsClient.spreadsheets.values.update.mock.calls[0][0];
      const row = callArgs.requestBody.values[0];

      // After this update: Delivered=100, Unique_Opens=1
      // Open_Rate = 1/100 * 100 = 1%
      expect(row[7]).toBe(1); // Open_Rate = 1%
    });
  });

  describe('recordCampaignEvent', () => {
    it('should return duplicate status for existing event', async () => {
      // checkDuplicateEvent returns true
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [['header'], ['12345']] },
      });

      const event = createMockEvent({ eventId: 12345 });
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
});
