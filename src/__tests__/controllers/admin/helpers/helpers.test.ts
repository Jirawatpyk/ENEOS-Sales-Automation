/**
 * Unit Tests for Admin Controller Helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadRow } from '../../../../types/index.js';

// Mock leads service (filter.helpers now uses leadsService instead of sheetsService)
vi.mock('../../../../services/leads.service.js', () => ({
  getAllLeads: vi.fn(),
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
  calculateConversionRate,
  aggregateSalesStats,
  getMinutesBetween,
  getWeekNumber,
  safeGetTime,
  calculateAverage,
  getActivityTimestamp,
  sortLeads,
  sortByNumericField,
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

    it('should parse "lastWeek" period', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));

      const result = parsePeriod('lastWeek');
      expect(result.type).toBe('lastWeek');

      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      // Mon 00:00 to Sun 23:59:59 ≈ 7 days
      const durationDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      expect(durationDays).toBe(7);

      // start should be a Monday (getDay() = 1)
      expect(start.getDay()).toBe(1);

      vi.useRealTimers();
    });

    it('should parse "lastMonth" period', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

      const result = parsePeriod('lastMonth');
      expect(result.type).toBe('lastMonth');

      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      // Last month: Jan 1 - Jan 31 (local time)
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      // End should be last day of January
      expect(end.getDate()).toBe(31);

      vi.useRealTimers();
    });
  });

  describe('getPreviousPeriod', () => {
    it('should return yesterday for today period', () => {
      const today = parsePeriod('today');
      const previous = getPreviousPeriod(today);
      expect(previous.type).toBe('today');

      const todayStart = new Date(today.startDate);
      const prevStart = new Date(previous.startDate);
      // Use ms difference instead of getDate() which breaks at month boundaries
      const diffMs = todayStart.getTime() - prevStart.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(1);
    });

    it('should return last month for month period', () => {
      const month = parsePeriod('month');
      const previous = getPreviousPeriod(month);
      expect(previous.type).toBe('month');
    });

    it('should return two months ago for lastMonth period', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

      const lastMonth = parsePeriod('lastMonth');
      const previous = getPreviousPeriod(lastMonth);
      expect(previous.type).toBe('lastMonth');

      const prevStart = new Date(previous.startDate);
      // Previous of lastMonth (Jan) = December
      expect(prevStart.getMonth()).toBe(11); // December (local)

      vi.useRealTimers();
    });

    it('should return two weeks ago for lastWeek period', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));

      const lastWeek = parsePeriod('lastWeek');
      const previous = getPreviousPeriod(lastWeek);
      expect(previous.type).toBe('lastWeek');

      const prevStart = new Date(previous.startDate);
      const lastWeekStart = new Date(lastWeek.startDate);
      const diffMs = lastWeekStart.getTime() - prevStart.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(7);

      vi.useRealTimers();
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
      expect(result.claimed).toBe(0); // ไม่มี lead ไหนมี salesOwnerId
      expect(result.lost).toBe(0);
      expect(result.unreachable).toBe(0);
    });

    it('should count claimed as leads with salesOwnerId (regardless of status)', () => {
      const leads = [
        createMockLead({ status: 'new', salesOwnerId: null }), // unclaimed
        createMockLead({ status: 'new', salesOwnerId: 'U123' }), // claimed
        createMockLead({ status: 'contacted', salesOwnerId: 'U456' }), // claimed + contacted
        createMockLead({ status: 'closed', salesOwnerId: 'U789' }), // claimed + closed
        createMockLead({ status: 'lost', salesOwnerId: 'U999' }), // claimed + lost
      ];

      const result = countByStatus(leads);
      // นับ status
      expect(result.new).toBe(2);
      expect(result.contacted).toBe(1);
      expect(result.closed).toBe(1);
      expect(result.lost).toBe(1);
      // นับ claimed = leads ที่มี salesOwnerId (4 leads)
      expect(result.claimed).toBe(4);
    });

    it('should return zeros for empty array', () => {
      const result = countByStatus([]);
      expect(result.new).toBe(0);
      expect(result.contacted).toBe(0);
      expect(result.claimed).toBe(0);
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

  describe('calculateConversionRate', () => {
    it('should calculate conversion rate correctly', () => {
      expect(calculateConversionRate(25, 100)).toBe(25);
      expect(calculateConversionRate(1, 3)).toBeCloseTo(33.33, 2);
    });

    it('should return 0 when total is 0', () => {
      expect(calculateConversionRate(0, 0)).toBe(0);
      expect(calculateConversionRate(5, 0)).toBe(0);
    });

    it('should return 100 when all closed', () => {
      expect(calculateConversionRate(10, 10)).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateConversionRate(1, 7)).toBeCloseTo(14.29, 2);
    });
  });

  describe('aggregateSalesStats', () => {
    it('should count all status types correctly', () => {
      const leads = [
        createMockLead({ status: 'contacted' }),
        createMockLead({ status: 'contacted' }),
        createMockLead({ status: 'closed' }),
        createMockLead({ status: 'lost' }),
        createMockLead({ status: 'unreachable' }),
      ];

      const result = aggregateSalesStats(leads);
      expect(result.claimed).toBe(5); // Total number of leads
      expect(result.contacted).toBe(2);
      expect(result.closed).toBe(1);
      expect(result.lost).toBe(1);
      expect(result.unreachable).toBe(1);
    });

    it('should return zeros for empty array', () => {
      const result = aggregateSalesStats([]);
      expect(result.claimed).toBe(0);
      expect(result.contacted).toBe(0);
      expect(result.closed).toBe(0);
      expect(result.lost).toBe(0);
      expect(result.unreachable).toBe(0);
    });

    it('should handle leads with only new status', () => {
      const leads = [
        createMockLead({ status: 'new' }),
        createMockLead({ status: 'new' }),
      ];

      const result = aggregateSalesStats(leads);
      expect(result.claimed).toBe(2); // Total claimed
      expect(result.contacted).toBe(0);
      expect(result.closed).toBe(0);
    });

    it('should handle single lead', () => {
      const leads = [createMockLead({ status: 'closed' })];

      const result = aggregateSalesStats(leads);
      expect(result.claimed).toBe(1);
      expect(result.closed).toBe(1);
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

    it('should sort by status', () => {
      const leadsWithStatus = [
        createMockLead({ status: 'new' }),
        createMockLead({ status: 'closed' }),
        createMockLead({ status: 'contacted' }),
      ];
      const result = sortLeads(leadsWithStatus, 'status', 'asc');
      expect(result[0].status).toBe('closed');
      expect(result[1].status).toBe('contacted');
      expect(result[2].status).toBe('new');
    });

    it('should sort by status descending', () => {
      const leadsWithStatus = [
        createMockLead({ status: 'closed' }),
        createMockLead({ status: 'new' }),
        createMockLead({ status: 'contacted' }),
      ];
      const result = sortLeads(leadsWithStatus, 'status', 'desc');
      expect(result[0].status).toBe('new');
      expect(result[2].status).toBe('closed');
    });

    it('should sort by salesOwnerName', () => {
      const leadsWithOwners = [
        createMockLead({ salesOwnerName: 'Charlie' }),
        createMockLead({ salesOwnerName: 'Alice' }),
        createMockLead({ salesOwnerName: 'Bob' }),
      ];
      const result = sortLeads(leadsWithOwners, 'salesOwnerName', 'asc');
      expect(result[0].salesOwnerName).toBe('Alice');
      expect(result[1].salesOwnerName).toBe('Bob');
      expect(result[2].salesOwnerName).toBe('Charlie');
    });

    it('should sort by salesOwnerName with null values', () => {
      const leadsWithNullOwners = [
        createMockLead({ salesOwnerName: 'Bob' }),
        createMockLead({ salesOwnerName: null }),
        createMockLead({ salesOwnerName: 'Alice' }),
      ];
      const result = sortLeads(leadsWithNullOwners, 'salesOwnerName', 'asc');
      // null converts to empty string, so it comes first in asc
      expect(result[0].salesOwnerName).toBeNull();
      expect(result[1].salesOwnerName).toBe('Alice');
      expect(result[2].salesOwnerName).toBe('Bob');
    });

    it('should sort by createdAt as alias for date', () => {
      const result = sortLeads(leads, 'createdAt', 'asc');
      expect(result[0].date).toBe('2026-01-05');
      expect(result[2].date).toBe('2026-01-15');
    });
  });

  describe('sortByNumericField', () => {
    interface SalesStats {
      name: string;
      totalLeads: number;
      closedLeads: number;
    }

    const salesData: SalesStats[] = [
      { name: 'Alice', totalLeads: 10, closedLeads: 5 },
      { name: 'Bob', totalLeads: 20, closedLeads: 8 },
      { name: 'Charlie', totalLeads: 15, closedLeads: 12 },
    ];

    it('should sort by numeric field descending (default)', () => {
      const result = sortByNumericField(salesData, (s) => s.totalLeads);
      expect(result[0].name).toBe('Bob');
      expect(result[1].name).toBe('Charlie');
      expect(result[2].name).toBe('Alice');
    });

    it('should sort by numeric field ascending', () => {
      const result = sortByNumericField(salesData, (s) => s.totalLeads, 'asc');
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Charlie');
      expect(result[2].name).toBe('Bob');
    });

    it('should sort by different field', () => {
      const result = sortByNumericField(salesData, (s) => s.closedLeads, 'desc');
      expect(result[0].name).toBe('Charlie');
      expect(result[0].closedLeads).toBe(12);
    });

    it('should not mutate original array', () => {
      const original = [...salesData];
      sortByNumericField(salesData, (s) => s.totalLeads);
      expect(salesData).toEqual(original);
    });

    it('should handle empty array', () => {
      const result = sortByNumericField([], (s: SalesStats) => s.totalLeads);
      expect(result).toEqual([]);
    });

    it('should handle single item array', () => {
      const single = [{ name: 'Solo', totalLeads: 5, closedLeads: 2 }];
      const result = sortByNumericField(single, (s) => s.totalLeads);
      expect(result).toEqual(single);
    });
  });
});
