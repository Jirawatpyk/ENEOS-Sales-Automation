/**
 * Brevo Validator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateBrevoWebhook,
  normalizeBrevoPayload,
  isClickEvent,
  isOpenEvent,
  BREVO_EVENTS,
} from '../../validators/brevo.validator.js';
import {
  mockBrevoClickPayload,
  mockBrevoOpenPayload,
  mockInvalidPayload,
  mockNormalizedPayload,
} from '../mocks/brevo.mock.js';

describe('Brevo Validator', () => {
  describe('validateBrevoWebhook', () => {
    it('should validate correct click payload', () => {
      const result = validateBrevoWebhook(mockBrevoClickPayload);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe('somchai@scg.com');
    });

    it('should validate correct open payload', () => {
      const result = validateBrevoWebhook(mockBrevoOpenPayload);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject payload without email', () => {
      const result = validateBrevoWebhook(mockInvalidPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should reject payload with invalid email', () => {
      const result = validateBrevoWebhook({
        event: 'click',
        email: 'invalid-email',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should reject null payload', () => {
      const result = validateBrevoWebhook(null);

      expect(result.success).toBe(false);
    });

    it('should reject undefined payload', () => {
      const result = validateBrevoWebhook(undefined);

      expect(result.success).toBe(false);
    });
  });

  describe('normalizeBrevoPayload', () => {
    it('should normalize email to lowercase', () => {
      const input = {
        ...mockBrevoClickPayload,
        email: 'USER@EXAMPLE.COM',
      };

      const result = validateBrevoWebhook(input);

      expect(result.data?.email).toBe('user@example.com');
    });

    it('should use UPPERCASE contact attributes', () => {
      const result = validateBrevoWebhook(mockBrevoClickPayload);

      expect(result.data?.firstname).toBe('สมชาย');
      expect(result.data?.lastname).toBe('ใจดี');
      expect(result.data?.phone).toBe('081-234-5678');
      expect(result.data?.company).toBe('SCG');
    });

    it('should fallback to lowercase contact attributes', () => {
      const input = {
        event: 'click',
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
        phone: '0812345678',
        company: 'Test Corp',
        campaign_id: 123,
      };

      const result = validateBrevoWebhook(input);

      expect(result.data?.firstname).toBe('John');
      expect(result.data?.lastname).toBe('Doe');
    });

    it('should convert campaign_id to string', () => {
      const result = validateBrevoWebhook(mockBrevoClickPayload);

      expect(result.data?.campaignId).toBe('12345');
      expect(typeof result.data?.campaignId).toBe('string');
    });

    it('should handle missing optional fields', () => {
      const input = {
        event: 'click',
        email: 'test@example.com',
      };

      const result = validateBrevoWebhook(input);

      expect(result.success).toBe(true);
      expect(result.data?.firstname).toBe('');
      expect(result.data?.company).toBe('');
    });
  });

  describe('isClickEvent', () => {
    it('should return true for click event', () => {
      expect(isClickEvent('click')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isClickEvent('CLICK')).toBe(true);
      expect(isClickEvent('Click')).toBe(true);
    });

    it('should return false for non-click events', () => {
      expect(isClickEvent('opened')).toBe(false);
      expect(isClickEvent('delivered')).toBe(false);
    });
  });

  describe('isOpenEvent', () => {
    it('should return true for opened event', () => {
      expect(isOpenEvent('opened')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isOpenEvent('OPENED')).toBe(true);
      expect(isOpenEvent('Opened')).toBe(true);
    });

    it('should return false for non-open events', () => {
      expect(isOpenEvent('click')).toBe(false);
    });
  });

  describe('BREVO_EVENTS', () => {
    it('should have correct event constants', () => {
      expect(BREVO_EVENTS.CLICK).toBe('click');
      expect(BREVO_EVENTS.OPENED).toBe('opened');
      expect(BREVO_EVENTS.HARD_BOUNCE).toBe('hard_bounce');
      expect(BREVO_EVENTS.SPAM).toBe('spam');
    });
  });
});
