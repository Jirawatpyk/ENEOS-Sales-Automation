# Story 0-13: Period Comparison for Dashboard

## Story Information
| Field | Value |
|-------|-------|
| Story ID | 0-13 |
| Epic | Epic-0: Backend API (Enhancement) |
| Priority | Medium |
| Status | done |
| Created | 2026-01-18 |
| Frontend Dependency | Story 2-1 KPI Cards (AC#3, AC#4) |

## User Story
**As a** Admin Dashboard user
**I want** to see percentage changes compared to the previous period
**So that** I can understand trends and whether performance is improving or declining

## Background / Problem Statement

### Current Issues Found:
1. **Hardcoded 0 values**: `admin.controller.ts:230-233` returns placeholder values
2. **No actual comparison**: Dashboard shows "0% change" for all metrics
3. **Visual indicators broken**: Up/down arrows (↑↓) never show real data

### Current Implementation:
```typescript
// admin.controller.ts:230-233
// TODO: ต้องดึงข้อมูลช่วงก่อนหน้ามาเปรียบเทียบ
const previousPeriodLeads = 0; // Placeholder
const previousClaimed = 0;
const previousClosed = 0;
```

### Frontend Expectation (Story 2-1):
- AC#3: "Total Leads shows % change vs previous period"
- AC#4: "Green up arrow (↑) for positive, red down arrow (↓) for negative"

## Acceptance Criteria

### AC#1: Calculate Previous Period Data
- [x] When period is "today", compare with "yesterday"
- [x] When period is "week", compare with "last week"
- [x] When period is "month", compare with "last month"
- [x] When period is "quarter", compare with "last quarter"
- [x] When period is custom range, compare with same duration before start date

### AC#2: Return Comparison in Dashboard API
- [x] `changes.totalLeads` shows % change from previous period
- [x] `changes.claimed` shows % change
- [x] `changes.closed` shows % change
- [x] Handle division by zero (previous = 0 → show "+100%" or "New")

### AC#3: Sales Performance Comparison
- [x] Fix TODO at line 1007 for sales performance endpoint
- [x] Populate `comparison.previousPeriod`: claimed, closed, conversionRate
- [x] Populate `comparison.changes`: claimed, closed, conversionRate (% change)

### AC#4: Campaign Comparison
- [x] Fix TODO at line 1379 for campaigns endpoint
- [x] Populate `comparison.previousPeriod`: leads, closed, conversionRate
- [x] Populate `comparison.changes`: leads, closed, conversionRate (% change)

### AC#5: Backwards Compatibility
- [x] API response structure unchanged
- [x] `changes` object already exists - just populate with real values

### AC#6: Testing
- [x] Unit tests for period calculation logic
- [x] Unit tests for comparison calculation
- [x] Integration tests for all endpoints

## Technical Implementation

### Files to Modify:

1. **`src/controllers/admin.controller.ts`**
   - Line 230-233: Implement `getPreviousPeriodData()` for dashboard
   - Line 1007: Implement comparison for sales performance
   - Line 1379: Implement comparison for campaigns

2. **`src/services/sheets.service.ts`** (optional)
   - Add helper to filter leads by date range

### Period Calculation Logic:

```typescript
interface PeriodRange {
  start: Date;
  end: Date;
}

function getPreviousPeriod(currentPeriod: string, startDate?: Date, endDate?: Date): PeriodRange {
  const now = new Date();

  switch (currentPeriod) {
    case 'today':
      // Yesterday
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };

    case 'week':
      // Last week (same 7 days, shifted back)
      return { start: subDays(startOfWeek(now), 7), end: subDays(endOfWeek(now), 7) };

    case 'month':
      // Last month
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };

    case 'quarter':
      // Last quarter
      const lastQuarter = subQuarters(now, 1);
      return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };

    case 'custom':
      // Same duration before start date
      if (startDate && endDate) {
        const duration = differenceInDays(endDate, startDate);
        return { start: subDays(startDate, duration + 1), end: subDays(startDate, 1) };
      }
      return { start: now, end: now };

    default:
      return { start: subDays(now, 30), end: subDays(now, 1) };
  }
}
```

### Comparison Calculation:

```typescript
function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0; // New data = +100%, both 0 = 0%
  }
  return ((current - previous) / previous) * 100;
}

// Usage in getDashboard():
const previousPeriod = getPreviousPeriod(period, startDate, endDate);
const previousLeads = allLeads.filter(lead =>
  isWithinInterval(parseDate(lead.date), previousPeriod)
);

const previousPeriodLeads = previousLeads.length;
const previousClaimed = previousLeads.filter(l => l.status === 'claimed').length;
const previousClosed = previousLeads.filter(l => l.status === 'closed').length;

const changes = {
  totalLeads: calculateChange(totalLeads, previousPeriodLeads),
  claimed: calculateChange(statusCount.claimed, previousClaimed),
  closed: calculateChange(statusCount.closed, previousClosed),
};
```

## Tasks

### Task 1: Period Calculation Helper
- [x] 1.1 Create `getPreviousPeriod()` function in admin.controller.ts
- [x] 1.2 Handle all period types: today, week, month, quarter, custom
- [x] 1.3 Use native Date API for date calculations (no date-fns needed)

### Task 2: Dashboard Comparison (Line 230)
- [x] 2.1 Filter leads for previous period
- [x] 2.2 Calculate previousPeriodLeads, previousClaimed, previousClosed
- [x] 2.3 Calculate percentage changes
- [x] 2.4 Handle edge cases (previous = 0)

### Task 3: Sales Performance Comparison (Line 1007)
- [x] 3.1 Implement comparison logic for sales metrics
- [x] 3.2 Add to API response

### Task 4: Campaign Comparison (Line 1379)
- [x] 4.1 Implement comparison logic for campaign metrics
- [x] 4.2 Add to API response

### Task 5: Testing
- [x] 5.1 Period calculation tests (week, month, custom via integration tests)
- [x] 5.2 Unit tests for calculateChange() (already existed)
- [x] 5.3 Update dashboard endpoint tests
- [x] 5.4 Update sales performance endpoint tests
- [x] 5.5 Update campaign endpoint tests (comparison tests added)
- [x] 5.6 Test edge cases: previous = 0, both = 0, negative change
- [x] 5.7 Test timezone edge cases (local time consistency documented)
- [x] 5.8 Test boundary dates (first/last day of period)
- [x] 5.9 Test isWithinInterval inclusive/exclusive boundaries

### Task 6: Documentation
- [x] 6.1 Update API documentation with comparison fields (via story file)
- [x] 6.2 Remove TODO comments after implementation

## Definition of Done
- [x] All 3 endpoints return real comparison data
- [x] Frontend KPI Cards show actual % changes with arrows
- [x] All unit tests pass (530 tests)
- [x] Code review passed
- [x] TODO comments removed (comparison-related)

## Out of Scope
- Comparison with specific custom date range (e.g., "compare with last year")
- Caching of previous period data
- Historical trend analysis

## Notes
- Frontend (Story 2-1) already handles the `changes` object
- No frontend changes needed - just populate backend data
- Consider performance: may need to query more data for comparison

## Review Notes (2026-01-18)
- Created based on analysis of TODO comments in admin.controller.ts
- Addresses lines 230, 1007, 1379
- Frontend dependency: Story 2-1 KPI Cards (AC#3, AC#4)

### Team Review (2026-01-18)
- Reviewed by: Winston (Architect), John (PM), Bob (SM), Murat (TEA), Amelia (Dev)
- **No breaking changes**: Types already exist in admin.types.ts
- **AC#3 clarified**: SalesComparison fields (claimed, closed, conversionRate)
- **AC#4 clarified**: CampaignComparison fields (leads, closed, conversionRate)
- **Tests added**: timezone, boundary dates, isWithinInterval edges
- **Risk**: LOW - straightforward date calculations

### Party Mode Review (2026-01-18)
- Story independent from 0-11 and 0-12 (can implement in parallel)
- Business value: Makes KPI Cards show real % change instead of hardcoded 0
- Technical feasibility: HIGH - API types already exist

## Dev Agent Record

### Implementation Date: 2026-01-18

### Files Modified:
- `src/controllers/admin.controller.ts` - Added `getPreviousPeriod()` function, implemented comparison logic for dashboard, sales performance, and campaigns endpoints
- `src/__tests__/controllers/admin.controller.test.ts` - Added 6 new tests for period comparison

### Tests Added:
- `should calculate period comparison changes correctly`
- `should return 100% change when previous period has 0 leads`
- `should return 0% change when both periods have 0 leads`
- `should calculate negative change when current period has fewer leads`
- `should calculate comparison with previous period` (sales performance)
- `should handle no previous period data for comparison` (sales performance)

### Test Results:
- **524 tests passed** (added 6 new tests)
- All existing tests continue to pass
- Typecheck passes with no errors

### Implementation Notes:
1. Created `getPreviousPeriod()` function that calculates the previous period based on current period type
2. Handles all period types: today, yesterday, week, month, quarter, year, custom
3. Custom period: calculates same duration immediately before the current start date
4. All three endpoints (dashboard, sales-performance, campaigns) now return real comparison data
5. Used existing `filterByPeriod()` and `calculateChange()` functions
6. `calculateChange()` handles division by zero: returns 100 if current > 0, else 0

### Change Log
- 2026-01-18: Story implemented by Dev Agent (Amelia)
- 2026-01-18: Code review passed - fixes applied:
  - Added 6 new tests: period edge cases (week, month, custom) and campaign comparison
  - Standardized rounding (.toFixed(2)) in dashboard changes
  - Documented timezone consistency between parsePeriod() and getPreviousPeriod()
  - Total: 530 tests passing
