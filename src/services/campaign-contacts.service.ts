/**
 * ENEOS Sales Automation - Campaign Contacts Service
 * Stores and retrieves contact attributes from Brevo Automation webhooks
 * into the Campaign_Contacts Google Sheet tab
 */

import { google } from 'googleapis';
import { config } from '../config/index.js';
import { campaignLogger as logger } from '../utils/logger.js';
import { withRetry, CircuitBreaker } from '../utils/retry.js';
import { formatISOTimestamp } from '../utils/date-formatter.js';
import { CAMPAIGN_CONTACTS_COLUMNS } from '../constants/campaign.constants.js';
import type { NormalizedBrevoPayload, CampaignContact } from '../types/index.js';

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

export interface StoreCampaignContactResult {
  success: boolean;
  isUpdate: boolean;
  error?: string;
}

// ===========================================
// Campaign Contacts Service Class
// ===========================================

export class CampaignContactsService {
  private spreadsheetId: string;
  private contactsSheet: string;

  constructor() {
    this.spreadsheetId = config.google.sheetId;
    this.contactsSheet = config.google.sheets.campaignContacts;
  }

  private getSheetRange(range: string): string {
    return `${this.contactsSheet}!${range}`;
  }

  // ===========================================
  // Store / Upsert Contact
  // ===========================================

  /**
   * Store a campaign contact (upsert by email + campaign_id)
   * - New contact: append row
   * - Existing contact: update row (preserve Created_At)
   */
  async storeCampaignContact(
    contact: NormalizedBrevoPayload
  ): Promise<StoreCampaignContactResult> {
    const email = contact.email.toLowerCase().trim();
    const campaignId = contact.campaignId;

    logger.info('Storing campaign contact', { email, campaignId });

    try {
      // Check for existing contact (email + campaign_id)
      const existing = await this.findExistingContact(email, campaignId);

      if (existing) {
        // Update existing row (upsert)
        await this.updateContactRow(existing.rowIndex, contact, existing.createdAt);
        logger.info('Campaign contact updated (upsert)', { email, campaignId });
        return { success: true, isUpdate: true };
      }

      // Append new row
      await this.appendContactRow(contact);
      logger.info('Campaign contact stored (new)', { email, campaignId });
      return { success: true, isUpdate: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to store campaign contact', { email, campaignId, error: errorMessage });
      return { success: false, isUpdate: false, error: errorMessage };
    }
  }

  // ===========================================
  // Find Existing Contact
  // ===========================================

  /**
   * Find existing contact by email + campaign_id
   * Returns row index (1-indexed for Sheets) and createdAt if found
   */
  private async findExistingContact(
    email: string,
    campaignId: string
  ): Promise<{ rowIndex: number; createdAt: string } | null> {
    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange('A:O'),
        });

        const values = response.data.values || [];

        // Search for matching email + campaign_id (skip header at index 0)
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          if (!row) { continue; }

          const rowEmail = (String(row[CAMPAIGN_CONTACTS_COLUMNS.EMAIL] || '')).toLowerCase().trim();
          const rowCampaignId = String(row[CAMPAIGN_CONTACTS_COLUMNS.CAMPAIGN_ID] || '');

