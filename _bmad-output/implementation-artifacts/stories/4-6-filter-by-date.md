# Story 4.6: Filter by Date

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to filter leads by their creation date or date range**,
so that **I can analyze leads from specific time periods like today's new leads or last month's pipeline**.

## Acceptance Criteria

1. **AC1: Date Filter Display**
   - Given I am on the leads page
   - When the page loads
   - Then I see a "Date" filter button next to the owner filter
   - And the button shows "All Time" by default
   - And the button has a calendar icon

2. **AC2: Date Preset Options**
   - Given I click the date filter button
   - When the popover opens
   - Then I see preset options:
     - Today
     - Yesterday
     - Last 7 Days
     - Last 30 Days
     - This Month
     - Last Month
     - Custom Range
   - And each preset is clearly labeled

3. **AC3: Preset Filter Application**
   - Given I select "Last 7 Days" preset
   - When the filter is applied
   - Then the table shows only leads with createdAt within last 7 days
   - And the button label updates to show date range (e.g., "Jan 9 - Jan 15, 2026")
   - And the URL updates with `?from=YYYY-MM-DD&to=YYYY-MM-DD` parameters

4. **AC4: Custom Date Range**
   - Given I select "Custom Range"
   - When the date picker appears
   - Then I see a calendar to select start date and end date
   - And I can navigate between months
   - And clicking dates selects the range
   - And clicking "Apply" filters the data

5. **AC5: Filter Results**
   - Given I apply a date filter
   - When the filter is active
   - Then the table shows only leads matching the date range
   - And pagination reflects the filtered count
   - And "Showing 1-20 of 45 leads" shows filtered total

6. **AC6: Combined Filters**
   - Given I have status filter "New" active
   - When I also filter by "Last 7 Days"
   - Then the table shows leads matching BOTH conditions
   - And URL shows `?status=new&from=YYYY-MM-DD&to=YYYY-MM-DD`
   - When I clear the date filter
   - Then status filter remains active

7. **AC7: Clear Filter**
   - Given I have date filter active
   - When I click "All Time" or a clear button
   - Then the date filter is removed
   - And the table shows all leads (respecting other filters)
   - And the URL removes the `?from=` and `?to=` parameters
   - And pagination resets to page 1

8. **AC8: URL State Sync**
   - Given I navigate to `/leads?from=2026-01-01&to=2026-01-15`
   - When the page loads
   - Then the filter shows "Jan 1 - Jan 15, 2026"
   - And the table shows only leads in that range
   - When I share this URL with another user
   - Then they see the same filtered view

9. **AC9: Accessibility**
   - Given the date filter is rendered
   - When I use keyboard navigation
   - Then I can open popover with Enter/Space
   - And I can navigate presets with Arrow keys
   - And I can navigate calendar with Arrow keys
   - And screen reader announces selected dates

## Tasks / Subtasks

