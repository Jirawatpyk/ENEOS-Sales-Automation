# Story 3.6: Period Filter for Sales Performance

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to filter sales performance data by different time periods (Week, Month, Quarter)**,
so that **I can analyze team performance over various timeframes and compare trends**.

## Acceptance Criteria

1. **AC1: Period Filter Display**
   - Given I am on the Sales Performance page (`/sales`)
   - When the page loads
   - Then I see a period filter dropdown in the page header (near title)
   - And the default selection is "This Month"
   - And the filter is positioned consistently with Dashboard date filter pattern

2. **AC2: Filter Options**
   - Given I click the period filter dropdown
   - When the options appear
   - Then I see: "This Week", "This Month", "This Quarter", "Last Quarter", "Custom Range"
   - And options are clearly labeled
   - And options match business reporting periods (Week starts Monday, Quarter = 3 months)

3. **AC3: Filter Application**
   - Given I select a filter option (e.g., "This Quarter")
   - When the selection is made
   - Then all page-level components update with filtered data:
     - Performance Table (Story 3-1)
     - Summary Cards (Story 3-2)
     - Bar Chart (Story 3-3)
     - Response Time Card (Story 3-4)
   - And a loading indicator shows during data fetch
   - And data updates within 2 seconds
   - **Note:** Trend Chart (Story 3-5) is in Detail Sheet, not affected by page filter (uses its own period selector)

4. **AC4: URL Sync**
   - Given I change the filter
   - When the filter is applied
   - Then the URL updates with query param (e.g., `?period=quarter`)
   - And refreshing the page preserves the filter
   - And sharing the URL shares the filtered view

5. **AC5: Custom Date Range**
   - Given I select "Custom Range"
   - When the date picker appears
   - Then I can select a start and end date
   - And future dates are disabled
   - And clicking "Apply" filters the data
   - And URL updates with `from` and `to` params
   - And if user selects `from` > `to`, dates are swapped automatically (user-friendly)

6. **AC6: Visual Feedback**
   - Given a filter is active
   - When displayed
   - Then the dropdown shows the selected period label
   - And non-default filters show a visual indicator (e.g., border color, badge)
   - And custom range shows the date range in the trigger button

7. **AC7: Persistence via URL**
   - Given I select a filter
   - When I navigate away and return to `/sales` page
   - Then my filter selection is preserved (via URL params)
   - And invalid URL params default to "This Month"

8. **AC8: Integration with Existing Hooks**
   - Given the period filter is applied
   - When data is fetched
   - Then `useSalesPerformance` hook receives the date range
   - And API call includes `dateFrom` and `dateTo` parameters
   - And TanStack Query cache key includes period for proper caching

9. **AC9: Responsive Design**
   - Given I view on different screen sizes
   - When screen width changes
   - Then the filter dropdown remains accessible
   - And on mobile (< 768px), filter may be in a collapsible section or full-width
   - And touch targets are minimum 44x44px

## Tasks / Subtasks

