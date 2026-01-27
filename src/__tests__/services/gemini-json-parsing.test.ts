/**
 * Gemini JSON Parsing Tests
 * Tests for robust JSON parsing with various edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService } from '../../services/gemini.service.js';

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {
    gemini: {
      apiKey: 'test-api-key',
      model: 'gemini-1.5-flash',
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  geminiLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock retry utilities
vi.mock('../../utils/retry.js', () => ({
  withRetry: (fn: () => Promise<any>) => fn(),
  CircuitBreaker: vi.fn().mockImplementation(() => ({
    execute: (fn: () => Promise<any>) => fn(),
  })),
}));

describe('Gemini JSON Parsing Edge Cases', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService();
  });

  describe('parseResponse method', () => {
    it('should handle valid JSON with markdown code blocks', () => {
      const responseText = `\`\`\`json
{
  "industry": "Technology",
  "one_talking_point": "Tech company",
  "website": "https://example.com",
  "registered_capital_thb": 1000000,
  "keywords": ["B2B", "Tech"],
  "juristic_id": "0123456789012",
  "dbd_sector": "TECH",
  "province": "Bangkok",
  "full_address": "123 Street"
}
\`\`\``;

      // Access private method via any type (testing purposes only)
      const result = (service as any).parseResponse(responseText, 'example.com', 'Test Company');

      expect(result.industry).toBe('Technology');
      expect(result.website).toBe('https://example.com');
      expect(result.registeredCapital).toBe(1000000);
    });

    it('should handle JSON without code blocks', () => {
      const responseText = `{
  "industry": "Manufacturing",
  "one_talking_point": "Manufacturing company",
  "website": "https://mfg.com",
  "registered_capital_thb": 5000000,
  "keywords": ["Industrial"],
  "juristic_id": "9876543210987",
  "dbd_sector": "MFG",
  "province": "Chonburi",
  "full_address": "456 Factory Road"
}`;

      const result = (service as any).parseResponse(responseText, 'mfg.com', 'MFG Corp');

      expect(result.industry).toBe('Manufacturing');
      expect(result.registeredCapital).toBe(5000000);
    });

    it('should handle truncated JSON (incomplete response)', () => {
      const responseText = `\`\`\`json
{
  "industry": "Retail",
  "one_talking_point": "Retail business",
  "website": "https://retail.com`;
      // Intentionally truncated - missing closing braces and quote

      const result = (service as any).parseResponse(responseText, 'retail.com', 'Retail Co');

      // Should use defaults when parsing fails
      expect(result.industry).toBe('Unknown');
      expect(result.talkingPoint).toBe('ENEOS มีน้ำมันหล่อลื่นคุณภาพสูงจากญี่ปุ่น เหมาะกับทุกประเภทอุตสาหกรรม');
    });

    it('should handle JSON with extra text before/after', () => {
      const responseText = `Here is the analysis:
\`\`\`json
{
  "industry": "Construction",
  "one_talking_point": "Construction firm",
  "website": "https://construct.co.th",
  "registered_capital_thb": 10000000,
  "keywords": ["Construction"],
  "juristic_id": "1234567890123",
  "dbd_sector": "CONS",
  "province": "Bangkok",
  "full_address": "789 Building St"
}
\`\`\`
That's the result.`;

      const result = (service as any).parseResponse(responseText, 'construct.co.th', 'Build Co');

      expect(result.industry).toBe('Construction');
      expect(result.registeredCapital).toBe(10000000);
    });

    it('should handle malformed JSON with unterminated strings', () => {
      const responseText = `{
  "industry": "Agriculture",
  "one_talking_point": "Farming business
  "website": "https://farm.com",
  "registered_capital_thb": 3000000
}`;
      // Missing closing quote after "Farming business

      const result = (service as any).parseResponse(responseText, 'farm.com', 'Farm Inc');

      // Should either fix or use defaults
      expect(result).toBeDefined();
      expect(result.industry).toBeDefined();
    });

    it('should handle empty response', () => {
      const responseText = '';

      const result = (service as any).parseResponse(responseText, 'empty.com', 'Empty Co');

      // Should return defaults
      expect(result.industry).toBe('Unknown');
      expect(result.confidence).toBe(0);
    });

    it('should handle non-JSON text response', () => {
      const responseText = 'I cannot analyze this company as the domain is invalid.';

      const result = (service as any).parseResponse(responseText, 'invalid.xyz', 'Invalid');

      // Should return defaults
      expect(result.industry).toBe('Unknown');
      expect(result.confidence).toBe(0);
    });

    it('should normalize "Unknown" values to null', () => {
      const responseText = `{
  "industry": "Technology",
  "one_talking_point": "Tech firm",
  "website": "Unknown",
  "registered_capital_thb": null,
  "keywords": ["B2B"],
  "juristic_id": "unknown",
  "dbd_sector": "TECH",
  "province": "ไม่ระบุ",
  "full_address": "Unknown"
}`;

      const result = (service as any).parseResponse(responseText, 'tech.com', 'Tech Co');

      expect(result.industry).toBe('Technology');
      expect(result.website).toBeNull();
      expect(result.juristicId).toBeNull();
      expect(result.province).toBeNull();
      expect(result.fullAddress).toBeNull();
    });

    it('should handle missing closing braces', () => {
      const responseText = `{
  "industry": "Energy",
  "one_talking_point": "Energy company",
  "website": "https://energy.com",
  "registered_capital_thb": 50000000,
  "keywords": ["Energy"]`;
      // Missing closing brace

      const result = (service as any).parseResponse(responseText, 'energy.com', 'Energy Corp');

      // Should auto-complete or use defaults
      expect(result).toBeDefined();
    });

    it('should extract JSON from middle of text', () => {
      const responseText = `Analysis complete. Here's the data:

{
  "industry": "Hospitality",
  "one_talking_point": "Hotel business",
  "website": "https://hotel.com",
  "registered_capital_thb": 25000000,
  "keywords": ["Hotel"],
  "juristic_id": "5555555555555",
  "dbd_sector": "HOSP",
  "province": "Phuket",
  "full_address": "Beach Road 99"
}

End of analysis.`;

      const result = (service as any).parseResponse(responseText, 'hotel.com', 'Hotel Group');

      expect(result.industry).toBe('Hospitality');
      expect(result.province).toBe('Phuket');
    });
  });

  describe('DBD Sector validation', () => {
    it('should accept valid exact sector codes', () => {
      const responseText = `{
  "industry": "Manufacturing",
  "one_talking_point": "MFG company",
  "dbd_sector": "MFG-CM"
}`;

      const result = (service as any).parseResponse(responseText);

      expect(result.dbdSector).toBe('MFG-CM');
    });

    it('should accept valid sector codes with prefix', () => {
      const responseText = `{
  "industry": "Food & Beverage",
  "one_talking_point": "F&B company",
  "dbd_sector": "F&B-M"
}`;

      const result = (service as any).parseResponse(responseText);

      expect(result.dbdSector).toBe('F&B-M');
    });

    it('should reject invalid sector codes and generate from industry', () => {
      const responseText = `{
  "industry": "Transportation & Logistics",
  "one_talking_point": "Transport company",
  "dbd_sector": "INVALID-CODE"
}`;

      const result = (service as any).parseResponse(responseText);

      // Should generate valid code from industry
      expect(result.dbdSector).not.toBe('INVALID-CODE');
      expect(result.dbdSector).toMatch(/^[A-Z]+$/);
    });
  });
});
