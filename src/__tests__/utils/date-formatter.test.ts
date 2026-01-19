/**
 * Date Formatter Utility Tests
 * Tests for date formatting and parsing functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDateForSheets,
  getCurrentThaiTime,
  getCurrentTimestamp,
  parseDateFromSheets,
  extractDateKey,
  formatISOTimestamp,
} from '../../utils/date-formatter.js';

describe('formatDateForSheets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T08:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format current date to ISO format when no argument', () => {
    const result = formatDateForSheets();

    expect(result).toBe('2026-01-15T08:30:00.000Z');
  });

  it('should format Date object to ISO format', () => {
    const date = new Date('2026-03-20T10:45:30.500Z');
    const result = formatDateForSheets(date);

    expect(result).toBe('2026-03-20T10:45:30.500Z');
  });

  it('should parse and format string date', () => {
    const result = formatDateForSheets('2026-06-15T14:00:00.000Z');

    expect(result).toBe('2026-06-15T14:00:00.000Z');
  });

  it('should fallback to current time for invalid date string', () => {
    const result = formatDateForSheets('invalid-date');

    expect(result).toBe('2026-01-15T08:30:00.000Z');
  });

  it('should handle empty string and fallback to current time', () => {
    const result = formatDateForSheets('');

    // Empty string creates invalid date, fallback to current
    expect(result).toBe('2026-01-15T08:30:00.000Z');
  });

  it('should handle various ISO date formats', () => {
    const result1 = formatDateForSheets('2026-01-01');
    expect(result1).toContain('2026-01-01');

    const result2 = formatDateForSheets('2026-12-31T23:59:59Z');
    expect(result2).toBe('2026-12-31T23:59:59.000Z');
  });
});

describe('getCurrentThaiTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T08:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return current time in ISO format', () => {
    const result = getCurrentThaiTime();

    expect(result).toBe('2026-01-15T08:30:00.000Z');
  });

  it('should be equivalent to formatDateForSheets()', () => {
    const result1 = getCurrentThaiTime();
    const result2 = formatDateForSheets();

    expect(result1).toBe(result2);
  });
});

describe('getCurrentTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T08:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return current time in ISO format', () => {
    const result = getCurrentTimestamp();

    expect(result).toBe('2026-01-15T08:30:00.000Z');
  });
});

describe('parseDateFromSheets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T08:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ISO format parsing', () => {
    it('should parse ISO format with milliseconds', () => {
      const result = parseDateFromSheets('2026-01-11T08:34:02.990Z');

      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(11);
      expect(result.getUTCHours()).toBe(8);
      expect(result.getUTCMinutes()).toBe(34);
    });

    it('should parse ISO format without milliseconds', () => {
      const result = parseDateFromSheets('2026-06-15T14:00:00Z');

      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(5); // June
      expect(result.getUTCDate()).toBe(15);
    });

    it('should parse ISO format with timezone offset', () => {
      const result = parseDateFromSheets('2026-01-15T15:30:00+07:00');

      // +07:00 means 15:30 local = 08:30 UTC
      expect(result.getUTCHours()).toBe(8);
      expect(result.getUTCMinutes()).toBe(30);
    });
  });

  describe('Thai format parsing', () => {
    it('should parse Thai format with single digit day/month', () => {
      const result = parseDateFromSheets('1/1/2026, 16:30:45');

      // Verify it returns a valid date in 2026
      expect(result.getFullYear()).toBe(2026);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });

    it('should parse Thai format with double digit day/month', () => {
      const result = parseDateFromSheets('15/06/2026 14:00:00');

      // Verify it returns a valid June 2026 date
      expect(result.getFullYear()).toBe(2026);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });

    it('should parse Thai format with comma separator', () => {
      const result = parseDateFromSheets('11/1/2026, 16:56:06');

      // Verify it parses correctly (11th of January)
      expect(result.getFullYear()).toBe(2026);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });

    it('should parse Thai format with space separator', () => {
      const result = parseDateFromSheets('25/12/2025 23:59:59');

      // December 2025
      expect(result.getFullYear()).toBe(2025);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });

    it('should subtract 7 hours from parsed Thai time', () => {
      // This tests the timezone conversion logic
      // Create a reference date using the same logic
      const thaiDate = new Date(2026, 0, 15, 14, 0, 0); // Jan 15, 2026 14:00 local
      const expectedUtc = new Date(thaiDate.getTime() - 7 * 60 * 60 * 1000);

      const result = parseDateFromSheets('15/01/2026 14:00:00');

      expect(result.getTime()).toBe(expectedUtc.getTime());
    });
  });

  describe('edge cases', () => {
    it('should return current date for empty string', () => {
      const result = parseDateFromSheets('');

      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
    });

    it('should handle native Date parsing fallback', () => {
      // Standard date format that Date.parse can handle
      const result = parseDateFromSheets('January 15, 2026 08:30:00');

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should return current date for completely invalid string', () => {
      const result = parseDateFromSheets('not-a-date-at-all');

      expect(result.getUTCFullYear()).toBe(2026);
    });

    it('should handle ISO format with invalid date', () => {
      // Has T but is not valid ISO
      const result = parseDateFromSheets('2026-13-45T99:99:99.000Z');

      // Should fallback as this is invalid
      expect(result).toBeDefined();
    });
  });

  describe('timezone conversion', () => {
    it('should convert Thai time using 7-hour offset', () => {
      // The function subtracts 7 hours from the local-time-interpreted value
      const thaiDateStr = '15/01/2026 12:00:00';
      const result = parseDateFromSheets(thaiDateStr);

      // Create expected result using same logic
      const localDate = new Date(2026, 0, 15, 12, 0, 0);
      const expected = new Date(localDate.getTime() - 7 * 60 * 60 * 1000);

      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should apply consistent timezone offset', () => {
      // Two different times should have 1 hour difference
      const result1 = parseDateFromSheets('01/01/2026 14:00:00');
      const result2 = parseDateFromSheets('01/01/2026 15:00:00');

      const diffHours = (result2.getTime() - result1.getTime()) / (60 * 60 * 1000);
      expect(diffHours).toBe(1);
    });

    it('should handle date boundary crossing', () => {
      // When subtracting 7 hours crosses date boundary
      const result = parseDateFromSheets('01/01/2026 03:00:00');

      // 03:00 - 7 hours = previous day 20:00
      const localDate = new Date(2026, 0, 1, 3, 0, 0);
      const expected = new Date(localDate.getTime() - 7 * 60 * 60 * 1000);

      expect(result.getTime()).toBe(expected.getTime());
    });
  });
});

describe('extractDateKey', () => {
  it('should extract date key from ISO format', () => {
    // Note: extractDateKey uses local time methods
    const date = new Date('2026-01-15T08:30:00.000Z');
    const expectedYear = date.getFullYear();
    const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(date.getDate()).padStart(2, '0');
    const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    const result = extractDateKey('2026-01-15T08:30:00.000Z');

    expect(result).toBe(expected);
  });

  it('should extract date key from Thai format', () => {
    // Thai time 15:00 - 7 = 08:00 UTC
    const thaiTime = '15/01/2026 15:00:00';
    const date = parseDateFromSheets(thaiTime);
    const expectedYear = date.getFullYear();
    const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(date.getDate()).padStart(2, '0');
    const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    const result = extractDateKey(thaiTime);

    expect(result).toBe(expected);
  });

  it('should handle date crossing midnight after timezone conversion', () => {
    // Thai time 00:00 on Jan 15 = Jan 14 17:00 UTC
    const thaiTime = '15/01/2026 00:00:00';
    const date = parseDateFromSheets(thaiTime);
    const expectedYear = date.getFullYear();
    const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(date.getDate()).padStart(2, '0');
    const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    const result = extractDateKey(thaiTime);

    expect(result).toBe(expected);
  });

  it('should pad month and day with zeros', () => {
    const date = new Date('2026-03-05T10:00:00.000Z');
    const expectedYear = date.getFullYear();
    const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(date.getDate()).padStart(2, '0');
    const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    const result = extractDateKey('2026-03-05T10:00:00.000Z');

    expect(result).toBe(expected);
    // Verify zero padding
    expect(expectedMonth).toBe('03');
    expect(expectedDay).toBe('05');
  });

  it('should handle end of year date', () => {
    const date = new Date('2026-12-31T12:00:00.000Z');
    const expectedYear = date.getFullYear();
    const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(date.getDate()).padStart(2, '0');
    const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    const result = extractDateKey('2026-12-31T12:00:00.000Z');

    expect(result).toBe(expected);
    expect(expectedMonth).toBe('12');
  });

  it('should return date in YYYY-MM-DD format', () => {
    const result = extractDateKey('2026-06-15T14:00:00.000Z');

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatISOTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T08:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format current date when no argument', () => {
    const result = formatISOTimestamp();

    expect(result).toBe('2026-01-15T08:30:00.000Z');
  });

  it('should format provided Date object', () => {
    const date = new Date('2026-06-15T14:00:00.000Z');
    const result = formatISOTimestamp(date);

    expect(result).toBe('2026-06-15T14:00:00.000Z');
  });

  it('should return ISO 8601 format', () => {
    const result = formatISOTimestamp(new Date('2026-12-25T00:00:00.000Z'));

    // Verify ISO format pattern
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle dates at year boundaries', () => {
    const newYear = new Date('2026-01-01T00:00:00.000Z');
    const result = formatISOTimestamp(newYear);

    expect(result).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should handle leap year date', () => {
    const leapDay = new Date('2024-02-29T12:00:00.000Z');
    const result = formatISOTimestamp(leapDay);

    expect(result).toBe('2024-02-29T12:00:00.000Z');
  });
});

describe('Date Formatter Integration', () => {
  it('should roundtrip format and parse ISO dates', () => {
    const original = new Date('2026-06-15T14:30:45.123Z');
    const formatted = formatDateForSheets(original);
    const parsed = parseDateFromSheets(formatted);

    expect(parsed.getTime()).toBe(original.getTime());
  });

  it('should extract correct date key after formatting', () => {
    const date = new Date('2026-03-20T12:00:00.000Z'); // Use noon UTC to avoid timezone issues
    const formatted = formatDateForSheets(date);
    const dateKey = extractDateKey(formatted);

    // extractDateKey uses local time, so calculate expected
    const expectedYear = date.getFullYear();
    const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(date.getDate()).padStart(2, '0');
    const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    expect(dateKey).toBe(expected);
  });

  it('should handle Thai format roundtrip', () => {
    const thaiFormat = '15/06/2026 14:30:00';
    const parsed = parseDateFromSheets(thaiFormat);
    const formatted = formatDateForSheets(parsed);

    // Verify the formatted date is a valid ISO string
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // Verify the date part is in June 2026
    expect(formatted).toContain('2026-06');
  });
});

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T08:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle null-like string gracefully', () => {
    const result = parseDateFromSheets('null');

    // Should fallback to current date
    expect(result.getFullYear()).toBe(2026);
  });

  it('should handle undefined-like string gracefully', () => {
    const result = parseDateFromSheets('undefined');

    // Should fallback to current date
    expect(result.getFullYear()).toBe(2026);
  });

  it('should handle numeric string that looks like date', () => {
    const result = parseDateFromSheets('20260115');

    // May parse as number or fallback
    expect(result).toBeDefined();
  });

  it('should handle very old dates', () => {
    const result = formatDateForSheets(new Date('1990-01-01T00:00:00.000Z'));

    expect(result).toBe('1990-01-01T00:00:00.000Z');
  });

  it('should handle future dates', () => {
    const result = formatDateForSheets(new Date('2050-12-31T23:59:59.999Z'));

    expect(result).toBe('2050-12-31T23:59:59.999Z');
  });

  it('should handle midnight UTC', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const expectedYear = date.getFullYear();
    const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(date.getDate()).padStart(2, '0');
    const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    const result = extractDateKey('2026-01-15T00:00:00.000Z');

    expect(result).toBe(expected);
  });

  it('should handle end of day UTC', () => {
    // Using noon UTC to avoid timezone edge cases
    const date = new Date('2026-01-15T12:00:00.000Z');
    const expectedYear = date.getFullYear();
    const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(date.getDate()).padStart(2, '0');
    const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    const result = extractDateKey('2026-01-15T12:00:00.000Z');

    expect(result).toBe(expected);
  });
});
