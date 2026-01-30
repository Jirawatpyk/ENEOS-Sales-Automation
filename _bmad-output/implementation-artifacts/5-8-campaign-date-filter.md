# Story 5.8: Campaign Date Filter

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to filter campaign data by date range (Today, This Week, This Month, Last Month, Custom)**,
so that **I can analyze email campaign performance for specific time periods**.

## Acceptance Criteria

1. **AC1: Date Filter Component Display**
   - Given I am on the Campaigns page
   - When the page loads
   - Then I see a date filter component above the Campaign Table
   - And the default selection is "All Time" (no date filter)

2. **AC2: Filter Options**
   - Given I click the filter dropdown
   - When the options appear
   - Then I see: All Time, Today, This Week, This Month, Last Month, Custom Range
   - And options are clearly labeled

3. **AC3: Filter Application**
   - Given I select a filter option (e.g., "This Month")
   - When the selection is made
   - Then KPI Cards and Campaign Table update with filtered data
   - And a loading indicator shows during data fetch
   - And data is filtered by `First_Event` date from backend

4. **AC4: URL Sync**
   - Given I change the filter
   - When the filter is applied
   - Then the URL updates with query params (e.g., `?period=month`)
   - And refreshing the page preserves the filter
   - And custom ranges use `?period=custom&from=...&to=...`

5. **AC5: Custom Date Range**
   - Given I select "Custom Range"
   - When the date picker appears
   - Then I can select a start and end date
   - And clicking "Apply" filters the data
   - And future dates are disabled

6. **AC6: Visual Feedback**
   - Given a filter is active (not "All Time")
   - When displayed
   - Then the dropdown shows the selected period
   - And non-default filters show a visual indicator (border highlight)

7. **AC7: Clear Filter**
   - Given a filter is active
   - When I click "Clear" or select "All Time"
   - Then the filter is removed
   - And data shows all campaigns

8. **AC8: KPI Cards Update**
   - Given I apply a date filter
   - When the filter changes
   - Then Campaign KPI Cards (Story 5-3) update to show filtered totals
   - And rates recalculate based on filtered data

## Tasks / Subtasks

