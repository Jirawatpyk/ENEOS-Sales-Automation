/**
 * Email Parser Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  normalizeEmail,
  isValidEmail,
  isFreeEmailProvider,
  guessCompanyFromEmail,
  createDedupKey,
} from '../../utils/email-parser.js';

describe('Email Parser Utility', () => {
  describe('extractDomain', () => {
    it('should extract domain from email', () => {
      expect(extractDomain('user@example.com')).toBe('example.com');
    });

    it('should convert domain to lowercase', () => {
      expect(extractDomain('User@EXAMPLE.COM')).toBe('example.com');
    });

    it('should handle subdomain emails', () => {
      expect(extractDomain('user@mail.example.com')).toBe('mail.example.com');
    });

    it('should return empty string for invalid email', () => {
      expect(extractDomain('invalid-email')).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(extractDomain('')).toBe('');
    });
  });

  describe('normalizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should handle mixed case and whitespace', () => {
      expect(normalizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email format', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('should validate email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should validate email with plus sign', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should reject email without TLD', () => {
      expect(isValidEmail('user@example')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isFreeEmailProvider', () => {
    it('should detect Gmail as free provider', () => {
      expect(isFreeEmailProvider('user@gmail.com')).toBe(true);
    });

    it('should detect Yahoo as free provider', () => {
      expect(isFreeEmailProvider('user@yahoo.com')).toBe(true);
    });

    it('should detect Hotmail as free provider', () => {
      expect(isFreeEmailProvider('user@hotmail.com')).toBe(true);
    });

    it('should not flag corporate email as free', () => {
      expect(isFreeEmailProvider('user@scg.com')).toBe(false);
    });

    it('should not flag custom domain as free', () => {
      expect(isFreeEmailProvider('user@mycompany.co.th')).toBe(false);
    });
  });

  describe('guessCompanyFromEmail', () => {
    it('should extract company name from domain', () => {
      expect(guessCompanyFromEmail('user@scg.com')).toBe('SCG');
    });

    it('should handle .co.th domain', () => {
      expect(guessCompanyFromEmail('user@eneos.co.th')).toBe('ENEOS');
    });

    it('should return empty string for invalid email', () => {
      expect(guessCompanyFromEmail('invalid')).toBe('');
    });
  });

  describe('createDedupKey', () => {
    it('should create composite key from email and campaign', () => {
      expect(createDedupKey('User@Example.com', '12345')).toBe('user@example.com_12345');
    });

    it('should normalize email in key', () => {
      expect(createDedupKey('  USER@EXAMPLE.COM  ', '12345')).toBe('user@example.com_12345');
    });
  });
});