          if (rowEmail === email && rowCampaignId === campaignId) {
            return {
              rowIndex: i + 1, // Convert to 1-indexed for Sheets API
              createdAt: String(row[CAMPAIGN_CONTACTS_COLUMNS.CREATED_AT] || ''),
            };
          }
        }

        return null;
      });
    });
  }

  // ===========================================
  // Append New Contact Row
  // ===========================================

  private async appendContactRow(contact: NormalizedBrevoPayload): Promise<void> {
    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const now = formatISOTimestamp();
        const row = this.buildContactRow(contact, now, now);

        await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange('A:O'),
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [row],
          },
        });
      });
    });
  }

  // ===========================================
  // Update Existing Contact Row
  // ===========================================

  private async updateContactRow(
    sheetRow: number,
    contact: NormalizedBrevoPayload,
    preservedCreatedAt: string
  ): Promise<void> {
    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const now = formatISOTimestamp();
        const row = this.buildContactRow(contact, preservedCreatedAt, now);

        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: this.getSheetRange(`A${sheetRow}:O${sheetRow}`),
          valueInputOption: 'RAW',
          requestBody: {
            values: [row],
          },
        });
      });
    });
  }

  // ===========================================
  // Build Row Array
  // ===========================================

  private buildContactRow(
    contact: NormalizedBrevoPayload,
    createdAt: string,
    updatedAt: string
  ): string[] {
    const row: string[] = new Array(15).fill('');

    row[CAMPAIGN_CONTACTS_COLUMNS.EMAIL] = contact.email.toLowerCase().trim();
    row[CAMPAIGN_CONTACTS_COLUMNS.FIRSTNAME] = contact.firstname;
    row[CAMPAIGN_CONTACTS_COLUMNS.LASTNAME] = contact.lastname;
    row[CAMPAIGN_CONTACTS_COLUMNS.PHONE] = contact.phone;
    row[CAMPAIGN_CONTACTS_COLUMNS.COMPANY] = contact.company;
    row[CAMPAIGN_CONTACTS_COLUMNS.JOB_TITLE] = contact.jobTitle;
    row[CAMPAIGN_CONTACTS_COLUMNS.CITY] = contact.city;
    row[CAMPAIGN_CONTACTS_COLUMNS.WEBSITE] = contact.website;
    row[CAMPAIGN_CONTACTS_COLUMNS.CAMPAIGN_ID] = contact.campaignId;
    row[CAMPAIGN_CONTACTS_COLUMNS.CAMPAIGN_NAME] = contact.campaignName;
    // NOTE: For Automation payloads, clickedAt is the webhook timestamp (not an actual click).
    // The brevo validator defaults event to 'click' and derives clickedAt from input.date || new Date().
    row[CAMPAIGN_CONTACTS_COLUMNS.EVENT_AT] = contact.clickedAt;
    row[CAMPAIGN_CONTACTS_COLUMNS.URL] = ''; // Automation payloads don't have click URL
    row[CAMPAIGN_CONTACTS_COLUMNS.LEAD_SOURCE] = contact.leadSource;
    row[CAMPAIGN_CONTACTS_COLUMNS.CREATED_AT] = createdAt;
    row[CAMPAIGN_CONTACTS_COLUMNS.UPDATED_AT] = updatedAt;

    return row;
  }

  // ===========================================
  // Get Contacts by Email (Batch Lookup)
  // ===========================================

  /**
   * Get all contacts as a Map<email, contact>
   * Used by getCampaignEvents() to join contact data with events.
   *
   * Looks up by email only (not campaign_id) because Brevo Automation
   * payloads use workflow_id which doesn't match Campaign Events' campaign_id.
   * Contact info (name, company) is per-person and doesn't vary by campaign.
   */
  async getAllContactsByEmail(): Promise<Map<string, CampaignContact>> {
    const contacts = new Map<string, CampaignContact>();

    try {
      return await circuitBreaker.execute(async () => {
        return await withRetry(async () => {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: this.getSheetRange('A:O'),
          });

          const values = response.data.values || [];

          for (let i = 1; i < values.length; i++) {
            const row = values[i];
            if (!row) { continue; }

            const email = (String(row[CAMPAIGN_CONTACTS_COLUMNS.EMAIL] || '')).toLowerCase().trim();
            if (!email) { continue; }

            contacts.set(email, {
              email,
              firstname: String(row[CAMPAIGN_CONTACTS_COLUMNS.FIRSTNAME] || ''),
              lastname: String(row[CAMPAIGN_CONTACTS_COLUMNS.LASTNAME] || ''),
              phone: String(row[CAMPAIGN_CONTACTS_COLUMNS.PHONE] || ''),
              company: String(row[CAMPAIGN_CONTACTS_COLUMNS.COMPANY] || ''),
              jobTitle: String(row[CAMPAIGN_CONTACTS_COLUMNS.JOB_TITLE] || ''),
              city: String(row[CAMPAIGN_CONTACTS_COLUMNS.CITY] || ''),
              website: String(row[CAMPAIGN_CONTACTS_COLUMNS.WEBSITE] || ''),
              campaignId: String(row[CAMPAIGN_CONTACTS_COLUMNS.CAMPAIGN_ID] || ''),
              campaignName: String(row[CAMPAIGN_CONTACTS_COLUMNS.CAMPAIGN_NAME] || ''),
              eventAt: String(row[CAMPAIGN_CONTACTS_COLUMNS.EVENT_AT] || ''),
              url: String(row[CAMPAIGN_CONTACTS_COLUMNS.URL] || ''),
              leadSource: String(row[CAMPAIGN_CONTACTS_COLUMNS.LEAD_SOURCE] || ''),
              createdAt: String(row[CAMPAIGN_CONTACTS_COLUMNS.CREATED_AT] || ''),
              updatedAt: String(row[CAMPAIGN_CONTACTS_COLUMNS.UPDATED_AT] || ''),
            });
          }

          return contacts;
        });
      });
    } catch (error) {
      logger.warn('Failed to get contacts, returning empty map', {
        error: error instanceof Error ? error.message : String(error),
      });
      return contacts;
    }
  }
}

// ===========================================
// Export Singleton Instance
// ===========================================

export const campaignContactsService = new CampaignContactsService();
