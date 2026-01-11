/**
 * Phone Formatter Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  formatPhone,
  isValidThaiPhone,
  formatPhoneDisplay,
  createTelUri,
} from '../../utils/phone-formatter.js';

describe('Phone Formatter Utility', () => {
  describe('formatPhone', () => {
    it('should remove spaces from phone number', () => {
      expect(formatPhone('081 234 5678')).toBe('0812345678');
    });

    it('should remove dashes from phone number', () => {
      expect(formatPhone('081-234-5678')).toBe('0812345678');
    });

    it('should convert +66 to 0', () => {
      expect(formatPhone('+66812345678')).toBe('0812345678');
    });

    it('should convert 66 to 0 without plus sign', () => {
      expect(formatPhone('66812345678')).toBe('0812345678');
    });

    it('should handle combination of spaces, dashes and country code', () => {
      expect(formatPhone('+66 81-234-5678')).toBe('0812345678');
    });

    it('should return empty string for null input', () => {
      expect(formatPhone(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(formatPhone(undefined)).toBe('');
    });

    it('should return empty string for empty string input', () => {
      expect(formatPhone('')).toBe('');
    });
  });

  describe('isValidThaiPhone', () => {
    it('should validate 10-digit mobile number starting with 08', () => {
      expect(isValidThaiPhone('0812345678')).toBe(true);
    });

    it('should validate 10-digit mobile number starting with 09', () => {
      expect(isValidThaiPhone('0912345678')).toBe(true);
    });

    it('should validate 9-digit landline number starting with 02', () => {
      expect(isValidThaiPhone('021234567')).toBe(true);
    });

    it('should validate formatted phone numbers', () => {
      expect(isValidThaiPhone('081-234-5678')).toBe(true);
    });

    it('should reject phone numbers not starting with 0', () => {
      expect(isValidThaiPhone('812345678')).toBe(false);
    });

    it('should reject phone numbers with wrong length', () => {
      expect(isValidThaiPhone('08123456')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidThaiPhone('')).toBe(false);
    });
  });

  describe('formatPhoneDisplay', () => {
    it('should format 10-digit mobile number with dashes', () => {
      expect(formatPhoneDisplay('0812345678')).toBe('081-234-5678');
    });

    it('should format 9-digit landline number with dashes', () => {
      expect(formatPhoneDisplay('021234567')).toBe('02-123-4567');
    });

    it('should handle already formatted numbers', () => {
      expect(formatPhoneDisplay('081-234-5678')).toBe('081-234-5678');
    });

    it('should return unformatted for unusual lengths', () => {
      expect(formatPhoneDisplay('12345')).toBe('12345');
    });
  });

  describe('createTelUri', () => {
    it('should create tel: URI from formatted phone', () => {
      expect(createTelUri('081-234-5678')).toBe('tel:0812345678');
    });

    it('should create tel: URI from raw phone', () => {
      expect(createTelUri('0812345678')).toBe('tel:0812345678');
    });

    it('should handle +66 format', () => {
      expect(createTelUri('+66812345678')).toBe('tel:0812345678');
    });
  });
});
