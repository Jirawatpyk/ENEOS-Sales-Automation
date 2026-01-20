/**
 * ENEOS Sales Automation - Google Sheets Service
 * Enterprise-grade Google Sheets integration with optimistic locking
 */

import { google } from 'googleapis';
import { config } from '../config/index.js';
import { sheetsLogger as logger } from '../utils/logger.js';
import { withRetry, CircuitBreaker } from '../utils/retry.js';
import { formatDateForSheets, formatISOTimestamp } from '../utils/date-formatter.js';
import { generateLeadUUID } from '../utils/uuid.js';
import {
  Lead,
  LeadRow,
  LeadStatus,
  SalesTeamMember,
  SalesTeamMemberFull,
  SalesTeamFilter,
  SalesTeamMemberUpdate,
  AppError,
  RaceConditionError,
  VALID_LEAD_STATUSES,
  StatusHistoryEntry,
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

/**
 * Column mapping reference (1-indexed for Google Sheets API):
 * A: date, B: customerName, C: email, D: phone, E: company
 * F: industryAI, G: website, H: capital, I: status
 * J: salesOwnerId, K: salesOwnerName, L: campaignId, M: campaignName
 * N: emailSubject, O: source, P: leadId, Q: eventId, R: clickedAt
 * S: talkingPoint, T: closedAt, U: lostAt, V: unreachableAt, W: version
 * X: leadSource, Y: jobTitle, Z: city
 * AA: leadUUID, AB: createdAt, AC: updatedAt (UUID Migration columns)
 * AD: contactedAt (when sales claimed the lead)
 */


// ===========================================
// Helper Functions
// ===========================================

function getSheetRange(sheetName: string, range: string): string {
  return `${sheetName}!${range}`;
}

/**
 * แปลง row array เป็น LeadRow object
 * พร้อม validate status ให้เป็นค่าที่ถูกต้องเท่านั้น
 */
function rowToLead(row: string[], rowNumber: number): LeadRow {
  // Validate status - ถ้าไม่ถูกต้องให้ใช้ 'new' เป็น default
  const rawStatus = row[8] || 'new';
  const status: LeadStatus = VALID_LEAD_STATUSES.includes(rawStatus as LeadStatus)
    ? (rawStatus as LeadStatus)
    : 'new';

  // Parse version - default เป็น 1 ถ้าไม่มีหรือ parse ไม่ได้
  const version = parseInt(row[22] || '1', 10) || 1;

  return {
    rowNumber,
    version,
    date: row[0] || '',
    customerName: row[1] || '',
    email: row[2] || '',
    phone: row[3] || '',
    company: row[4] || '',
    industryAI: row[5] || '',
    website: row[6] || null,
    capital: row[7] || null,
    status,
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
    // New fields from Brevo Contact Attributes (columns X, Y, Z)
    leadSource: row[23] || null,
    jobTitle: row[24] || null,
    city: row[25] || null,
    // UUID Migration fields (columns AA, AB, AC)
    leadUUID: row[26] || null,
    createdAt: row[27] || null,
    updatedAt: row[28] || null,
    // Contacted timestamp (column AD)
    contactedAt: row[29] || null,
  };
}

function leadToRow(lead: Partial<Lead>, version: number = 1): string[] {
  return [
    lead.date || formatDateForSheets(),
    lead.customerName || '',
    lead.email || '',
    lead.phone ? `'${lead.phone}` : '',  // Prefix with ' to preserve leading zeros
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
    // New fields from Brevo Contact Attributes (columns X, Y, Z)
    lead.leadSource || '',
    lead.jobTitle || '',
    lead.city || '',
    // UUID Migration fields (columns AA, AB, AC)
    lead.leadUUID || '',
    lead.createdAt || '',
    lead.updatedAt || '',
    // Contacted timestamp (column AD)
    lead.contactedAt || '',
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
  private statusHistorySheet: string;

  constructor() {
    this.spreadsheetId = config.google.sheetId;
    this.leadsSheet = config.google.sheets.leads;
    this.dedupSheet = config.google.sheets.dedup;
    this.salesTeamSheet = config.google.sheets.salesTeam;
    this.statusHistorySheet = config.google.sheets.statusHistory;
  }

  // ===========================================
  // Lead Operations
  // ===========================================

  /**
   * Add a new lead to the sheet
   * Returns the row number of the new lead
   * Automatically generates leadUUID, createdAt, and updatedAt
   */
  async addLead(lead: Partial<Lead>): Promise<number> {
    logger.info('Adding new lead', { email: lead.email, company: lead.company });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        // Generate UUID and timestamps for new leads
        const now = formatISOTimestamp();
        const enrichedLead: Partial<Lead> = {
          ...lead,
          leadUUID: lead.leadUUID || generateLeadUUID(),
          createdAt: lead.createdAt || now,
          updatedAt: now,
        };

        const row = leadToRow(enrichedLead);

        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.leadsSheet, 'A:AD'),
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [row],
          },
        });

        // Extract row number from updatedRange (e.g., "Leads!A42:AD42")
        const updatedRange = response.data.updates?.updatedRange || '';
        const match = updatedRange.match(/!A(\d+):/);
        const rowNumber = match ? parseInt(match[1], 10) : 0;

        logger.info('Lead added successfully', {
          rowNumber,
          email: lead.email,
          leadUUID: enrichedLead.leadUUID,
        });

        // Fire-and-forget: Record initial "new" status in history (using UUID for Supabase compatibility)
        if (rowNumber > 0 && enrichedLead.leadUUID) {
          this.addStatusHistory({
            leadUUID: enrichedLead.leadUUID,
            status: 'new',
            changedById: 'System',
            changedByName: 'System',
            timestamp: now,
            notes: 'Lead created from webhook',
          }).catch((err) => {
            logger.error('Failed to record initial status history', { leadUUID: enrichedLead.leadUUID, error: err });
          });
        }

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
        const range = getSheetRange(this.leadsSheet, `A${rowNumber}:AD${rowNumber}`);

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
      // Always fetch current data for race condition detection
      // This second read is intentional - it detects concurrent modifications
      const currentLead = await this.getRow(rowNumber);

      if (!currentLead) {
        throw new AppError(`Row ${rowNumber} not found`, 404, 'ROW_NOT_FOUND');
      }

      // Check version for optimistic locking (if version checking is enabled)
      if (expectedVersion !== undefined) {
        if (currentLead.version !== expectedVersion) {
          throw new RaceConditionError(
            `Version mismatch: expected ${expectedVersion}, got ${currentLead.version}`
          );
        }
      }

      // Merge updates and set updatedAt timestamp
      const updatedLead: Lead = {
        ...currentLead,
        ...updates,
        updatedAt: formatISOTimestamp(), // Always update timestamp on modification
      };

      // Generate UUID for existing leads without one (backward compatibility)
      if (!updatedLead.leadUUID) {
        updatedLead.leadUUID = generateLeadUUID();
        logger.info('Generated UUID for existing lead', {
          rowNumber,
          leadUUID: updatedLead.leadUUID,
        });
      }

      // Increment version
      const newVersion = currentLead.version + 1;
      const row = leadToRow(updatedLead, newVersion);

      await withRetry(async () => {
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.leadsSheet, `A${rowNumber}:AD${rowNumber}`),
          valueInputOption: 'RAW',
          requestBody: {
            values: [row],
          },
        });
      });

      logger.info('Lead updated successfully', { rowNumber, newVersion });
      return { ...updatedLead, rowNumber, version: newVersion };
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
  ): Promise<{ success: boolean; lead: LeadRow; alreadyClaimed: boolean; isNewClaim: boolean; owner?: string }> {
    logger.info('Attempting to claim lead', { rowNumber, salesUserId });

    const currentLead = await this.getRow(rowNumber);

    if (!currentLead) {
      throw new AppError(`Row ${rowNumber} not found`, 404, 'ROW_NOT_FOUND');
    }

    // Determine if this is a new claim (lead was previously unclaimed)
    const isNewClaim = !currentLead.salesOwnerId;

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
        isNewClaim: false,
        owner: currentLead.salesOwnerName || currentLead.salesOwnerId,
      };
    }

    // Update timestamp based on status
    const now = formatDateForSheets();
    const updates: Partial<Lead> = {
      salesOwnerId: salesUserId,
      salesOwnerName: salesUserName,
      status,
    };

    // Set appropriate timestamp and clear others (only one status at a time)
    // BUG FIX: Always set contactedAt when claiming a lead (needed for Closing Time calculation)
    switch (status) {
      case 'closed':
        updates.contactedAt = currentLead.contactedAt || now; // Preserve existing or set new
        updates.closedAt = now;
        updates.lostAt = '';
        updates.unreachableAt = '';
        break;
      case 'lost':
        updates.contactedAt = currentLead.contactedAt || now; // Preserve existing or set new
        updates.closedAt = '';
        updates.lostAt = now;
        updates.unreachableAt = '';
        break;
      case 'unreachable':
        updates.contactedAt = currentLead.contactedAt || now; // Preserve existing or set new
        updates.closedAt = '';
        updates.lostAt = '';
        updates.unreachableAt = now;
        break;
      case 'contacted':
        // รับเคสครั้งแรก - set contactedAt และเคลียร์ทุก timestamp
        updates.contactedAt = now;
        updates.closedAt = '';
        updates.lostAt = '';
        updates.unreachableAt = '';
        break;
    }

    // Pass version for optimistic locking - the second getRow in updateLeadWithLock
    // is intentional for race condition detection (detects concurrent modifications)
    const updatedLead = await this.updateLeadWithLock(rowNumber, updates, currentLead.version);

    // Fire-and-forget: Record status change in history (using UUID for Supabase compatibility)
    if (updatedLead.leadUUID) {
      this.addStatusHistory({
        leadUUID: updatedLead.leadUUID,
        status,
        changedById: salesUserId,
        changedByName: salesUserName,
        timestamp: now,
      }).catch((err) => {
        logger.error('Failed to record status history for claimLead', { leadUUID: updatedLead.leadUUID, status, error: err });
      });
    }

    return {
      success: true,
      lead: updatedLead,
      alreadyClaimed: false,
      isNewClaim,
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

    const now = formatDateForSheets();
    const updates: Partial<Lead> = { status: newStatus };

    // BUG FIX: Ensure contactedAt is set for Closing Time calculation
    // This handles legacy leads that were claimed before contactedAt column was added
    if (!currentLead.contactedAt && (newStatus === 'closed' || newStatus === 'lost' || newStatus === 'unreachable')) {
      updates.contactedAt = now;
    }

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

    // Pass version for optimistic locking - the second getRow in updateLeadWithLock
    // is intentional for race condition detection (detects concurrent modifications)
    const updatedLead = await this.updateLeadWithLock(rowNumber, updates, currentLead.version);

    // Fire-and-forget: Record status change in history (using UUID for Supabase compatibility)
    // Use updatedLead.leadUUID because updateLeadWithLock generates UUID for legacy leads
    if (updatedLead.leadUUID) {
      this.addStatusHistory({
        leadUUID: updatedLead.leadUUID,
        status: newStatus,
        changedById: salesUserId,
        changedByName: currentLead.salesOwnerName || 'Unknown',
        timestamp: now,
      }).catch((err) => {
        logger.error('Failed to record status history for updateLeadStatus', { leadUUID: updatedLead.leadUUID, status: newStatus, error: err });
      });
    }

    return updatedLead;
  }

  // ===========================================
  // UUID-based Lead Lookup (Migration Support)
  // ===========================================

  /**
   * Find a lead by its UUID (leadUUID column)
   * Used for UUID-based postback lookup (new format)
   * Falls back to generating UUID for existing leads without one
   */
  async findLeadByUUID(leadUUID: string): Promise<LeadRow | null> {
    logger.info('Finding lead by UUID', { leadUUID });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        // Get all leads with their leadUUID column (column AA = index 26)
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.leadsSheet, 'A2:AD'),
        });

        const rows = response.data.values || [];

        // Find the row with matching leadUUID
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowLeadUUID = row[26]; // Column AA (index 26)

          if (rowLeadUUID === leadUUID) {
            const rowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed
            logger.info('Found lead by UUID', { leadUUID, rowNumber });
            return rowToLead(row, rowNumber);
          }
        }

        logger.warn('Lead not found by UUID', { leadUUID });
        return null;
      });
    });
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
  async markAsProcessed(key: string, email: string, leadSource: string): Promise<void> {
    logger.info('Marking lead as processed', { key });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.dedupSheet, 'A:D'),
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[key, email, leadSource, formatDateForSheets()]],
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
  // Admin Dashboard Methods
  // ===========================================

  /**
   * Private helper: ดึง raw leads ทั้งหมดจาก Google Sheets
   * ใช้ร่วมกันระหว่าง methods เพื่อลด duplicate code
   */
  private async _fetchAllLeadsFromSheet(): Promise<LeadRow[]> {
    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.leadsSheet, 'A2:AD'), // Skip header row, includes contactedAt column
        });

        const rows = response.data.values || [];
        return rows.map((row, index) => rowToLead(row, index + 2)); // +2 because row 1 is header
      });
    });
  }

  /**
   * Get all leads (use with caution - prefer pagination)
   */
  async getAllLeads(): Promise<LeadRow[]> {
    logger.info('Getting all leads');
    return this._fetchAllLeadsFromSheet();
  }

  /**
   * Get leads with pagination and filters
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @param filters - Optional filters (status, dateRange, search)
   */
  async getLeadsWithPagination(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: LeadStatus;
      startDate?: string;
      endDate?: string;
      search?: string; // Search in email, company, customerName
      salesOwnerId?: string;
    }
  ): Promise<{ leads: LeadRow[]; total: number; page: number; limit: number; totalPages: number }> {
    logger.info('Getting leads with pagination', { page, limit, filters });

    // Get all leads using helper method (in production, consider caching this)
    let leads = await this._fetchAllLeadsFromSheet();

    // Apply filters
    if (filters) {
      if (filters.status) {
        leads = leads.filter((lead) => lead.status === filters.status);
      }

      // Date comparison using Date objects for accuracy
      if (filters.startDate) {
        const startTime = new Date(filters.startDate).getTime();
        leads = leads.filter((lead) => {
          const leadTime = new Date(lead.date).getTime();
          return !isNaN(leadTime) && leadTime >= startTime;
        });
      }

      if (filters.endDate) {
        const endTime = new Date(filters.endDate).getTime();
        leads = leads.filter((lead) => {
          const leadTime = new Date(lead.date).getTime();
          return !isNaN(leadTime) && leadTime <= endTime;
        });
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        leads = leads.filter(
          (lead) =>
            lead.email.toLowerCase().includes(searchLower) ||
            lead.company.toLowerCase().includes(searchLower) ||
            lead.customerName.toLowerCase().includes(searchLower)
        );
      }

      if (filters.salesOwnerId) {
        leads = leads.filter((lead) => lead.salesOwnerId === filters.salesOwnerId);
      }
    }

    // Calculate pagination
    const total = leads.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLeads = leads.slice(startIndex, endIndex);

    logger.info('Leads pagination result', {
      total,
      page,
      limit,
      totalPages,
      returned: paginatedLeads.length,
    });

    return {
      leads: paginatedLeads,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get leads by status
   */
  async getLeadsByStatus(status: LeadStatus): Promise<LeadRow[]> {
    logger.info('Getting leads by status', { status });

    const leads = await this._fetchAllLeadsFromSheet();
    return leads.filter((lead) => lead.status === status);
  }

  /**
   * Get leads by date range
   * ใช้ Date objects ในการเปรียบเทียบเพื่อความถูกต้อง
   */
  async getLeadsByDateRange(startDate: string, endDate: string): Promise<LeadRow[]> {
    logger.info('Getting leads by date range', { startDate, endDate });

    const leads = await this._fetchAllLeadsFromSheet();

    // Convert to timestamps for accurate comparison
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();

    return leads.filter((lead) => {
      const leadTime = new Date(lead.date).getTime();
      return !isNaN(leadTime) && leadTime >= startTime && leadTime <= endTime;
    });
  }

  /**
   * Get all sales team members
   */
  async getSalesTeamAll(): Promise<SalesTeamMember[]> {
    logger.info('Getting all sales team members');

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.salesTeamSheet, 'A2:E'), // A:E to include Role column
        });

        const rows = response.data.values || [];

        return rows
          .filter((row) => row[0]) // Ensure LINE User ID exists
          .map((row) => ({
            lineUserId: row[0],
            name: row[1],
            email: row[2] || undefined,
            phone: row[3] || undefined,
            role: row[4] || 'sales', // Default role is 'sales'
          }));
      });
    });
  }

  /**
   * Get user by email (for authentication)
   * Returns user info with role from Sales_Team sheet
   */
  async getUserByEmail(email: string): Promise<(SalesTeamMember & { role: string }) | null> {
    logger.info('Getting user by email', { email });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.salesTeamSheet, 'A2:E'), // Include Role column (E)
        });

        const rows = response.data.values || [];
        const userRow = rows.find((row) => row[2] && row[2].toLowerCase() === email.toLowerCase());

        if (!userRow) {
          logger.warn('User not found by email', { email });
          return null;
        }

        return {
          lineUserId: userRow[0],
          name: userRow[1],
          email: userRow[2],
          phone: userRow[3] || undefined,
          role: userRow[4] || 'sales', // Default to 'sales' if not specified
        };
      });
    });
  }

  // ===========================================
  // Team Management Operations (Story 7-4)
  // ===========================================

  /**
   * Get all sales team members with optional filtering
   * Used by Team Management page (/settings/team)
   *
   * Sheet columns: A=lineUserId, B=name, C=email, D=phone, E=role, F=createdAt, G=status
   *
   * @param filter - Optional filter for status and role
   * @returns Array of SalesTeamMemberFull
   */
  async getAllSalesTeamMembers(filter?: SalesTeamFilter): Promise<SalesTeamMemberFull[]> {
    logger.info('Getting all sales team members with filters', { filter });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.salesTeamSheet, 'A2:G'), // A:G to include all columns
        });

        const rows = response.data.values || [];

        let members: SalesTeamMemberFull[] = rows
          .filter((row) => row[0]) // Ensure LINE User ID exists
          .map((row) => ({
            lineUserId: row[0],
            name: row[1] || '',
            email: row[2] || null,
            phone: row[3] || null,
            role: (row[4] || 'sales') as 'admin' | 'sales',
            createdAt: row[5] || '',
            status: (row[6] || 'active') as 'active' | 'inactive',
          }));

        // Apply status filter (default to 'active')
        const statusFilter = filter?.status || 'active';
        if (statusFilter !== 'all') {
          members = members.filter((m) => m.status === statusFilter);
        }

        // Apply role filter
        if (filter?.role && filter.role !== 'all') {
          members = members.filter((m) => m.role === filter.role);
        }

        logger.info('Sales team members retrieved', { count: members.length, filter });
        return members;
      });
    });
  }

  /**
   * Get a single sales team member by LINE User ID
   * Used by Team Management edit functionality
   *
   * @param lineUserId - LINE User ID
   * @returns SalesTeamMemberFull or null if not found
   */
  async getSalesTeamMemberById(lineUserId: string): Promise<SalesTeamMemberFull | null> {
    logger.info('Getting sales team member by ID', { lineUserId });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.salesTeamSheet, 'A2:G'),
        });

        const rows = response.data.values || [];
        const memberRow = rows.find((row) => row[0] === lineUserId);

        if (!memberRow) {
          logger.warn('Sales team member not found', { lineUserId });
          return null;
        }

        return {
          lineUserId: memberRow[0],
          name: memberRow[1] || '',
          email: memberRow[2] || null,
          phone: memberRow[3] || null,
          role: (memberRow[4] || 'sales') as 'admin' | 'sales',
          createdAt: memberRow[5] || '',
          status: (memberRow[6] || 'active') as 'active' | 'inactive',
        };
      });
    });
  }

  /**
   * Update a sales team member's details
   * Can update: email, phone, role, status
   * Cannot update: lineUserId, name (from LINE), createdAt
   *
   * @param lineUserId - LINE User ID
   * @param updates - Fields to update
   * @returns Updated SalesTeamMemberFull or null if not found
   */
  async updateSalesTeamMember(
    lineUserId: string,
    updates: SalesTeamMemberUpdate
  ): Promise<SalesTeamMemberFull | null> {
    logger.info('Updating sales team member', { lineUserId, updates });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        // First, find the row
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.salesTeamSheet, 'A2:G'),
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex((row) => row[0] === lineUserId);

        if (rowIndex === -1) {
          logger.warn('Sales team member not found for update', { lineUserId });
          return null;
        }

        const currentRow = rows[rowIndex];

        // Build updated row (preserve immutable fields: lineUserId, name, createdAt)
        const updatedRow = [
          currentRow[0], // lineUserId (immutable)
          currentRow[1], // name (immutable from LINE)
          updates.email !== undefined ? (updates.email || '') : (currentRow[2] || ''),
          updates.phone !== undefined ? (updates.phone || '') : (currentRow[3] || ''),
          updates.role || currentRow[4] || 'sales',
          currentRow[5] || '', // createdAt (immutable)
          updates.status || currentRow[6] || 'active',
        ];

        // Update the row (rowIndex + 2 because header is row 1, data starts at 2, array is 0-indexed)
        const actualRow = rowIndex + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.salesTeamSheet, `A${actualRow}:G${actualRow}`),
          valueInputOption: 'RAW',
          requestBody: {
            values: [updatedRow],
          },
        });

        logger.info('Sales team member updated', { lineUserId, actualRow });

        return {
          lineUserId: updatedRow[0],
          name: updatedRow[1],
          email: updatedRow[2] || null,
          phone: updatedRow[3] || null,
          role: updatedRow[4] as 'admin' | 'sales',
          createdAt: updatedRow[5],
          status: updatedRow[6] as 'active' | 'inactive',
        };
      });
    });
  }

  /**
   * Get leads count grouped by status
   * Returns object with count for each status
   */
  async getLeadsCountByStatus(): Promise<Record<LeadStatus, number>> {
    logger.info('Getting leads count by status');

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.leadsSheet, 'A2:I'), // Only need up to status column
        });

        const rows = response.data.values || [];

        // Initialize counts
        const counts: Record<LeadStatus, number> = {
          new: 0,
          claimed: 0,
          contacted: 0,
          closed: 0,
          lost: 0,
          unreachable: 0,
        };

        // Count each status
        rows.forEach((row) => {
          const status = (row[8] as LeadStatus) || 'new'; // Column I (index 8) is status
          if (status in counts) {
            counts[status]++;
          }
        });

        logger.info('Leads count by status result', counts);
        return counts;
      });
    });
  }

  // ===========================================
  // Status History Operations
  // ===========================================

  /**
   * Add a status history entry (fire-and-forget)
   * Errors are logged but don't throw to avoid blocking main operations
   * Uses UUID for future Supabase migration compatibility
   */
  async addStatusHistory(entry: StatusHistoryEntry): Promise<void> {
    logger.debug('Adding status history entry', { leadUUID: entry.leadUUID, status: entry.status });

    try {
      await circuitBreaker.execute(async () => {
        await withRetry(async () => {
          await sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: getSheetRange(this.statusHistorySheet, 'A:F'),
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: [[
                entry.leadUUID,
                entry.status,
                entry.changedById,
                entry.changedByName,
                entry.timestamp,
                entry.notes || '',
              ]],
            },
          });
        });
      });

      logger.info('Status history entry added', { leadUUID: entry.leadUUID, status: entry.status });
    } catch (error) {
      // Fire-and-forget: log error but don't throw
      logger.error('Failed to add status history entry', {
        leadUUID: entry.leadUUID,
        status: entry.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get status history for a lead by UUID
   * Returns sorted array of StatusHistoryEntry (oldest first)
   * Uses UUID for future Supabase migration compatibility
   */
  async getStatusHistory(leadUUID: string): Promise<StatusHistoryEntry[]> {
    logger.debug('Getting status history', { leadUUID });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: getSheetRange(this.statusHistorySheet, 'A2:F'), // Skip header row
        });

        const rows = response.data.values || [];

        // Filter rows for this lead UUID and map to StatusHistoryEntry
        const history: StatusHistoryEntry[] = rows
          .filter((row) => row[0] === leadUUID)
          .map((row) => ({
            leadUUID: row[0] || '',
            status: row[1] as LeadStatus,
            changedById: row[2] || '',
            changedByName: row[3] || '',
            timestamp: row[4] || '',
            notes: row[5] || undefined,
          }));

        // Sort by timestamp ascending (oldest first)
        history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        logger.debug('Status history retrieved', { leadUUID, count: history.length });
        return history;
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