- [ ] **Task 1: Period Filter Component** (AC: #1, #2)
  - [ ] 1.0 Verify shadcn/ui Select is installed (from Story 2-7)
  - [ ] 1.1 Create `src/components/sales/sales-period-filter.tsx`
  - [ ] 1.2 Define period options: week, month, quarter, lastQuarter, custom
  - [ ] 1.3 Use shadcn/ui Select component with Calendar icon
  - [ ] 1.4 Style to match header design and Dashboard filter pattern

- [ ] **Task 2: Period Date Range Hook** (AC: #3, #8)
  - [ ] 2.1 Create `src/hooks/use-sales-period-filter.ts` OR extend existing `use-date-filter.ts`
  - [ ] 2.2 Calculate date ranges for each period:
    - Week: startOfWeek (Monday) to now
    - Month: startOfMonth to now
    - Quarter: startOfQuarter to now
    - Last Quarter: previous quarter start to end
  - [ ] 2.3 Use date-fns for date calculations (startOfWeek, startOfMonth, startOfQuarter, etc.)
  - [ ] 2.4 Return `{ period, from, to }` for use in API calls

- [ ] **Task 3: URL State Management** (AC: #4, #7)
  - [ ] 3.1 Use `useSearchParams` from Next.js
  - [ ] 3.2 Update URL on filter change (push to `/sales?period=X`)
  - [ ] 3.3 Read filter from URL on page load
  - [ ] 3.4 Handle invalid URL params gracefully (default to "month")
  - [ ] 3.5 Clear `from`/`to` params when switching from custom to preset

- [ ] **Task 4: Custom Date Range** (AC: #5)
  - [ ] 4.0 Verify shadcn/ui Calendar and Popover are installed
  - [ ] 4.1 **Update Story 2-7's CustomDateRange** to accept `basePath` prop (currently hardcoded to `/dashboard`)
  - [ ] 4.2 Reuse updated `CustomDateRange` with `basePath="/sales"`
  - [ ] 4.3 Show date range picker when "Custom Range" selected
  - [ ] 4.4 Disable future dates
  - [ ] 4.5 Add Apply/Cancel buttons
  - [ ] 4.6 Update URL with `from` and `to` ISO date params
  - [ ] 4.7 **Auto-swap dates** if `from` > `to` before applying

- [ ] **Task 5: Hook Integration** (AC: #8)
  - [ ] 5.1 Update `useSalesPerformance` hook to accept `dateFrom`, `dateTo` params
  - [ ] 5.2 Update TanStack Query key to include period/dates for proper caching
  - [ ] 5.3 Pass date range to API call: `/api/admin/sales-performance?dateFrom=X&dateTo=Y`
  - [ ] 5.4 Verify API endpoint supports date filtering (check backend)
  - [ ] 5.5 **Fallback:** If backend doesn't support date filtering, filter data on frontend (less efficient but functional)

- [ ] **Task 6: Page Integration** (AC: #1, #3)
  - [ ] 6.1 Add `SalesPeriodFilter` to `/sales` page header
  - [ ] 6.2 Connect filter to `useSalesPerformance` hook via date range
  - [ ] 6.3 Ensure all child components receive filtered data
  - [ ] 6.4 Show loading state during filter change

- [ ] **Task 7: Visual Feedback** (AC: #6)
  - [ ] 7.1 Show selected option in dropdown trigger
  - [ ] 7.2 Add visual indicator for non-default filter (e.g., `data-filter-active` attribute)
  - [ ] 7.3 Style non-default with border-primary or badge
  - [ ] 7.4 Show date range in trigger when custom is selected

- [ ] **Task 8: Testing** (AC: #1-9)
  - [ ] 8.1 Test filter options render correctly
  - [ ] 8.2 Test period selection updates URL
  - [ ] 8.3 Test date range calculation for each period option
  - [ ] 8.4 Test page load with URL params restores filter
  - [ ] 8.5 Test invalid URL params default to "month"
  - [ ] 8.6 Test custom date range selection
  - [ ] 8.7 Test future dates are disabled
  - [ ] 8.8 Test data refetch on filter change
  - [ ] 8.9 Test visual indicator for non-default filter
  - [ ] 8.10 Test responsive behavior
  - [ ] 8.11 Test quarter boundary dates (Jan 1, Apr 1, Jul 1, Oct 1)
  - [ ] 8.12 Test auto-swap when from > to in custom range
  - [ ] 8.13 Test CustomDateRange with basePath="/sales" generates correct URL

## Dev Notes

### Period Options

```typescript
const SALES_PERIOD_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'lastQuarter', label: 'Last Quarter' },
  { value: 'custom', label: 'Custom Range' },
] as const;

type SalesPeriod = typeof SALES_PERIOD_OPTIONS[number]['value'];
```

### Component Structure

```
src/components/sales/
├── sales-period-filter.tsx    # Period filter dropdown
└── index.ts                   # Update exports

src/hooks/
└── use-sales-period-filter.ts # Period date range calculation
    OR extend use-date-filter.ts with quarter support
```

### Sales Period Filter Component

```typescript
// src/components/sales/sales-period-filter.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomDateRange } from '@/components/dashboard/custom-date-range';

const SALES_PERIOD_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'lastQuarter', label: 'Last Quarter' },
  { value: 'custom', label: 'Custom Range' },
] as const;

type SalesPeriod = typeof SALES_PERIOD_OPTIONS[number]['value'];

const isValidPeriod = (period: string | null): period is SalesPeriod => {
  return SALES_PERIOD_OPTIONS.some(opt => opt.value === period);
};

export function SalesPeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodParam = searchParams.get('period');
  const currentPeriod: SalesPeriod = isValidPeriod(periodParam) ? periodParam : 'month';
  const isNonDefault = currentPeriod !== 'month';

  const handlePeriodChange = (period: SalesPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);

    // Clear custom date params if not custom
    if (period !== 'custom') {
      params.delete('from');
      params.delete('to');
    }

    router.push(`/sales?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger
          className={cn(
            "w-[180px]",
            isNonDefault && "border-primary"
          )}
          data-filter-active={isNonDefault || undefined}
        >
          <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {SALES_PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentPeriod === 'custom' && (
        <CustomDateRange basePath="/sales" />
      )}
    </div>
  );
}
```

### Period Date Range Hook

```typescript
// src/hooks/use-sales-period-filter.ts
import { useSearchParams } from 'next/navigation';
import {
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  subQuarters,
  endOfQuarter
} from 'date-fns';

type SalesPeriod = 'week' | 'month' | 'quarter' | 'lastQuarter' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

export function useSalesPeriodFilter(): { period: SalesPeriod; from: Date; to: Date } {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get('period');
  const period = isValidPeriod(periodParam) ? periodParam : 'month';

  const getDateRange = (): DateRange => {
    const now = new Date();

    switch (period) {
      case 'week':
        return {
          from: startOfWeek(now, { weekStartsOn: 1 }), // Monday
          to: now,
        };
      case 'month':
        return {
          from: startOfMonth(now),
          to: now,
        };
      case 'quarter':
        return {
          from: startOfQuarter(now),
          to: now,
        };
      case 'lastQuarter':
        const lastQ = subQuarters(now, 1);
        return {
          from: startOfQuarter(lastQ),
          to: endOfQuarter(lastQ),
        };
      case 'custom':
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        return {
          from: fromParam ? new Date(fromParam) : startOfMonth(now),
          to: toParam ? new Date(toParam) : now,
        };
      default:
        return {
          from: startOfMonth(now),
          to: now,
        };
    }
  };

  const { from, to } = getDateRange();

  return { period, from, to };
}

function isValidPeriod(period: string | null): period is SalesPeriod {
  return ['week', 'month', 'quarter', 'lastQuarter', 'custom'].includes(period || '');
}
```

### Update useSalesPerformance Hook

```typescript
// Update to src/hooks/use-sales-performance.ts
import { useQuery } from '@tanstack/react-query';
import { useSalesPeriodFilter } from './use-sales-period-filter';

export function useSalesPerformance() {
  const { period, from, to } = useSalesPeriodFilter();

  return useQuery({
    // Include period/dates in query key for proper caching
    queryKey: ['sales-performance', period, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
      });
      const response = await fetch(`/api/admin/sales-performance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sales performance');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Page Integration

```typescript
// In /sales page.tsx
import { SalesPeriodFilter } from '@/components/sales/sales-period-filter';

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales Performance</h1>
        <SalesPeriodFilter />
      </div>

      {/* Summary Cards, Table, Chart - all use useSalesPerformance hook */}
      <ConversionSummaryCards />
      <ResponseTimeCard />
      <PerformanceBarChart />
      <PerformanceTable />
    </div>
  );
}
```

### Quarter Calculation Reference

```typescript
// date-fns functions for quarters
import { startOfQuarter, endOfQuarter, subQuarters } from 'date-fns';

// Q1: Jan 1 - Mar 31
// Q2: Apr 1 - Jun 30
// Q3: Jul 1 - Sep 30
// Q4: Oct 1 - Dec 31

const now = new Date('2026-01-15');
startOfQuarter(now);      // 2026-01-01 (Q1 start)
endOfQuarter(now);        // 2026-03-31 (Q1 end)

const lastQ = subQuarters(now, 1);
startOfQuarter(lastQ);    // 2025-10-01 (Q4 2025 start)
endOfQuarter(lastQ);      // 2025-12-31 (Q4 2025 end)
```

### shadcn/ui Components Required

Should already be installed from Story 2-7:
```bash
npx shadcn-ui@latest add select
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
```

### Dependencies

- `date-fns` - Already used in project for date calculations
- Story 2-7's `CustomDateRange` component can be reused (may need `basePath` prop)
- `useSalesPerformance` hook from Story 3-1

### Dependencies on Previous Stories

- **Story 2-7:** Pattern reference, CustomDateRange component may be reusable
- **Story 3-1:** useSalesPerformance hook needs date param support
- **Story 3-2/3-3/3-4:** All components should update when filter changes

### Backend API Note

**Verify backend supports date filtering:**
- Endpoint: `GET /api/admin/sales-performance`
- Required params: `dateFrom`, `dateTo` (ISO 8601 format)
- If not supported, backend enhancement may be needed

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-03.6] - Period Filter feature
- [Source: _bmad-output/implementation-artifacts/stories/2-7-date-filter.md] - Dashboard date filter pattern
- [Source: _bmad-output/implementation-artifacts/stories/3-1-performance-table.md] - useSalesPerformance hook

### Previous Story Intelligence

From Story 2-7:
- DateFilter pattern with URL sync
- CustomDateRange component with Calendar popover
- useDateFilter hook pattern
- Visual feedback with `data-filter-active` attribute

From Story 3-1:
- useSalesPerformance hook exists
- May need modification to accept date params

### Critical Don't-Miss Rules

1. **Update CustomDateRange first** - Add `basePath` prop to Story 2-7's component before reusing
2. **URL sync is required** - Filter must persist via URL params
3. **Week starts Monday** - Use `weekStartsOn: 1` in date-fns
4. **Quarter calculation** - Use date-fns startOfQuarter/endOfQuarter
5. **Disable future dates** - Calendar should not allow future date selection
6. **Default is "month"** - Invalid URL params should fallback to month
7. **Update query key** - Include period in TanStack Query key for proper caching
8. **Auto-swap dates** - If from > to in custom range, swap automatically

### Edge Cases

- Invalid URL period param → default to "month"
- Custom range with missing from/to → default to current month
- Custom range with from > to → **swap dates automatically** (user-friendly)
- Very old date range → verify API handles large date ranges
- Quarter boundary (e.g., Jan 1) → verify quarter calculation is correct
- Trend Chart in Detail Sheet → NOT affected by page filter (has own period selector)
- Backend doesn't support date filtering → fallback to frontend filtering

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

