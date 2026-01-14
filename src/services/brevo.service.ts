/**
 * ENEOS Sales Automation - Brevo API Service
 * Fetch contact details from Brevo when webhook doesn't include them
 */

import { config } from '../config/index.js';
import { webhookLogger as logger } from '../utils/logger.js';

// ===========================================
// Types
// ===========================================

interface BrevoContact {
  email: string;
  attributes: {
    FIRSTNAME?: string;
    LASTNAME?: string;
    PHONE?: string;
    SMS?: string;
    COMPANY?: string;
    JOB_TITLE?: string;
    LEAD_SOURCE?: string;
    CITY?: string;
    WEBSITE?: string;
    [key: string]: string | undefined;
  };
}

export interface ContactDetails {
  firstname: string;
  lastname: string;
  phone: string;
  company: string;
  jobTitle: string;
  leadSource: string;
  city: string;
  website: string;
}

// ===========================================
// Brevo Service Class
// ===========================================

export class BrevoService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.brevo.com/v3';

  constructor() {
    this.apiKey = config.brevo.apiKey;
  }

  /**
   * Check if Brevo API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetch contact details by email from Brevo API
   */
  async getContactByEmail(email: string): Promise<ContactDetails | null> {
    if (!this.apiKey) {
      logger.warn('Brevo API key not configured, cannot fetch contact details');
      return null;
    }

    try {
      logger.info('Fetching contact from Brevo API', { email });

      const response = await fetch(
        `${this.baseUrl}/contacts/${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('Contact not found in Brevo', { email });
          return null;
        }
        throw new Error(`Brevo API error: ${response.status} ${response.statusText}`);
      }

      const contact = (await response.json()) as BrevoContact;

      const details: ContactDetails = {
        firstname: contact.attributes.FIRSTNAME || '',
        lastname: contact.attributes.LASTNAME || '',
        phone: contact.attributes.PHONE || contact.attributes.SMS || '',
        company: contact.attributes.COMPANY || '',
        jobTitle: contact.attributes.JOB_TITLE || '',
        leadSource: contact.attributes.LEAD_SOURCE || '',
        city: contact.attributes.CITY || '',
        website: contact.attributes.WEBSITE || '',
      };

      logger.info('Contact fetched from Brevo', {
        email,
        company: details.company,
        hasPhone: !!details.phone,
      });

      return details;
    } catch (error) {
      logger.error('Failed to fetch contact from Brevo', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

// Export singleton instance
export const brevoService = new BrevoService();
