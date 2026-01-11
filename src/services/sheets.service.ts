/**
 * ENEOS Sales Automation - Google Sheets Service
 * Enterprise-grade Google Sheets integration with optimistic locking
 */

import { google, sheets_v4 } from 'googleapis';
import { config } from '../config/index.js';
import { sheetsLogger as logger } from '../utils/logger.js';
import { withRetry, CircuitBreaker } from '../utils/retry.js';
import {
  Lead,
  LeadRow,
  LeadStatus,
  SalesTeamMember,
  AppError,
  RaceConditionError,
} from '../types/index.js';

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
// Column Mapping (1-indexed for Google Sheets API)
// ===========================================

const LEAD_COLUMNS = {
  date: 'A',
  customerName: 'B',
  email: 'C',
  phone: 'D',
  company: 'E',
  industryAI: 'F',
  website: 'G',
  capital: 'H',
  status: 'I',
  salesOwnerId: 'J',
  salesOwnerName: 'K',
  campaignId: 'L',
  campaignName: 'M',
  emailSubject: 'N',
  source: 'O',
  leadId: 'P',
  eventId: 'Q',
  clickedAt: 'R',
  talkingPoint: 'S',
  closedAt: 'T',
  lostAt: 'U',
  unreachableAt: 'V',
  version: 'W', // For optimistic locking
};

const COLUMN_COUNT = Object.keys(LEAD_COLUMNS).length;

// ===========================================
// Helper Functions
// ===========================================

function getSheetRange(sheetName: string, range: string): string {
  return `${sheetName}!${range}`;
}

function rowToLead(row: string[], rowNumber: number): LeadRow {
  return {
    rowNumber,
    date: row[0] || '',
    customerName: row[1] || '',
    email: row[2] || '',
    phone: row[3] || '',
    company: row[4] || '',
    industryAI: row[5] || '',
    website: row[6] || null,
    capital: row[7] || null,
    status: (row[8] as LeadStatus) || 'new',
    salesOwnerId: row[9] || null,
    salesOwnerName: row[10] || null,
    campaignId: row[11] || '',
    campaignName: row[12] || '',
    emailSubject: row[13] || '',
    source: row[14] || '',
    leadId: row[15] || '',
    eventId: row[16] || '',
    clickedAt: row[17] || '',
    talkingPoint: row[18] || null,
    closedAt: row[19] || null,
    lostAt: row[20] || null,
    unreachableAt: row[21] || null,
  };
}

function leadToRow(lead: Partial<Lead>, version: number = 1): string[] {
  return [
    lead.date || new Date().toISOString(),
    lead.customerName || '',
    lead.email || '',
    lead.phone || '',
    lead.company || '',
    lead.industryAI || '',
    lead.website || '',
    lead.capital || '',
    lead.status || 'new',
    lead.salesOwnerId || '',
    lead.salesOwnerName || '',
    lead.campaignId || '',
    lead.campaignName || '',
    lead.emailSubject || '',
    lead.source || 'Brevo',
    lead.leadId || '',
    lead.eventId || '',
    lead.clickedAt || '',
    lead.talkingPoint || '',
    lead.closedAt || '',
    lead.lostAt || '',
    lead.unreachableAt || '',
    version.toString(),
  ];
}

// ===========================================
// Main Service Class
// ===========================================

export class SheetsService {
  private spreadsheetId: string;
  private leadsSheet: string;
  private dedupSheet: string;
  private salesTeamSheet: string;

  constructor() {
    this.spreadsheetId = config.google.sheetId;
    this.leadsSheet = config.google.sheets.leads;
    this.dedupSheet = config.google.sheets.dedup;
    this.salesTeamSheet = config.google.sheets.salesTeam;
  }

  // ===========================================
  // Lead Operations
  // ===========================================

