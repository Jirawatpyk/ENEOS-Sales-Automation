/**
 * UUID Utility Tests
 * Test UUID generation and validation for lead identification
 */

import { describe, it, expect } from 'vitest';
import { generateLeadUUID, isValidLeadUUID, extractUUID } from '../../utils/uuid.js';

describe('UUID Utility', () => {
  describe('generateLeadUUID', () => {
    it('should generate a unique lead UUID with lead_ prefix', () => {
      const uuid = generateLeadUUID();
      expect(uuid).toMatch(/^lead_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs on each call', () => {
      const uuid1 = generateLeadUUID();
      const uuid2 = generateLeadUUID();
      const uuid3 = generateLeadUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it('should generate UUIDs of consistent length', () => {
      const uuid = generateLeadUUID();
      // lead_ (5) + uuid (36) = 41 characters
      expect(uuid.length).toBe(41);
    });
  });

  describe('isValidLeadUUID', () => {
    it('should return true for valid lead UUID format', () => {
      expect(isValidLeadUUID('lead_550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidLeadUUID('lead_a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    });

    it('should return false for UUID without lead_ prefix', () => {
      expect(isValidLeadUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });

    it('should return false for invalid UUID format', () => {
      expect(isValidLeadUUID('lead_invalid')).toBe(false);
      expect(isValidLeadUUID('lead_')).toBe(false);
      expect(isValidLeadUUID('')).toBe(false);
      expect(isValidLeadUUID('lead_550e8400-e29b-41d4-a716')).toBe(false);
    });

    it('should return false for wrong prefix', () => {
      expect(isValidLeadUUID('user_550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });

    it('should handle generated UUIDs correctly', () => {
      const uuid = generateLeadUUID();
      expect(isValidLeadUUID(uuid)).toBe(true);
    });
  });

  describe('extractUUID', () => {
    it('should extract raw UUID from valid lead UUID', () => {
      const result = extractUUID('lead_550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return null for invalid lead UUID', () => {
      expect(extractUUID('invalid')).toBeNull();
      expect(extractUUID('')).toBeNull();
      expect(extractUUID('lead_invalid')).toBeNull();
    });

    it('should work with generated UUIDs', () => {
      const leadUUID = generateLeadUUID();
      const rawUUID = extractUUID(leadUUID);

      expect(rawUUID).not.toBeNull();
      expect(rawUUID!.length).toBe(36);
      expect(leadUUID).toBe(`lead_${rawUUID}`);
    });
  });
});