- [ ] **Task 1: Date Filter Component** (AC: #1, #2, #9)
  - [ ] 1.0 Install shadcn/ui Calendar if not exists: `npx shadcn-ui@latest add calendar`
  - [ ] 1.1 Create `src/components/leads/lead-date-filter.tsx`
  - [ ] 1.2 Use shadcn/ui Popover with preset buttons
  - [ ] 1.3 Add calendar icon (lucide-react Calendar icon)
  - [ ] 1.4 Display all 7 preset options
  - [ ] 1.5 Add "All Time" option to clear filter
  - [ ] 1.6 Show selected date range in button label
  - [ ] 1.7 Add clear button (X) when filter active
  - [ ] 1.8 Implement keyboard navigation
  - [ ] 1.9 Add `type="button"` to all buttons inside Popover

- [ ] **Task 2: Date Range Picker** (AC: #4)
  - [ ] 2.1 Integrate shadcn/ui Calendar for date selection
  - [ ] 2.2 Implement range selection (start and end dates)
  - [ ] 2.3 Add month navigation (prev/next)
  - [ ] 2.4 Add "Apply" button for custom range
  - [ ] 2.5 Add "Cancel" button to close without applying
  - [ ] 2.6 Validate end date >= start date
  - [ ] 2.7 Reset tempRange state when popover closes

- [ ] **Task 3: Date Preset Logic** (AC: #3)
  - [ ] 3.1 Create `src/lib/date-presets.ts` utility
  - [ ] 3.2 Implement getPresetDateRange(preset) function
  - [ ] 3.3 Use date-fns for date calculations
  - [ ] 3.4 Handle timezone correctly (use local time)
  - [ ] 3.5 Return { from: Date, to: Date } for each preset

- [ ] **Task 4: URL State Management** (AC: #8)
  - [ ] 4.1 Extend `src/hooks/use-filter-params.ts` for date filter
  - [ ] 4.2 Read `from` and `to` from URL (YYYY-MM-DD format)
  - [ ] 4.3 Update URL when filter changes (router.replace)
  - [ ] 4.4 Validate date format and handle invalid params
  - [ ] 4.5 Reset page to 1 when filter changes

- [ ] **Task 5: Update useLeads Hook** (AC: #5, #6)
  - [ ] 5.1 Add `from` and `to` parameters to useLeads hook
  - [ ] 5.2 Update queryKey: `['leads', { page, limit, search, status, owner, from, to }]`
  - [ ] 5.3 Pass date params to API: `GET /api/admin/leads?from=...&to=...`
  - [ ] 5.4 Format dates as YYYY-MM-DD for API
  - [ ] 5.5 Ensure works with all other filters

- [ ] **Task 6: Update API Route** (AC: #5)
  - [ ] 6.1 Update `src/app/api/admin/leads/route.ts` to pass date params
  - [ ] 6.2 Verify backend supports `from` and `to` query parameters
  - [ ] 6.3 Backend should filter by createdAt >= from AND createdAt <= to

- [ ] **Task 7: Integration with LeadTable** (AC: #1-8)
  - [ ] 7.1 Add LeadDateFilter next to LeadOwnerFilter in container
  - [ ] 7.2 Update filter toolbar layout
  - [ ] 7.3 Wire up filter state with useDateFilterParams hook
  - [ ] 7.4 Pass date filter to useLeads hook
  - [ ] 7.5 Ensure combined filters work correctly

- [ ] **Task 8: Testing** (AC: #1-9)
  - [ ] 8.1 Test filter button renders with correct label
  - [ ] 8.2 Test preset selection calculates correct dates
  - [ ] 8.3 Test custom date range selection
  - [ ] 8.4 Test URL params sync (from, to)
  - [ ] 8.5 Test combined with status, owner, and search filters
  - [ ] 8.6 Test clear button removes filter
  - [ ] 8.7 Test keyboard navigation
  - [ ] 8.8 Use fake timers for date calculations (Pattern 3.3)
  - [ ] 8.9 Use E2E tests for Calendar component (jsdom issue)

## Dev Notes

### Backend Date Filter Support

Backend already supports date filter via query params:

```typescript
// Request: GET /api/admin/leads?from=2026-01-01&to=2026-01-15&page=1&limit=20
// Backend filters by: createdAt >= '2026-01-01' AND createdAt <= '2026-01-15'

interface LeadsResponse {
  success: boolean;
  data: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;      // Total FILTERED count
    totalPages: number;
  };
}
```

### Lead Date Fields (from Story 4-1)

```typescript
interface Lead {
  // ... other fields
  clickedAt: string | null;    // When email was clicked
  closedAt: string | null;     // When deal was closed
  lostAt: string | null;       // When lead was lost
  unreachableAt: string | null;
  createdAt: string;           // Primary filter field (required)
  updatedAt: string | null;
}

// Filter by createdAt as primary date field
```

### Date Preset Utility

```typescript
// src/lib/date-presets.ts
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export function getPresetDateRange(preset: DatePreset): DateRange | null {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case 'last7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last30days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'custom':
      return null; // Custom handled separately
    default:
      return null;
  }
}

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];
```

### Date Filter Component

```typescript
// src/components/leads/lead-date-filter.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  DATE_PRESET_OPTIONS,
  getPresetDateRange,
  type DatePreset,
  type DateRange,
} from '@/lib/date-presets';

interface LeadDateFilterProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  className?: string;
}

export function LeadDateFilter({
  value,
  onChange,
  className,
}: LeadDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | null>(null);

  const hasSelection = value !== null;

  // Reset state when popover closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setShowCalendar(false);
      setTempRange(null);
    }
  };

  const handlePresetClick = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCalendar(true);
      setTempRange(value);
      return;
    }

    const range = getPresetDateRange(preset);
    onChange(range);
    setOpen(false);
    setShowCalendar(false);
  };

  const handleApplyCustom = () => {
    if (tempRange?.from && tempRange?.to) {
      onChange(tempRange);
      setOpen(false);
      setShowCalendar(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
    setShowCalendar(false);
  };

  const getButtonLabel = (): string => {
    if (!value) return 'All Time';
    return `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d, yyyy')}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'h-9 border-dashed',
              hasSelection && 'border-primary'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getButtonLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          {!showCalendar ? (
            <div className="space-y-1">
              {/* All Time option */}
              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={handleClear}
              >
                All Time
              </button>

              <div className="my-1 h-px bg-border" />

              {/* Preset options */}
              {DATE_PRESET_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => handlePresetClick(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Calendar
                mode="range"
                selected={{
                  from: tempRange?.from,
                  to: tempRange?.to,
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setTempRange({ from: range.from, to: range.to });
                  } else if (range?.from) {
                    setTempRange({ from: range.from, to: range.from });
                  }
                }}
                numberOfMonths={1}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCalendar(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyCustom}
                  disabled={!tempRange?.from || !tempRange?.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Clear button when filter active */}
      {hasSelection && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={handleClear}
          aria-label="Clear date filter"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
```

### URL Filter Params Hook (Extended)

```typescript
// src/hooks/use-filter-params.ts (extend existing)
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import type { DateRange } from '@/lib/date-presets';

const DATE_FORMAT = 'yyyy-MM-dd';

export function useDateFilterParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse dates from URL
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  let dateRange: DateRange | null = null;

  if (fromParam && toParam) {
    const from = parseISO(fromParam);
    const to = parseISO(toParam);
    if (isValid(from) && isValid(to)) {
      dateRange = { from, to };
    }
  }

  const setDateRange = useCallback((range: DateRange | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (range) {
      params.set('from', format(range.from, DATE_FORMAT));
      params.set('to', format(range.to, DATE_FORMAT));
    } else {
      params.delete('from');
      params.delete('to');
    }

    // Reset to page 1 when filter changes
    params.set('page', '1');

    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  return { dateRange, setDateRange };
}
```

### Integration with Container

```typescript
// In lead-table-container.tsx (updated)
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/use-debounce';
import { useLeadSearchParams } from '@/hooks/use-search-params';
import { usePaginationParams } from '@/hooks/use-pagination-params';
import {
  useStatusFilterParams,
  useOwnerFilterParams,
  useDateFilterParams,
} from '@/hooks/use-filter-params';
import { useLeads } from '@/hooks/use-leads';
import { LeadSearch } from './lead-search';
import { LeadStatusFilter } from './lead-status-filter';
import { LeadOwnerFilter } from './lead-owner-filter';
import { LeadDateFilter } from './lead-date-filter';
import { LeadTable } from './lead-table';
import { LeadPagination } from './lead-pagination';

export function LeadTableContainer() {
  const { search, setSearch } = useLeadSearchParams();
  const { page, limit, setPage, setLimit } = usePaginationParams();
  const { statuses, setStatuses } = useStatusFilterParams();
  const { owners, setOwners } = useOwnerFilterParams();
  const { dateRange, setDateRange } = useDateFilterParams();

  const [inputValue, setInputValue] = useState(search);
  const debouncedSearch = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const { data, isLoading, isFetching } = useLeads({
    page,
    limit,
    search: debouncedSearch,
    status: statuses,
    owner: owners,
    from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  });

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <LeadSearch
          value={inputValue}
          onChange={setInputValue}
          isPending={inputValue !== debouncedSearch}
          className="flex-1 min-w-[200px]"
        />
        <LeadStatusFilter
          value={statuses}
          onChange={setStatuses}
        />
        <LeadOwnerFilter
          value={owners}
          onChange={setOwners}
        />
        <LeadDateFilter
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      <LeadTable
        data={data?.data ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <LeadPagination
        page={page}
        limit={limit}
        total={data?.pagination.total ?? 0}
        totalPages={data?.pagination.totalPages ?? 0}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isFetching={isFetching}
      />
    </div>
  );
}
```

### Update useLeads Hook

```typescript
// src/hooks/use-leads.ts (updated)
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchLeads } from '@/lib/api/leads';
import type { LeadStatus } from '@/lib/leads-constants';

interface UseLeadsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus[];
  owner?: string[];
  from?: string;  // YYYY-MM-DD format
  to?: string;    // YYYY-MM-DD format
}

export function useLeads({
  page = 1,
  limit = 20,
  search = '',
  status = [],
  owner = [],
  from,
  to,
}: UseLeadsParams = {}) {
  return useQuery({
    queryKey: ['leads', { page, limit, search, status, owner, from, to }],
    queryFn: () => fetchLeads({ page, limit, search, status, owner, from, to }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
```

### Component Structure

```
src/
├── components/leads/
│   ├── lead-date-filter.tsx        # Date filter dropdown (new)
│   └── lead-table-container.tsx    # Updated with date filter
├── hooks/
│   ├── use-leads.ts                # Updated with from/to params
│   └── use-filter-params.ts        # Extended with date filter
├── lib/
│   └── date-presets.ts             # Date preset calculations (new)
└── app/api/admin/leads/
    └── route.ts                    # Updated to pass from/to
```

### shadcn/ui Components Required

May need to install:
```bash
npx shadcn-ui@latest add calendar
```

Calendar uses react-day-picker under the hood.

### Testing Notes (IMPORTANT)

From Epic 2 Retrospective:
- **react-day-picker causes infinite loop in jsdom** - Cannot unit test Calendar directly
- **Use E2E tests for Calendar interactions** - Playwright for date selection
- **Unit test presets and URL logic** - These work fine with fake timers
- **Pattern 3.3** - Use vi.useFakeTimers() for date calculations

```typescript
// Test date presets with fake timers
const TEST_DATE = new Date('2026-01-15T10:00:00Z');

describe('getPresetDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TEST_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates "today" correctly', () => {
    const range = getPresetDateRange('today');
    expect(range?.from.toISOString().slice(0, 10)).toBe('2026-01-15');
    expect(range?.to.toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('calculates "last7days" correctly', () => {
    const range = getPresetDateRange('last7days');
    expect(range?.from.toISOString().slice(0, 10)).toBe('2026-01-09');
    expect(range?.to.toISOString().slice(0, 10)).toBe('2026-01-15');
  });
});
```

### Architecture Compliance

From project-context.md:
- date-fns ^3.2.0 for date manipulation
- TanStack Query v5 object syntax
- URL state for shareable links
- useSearchParams needs Suspense wrapper

### Critical Don't-Miss Rules

1. **Filter by createdAt** - Primary date field (required in Lead)
2. **YYYY-MM-DD URL format** - ISO date format for URL params
3. **Reset to page 1** - When filter changes
4. **Preserve other params** - Don't lose search/status/owner/limit
5. **date-fns v3** - Use named imports (not default)
6. **E2E for Calendar** - Unit tests cause infinite loop
7. **Local timezone** - Use startOfDay/endOfDay with local time

### Dependencies

Existing:
- `date-fns` ^3.2.0 - Date manipulation
- `@tanstack/react-query` - Data fetching
- `lucide-react` - Calendar, X icons
- shadcn/ui Popover, Button, Calendar components

### References

- [Source: epics.md#F-04.6] - Feature definition "กรองตามวันที่"
- [Source: project-context.md] - date-fns v3, Lead createdAt field
- [Source: stories/2-7-date-filter.md] - Date filter pattern (Dashboard)
- [Source: stories/4-4-filter-by-status.md] - Multi-filter integration
- [Source: docs/test-pattern-library.md#3.3] - Time-Based Hook Test
- [Source: epic-2-retro] - react-day-picker jsdom issue

## Code Review

_To be completed after implementation_

