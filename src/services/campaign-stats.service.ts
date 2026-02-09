/**
 * ENEOS Sales Automation - Campaign Stats Service
 * Handles Brevo Campaign Events storage and statistics tracking
 */

import { google } from 'googleapis';
import { config } from '../config/index.js';
import { campaignLogger as logger } from '../utils/logger.js';
import { withRetry, CircuitBreaker } from '../utils/retry.js';
import { formatISOTimestamp } from '../utils/date-formatter.js';
import type { NormalizedCampaignEvent } from '../validators/campaign-event.validator.js';
import type {
  CampaignStatsItem,
  CampaignEventItem,
  PaginationMeta,
  CampaignStatsSortBy,
} from '../types/admin.types.js';
import {
  CAMPAIGN_EVENTS,
  CAMPAIGN_STATS_COLUMNS,
  CAMPAIGN_EVENTS_COLUMNS,
  createDefaultStatsRow,
} from '../constants/campaign.constants.js';
import { campaignContactsService } from './campaign-contacts.service.js';

// ===========================================
// Google Sheets Client Setup
// ===========================================

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: config.google.serviceAccountEmail,
    private_key: config.google.privateKey,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const circuitBreaker = new CircuitBreaker(5, 60000);

// ===========================================
// Result Types
// ===========================================

export interface RecordEventResult {
  success: boolean;
  duplicate: boolean;
  error?: string;
  eventId?: number;
  campaignId?: number;
}

export interface CampaignStatsRow {
  row: (string | number)[];
  rowIndex: number; // 0-indexed (header is at index 0, first data at 1)
}

// ===========================================
// Campaign Stats Service Class
// ===========================================

export class CampaignStatsService {
  private spreadsheetId: string;
  private eventsSheet: string;
  private statsSheet: string;

  constructor() {
    this.spreadsheetId = config.google.sheetId;
    this.eventsSheet = config.google.sheets.campaignEvents;
    this.statsSheet = config.google.sheets.campaignStats;
  }

  // ===========================================
  // Helper Functions
  // ===========================================

  private getSheetRange(sheetName: string, range: string): string {
    return `${sheetName}!${range}`;
  }

  // ===========================================
  // Main Entry Point
  // ===========================================

