# Story 0-13: Period Comparison for Dashboard

## Story Information
| Field | Value |
|-------|-------|
| Story ID | 0-13 |
| Epic | Epic-0: Backend API (Enhancement) |
| Priority | Medium |
| Status | ready-for-dev |
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
- [ ] When period is "today", compare with "yesterday"
- [ ] When period is "week", compare with "last week"
- [ ] When period is "month", compare with "last month"
- [ ] When period is "quarter", compare with "last quarter"
- [ ] When period is custom range, compare with same duration before start date

### AC#2: Return Comparison in Dashboard API
- [ ] `changes.totalLeads` shows % change from previous period
- [ ] `changes.claimed` shows % change
- [ ] `changes.closed` shows % change
- [ ] Handle division by zero (previous = 0 → show "+100%" or "New")

### AC#3: Sales Performance Comparison
- [ ] Fix TODO at line 1007 for sales performance endpoint
- [ ] Populate `comparison.previousPeriod`: claimed, closed, conversionRate
- [ ] Populate `comparison.changes`: claimed, closed, conversionRate (% change)

### AC#4: Campaign Comparison
- [ ] Fix TODO at line 1379 for campaigns endpoint
- [ ] Populate `comparison.previousPeriod`: leads, closed, conversionRate
- [ ] Populate `comparison.changes`: leads, closed, conversionRate (% change)

### AC#5: Backwards Compatibility
- [ ] API response structure unchanged
- [ ] `changes` object already exists - just populate with real values

### AC#6: Testing
- [ ] Unit tests for period calculation logic
- [ ] Unit tests for comparison calculation
- [ ] Integration tests for all endpoints

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
- [ ] 1.1 Create `getPreviousPeriod()` function in admin.controller.ts
- [ ] 1.2 Handle all period types: today, week, month, quarter, custom
- [ ] 1.3 Use date-fns for date calculations

### Task 2: Dashboard Comparison (Line 230)
- [ ] 2.1 Filter leads for previous period
- [ ] 2.2 Calculate previousPeriodLeads, previousClaimed, previousClosed
- [ ] 2.3 Calculate percentage changes
- [ ] 2.4 Handle edge cases (previous = 0)

### Task 3: Sales Performance Comparison (Line 1007)
- [ ] 3.1 Implement comparison logic for sales metrics
- [ ] 3.2 Add to API response

### Task 4: Campaign Comparison (Line 1379)
- [ ] 4.1 Implement comparison logic for campaign metrics
- [ ] 4.2 Add to API response

### Task 5: Testing
- [ ] 5.1 Unit tests for getPreviousPeriod()
- [ ] 5.2 Unit tests for calculateChange()
- [ ] 5.3 Update dashboard endpoint tests
- [ ] 5.4 Update sales performance endpoint tests
- [ ] 5.5 Update campaign endpoint tests
- [ ] 5.6 Test edge cases: previous = 0, both = 0, negative change
- [ ] 5.7 Test timezone edge cases (UTC vs local)
- [ ] 5.8 Test boundary dates (first/last day of period)
- [ ] 5.9 Test isWithinInterval inclusive/exclusive boundaries

### Task 6: Documentation
- [ ] 6.1 Update API documentation with comparison fields
- [ ] 6.2 Remove TODO comments after implementation

## Definition of Done
- [ ] All 3 endpoints return real comparison data
- [ ] Frontend KPI Cards show actual % changes with arrows
- [ ] All unit tests pass (300+)
- [ ] Code review passed
- [ ] TODO comments removed

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