  /**
   * Add a new lead to the sheet
   * Returns the row number of the new lead
   */
  async addLead(lead: Partial<Lead>): Promise<number> {
    logger.info('Adding new lead', { email: lead.email, company: lead.company });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const row = leadToRow(lead);

        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.leadsSheet, 'A:W'),
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [row],
          },
        });

        // Extract row number from updatedRange (e.g., "Leads!A42:W42")
        const updatedRange = response.data.updates?.updatedRange || '';
        const match = updatedRange.match(/!A(\d+):/);
        const rowNumber = match ? parseInt(match[1], 10) : 0;

        logger.info('Lead added successfully', { rowNumber, email: lead.email });
        return rowNumber;
      });
    });
  }

  /**
   * Get a specific row by row number
   */
  async getRow(rowNumber: number): Promise<LeadRow | null> {
    logger.debug('Getting row', { rowNumber });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const range = getSheetRange(this.leadsSheet, `A${rowNumber}:W${rowNumber}`);

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range,
        });

        const row = response.data.values?.[0];
        if (!row || row.length === 0) {
          logger.warn('Row not found', { rowNumber });
          return null;
        }

        return rowToLead(row, rowNumber);
      });
    });
  }

  /**
   * Update a lead with optimistic locking
   * Prevents race conditions by checking version before update
   */
  async updateLeadWithLock(
    rowNumber: number,
    updates: Partial<Lead>,
    expectedVersion?: number
  ): Promise<LeadRow> {
    logger.info('Updating lead with lock', { rowNumber, updates });

    return circuitBreaker.execute(async () => {
      // Get current row data
      const currentLead = await this.getRow(rowNumber);

      if (!currentLead) {
        throw new AppError(`Row ${rowNumber} not found`, 404, 'ROW_NOT_FOUND');
      }

      // Check version for optimistic locking (if version checking is enabled)
      if (expectedVersion !== undefined) {
        const currentVersion = parseInt((currentLead as unknown as Record<string, string>)['version'] || '1', 10);
        if (currentVersion !== expectedVersion) {
          throw new RaceConditionError(
            `Version mismatch: expected ${expectedVersion}, got ${currentVersion}`
          );
        }
      }

      // Merge updates
      const updatedLead: Lead = {
        ...currentLead,
        ...updates,
      };

      // Increment version
      const newVersion = (parseInt((currentLead as unknown as Record<string, string>)['version'] || '1', 10)) + 1;
      const row = leadToRow(updatedLead, newVersion);

      await withRetry(async () => {
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.leadsSheet, `A${rowNumber}:W${rowNumber}`),
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [row],
          },
        });
      });

      logger.info('Lead updated successfully', { rowNumber });
      return { ...updatedLead, rowNumber };
    });
  }

  /**
   * Claim a lead for a sales person (with race condition protection)
   */
  async claimLead(
    rowNumber: number,
    salesUserId: string,
    salesUserName: string,
    status: LeadStatus = 'contacted'
  ): Promise<{ success: boolean; lead: LeadRow; alreadyClaimed: boolean; owner?: string }> {
    logger.info('Attempting to claim lead', { rowNumber, salesUserId });

    const currentLead = await this.getRow(rowNumber);

    if (!currentLead) {
      throw new AppError(`Row ${rowNumber} not found`, 404, 'ROW_NOT_FOUND');
    }

    // Check if already claimed by someone else
    if (currentLead.salesOwnerId && currentLead.salesOwnerId !== salesUserId) {
      logger.warn('Lead already claimed by another user', {
        rowNumber,
        currentOwner: currentLead.salesOwnerName,
        attemptedBy: salesUserName,
      });

      return {
        success: false,
        lead: currentLead,
        alreadyClaimed: true,
        owner: currentLead.salesOwnerName || currentLead.salesOwnerId,
      };
    }

    // Update timestamp based on status
    const now = new Date().toISOString();
    const updates: Partial<Lead> = {
      salesOwnerId: salesUserId,
      salesOwnerName: salesUserName,
      status,
    };

    // Set appropriate timestamp
    switch (status) {
      case 'closed':
        updates.closedAt = now;
        break;
      case 'lost':
        updates.lostAt = now;
        break;
      case 'unreachable':
        updates.unreachableAt = now;
        break;
    }

    const updatedLead = await this.updateLeadWithLock(rowNumber, updates);

    return {
      success: true,
      lead: updatedLead,
      alreadyClaimed: false,
    };
  }

  /**
   * Update lead status (only if user is the owner)
   */
  async updateLeadStatus(
    rowNumber: number,
    salesUserId: string,
    newStatus: LeadStatus
  ): Promise<LeadRow> {
    const currentLead = await this.getRow(rowNumber);

    if (!currentLead) {
      throw new AppError(`Row ${rowNumber} not found`, 404, 'ROW_NOT_FOUND');
    }

    // Verify ownership
    if (currentLead.salesOwnerId !== salesUserId) {
      throw new RaceConditionError(
        `User ${salesUserId} is not the owner of this lead`
      );
    }

    const now = new Date().toISOString();
    const updates: Partial<Lead> = { status: newStatus };

    switch (newStatus) {
      case 'closed':
        updates.closedAt = now;
        break;
      case 'lost':
        updates.lostAt = now;
        break;
      case 'unreachable':
        updates.unreachableAt = now;
        break;
    }

    return this.updateLeadWithLock(rowNumber, updates);
  }

  // ===========================================
  // Deduplication Operations
  // ===========================================

  /**
   * Check if a lead has already been processed
   */
  async checkDuplicate(key: string): Promise<boolean> {
    logger.debug('Checking duplicate', { key });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.dedupSheet, 'A:A'),
        });

        const keys = response.data.values?.flat() || [];
        return keys.includes(key);
      });
    });
  }

  /**
   * Mark a lead as processed (add to dedup log)
   */
  async markAsProcessed(key: string, email: string, campaignId: string): Promise<void> {
    logger.info('Marking lead as processed', { key });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.dedupSheet, 'A:D'),
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[key, email, campaignId, new Date().toISOString()]],
          },
        });
      });
    });
  }

  // ===========================================
  // Sales Team Operations
  // ===========================================

  /**
   * Get sales team member by LINE User ID
   */
  async getSalesTeamMember(lineUserId: string): Promise<SalesTeamMember | null> {
    logger.debug('Getting sales team member', { lineUserId });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.salesTeamSheet, 'A:D'),
        });

        const rows = response.data.values || [];
        const memberRow = rows.find((row) => row[0] === lineUserId);

        if (!memberRow) {
          return null;
        }

        return {
          lineUserId: memberRow[0],
          name: memberRow[1],
          email: memberRow[2] || undefined,
          phone: memberRow[3] || undefined,
        };
      });
    });
  }

  // ===========================================
  // Health Check
  // ===========================================

  /**
   * Check if Google Sheets connection is healthy
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
      logger.error('Health check failed', { error });
      return {
        healthy: false,
        latency: Date.now() - start,
      };
    }
  }
}

// Export singleton instance
export const sheetsService = new SheetsService();
