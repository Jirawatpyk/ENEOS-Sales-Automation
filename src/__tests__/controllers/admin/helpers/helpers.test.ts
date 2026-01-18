/**
 * Unit Tests for Admin Controller Helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadRow } from '../../../../types/index.js';

// Mock sheets service before importing helpers
vi.mock('../../../../services/sheets.service.js', () => ({
  sheetsService: {
    getAllLeads: vi.fn(),
  },
}));

vi.mock('../../../../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import helpers after mocking
import {
  parsePeriod,
  getPreviousPeriod,
  filterByPeriod,
  filterByStatus,
  filterByOwner,
  filterByCampaign,
  filterBySearch,
  filterByLeadSource,
  countByStatus,
  calculateChange,
  getMinutesBetween,
  getWeekNumber,
  safeGetTime,
  calculateAverage,
  getActivityTimestamp,
  sortLeads,
} from '../../../../controllers/admin/helpers/index.js';

// Helper to create mock lead
function createMockLead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    rowNumber: 2,
    date: '2026-01-15T10:00:00.000Z',
    customerName: 'Test Customer',
    email: 'test@example.com',
    phone: '0812345678',
    company: 'Test Company',
    industryAI: 'Technology',
    website: 'https://test.com',
    capital: '10M',
    status: 'new',
    salesOwnerId: null,
    salesOwnerName: null,
    campaignId: 'camp_1',
    campaignName: 'Test Campaign',
    emailSubject: 'Test Subject',
    source: 'Brevo',
    leadId: 'lead_1',
    eventId: 'event_1',
    clickedAt: '2026-01-15T09:00:00.000Z',
    talkingPoint: 'Test talking point',
    closedAt: null,
    lostAt: null,
    unreachableAt: null,
    version: 1,
    leadSource: null,
    jobTitle: null,
    city: null,
    leadUUID: 'lead_uuid_1',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    contactedAt: null,
    ...overrides,
  };
}

describe('Admin Controller Helpers', () => {
  describe('parsePeriod', () => {
    it('should parse "today" period', () => {
      const result = parsePeriod('today');
      expect(result.type).toBe('today');
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
    });

    it('should parse "month" period by default', () => {
      const result = parsePeriod();
      expect(result.type).toBe('month');
    });

    it('should parse "custom" period with dates', () => {
      const result = parsePeriod('custom', '2026-01-01', '2026-01-31');
      expect(result.type).toBe('custom');
    });

    it('should throw error for custom without dates', () => {
      expect(() => parsePeriod('custom')).toThrow('startDate and endDate required');
    });

    it('should default to month for unknown period', () => {
      const result = parsePeriod('unknown');
      expect(result.type).toBe('month');
    });
  });

  describe('getPreviousPeriod', () => {
    it('should return yesterday for today period', () => {
      const today = parsePeriod('today');
      const previous = getPreviousPeriod(today);
      expect(previous.type).toBe('today');

      const todayStart = new Date(today.startDate);
      const prevStart = new Date(previous.startDate);
      expect(todayStart.getDate() - prevStart.getDate()).toBe(1);
    });

    it('should return last month for month period', () => {
      const month = parsePeriod('month');
      const previous = getPreviousPeriod(month);
      expect(previous.type).toBe('month');
    });
  });

  describe('filterByStatus', () => {
    const leads = [
      createMockLead({ status: 'new' }),
      createMockLead({ status: 'contacted' }),
      createMockLead({ status: 'closed' }),
    ];

    it('should filter by single status', () => {
      const result = filterByStatus(leads, 'new');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('new');
    });

    it('should filter by multiple comma-separated statuses', () => {
      const result = filterByStatus(leads, 'new,contacted');
      expect(result).toHaveLength(2);
    });

    it('should handle whitespace in status list', () => {
      const result = filterByStatus(leads, 'new , contacted');
      expect(result).toHaveLength(2);
    });
  });

  describe('filterByOwner', () => {
    const leads = [
      createMockLead({ salesOwnerId: 'owner_1' }),
      createMockLead({ salesOwnerId: 'owner_2' }),
      createMockLead({ salesOwnerId: null }),
    ];

    it('should filter by owner ID', () => {
      const result = filterByOwner(leads, 'owner_1');
      expect(result).toHaveLength(1);
    });

    it('should filter by unassigned', () => {
      const result = filterByOwner(leads, 'unassigned');
      expect(result).toHaveLength(1);
      expect(result[0].salesOwnerId).toBeNull();
    });

    it('should filter by multiple owners including unassigned', () => {
      const result = filterByOwner(leads, 'owner_1,unassigned');
      expect(result).toHaveLength(2);
    });
  });

  describe('filterByCampaign', () => {
    const leads = [
      createMockLead({ campaignId: 'camp_1' }),
      createMockLead({ campaignId: 'camp_2' }),
    ];

    it('should filter by campaign ID', () => {
      const result = filterByCampaign(leads, 'camp_1');
      expect(result).toHaveLength(1);
    });
  });

  describe('filterBySearch', () => {
    const leads = [
      createMockLead({ company: 'Acme Corp', customerName: 'John', email: 'john@acme.com' }),
      createMockLead({ company: 'Beta Inc', customerName: 'Jane', email: 'jane@beta.com' }),
    ];

    it('should search in company name', () => {
      const result = filterBySearch(leads, 'acme');
      expect(result).toHaveLength(1);
    });

    it('should search in customer name', () => {
      const result = filterBySearch(leads, 'jane');
      expect(result).toHaveLength(1);
    });

    it('should search in email', () => {
      const result = filterBySearch(leads, 'beta.com');
      expect(result).toHaveLength(1);
    });

    it('should be case insensitive', () => {
      const result = filterBySearch(leads, 'ACME');
      expect(result).toHaveLength(1);
    });
  });

  /**
   * Story 4-14: Filter by Lead Source
   * Tests for filterByLeadSource function
   */
  describe('filterByLeadSource', () => {
    const leads = [
      createMockLead({ leadSource: 'Email Campaign' }),
      createMockLead({ leadSource: 'Website' }),
      createMockLead({ leadSource: 'Referral' }),
      createMockLead({ leadSource: null }),
      createMockLead({ leadSource: '' }),
    ];

    it('should filter by exact lead source name', () => {
      const result = filterByLeadSource(leads, 'Website');
      expect(result).toHaveLength(1);
      expect(result[0].leadSource).toBe('Website');
    });

    it('should filter by lead source with spaces', () => {
      const result = filterByLeadSource(leads, 'Email Campaign');
      expect(result).toHaveLength(1);
      expect(result[0].leadSource).toBe('Email Campaign');
    });

    it('should return leads with null/empty leadSource when __unknown__ is passed', () => {
      const result = filterByLeadSource(leads, '__unknown__');
      expect(result).toHaveLength(2); // null and empty string
    });

    it('should return empty array when no leads match the source', () => {
      const result = filterByLeadSource(leads, 'NonExistentSource');
      expect(result).toHaveLength(0);
    });

    it('should be case sensitive', () => {
      const result = filterByLeadSource(leads, 'website');
      expect(result).toHaveLength(0);
    });
  });

  describe('countByStatus', () => {
    it('should count leads by status in single pass', () => {
      const leads = [
        createMockLead({ status: 'new' }),
        createMockLead({ status: 'new' }),
        createMockLead({ status: 'contacted' }),
        createMockLead({ status: 'closed' }),
      ];

      const result = countByStatus(leads);
      expect(result.new).toBe(2);
      expect(result.contacted).toBe(1);
      expect(result.closed).toBe(1);
      expect(result.claimed).toBe(0);
      expect(result.lost).toBe(0);
      expect(result.unreachable).toBe(0);
    });

    it('should return zeros for empty array', () => {
      const result = countByStatus([]);
      expect(result.new).toBe(0);
      expect(result.contacted).toBe(0);
    });
  });

  describe('calculateChange', () => {
    it('should calculate percentage change', () => {
      expect(calculateChange(150, 100)).toBe(50);
      expect(calculateChange(50, 100)).toBe(-50);
    });

    it('should return 100 when previous is 0 and current > 0', () => {
      expect(calculateChange(10, 0)).toBe(100);
    });

    it('should return 0 when both are 0', () => {
      expect(calculateChange(0, 0)).toBe(0);
    });
  });

  describe('getMinutesBetween', () => {
    it('should calculate minutes between two dates', () => {
      const start = '2026-01-15T10:00:00.000Z';
      const end = '2026-01-15T11:30:00.000Z';
      expect(getMinutesBetween(start, end)).toBe(90);
    });

    it('should return 0 for null start', () => {
      expect(getMinutesBetween(null, '2026-01-15T10:00:00.000Z')).toBe(0);
    });

    it('should return 0 for null end', () => {
      expect(getMinutesBetween('2026-01-15T10:00:00.000Z', null)).toBe(0);
    });
  });

  describe('getWeekNumber', () => {
    it('should return week number for date', () => {
      const date = new Date('2026-01-15');
      const weekNum = getWeekNumber(date);
      expect(weekNum).toBeGreaterThan(0);
      expect(weekNum).toBeLessThanOrEqual(53);
    });
  });

  describe('safeGetTime', () => {
    it('should return timestamp for valid date', () => {
      const result = safeGetTime('2026-01-15T10:00:00.000Z');
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 for invalid date', () => {
      expect(safeGetTime('invalid')).toBe(0);
    });
  });

  describe('calculateAverage', () => {
    it('should calculate average of numbers', () => {
      expect(calculateAverage([10, 20, 30])).toBe(20);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAverage([])).toBe(0);
    });
  });

  describe('getActivityTimestamp', () => {
    it('should return closedAt for closed status', () => {
      const lead = createMockLead({ status: 'closed', closedAt: '2026-01-20' });
      expect(getActivityTimestamp(lead)).toBe('2026-01-20');
    });

    it('should return contactedAt for claimed status', () => {
      const lead = createMockLead({ status: 'claimed', contactedAt: '2026-01-18' });
      expect(getActivityTimestamp(lead)).toBe('2026-01-18');
    });

    it('should return date for new status', () => {
      const lead = createMockLead({ status: 'new' });
      expect(getActivityTimestamp(lead)).toBe(lead.date);
    });

    it('should fallback to contactedAt then date for closed without closedAt', () => {
      const lead = createMockLead({ status: 'closed', closedAt: null, contactedAt: '2026-01-18' });
      expect(getActivityTimestamp(lead)).toBe('2026-01-18');
    });
  });

  describe('sortLeads', () => {
    const leads = [
      createMockLead({ date: '2026-01-10', company: 'Zebra' }),
      createMockLead({ date: '2026-01-15', company: 'Alpha' }),
      createMockLead({ date: '2026-01-05', company: 'Beta' }),
    ];

    it('should sort by date descending by default', () => {
      const result = sortLeads(leads);
      expect(result[0].date).toBe('2026-01-15');
      expect(result[2].date).toBe('2026-01-05');
    });

    it('should sort by date ascending', () => {
      const result = sortLeads(leads, 'date', 'asc');
      expect(result[0].date).toBe('2026-01-05');
    });

    it('should sort by company', () => {
      const result = sortLeads(leads, 'company', 'asc');
      expect(result[0].company).toBe('Alpha');
      expect(result[2].company).toBe('Zebra');
    });

    it('should not mutate original array', () => {
      const original = [...leads];
      sortLeads(leads, 'date', 'asc');
      expect(leads).toEqual(original);
    });

    it('should handle unknown sortBy field with fallback to date', () => {
      const result = sortLeads(leads, 'unknownField', 'desc');
      expect(result[0].date).toBe('2026-01-15');
    });
  });
});