  /**
   * Record a campaign event (main entry point)
   * Handles: duplicate check → write event → count unique → update stats
   *
   * Race Condition Fix: We write the event FIRST, then count unique emails
   * from the sheet. This ensures accurate unique counts even with concurrent requests.
   */
  async recordCampaignEvent(event: NormalizedCampaignEvent): Promise<RecordEventResult> {
    logger.info('Recording campaign event', {
      eventId: event.eventId,
      campaignId: event.campaignId,
      event: event.event,
      email: event.email,
    });

    try {
      // Step 1: Check for duplicate event (composite key: Event_ID + Campaign_ID + Event_Type)
      const isDuplicate = await this.checkDuplicateEvent(event.eventId, event.event, event.campaignId);
      if (isDuplicate) {
        logger.info('Duplicate event detected, returning success', {
          eventId: event.eventId,
          eventType: event.event,
        });
        return {
          success: true,
          duplicate: true,
          eventId: event.eventId,
          campaignId: event.campaignId,
        };
      }

      // Step 2: Write event to Campaign_Events sheet FIRST
      await this.writeCampaignEvent(event);

      // Step 3+4: Update stats with retry — event is already written,
      // so stats failure should not lose the event data.
      try {
        // Step 3: Count unique emails AFTER write (race condition fix)
        const uniqueCount = await this.countUniqueEmailsForEvent(
          event.campaignId,
          event.event
        );

        // Step 4: Update Campaign_Stats with accurate unique count
        await this.updateCampaignStatsWithUniqueCount(event, uniqueCount);

        logger.info('Campaign event recorded successfully', {
          eventId: event.eventId,
          campaignId: event.campaignId,
          uniqueCount,
        });
      } catch (statsError) {
        // Event was already written to Campaign_Events (source of truth).
        // Stats are stale but can be reconciled — log clearly for monitoring.
        const statsMessage = statsError instanceof Error ? statsError.message : String(statsError);
        logger.warn('Campaign event written but stats update failed — stats may be stale', {
          eventId: event.eventId,
          campaignId: event.campaignId,
          event: event.event,
          email: event.email,
          error: statsMessage,
          action: 'STATS_RECONCILE_NEEDED',
        });
      }

      return {
        success: true,
        duplicate: false,
        eventId: event.eventId,
        campaignId: event.campaignId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to record campaign event', {
        eventId: event.eventId,
        campaignId: event.campaignId,
        error: errorMessage,
      });

      return {
        success: false,
        duplicate: false,
        error: errorMessage,
        eventId: event.eventId,
        campaignId: event.campaignId,
      };
    }
  }

  // ===========================================
  // Duplicate Check
  // ===========================================

  /**
   * Check if Event_ID + Campaign_ID + Event_Type combination already exists
   *
   * Composite key: eventId + campaignId + eventType
   * - Story 5-10: Changed from Event_ID only to Event_ID + Event_Type
   * - Fix: Added Campaign_ID because Brevo reuses eventId across campaigns
   *
   * @param eventId - The unique event identifier from Brevo (maps to 'id' in webhook payload)
   * @param eventType - The event type: 'delivered', 'opened', or 'click'
   * @param campaignId - The campaign ID (ensures cross-campaign events are not blocked)
   * @returns true if exact combination already exists (duplicate), false if new
   */
  async checkDuplicateEvent(eventId: number, eventType: string, campaignId: number): Promise<boolean> {
    logger.debug('Checking duplicate event', { eventId, eventType, campaignId });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        // Fetch A:E — col A (Event_ID), col B (Campaign_ID), col E (Event)
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange(this.eventsSheet, 'A:E'),
        });

        const values = response.data.values || [];

        // Check if eventId + campaignId + eventType combination exists (skip header row)
        // Column A (index 0) = Event_ID, Column B (index 1) = Campaign_ID, Column E (index 4) = Event
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          if (
            row &&
            row[0] &&
            Number(row[0]) === eventId &&
            Number(row[1]) === campaignId &&
            row[4] === eventType
          ) {
            return true;
          }
        }

        return false;
      });
    });
  }

  // ===========================================
  // Write Campaign Event
  // ===========================================

  /**
   * Write event to Campaign_Events sheet
   * Implements AC3: Campaign_Events Sheet Write
   */
  async writeCampaignEvent(event: NormalizedCampaignEvent): Promise<void> {
    logger.debug('Writing campaign event', { eventId: event.eventId });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const now = formatISOTimestamp();
        const row = [
          event.eventId,                            // Event_ID
          event.campaignId,                         // Campaign_ID
          event.campaignName,                       // Campaign_Name
          event.email,                              // Email
          event.event,                              // Event
          event.eventAt || now,                     // Event_At
          event.sentAt || '',                       // Sent_At
          event.url || '',                          // URL
          event.tag || '',                          // Tag
          JSON.stringify(event.segmentIds || []),   // Segment_IDs (as JSON)
          now,                                      // Created_At
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange(this.eventsSheet, 'A:K'),
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [row],
          },
        });

        logger.debug('Campaign event written', { eventId: event.eventId });
      });
    });
  }

  // ===========================================
  // Count Unique Emails (Race Condition Safe)
  // ===========================================

  /**
   * Count unique emails for a specific event type in a campaign
   * Called AFTER writing the event to ensure accurate count
   *
   * This replaces the old checkIsFirstEventForEmail approach which had
   * race condition issues when multiple requests arrived simultaneously.
   */
  async countUniqueEmailsForEvent(
    campaignId: number,
    eventType: string
  ): Promise<number> {
    logger.debug('Counting unique emails for event', { campaignId, eventType });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        // Get Campaign_ID (B), Email (D), Event (E) columns
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange(this.eventsSheet, 'B:E'),
        });

        const values = response.data.values || [];
        const uniqueEmails = new Set<string>();

        // Collect unique emails for this campaign + event type (skip header row)
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          if (row) {
            const rowCampaignId = Number(row[0]); // Column B (index 0 in this range)
            const rowEmail = (row[2] || '').toLowerCase(); // Column D (index 2 in this range)
            const rowEvent = row[3] || ''; // Column E (index 3 in this range)

            if (rowCampaignId === campaignId && rowEvent === eventType) {
              uniqueEmails.add(rowEmail);
            }
          }
        }

        return uniqueEmails.size;
      });
    });
  }

  // ===========================================
  // Get Campaign Stats
  // ===========================================

  /**
   * Get campaign stats row by campaign ID
   * Returns null if campaign doesn't exist
   */
  async getCampaignStats(campaignId: number): Promise<CampaignStatsRow | null> {
    logger.debug('Getting campaign stats', { campaignId });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange(this.statsSheet, 'A:O'),
        });

        const values = response.data.values || [];

        // Find campaign row (skip header at index 0)
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          if (row && Number(row[0]) === campaignId) {
            return { row, rowIndex: i };
          }
        }

        return null;
      });
    });
  }

  // ===========================================
  // Update Campaign Stats
  // ===========================================

  /**
   * Update or create Campaign_Stats row with accurate unique count
   * Race condition safe: uses actual count from sheet instead of increment
   */
  async updateCampaignStatsWithUniqueCount(
    event: NormalizedCampaignEvent,
    uniqueCount: number
  ): Promise<void> {
    logger.debug('Updating campaign stats with unique count', {
      campaignId: event.campaignId,
      event: event.event,
      uniqueCount,
    });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const now = formatISOTimestamp();
        const existing = await this.getCampaignStats(event.campaignId);

        if (!existing) {
          // Create new campaign stats row
          await this.createNewCampaignStatsWithUniqueCount(event, uniqueCount, now);
        } else {
          // Update existing campaign stats
          await this.updateExistingCampaignStats(existing, event, uniqueCount, now);
        }
      });
    });
  }

  /**
   * Create new campaign stats row with accurate unique count
   */
  private async createNewCampaignStatsWithUniqueCount(
    event: NormalizedCampaignEvent,
    uniqueCount: number,
    timestamp: string
  ): Promise<void> {
    logger.debug('Creating new campaign stats with unique count', {
      campaignId: event.campaignId,
      uniqueCount,
    });

    const row = createDefaultStatsRow(event.campaignId, event.campaignName, timestamp);

    // Set counts based on event type
    this.applyEventWithUniqueCount(row, event.event, uniqueCount);

    // Calculate rates
    this.recalculateRates(row);

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: this.getSheetRange(this.statsSheet, 'A:O'),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    logger.info('New campaign stats created', { campaignId: event.campaignId });
  }

  /**
   * Update existing campaign stats with accurate unique count
   */
  private async updateExistingCampaignStats(
    existing: CampaignStatsRow,
    event: NormalizedCampaignEvent,
    uniqueCount: number,
    timestamp: string
  ): Promise<void> {
    const { row, rowIndex } = existing;

    const updatedRow = this.cloneAndPadStatsRow(row, event.campaignId, event.campaignName);

    // Apply event with accurate unique count
    this.applyEventWithUniqueCount(updatedRow, event.event, uniqueCount);

    // Update Last_Updated
    updatedRow[CAMPAIGN_STATS_COLUMNS.LAST_UPDATED] = timestamp;

    // Recalculate rates
    this.recalculateRates(updatedRow);

    // Write back to sheet (rowIndex + 1 because Sheets is 1-indexed)
    const sheetRow = rowIndex + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: this.getSheetRange(this.statsSheet, `A${sheetRow}:O${sheetRow}`),
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow],
      },
    });

    logger.debug('Campaign stats updated with unique count', {
      campaignId: event.campaignId,
      sheetRow,
      uniqueCount,
    });
  }

  /**
   * Apply event with accurate unique count (race condition safe)
   * Sets the unique count directly from sheet data instead of incrementing
   */
  private applyEventWithUniqueCount(
    row: (string | number)[],
    eventType: string,
    uniqueCount: number
  ): void {
    switch (eventType) {
      case CAMPAIGN_EVENTS.DELIVERED:
        row[CAMPAIGN_STATS_COLUMNS.DELIVERED] = Number(row[CAMPAIGN_STATS_COLUMNS.DELIVERED] || 0) + 1;
        break;

      case CAMPAIGN_EVENTS.OPENED:
        row[CAMPAIGN_STATS_COLUMNS.OPENED] = Number(row[CAMPAIGN_STATS_COLUMNS.OPENED] || 0) + 1;
        // Set unique count from actual sheet data (not increment)
        row[CAMPAIGN_STATS_COLUMNS.UNIQUE_OPENS] = uniqueCount;
        break;

      case CAMPAIGN_EVENTS.CLICK:
        row[CAMPAIGN_STATS_COLUMNS.CLICKED] = Number(row[CAMPAIGN_STATS_COLUMNS.CLICKED] || 0) + 1;
        // Set unique count from actual sheet data (not increment)
        row[CAMPAIGN_STATS_COLUMNS.UNIQUE_CLICKS] = uniqueCount;
        break;

      // Future event types (prepared but not enabled in ENABLED_EVENTS)
      case CAMPAIGN_EVENTS.HARD_BOUNCE:
        row[CAMPAIGN_STATS_COLUMNS.HARD_BOUNCE] = Number(row[CAMPAIGN_STATS_COLUMNS.HARD_BOUNCE] || 0) + 1;
        break;

      case CAMPAIGN_EVENTS.SOFT_BOUNCE:
        row[CAMPAIGN_STATS_COLUMNS.SOFT_BOUNCE] = Number(row[CAMPAIGN_STATS_COLUMNS.SOFT_BOUNCE] || 0) + 1;
        break;

      case CAMPAIGN_EVENTS.UNSUBSCRIBE:
        row[CAMPAIGN_STATS_COLUMNS.UNSUBSCRIBE] = Number(row[CAMPAIGN_STATS_COLUMNS.UNSUBSCRIBE] || 0) + 1;
        break;

      case CAMPAIGN_EVENTS.SPAM:
        row[CAMPAIGN_STATS_COLUMNS.SPAM] = Number(row[CAMPAIGN_STATS_COLUMNS.SPAM] || 0) + 1;
        break;
    }
  }

  /**
   * Recalculate Open_Rate and Click_Rate with 2 decimal precision
   * Open_Rate = Unique_Opens / Delivered * 100
   * Click_Rate = Unique_Clicks / Delivered * 100
   *
   * Returns rates with 2 decimal places (e.g., 42.86%)
   */
  private recalculateRates(row: (string | number)[]): void {
    const delivered = Number(row[CAMPAIGN_STATS_COLUMNS.DELIVERED] || 0);
    const uniqueOpens = Number(row[CAMPAIGN_STATS_COLUMNS.UNIQUE_OPENS] || 0);
    const uniqueClicks = Number(row[CAMPAIGN_STATS_COLUMNS.UNIQUE_CLICKS] || 0);

    if (delivered > 0) {
      // Round to 2 decimal places for precision
      row[CAMPAIGN_STATS_COLUMNS.OPEN_RATE] = Math.round((uniqueOpens / delivered) * 10000) / 100;
      row[CAMPAIGN_STATS_COLUMNS.CLICK_RATE] = Math.round((uniqueClicks / delivered) * 10000) / 100;
    } else {
      row[CAMPAIGN_STATS_COLUMNS.OPEN_RATE] = 0;
      row[CAMPAIGN_STATS_COLUMNS.CLICK_RATE] = 0;
    }
  }

  // ===========================================
  // READ Operations (Story 5-2)
  // ===========================================

  /**
   * Get all campaign stats with pagination, search, date range filtering, and sorting
   * Implements AC1: GET /api/admin/campaigns/stats
   */
  async getAllCampaignStats(options: {
    page?: number;
    limit?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: CampaignStatsSortBy;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    data: CampaignStatsItem[];
    pagination: PaginationMeta;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      dateFrom,
      dateTo,
      sortBy = 'Last_Updated',
      sortOrder = 'desc',
    } = options;

    logger.debug('Getting all campaign stats', { page, limit, search, sortBy, sortOrder });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        // Read all campaign stats from sheet
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange(this.statsSheet, 'A:O'),
        });

        const values = response.data.values || [];
        if (values.length <= 1) {
          // Only header or empty
          return {
            data: [],
            pagination: this.createPaginationMeta(0, page, limit),
          };
        }

        // Parse rows (skip header at index 0)
        let campaigns: CampaignStatsItem[] = [];
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          if (!row || !row[0]) { continue; }

          const item = this.rowToCampaignStatsItem(row);
          campaigns.push(item);
        }

        // Apply filters
        campaigns = this.filterCampaignStats(campaigns, search, dateFrom, dateTo);

        // Apply sorting
        campaigns = this.sortCampaignStats(campaigns, sortBy, sortOrder);

        // Apply pagination
        const total = campaigns.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = campaigns.slice(startIndex, endIndex);

        logger.info('Campaign stats retrieved', { total, returned: paginatedData.length });

        return {
          data: paginatedData,
          pagination: this.createPaginationMeta(total, page, limit),
        };
      });
    });
  }

  /**
   * Get single campaign stats by Campaign_ID
   * Implements AC2: GET /api/admin/campaigns/:id/stats
   */
  async getCampaignStatsById(campaignId: number): Promise<CampaignStatsItem | null> {
    logger.debug('Getting campaign stats by ID', { campaignId });

    const existing = await this.getCampaignStats(campaignId);

    if (!existing) {
      return null;
    }

    return this.rowToCampaignStatsItem(existing.row);
  }

  /**
   * Get campaign events with pagination and filtering
   * Implements AC3: GET /api/admin/campaigns/:id/events
   */
  async getCampaignEvents(
    campaignId: number,
    options: {
      page?: number;
      limit?: number;
      event?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<{
    data: CampaignEventItem[];
    pagination: PaginationMeta;
  }> {
    const {
      page = 1,
      limit = 50,
      event: eventFilter,
      dateFrom,
      dateTo,
    } = options;

    logger.debug('Getting campaign events', { campaignId, page, limit, eventFilter });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        // Read all events from sheet
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange(this.eventsSheet, 'A:K'),
        });

        const values = response.data.values || [];
        if (values.length <= 1) {
          return {
            data: [],
            pagination: this.createPaginationMeta(0, page, limit),
          };
        }

        // Pre-compute date boundaries once (avoid repeated Date parsing per row)
        const fromTime = dateFrom ? new Date(dateFrom).getTime() : undefined;
        const toTime = dateTo ? new Date(dateTo).getTime() : undefined;

        // Parse and filter rows (single pass)
        const events: CampaignEventItem[] = [];
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          if (!row || !row[0]) { continue; }

          // Filter by campaign ID
          const rowCampaignId = Number(row[CAMPAIGN_EVENTS_COLUMNS.CAMPAIGN_ID]);
          if (rowCampaignId !== campaignId) { continue; }

          const item = this.rowToCampaignEventItem(row);

          if (this.matchesCampaignEventFilter(item, eventFilter, fromTime, toTime)) {
            events.push(item);
          }
        }

        // Sort by eventAt descending (newest first)
        events.sort((a, b) =>
          new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime()
        );

        // Apply pagination
        const total = events.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = events.slice(startIndex, endIndex);

        // Story 5-11 AC6: Join contact data from Campaign_Contacts by email.
        // Looks up by email only (not campaign_id) because Automation payloads
        // use workflow_id which doesn't match Campaign Events' campaign_id.
        // TODO: Full table scan — consider caching if Campaign_Contacts > 10,000 rows.
        const contactsMap = await campaignContactsService.getAllContactsByEmail();
        for (const event of paginatedData) {
          const contact = contactsMap.get(event.email.toLowerCase());
          if (contact) {
            event.firstname = contact.firstname;
            event.lastname = contact.lastname;
            event.company = contact.company;
          }
        }

        logger.info('Campaign events retrieved', { campaignId, total, returned: paginatedData.length });

        return {
          data: paginatedData,
          pagination: this.createPaginationMeta(total, page, limit),
        };
      });
    });
  }

  // ===========================================
  // Filtering & Row Helpers
  // ===========================================

  /**
   * Clone a stats row and pad to full column count with proper types
   * Numeric columns (DELIVERED..SPAM) are converted to numbers, text columns kept as strings
   */
  private cloneAndPadStatsRow(
    row: (string | number)[],
    fallbackCampaignId: number,
    fallbackCampaignName: string
  ): (string | number)[] {
    const totalColumns = CAMPAIGN_STATS_COLUMNS.LAST_UPDATED + 1; // 15
    const padded: (string | number)[] = [];
    for (let i = 0; i < totalColumns; i++) {
      const value = row[i];
      if (i >= CAMPAIGN_STATS_COLUMNS.DELIVERED && i <= CAMPAIGN_STATS_COLUMNS.SPAM) {
        padded.push(Number(value || 0));
      } else if (i === CAMPAIGN_STATS_COLUMNS.CAMPAIGN_ID) {
        padded.push(value || fallbackCampaignId);
      } else if (i === CAMPAIGN_STATS_COLUMNS.CAMPAIGN_NAME) {
        padded.push(value || fallbackCampaignName);
      } else {
        padded.push(value || '');
      }
    }
    return padded;
  }

  /**
   * Filter campaign stats by search term and date range (single pass)
   */
  private filterCampaignStats(
    campaigns: CampaignStatsItem[],
    search?: string,
    dateFrom?: string,
    dateTo?: string
  ): CampaignStatsItem[] {
    if (!search && !dateFrom && !dateTo) { return campaigns; }

    const searchLower = search ? search.toLowerCase() : undefined;
    const fromTime = dateFrom ? new Date(dateFrom).getTime() : undefined;
    const toTime = dateTo ? new Date(dateTo).getTime() : undefined;

    return campaigns.filter((c) => {
      if (searchLower && !c.campaignName.toLowerCase().includes(searchLower)) { return false; }
      if (fromTime !== undefined || toTime !== undefined) {
        const eventTime = new Date(c.firstEvent).getTime();
        if (fromTime !== undefined && eventTime < fromTime) { return false; }
        if (toTime !== undefined && eventTime > toTime) { return false; }
      }
      return true;
    });
  }

  /**
   * Check if a campaign event matches the given filters
   * Accepts pre-computed timestamps to avoid repeated Date parsing in hot loops
   */
  private matchesCampaignEventFilter(
    item: CampaignEventItem,
    eventFilter?: string,
    fromTime?: number,
    toTime?: number
  ): boolean {
    if (eventFilter && item.event !== eventFilter) { return false; }

    if (fromTime !== undefined || toTime !== undefined) {
      const eventTime = new Date(item.eventAt).getTime();
      if (fromTime !== undefined && eventTime < fromTime) { return false; }
      if (toTime !== undefined && eventTime > toTime) { return false; }
    }

    return true;
  }

  /**
   * Convert sheet row to CampaignStatsItem
   */
  private rowToCampaignStatsItem(row: (string | number)[]): CampaignStatsItem {
    return {
      campaignId: Number(row[CAMPAIGN_STATS_COLUMNS.CAMPAIGN_ID] || 0),
      campaignName: String(row[CAMPAIGN_STATS_COLUMNS.CAMPAIGN_NAME] || ''),
      delivered: Number(row[CAMPAIGN_STATS_COLUMNS.DELIVERED] || 0),
      opened: Number(row[CAMPAIGN_STATS_COLUMNS.OPENED] || 0),
      clicked: Number(row[CAMPAIGN_STATS_COLUMNS.CLICKED] || 0),
      uniqueOpens: Number(row[CAMPAIGN_STATS_COLUMNS.UNIQUE_OPENS] || 0),
      uniqueClicks: Number(row[CAMPAIGN_STATS_COLUMNS.UNIQUE_CLICKS] || 0),
      openRate: Number(row[CAMPAIGN_STATS_COLUMNS.OPEN_RATE] || 0),
      clickRate: Number(row[CAMPAIGN_STATS_COLUMNS.CLICK_RATE] || 0),
      hardBounce: Number(row[CAMPAIGN_STATS_COLUMNS.HARD_BOUNCE] || 0),
      softBounce: Number(row[CAMPAIGN_STATS_COLUMNS.SOFT_BOUNCE] || 0),
      unsubscribe: Number(row[CAMPAIGN_STATS_COLUMNS.UNSUBSCRIBE] || 0),
      spam: Number(row[CAMPAIGN_STATS_COLUMNS.SPAM] || 0),
      firstEvent: String(row[CAMPAIGN_STATS_COLUMNS.FIRST_EVENT] || ''),
      lastUpdated: String(row[CAMPAIGN_STATS_COLUMNS.LAST_UPDATED] || ''),
    };
  }

  /**
   * Convert sheet row to CampaignEventItem
   * Contact fields (firstname, lastname, company) default to empty strings,
   * populated later via Campaign_Contacts join in getCampaignEvents()
   */
  private rowToCampaignEventItem(row: (string | number)[]): CampaignEventItem {
    return {
      eventId: Number(row[CAMPAIGN_EVENTS_COLUMNS.EVENT_ID] || 0),
      email: String(row[CAMPAIGN_EVENTS_COLUMNS.EMAIL] || ''),
      event: String(row[CAMPAIGN_EVENTS_COLUMNS.EVENT] || ''),
      eventAt: String(row[CAMPAIGN_EVENTS_COLUMNS.EVENT_AT] || ''),
      url: row[CAMPAIGN_EVENTS_COLUMNS.URL]
        ? String(row[CAMPAIGN_EVENTS_COLUMNS.URL])
        : null,
      // Story 5-11: Contact data defaults (populated via join)
      firstname: '',
      lastname: '',
      company: '',
    };
  }

  /**
   * Sort campaign stats by specified field and order
   */
  private sortCampaignStats(
    campaigns: CampaignStatsItem[],
    sortBy: CampaignStatsSortBy,
    sortOrder: 'asc' | 'desc'
  ): CampaignStatsItem[] {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return campaigns.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'Last_Updated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        case 'First_Event':
          comparison = new Date(a.firstEvent).getTime() - new Date(b.firstEvent).getTime();
          break;
        case 'Campaign_Name':
          comparison = a.campaignName.localeCompare(b.campaignName);
          break;
        case 'Delivered':
          comparison = a.delivered - b.delivered;
          break;
        case 'Opened':
          comparison = a.opened - b.opened;
          break;
        case 'Clicked':
          comparison = a.clicked - b.clicked;
          break;
        case 'Open_Rate':
          comparison = a.openRate - b.openRate;
          break;
        case 'Click_Rate':
          comparison = a.clickRate - b.clickRate;
          break;
        default:
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
      }

      return comparison * multiplier;
    });
  }

  /**
   * Create pagination metadata
   */
  private createPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  // ===========================================
  // Health Check
  // ===========================================

  /**
   * Check if Campaign Sheets are accessible
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();

    try {
      await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'spreadsheetId',
      });

      return {
        healthy: true,
        latency: Date.now() - start,
      };
    } catch (error) {
      logger.error('Campaign stats health check failed', { error });
      return {
        healthy: false,
        latency: Date.now() - start,
      };
    }
  }
}

// ===========================================
// Export Singleton Instance
// ===========================================

export const campaignStatsService = new CampaignStatsService();
