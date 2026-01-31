/**
 * Period Helper Functions
 * Handles period parsing and comparison calculations
 */

import { PeriodInfo } from '../../../types/admin.types.js';

/** Milliseconds in one week */
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * แปลง period parameter เป็น PeriodInfo
 */
export function parsePeriod(
  period: string = 'month',
  startDate?: string,
  endDate?: string
): PeriodInfo {
  const now = new Date();
  let start: Date;
  let end: Date = now;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;

    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      break;

    case 'week': {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      break;
    }

    case 'lastWeek': {
      const dow = now.getDay();
      const diffMon = dow === 0 ? 6 : dow - 1;
      // This Monday minus 7 days = last Monday
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffMon - 7);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffMon - 1, 23, 59, 59, 999);
      break;
    }

    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // Last day of previous month
      break;

    case 'quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      break;
    }

    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;

    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate required for custom period');
      }
      start = new Date(startDate);
      end = new Date(endDate);
      break;

    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      period = 'month';
  }

  return {
    type: period as PeriodInfo['type'],
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/**
 * คำนวณ period ก่อนหน้าสำหรับการเปรียบเทียบ
 * - today → yesterday
 * - week → last week (same 7 days, shifted back)
 * - month → last month
 * - quarter → last quarter
 * - year → last year
 * - custom → same duration before start date
 *
 * Note: Uses local time methods consistent with parsePeriod()
 * Both functions must use the same timezone approach for correct comparison
 */
export function getPreviousPeriod(currentPeriod: PeriodInfo): PeriodInfo {
  const start = new Date(currentPeriod.startDate);
  const end = new Date(currentPeriod.endDate);

  let prevStart: Date;
  let prevEnd: Date;

  switch (currentPeriod.type) {
    case 'today':
      // Yesterday (use local time consistent with parsePeriod)
      prevStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 23, 59, 59, 999);
      break;

    case 'yesterday':
      // Day before yesterday
      prevStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 23, 59, 59, 999);
      break;

    case 'week': {
      // Last week (7 days before)
      prevStart = new Date(start.getTime() - MS_PER_WEEK);
      prevEnd = new Date(end.getTime() - MS_PER_WEEK);
      break;
    }

    case 'lastWeek': {
      // Two weeks ago (7 days before last week)
      prevStart = new Date(start.getTime() - MS_PER_WEEK);
      prevEnd = new Date(end.getTime() - MS_PER_WEEK);
      break;
    }

    case 'month': {
      // Last month (use local time consistent with parsePeriod)
      prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999); // Last day of previous month
      break;
    }

    case 'lastMonth': {
      // Two months ago
      prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
      break;
    }

    case 'quarter': {
      // Last quarter (3 months before, use local time)
      prevStart = new Date(start.getFullYear(), start.getMonth() - 3, 1);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
      break;
    }

    case 'year': {
      // Last year (use local time)
      prevStart = new Date(start.getFullYear() - 1, 0, 1);
      prevEnd = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    }

    case 'custom':
    default: {
      // Same duration before start date
      const durationMs = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1); // 1ms before current start
      prevStart = new Date(prevEnd.getTime() - durationMs);
      break;
    }
  }

  return {
    type: currentPeriod.type,
    startDate: prevStart.toISOString(),
    endDate: prevEnd.toISOString(),
  };
}
