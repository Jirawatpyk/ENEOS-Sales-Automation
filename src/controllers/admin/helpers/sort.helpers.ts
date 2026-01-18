/**
 * Sort Helper Functions
 * Handles sorting logic for leads and other data
 */

import { LeadRow } from '../../../types/index.js';
import { safeGetTime } from './time.helpers.js';

/** Valid sort fields for leads */
export type LeadSortField = 'date' | 'createdAt' | 'company' | 'status' | 'salesOwnerName';

/** Sort direction */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort leads by specified field and order
 * @param leads - Array of leads to sort
 * @param sortBy - Field to sort by (defaults to 'date')
 * @param sortOrder - Sort direction (defaults to 'desc')
 * @returns New sorted array (does not mutate input)
 */
export function sortLeads(
  leads: LeadRow[],
  sortBy: string = 'date',
  sortOrder: string = 'desc'
): LeadRow[] {
  const order = sortOrder === 'asc' ? 'asc' : 'desc';

  return [...leads].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortBy) {
      case 'date':
      case 'createdAt': // createdAt is alias for date
        aValue = safeGetTime(a.date);
        bValue = safeGetTime(b.date);
        break;
      case 'company':
        aValue = a.company.toLowerCase();
        bValue = b.company.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'salesOwnerName':
        aValue = (a.salesOwnerName || '').toLowerCase();
        bValue = (b.salesOwnerName || '').toLowerCase();
        break;
      default:
        // Unknown field - fallback to date sort
        aValue = safeGetTime(a.date);
        bValue = safeGetTime(b.date);
    }

    if (order === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });
}

/**
 * Generic sort function for sales team by stats field
 */
export function sortByNumericField<T>(
  items: T[],
  getValue: (item: T) => number,
  sortOrder: SortOrder = 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const aValue = getValue(a);
    const bValue = getValue(b);
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });
}
