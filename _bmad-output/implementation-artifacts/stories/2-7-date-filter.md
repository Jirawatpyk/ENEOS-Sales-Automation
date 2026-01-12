# Story 2.7: Date Filter

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to filter dashboard data by different time periods**,
so that **I can analyze performance for today, this week, or this month**.

## Acceptance Criteria

1. **AC1: Filter Dropdown Display**
   - Given I am on the dashboard
   - When the page loads
   - Then I see a date filter dropdown in the header
   - And the default selection is "This Month"

2. **AC2: Filter Options**
   - Given I click the filter dropdown
   - When the options appear
   - Then I see: Today, This Week, This Month, Last Month, Custom Range
   - And options are clearly labeled

3. **AC3: Filter Application**
   - Given I select a filter option (e.g., "This Week")
   - When the selection is made
   - Then all dashboard components update with filtered data
   - And a loading indicator shows during data fetch

4. **AC4: URL Sync**
   - Given I change the filter
   - When the filter is applied
   - Then the URL updates with query param (e.g., `?period=week`)
   - And refreshing the page preserves the filter

5. **AC5: Custom Date Range**
   - Given I select "Custom Range"
   - When the date picker appears
   - Then I can select a start and end date
   - And clicking "Apply" filters the data

6. **AC6: Visual Feedback**
   - Given a filter is active
   - When displayed
   - Then the dropdown shows the selected period
   - And non-default filters show a visual indicator

7. **AC7: Persistence**
   - Given I select a filter
   - When I navigate away and return to dashboard
   - Then my filter selection is preserved (via URL)

## Tasks / Subtasks

- [ ] **Task 1: Filter Component** (AC: #1, #2)
  - [ ] 1.1 Create `src/components/dashboard/date-filter.tsx`
  - [ ] 1.2 Use shadcn/ui Select component
  - [ ] 1.3 Define filter options: today, week, month, lastMonth, custom
  - [ ] 1.4 Style to match header design

- [ ] **Task 2: Filter Logic** (AC: #3, #4)
  - [ ] 2.1 Create `useDateFilter` hook
  - [ ] 2.2 Calculate date ranges for each option
  - [ ] 2.3 Sync filter state with URL search params
  - [ ] 2.4 Update TanStack Query key with period

- [ ] **Task 3: Custom Date Range** (AC: #5)
  - [ ] 3.1 Add date range picker component
  - [ ] 3.2 Use shadcn/ui Calendar or DatePicker
  - [ ] 3.3 Implement start/end date selection
  - [ ] 3.4 Add "Apply" button for custom range

- [ ] **Task 4: Dashboard Integration** (AC: #3)
  - [ ] 4.1 Pass filter period to `useDashboardData` hook
  - [ ] 4.2 Update API call with date parameters
  - [ ] 4.3 Show loading state during filter change

- [ ] **Task 5: URL Management** (AC: #4, #7)
  - [ ] 5.1 Use `useSearchParams` from Next.js
  - [ ] 5.2 Update URL on filter change
  - [ ] 5.3 Read filter from URL on page load
  - [ ] 5.4 Handle invalid URL params gracefully

- [ ] **Task 6: Visual Feedback** (AC: #6)
  - [ ] 6.1 Show selected option in dropdown
  - [ ] 6.2 Add indicator for non-default filter
  - [ ] 6.3 Add clear/reset button for custom ranges

- [ ] **Task 7: Testing** (AC: #1-7)
  - [ ] 7.1 Test filter options render
  - [ ] 7.2 Test data updates on filter change
  - [ ] 7.3 Test URL sync works
  - [ ] 7.4 Test custom date range
  - [ ] 7.5 Test persistence on navigation

## Dev Notes

### Implementation

```typescript
// src/components/dashboard/date-filter.tsx
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

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
] as const;

type Period = typeof PERIOD_OPTIONS[number]['value'];

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = (searchParams.get('period') as Period) || 'month';

  const handlePeriodChange = (period: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <Select value={currentPeriod} onValueChange={handlePeriodChange}>
      <SelectTrigger className="w-[180px]">
        <Calendar className="mr-2 h-4 w-4" />
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
  );
}
```

### Date Filter Hook

```typescript
// src/hooks/use-date-filter.ts
import { useSearchParams } from 'next/navigation';
import { startOfDay, startOfWeek, startOfMonth, subMonths, endOfMonth } from 'date-fns';

export function useDateFilter() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'month';

  const getDateRange = () => {
    const now = new Date();

    switch (period) {
      case 'today':
        return {
          from: startOfDay(now),
          to: now,
        };
      case 'week':
        return {
          from: startOfWeek(now, { weekStartsOn: 1 }),
          to: now,
        };
      case 'month':
        return {
          from: startOfMonth(now),
          to: now,
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      case 'custom':
        // Handle custom from URL params
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

  return {
    period,
    ...getDateRange(),
  };
}
```

### Custom Date Range Picker

```typescript
// src/components/dashboard/custom-date-range.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function CustomDateRange() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState<DateRange | undefined>();
  const [open, setOpen] = useState(false);

  const applyCustomRange = () => {
    if (!date?.from || !date?.to) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('period', 'custom');
    params.set('from', date.from.toISOString());
    params.set('to', date.to.toISOString());
    router.push(`/dashboard?${params.toString()}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
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
        />
        <div className="p-3 border-t flex justify-end gap-2">
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

### Updated DateFilter with Custom Range

```typescript
// Updated date-filter.tsx to include custom range picker
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
import { CustomDateRange } from './custom-date-range';

// ... PERIOD_OPTIONS and types same as above

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = (searchParams.get('period') as Period) || 'month';

  const handlePeriodChange = (period: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    // Clear custom date params if not custom
    if (period !== 'custom') {
      params.delete('from');
      params.delete('to');
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[180px]">
          <Calendar className="mr-2 h-4 w-4" />
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

      {currentPeriod === 'custom' && <CustomDateRange />}
    </div>
  );
}
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add select
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add button
```

### Dependencies

- `date-fns` - Date calculations (startOfDay, startOfWeek, startOfMonth, subMonths, endOfMonth, format)
- `lucide-react` - Icons (Calendar)
- `react-day-picker` - DateRange type (installed with shadcn calendar)
- Story 2-1 should be complete for shared patterns

### File Structure

```
src/
├── components/dashboard/
│   ├── date-filter.tsx       # Main filter dropdown
│   └── custom-date-range.tsx # Custom range picker
└── hooks/
    └── use-date-filter.ts    # Date range calculation hook
```

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.7] - Date Filter feature

## Dev Agent Record

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

