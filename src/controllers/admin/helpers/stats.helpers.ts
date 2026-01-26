/**
 * Statistics Helper Functions
 * Handles counting, aggregation, and comparison calculations
 */

import { StatusDistribution } from '../../../types/admin.types.js';
import { LeadRow } from '../../../types/index.js';

/**
 * นับจำนวน leads ตาม status (O(n) single pass)
 *
 * Note: "claimed" หมายถึง leads ที่มี salesOwnerId (ไม่ว่า status จะเป็นอะไร)
 * ตามเอกสาร: claimed = COUNT WHERE Sales_Owner_ID IS NOT NULL
 */
export function countByStatus(leads: LeadRow[]): StatusDistribution {
  return leads.reduce(
    (acc, lead) => {
      // นับตาม status ปกติ
      if (lead.status in acc) {
        acc[lead.status as keyof StatusDistribution]++;
      }

      // นับ claimed = leads ที่มี salesOwnerId (ไม่ว่า status จะเป็นอะไร)
      if (lead.salesOwnerId) {
        acc.claimed++;
      }

      return acc;
    },
    {
      new: 0,
      claimed: 0,
      contacted: 0,
      closed: 0,
      lost: 0,
      unreachable: 0,
    } as StatusDistribution
  );
}

/**
 * คำนวณ % เปลี่ยนแปลง
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * คำนวณ conversion rate
 */
export function calculateConversionRate(closed: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Number(((closed / total) * 100).toFixed(2));
}

/**
 * Aggregate sales stats from leads for a single salesperson
 */
export function aggregateSalesStats(leads: LeadRow[]): {
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
} {
  return {
    claimed: leads.length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    closed: leads.filter((l) => l.status === 'closed').length,
    lost: leads.filter((l) => l.status === 'lost').length,
    unreachable: leads.filter((l) => l.status === 'unreachable').length,
  };
}