- [ ] **Task 1: Create Campaign Date Filter Component** (AC: #1, #2, #6)
  - [ ] 1.1 Create `src/components/campaigns/campaign-date-filter.tsx`
  - [ ] 1.2 REUSE pattern from `src/components/dashboard/date-filter.tsx` (Story 2-7)
  - [ ] 1.3 Define filter options: allTime, today, week, month, lastMonth, custom
  - [ ] 1.4 Use shadcn/ui Select component
  - [ ] 1.5 Add Calendar icon from lucide-react
  - [ ] 1.6 Add visual indicator for active non-default filter
  - [ ] 1.7 Write unit tests (8+ test cases)

- [ ] **Task 2: Create Campaign Date Range Picker** (AC: #5)
  - [ ] 2.1 Create `src/components/campaigns/campaign-custom-date-range.tsx`
  - [ ] 2.2 REUSE pattern from `src/components/dashboard/custom-date-range.tsx`
  - [ ] 2.3 Use shadcn/ui Calendar with mode="range"
  - [ ] 2.4 Add Apply/Cancel buttons in Popover
  - [ ] 2.5 Disable future dates: `disabled={{ after: new Date() }}`
  - [ ] 2.6 Add aria-label for accessibility
  - [ ] 2.7 Write unit tests (5+ test cases)

- [ ] **Task 3: Create useCampaignDateFilter Hook** (AC: #3, #4, #7)
  - [ ] 3.1 Create `src/hooks/use-campaign-date-filter.ts`
  - [ ] 3.2 Use `useSearchParams` from Next.js for URL sync
  - [ ] 3.3 Calculate date ranges with date-fns
  - [ ] 3.4 Return `{ period, dateFrom, dateTo }` in ISO 8601 format
  - [ ] 3.5 Handle "allTime" by returning undefined dates
  - [ ] 3.6 Validate period param from URL (handle invalid values)
  - [ ] 3.7 Write unit tests (10+ test cases)

- [ ] **Task 4: Update API Proxy Route** (AC: #3)
  - [ ] 4.1 Update `src/app/api/admin/campaigns/stats/route.ts`
  - [ ] 4.2 Forward `dateFrom` and `dateTo` query params to backend
  - [ ] 4.3 Ensure ISO 8601 date format is passed correctly

- [ ] **Task 5: Update Campaign Hooks** (AC: #3, #8)
  - [ ] 5.1 Update `src/hooks/use-campaign-stats.ts` to accept dateFrom/dateTo
  - [ ] 5.2 Update `src/hooks/use-campaigns-table.ts` to accept dateFrom/dateTo
  - [ ] 5.3 Add dateFrom/dateTo to TanStack Query key for cache separation
  - [ ] 5.4 Write unit tests for updated hooks (6+ test cases)

- [ ] **Task 6: Update API Client** (AC: #3)
  - [ ] 6.1 Update `src/lib/api/campaigns.ts` fetchCampaignStats
  - [ ] 6.2 Add optional `dateFrom` and `dateTo` params
  - [ ] 6.3 Update `CampaignTableParams` type in `src/types/campaigns.ts`

- [ ] **Task 7: Update Campaign Components to Accept Date Props** (AC: #3, #8)
  - [ ] 7.1 Update `CampaignKPICardsGrid` interface to accept `dateFrom?: string`, `dateTo?: string` props
  - [ ] 7.2 Update `CampaignKPICardsGrid` to pass dateFrom/dateTo to `useCampaignStats()` hook
  - [ ] 7.3 Update `CampaignTable` interface to accept `dateFrom?: string`, `dateTo?: string` props
  - [ ] 7.4 Update `CampaignTable` to pass dateFrom/dateTo to `useCampaignsTable()` hook
  - [ ] 7.5 Write unit tests for updated components (4+ test cases)

- [ ] **Task 8: Update Campaigns Page** (AC: #1, #3)
  - [ ] 8.1 Update `src/app/(dashboard)/campaigns/page.tsx`
  - [ ] 8.2 Create `src/components/campaigns/campaigns-content.tsx` client wrapper
  - [ ] 8.3 Add CampaignDateFilter above Campaign Table
  - [ ] 8.4 Pass dateFrom/dateTo from hook to CampaignKPICardsGrid
  - [ ] 8.5 Pass dateFrom/dateTo from hook to CampaignTable
  - [ ] 8.6 Show loading state during filter change

- [ ] **Task 9: Update Barrel Exports** (AC: #1)
  - [ ] 9.1 Update `src/components/campaigns/index.ts`
  - [ ] 9.2 Export CampaignDateFilter, CampaignCustomDateRange, CampaignsContent

- [ ] **Task 10: Testing** (AC: #1-#8)
  - [ ] 10.1 Test filter options render correctly
  - [ ] 10.2 Test data updates when filter changes
  - [ ] 10.3 Test URL sync preserves filter on refresh
  - [ ] 10.4 Test custom date range picker
  - [ ] 10.5 Test KPI cards update with filtered data
  - [ ] 10.6 Test "All Time" clears filter
  - [ ] 10.7 Test CampaignKPICardsGrid accepts dateFrom/dateTo props
  - [ ] 10.8 Test CampaignTable accepts dateFrom/dateTo props

## Dev Notes

### Backend API Already Supports Date Filtering

**Endpoint:** `GET /api/admin/campaigns/stats`

**Existing Query Parameters (from Story 5-2):**
| Param | Type | Description |
|-------|------|-------------|
| `dateFrom` | string | Filter by First_Event >= dateFrom (ISO 8601) |
| `dateTo` | string | Filter by First_Event <= dateTo (ISO 8601) |

**Backend filters by `First_Event` column** - the first event received for each campaign.

### CRITICAL: Reuse Existing Pattern from Dashboard

**DO NOT reinvent the wheel.** Copy patterns from Story 2-7:
- `src/components/dashboard/date-filter.tsx` → `src/components/campaigns/campaign-date-filter.tsx`
- `src/components/dashboard/custom-date-range.tsx` → `src/components/campaigns/campaign-custom-date-range.tsx`
- `src/hooks/use-date-filter.ts` → `src/hooks/use-campaign-date-filter.ts`

### TypeScript Types

```typescript
// src/types/campaigns.ts - Add to existing types
export type CampaignPeriod = 'allTime' | 'today' | 'week' | 'month' | 'lastMonth' | 'custom';

export interface CampaignDateFilterParams {
  period: CampaignPeriod;
  dateFrom?: string;  // ISO 8601
  dateTo?: string;    // ISO 8601
}

// Update existing CampaignTableParams
export interface CampaignTableParams {
  page?: number;
  limit?: number;
  sortBy?: CampaignSortBy;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;  // ADD THIS
  dateTo?: string;    // ADD THIS
}
```

### Campaign Date Filter Component

```typescript
// src/components/campaigns/campaign-date-filter.tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { CampaignCustomDateRange } from './campaign-custom-date-range';
import type { CampaignPeriod } from '@/types/campaigns';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS: { value: CampaignPeriod; label: string }[] = [
  { value: 'allTime', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

export const VALID_CAMPAIGN_PERIODS: CampaignPeriod[] = ['allTime', 'today', 'week', 'month', 'lastMonth', 'custom'];

export function isValidCampaignPeriod(value: string): value is CampaignPeriod {
  return VALID_CAMPAIGN_PERIODS.includes(value as CampaignPeriod);
}

export function CampaignDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const periodParam = searchParams.get('period');
  const currentPeriod: CampaignPeriod = isValidCampaignPeriod(periodParam || '')
    ? periodParam as CampaignPeriod
    : 'allTime';

  const isFiltered = currentPeriod !== 'allTime';

  const handlePeriodChange = (period: CampaignPeriod) => {
    const params = new URLSearchParams(searchParams.toString());

    if (period === 'allTime') {
      params.delete('period');
      params.delete('from');
      params.delete('to');
    } else {
      params.set('period', period);
      if (period !== 'custom') {
        params.delete('from');
        params.delete('to');
      }
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger
          className={cn(
            "w-[180px]",
            isFiltered && "border-primary"
          )}
          data-filter-active={isFiltered}
        >
          <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentPeriod === 'custom' && <CampaignCustomDateRange />}
    </div>
  );
}
```

### Campaign Custom Date Range Picker

```typescript
// src/components/campaigns/campaign-custom-date-range.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function CampaignCustomDateRange() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [date, setDate] = useState<DateRange | undefined>();
  const [open, setOpen] = useState(false);

  // Initialize from URL params
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (fromParam && toParam) {
      try {
        setDate({
          from: parseISO(fromParam),
          to: parseISO(toParam),
        });
      } catch {
        // Invalid dates in URL, ignore
      }
    }
  }, [searchParams]);

  const applyCustomRange = () => {
    if (!date?.from || !date?.to) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('period', 'custom');
    params.set('from', date.from.toISOString());
    params.set('to', date.to.toISOString());
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  const clearRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('period');
    params.delete('from');
    params.delete('to');
    router.push(`${pathname}?${params.toString()}`);
    setDate(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Select custom date range"
          aria-haspopup="dialog"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
              </>
            ) : (
              format(date.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
        />
        <div className="p-3 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={clearRange}>
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={applyCustomRange} disabled={!date?.from || !date?.to}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Campaign Date Filter Hook

```typescript
// src/hooks/use-campaign-date-filter.ts
import { useSearchParams } from 'next/navigation';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subMonths,
  endOfMonth,
  endOfDay
} from 'date-fns';
import type { CampaignPeriod } from '@/types/campaigns';
import { isValidCampaignPeriod } from '@/components/campaigns/campaign-date-filter';

export interface CampaignDateFilterResult {
  period: CampaignPeriod;
  dateFrom?: string;  // ISO 8601
  dateTo?: string;    // ISO 8601
}

export function useCampaignDateFilter(): CampaignDateFilterResult {
  const searchParams = useSearchParams();

  const periodParam = searchParams.get('period');
  const period: CampaignPeriod = isValidCampaignPeriod(periodParam || '')
    ? periodParam as CampaignPeriod
    : 'allTime';

  const getDateRange = (): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();

    switch (period) {
      case 'allTime':
        // No date filter
        return { dateFrom: undefined, dateTo: undefined };

      case 'today':
        return {
          dateFrom: startOfDay(now).toISOString(),
          dateTo: endOfDay(now).toISOString(),
        };

      case 'week':
        return {
          dateFrom: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
          dateTo: endOfDay(now).toISOString(),
        };

      case 'month':
        return {
          dateFrom: startOfMonth(now).toISOString(),
          dateTo: endOfDay(now).toISOString(),
        };

      case 'lastMonth': {
        const lastMonth = subMonths(now, 1);
        return {
          dateFrom: startOfMonth(lastMonth).toISOString(),
          dateTo: endOfMonth(lastMonth).toISOString(),
        };
      }

      case 'custom': {
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');

        if (fromParam && toParam) {
          try {
            // Validate dates are parseable
            const from = new Date(fromParam);
            const to = new Date(toParam);
            if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
              return {
                dateFrom: from.toISOString(),
                dateTo: to.toISOString(),
              };
            }
          } catch {
            // Invalid dates, fall through to default
          }
        }
        // If custom but no valid dates, treat as all time
        return { dateFrom: undefined, dateTo: undefined };
      }

      default:
        return { dateFrom: undefined, dateTo: undefined };
    }
  };

  const { dateFrom, dateTo } = getDateRange();

  return {
    period,
    dateFrom,
    dateTo,
  };
}
```

### Update API Proxy Route

```typescript
// src/app/api/admin/campaigns/stats/route.ts
// ADD these lines to forward date filter params:

const dateFrom = searchParams.get('dateFrom');
const dateTo = searchParams.get('dateTo');

// Build backend URL with all params
const backendParams = new URLSearchParams({
  page,
  limit,
  sortBy,
  sortOrder,
});

if (dateFrom) backendParams.set('dateFrom', dateFrom);
if (dateTo) backendParams.set('dateTo', dateTo);

const backendUrl = `${BACKEND_URL}/api/admin/campaigns/stats?${backendParams.toString()}`;
```

### Update CampaignKPICardsGrid Component

```typescript
// src/components/campaigns/campaign-kpi-cards-grid.tsx
// ADD props interface and update component

interface CampaignKPICardsGridProps {
  dateFrom?: string;
  dateTo?: string;
}

export function CampaignKPICardsGrid({ dateFrom, dateTo }: CampaignKPICardsGridProps) {
  // Pass date params to hook
  const { data, isLoading, isError, error, refetch } = useCampaignStats({
    dateFrom,
    dateTo,
  });

  // ... rest of component unchanged
}
```

### Update CampaignTable Component

```typescript
// src/components/campaigns/campaign-table.tsx
// ADD props interface and update component

interface CampaignTableProps {
  dateFrom?: string;
  dateTo?: string;
}

export function CampaignTable({ dateFrom, dateTo }: CampaignTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<CampaignSortBy>('Last_Updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pass date params to hook
  const { data, isLoading, isError, error, refetch } = useCampaignsTable({
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
    dateFrom,  // ADD THIS
    dateTo,    // ADD THIS
  });

  // ... rest of component unchanged
}
```

### Update Campaign Stats Hook

```typescript
// src/hooks/use-campaign-stats.ts - Update to accept date params
export interface UseCampaignStatsOptions {
  enabled?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export function useCampaignStats(options: UseCampaignStatsOptions = {}) {
  const { enabled = true, dateFrom, dateTo } = options;

  return useQuery({
    // Include dates in query key for cache separation
    queryKey: ['campaigns', 'stats', { dateFrom, dateTo }],
    queryFn: async () => {
      const response = await fetchCampaignStats({ limit: 100, dateFrom, dateTo });
      return aggregateCampaignStats(response.data.data);
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    enabled,
  });
}
```

### Update Campaigns Table Hook

```typescript
// src/hooks/use-campaigns-table.ts - Update to accept date params
export function useCampaignsTable(params: CampaignTableParams = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'Last_Updated',
    sortOrder = 'desc',
    dateFrom,
    dateTo,
  } = params;

  return useQuery({
    // Include dates in query key
    queryKey: ['campaigns', 'table', { page, limit, sortBy, sortOrder, dateFrom, dateTo }],
    queryFn: () => fetchCampaignStats({ page, limit, sortBy, sortOrder, dateFrom, dateTo }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}
```

### Update API Client

```typescript
// src/lib/api/campaigns.ts - Update fetchCampaignStats
export async function fetchCampaignStats(
  params: CampaignTableParams = {}
): Promise<CampaignStatsResponse> {
  const { page = 1, limit = 100, sortBy, sortOrder, dateFrom, dateTo } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (sortBy) searchParams.set('sortBy', sortBy);
  if (sortOrder) searchParams.set('sortOrder', sortOrder);
  if (dateFrom) searchParams.set('dateFrom', dateFrom);
  if (dateTo) searchParams.set('dateTo', dateTo);

  const url = `/api/admin/campaigns/stats?${searchParams.toString()}`;
  // ... rest of fetch logic
}
```

### Campaigns Content Wrapper (Client Component)

```typescript
// src/components/campaigns/campaigns-content.tsx
'use client';

import { Suspense } from 'react';
import { CampaignDateFilter } from './campaign-date-filter';
import { CampaignKPICardsGrid, CampaignKPICardsSkeleton } from './campaign-kpi-cards-grid';
import { CampaignTable } from './campaign-table';
import { CampaignTableSkeleton } from './campaign-table-skeleton';
import { useCampaignDateFilter } from '@/hooks/use-campaign-date-filter';

export function CampaignsContent() {
  const { dateFrom, dateTo } = useCampaignDateFilter();

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="flex justify-end">
        <CampaignDateFilter />
      </div>

      {/* KPI Cards with date filter */}
      <Suspense fallback={<CampaignKPICardsSkeleton />}>
        <CampaignKPICardsGrid dateFrom={dateFrom} dateTo={dateTo} />
      </Suspense>

      {/* Campaign Table with date filter */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Campaigns</h2>
        <Suspense fallback={<CampaignTableSkeleton />}>
          <CampaignTable dateFrom={dateFrom} dateTo={dateTo} />
        </Suspense>
      </div>
    </div>
  );
}
```

### Update Campaigns Page

```typescript
// src/app/(dashboard)/campaigns/page.tsx
import { Suspense } from 'react';
import { CampaignsContent } from '@/components/campaigns';

export const metadata = {
  title: 'Campaigns | ENEOS Admin',
  description: 'Email campaign analytics and metrics',
};

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">
          Email campaign performance metrics
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <CampaignsContent />
      </Suspense>
    </div>
  );
}
```

### File Structure

```
eneos-admin-dashboard/src/
├── app/(dashboard)/campaigns/
│   └── page.tsx                          # UPDATE - Use CampaignsContent wrapper
├── app/api/admin/campaigns/stats/
│   └── route.ts                          # UPDATE - Forward dateFrom, dateTo
├── components/campaigns/
│   ├── campaign-date-filter.tsx          # NEW - Date filter dropdown
│   ├── campaign-custom-date-range.tsx    # NEW - Custom range picker
│   ├── campaigns-content.tsx             # NEW - Client wrapper with date filter
│   ├── campaign-kpi-cards-grid.tsx       # UPDATE - Add props interface, pass to hook
│   ├── campaign-table.tsx                # UPDATE - Add props interface, pass to hook
│   └── index.ts                          # UPDATE - Add new exports
├── hooks/
│   ├── use-campaign-date-filter.ts       # NEW - Date filter hook
│   ├── use-campaign-stats.ts             # UPDATE - Accept dateFrom, dateTo options
│   └── use-campaigns-table.ts            # UPDATE - Accept dateFrom, dateTo params
├── lib/api/
│   └── campaigns.ts                      # UPDATE - Add dateFrom, dateTo params
├── types/
│   └── campaigns.ts                      # UPDATE - Add CampaignPeriod, update params
└── __tests__/
    ├── campaign-date-filter.test.tsx     # NEW - 8+ tests
    ├── use-campaign-date-filter.test.ts  # NEW - 10+ tests
    ├── campaign-kpi-cards-grid.test.tsx  # UPDATE - Add props tests
    └── campaign-table.test.tsx           # UPDATE - Add props tests
```

**Summary: 4 NEW files, 9 UPDATE files**

### Existing Pattern References

**CRITICAL:** Follow exact patterns from these existing components:

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| Date Filter UI | `src/components/dashboard/date-filter.tsx` | Select, options, URL sync |
| Custom Date Range | `src/components/dashboard/custom-date-range.tsx` | Calendar popover, Apply/Cancel |
| Date Filter Hook | `src/hooks/use-date-filter.ts` | Date range calculation with date-fns |
| Campaign KPI Cards | `src/components/campaigns/campaign-kpi-cards-grid.tsx` | Props pattern for dateFrom/dateTo |
| Campaign Table | `src/components/campaigns/campaign-table.tsx` | Props pattern for dateFrom/dateTo |

### Dependencies (Already Installed)

- `date-fns` ^3.x - Date calculations
- `lucide-react` - Calendar icon
- `react-day-picker` - DateRange type (with shadcn calendar)
- shadcn/ui Select, Calendar, Popover, Button - Already available

### Do NOT

- ❌ Create new date calculation logic - REUSE date-fns functions from Story 2-7
- ❌ Use different URL param names - Use `period`, `from`, `to` (same as dashboard)
- ❌ Skip URL sync - Filter state MUST persist on page refresh
- ❌ Forget to update query keys - TanStack Query must cache separately per date range
- ❌ Create CustomDateRange.test.tsx - Radix Calendar has jsdom issues (Story 2-7 note)

### Known Limitation from Story 2-7

**CustomDateRange Calendar Testing:**
- react-day-picker causes infinite loop in jsdom environment
- Rely on integration tests within `campaign-date-filter.test.tsx`
- Use Playwright E2E tests for Calendar interactive behavior

### Testing Strategy

| Test File | New/Update | Test Cases | Focus |
|-----------|------------|------------|-------|
| `campaign-date-filter.test.tsx` | NEW | 8+ | Filter dropdown, options, URL updates |
| `use-campaign-date-filter.test.ts` | NEW | 10+ | Date range calculation for each period |
| `campaign-kpi-cards-grid.test.tsx` | UPDATE | 4+ | Accept dateFrom/dateTo props |
| `campaign-table.test.tsx` | UPDATE | 4+ | Accept dateFrom/dateTo props |
| `use-campaign-stats.test.tsx` | UPDATE | 3+ | Accept dateFrom/dateTo options |
| `use-campaigns-table.test.tsx` | UPDATE | 3+ | Accept dateFrom/dateTo params |

**Total: ~32+ test cases**

### URL Examples

| Period | URL |
|--------|-----|
| All Time | `/campaigns` |
| Today | `/campaigns?period=today` |
| This Week | `/campaigns?period=week` |
| This Month | `/campaigns?period=month` |
| Last Month | `/campaigns?period=lastMonth` |
| Custom | `/campaigns?period=custom&from=2026-01-01T00:00:00.000Z&to=2026-01-15T23:59:59.999Z` |

### References

- [Source: _bmad-output/implementation-artifacts/stories/2-7-date-filter.md] - Dashboard date filter pattern
- [Source: _bmad-output/implementation-artifacts/5-3-campaign-summary-cards.md] - KPI Cards pattern
- [Source: _bmad-output/implementation-artifacts/5-4-campaign-table.md] - Campaign Table pattern
- [Source: _bmad-output/implementation-artifacts/5-2-campaign-stats-api.md] - Backend API with dateFrom/dateTo
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-05.F6] - Date Range Filter feature

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

