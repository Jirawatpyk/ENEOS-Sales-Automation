# Story 4.7: Sort Columns

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to sort the leads table by clicking column headers**,
so that **I can quickly organize leads by date, company, status, or any other column to find what I need**.

## Acceptance Criteria

1. **AC1: Sortable Column Headers**
   - Given I am viewing the leads table
   - When I look at the column headers
   - Then I see sort indicators on sortable columns (Company, Status, Owner, Date)
   - And headers have hover state indicating they are clickable
   - And cursor changes to pointer on sortable columns

2. **AC2: Single Column Sort**
   - Given I click the "Company" column header
   - When the sort is applied
   - Then the table sorts by company name ascending (A-Z)
   - And the column header shows ascending indicator (▲)
   - When I click the same header again
   - Then the sort toggles to descending (Z-A)
   - And the column header shows descending indicator (▼)

3. **AC3: Sort Indicator Display**
   - Given a column is sorted
   - When viewing the column header
   - Then I see a clear sort direction indicator (arrow up or down)
   - And the sorted column header is visually highlighted
   - And other column headers show neutral state

4. **AC4: Default Sort**
   - Given I navigate to the leads page
   - When the page first loads
   - Then leads are sorted by "Created Date" descending (newest first)
   - And the Date column shows descending indicator
   - And URL has no sort params (default behavior)

5. **AC5: URL State Sync**
   - Given I sort by "Company" ascending
   - When the sort is applied
   - Then URL updates to `?sortBy=company&sortOrder=asc`
   - When I refresh the page
   - Then the sort is preserved
   - When I share this URL
   - Then others see the same sorted view

6. **AC6: Sort with Filters**
   - Given I have status filter "New" active
   - When I also sort by "Created Date" ascending
   - Then filtered results are sorted by date
   - And URL shows `?status=new&sortBy=createdAt&sortOrder=asc`
   - When I change the sort
   - Then filters remain active

7. **AC7: Sort with Pagination**
   - Given I am on page 3 of results
   - When I change the sort order
   - Then pagination resets to page 1
   - And results are sorted across all pages (server-side)
   - And total count remains the same

8. **AC8: Server-Side Sorting**
   - Given I sort by any column
   - When the API is called
   - Then sorting happens on the server (not client-side)
   - And API receives `sortBy` and `sortOrder` parameters
   - And large datasets are sorted efficiently

9. **AC9: Accessibility**
   - Given sortable column headers are rendered
   - When I use keyboard navigation
   - Then I can Tab to each sortable header
   - And I can press Enter/Space to sort
   - And screen reader announces sort direction
   - And aria-sort attribute is set correctly

## Tasks / Subtasks

- [ ] **Task 1: Update Column Definitions** (AC: #1, #2, #3)
  - [ ] 1.1 Add `enableSorting: true` to sortable columns
  - [ ] 1.2 Define sortable columns: company, status, salesOwnerName, createdAt
  - [ ] 1.3 Add `enableSorting: false` to non-sortable columns (row number, actions)
  - [ ] 1.4 Add header render function for sort indicators

- [ ] **Task 2: Sort Indicator Component** (AC: #3)
  - [ ] 2.1 Create sort indicator with ArrowUp, ArrowDown, ArrowUpDown icons
  - [ ] 2.2 Show ArrowUpDown (neutral) when column is not sorted
  - [ ] 2.3 Show ArrowUp when ascending
  - [ ] 2.4 Show ArrowDown when descending
  - [ ] 2.5 Style active sort indicator with primary color

- [ ] **Task 3: Clickable Headers** (AC: #1, #2, #9)
  - [ ] 3.1 Make sortable headers clickable with pointer cursor
  - [ ] 3.2 Add hover state (background highlight)
  - [ ] 3.3 Implement onClick to toggle sort
  - [ ] 3.4 Add keyboard support (Enter/Space)
  - [ ] 3.5 Add `role="button"` and `tabIndex={0}` for accessibility
  - [ ] 3.6 Add `aria-sort` attribute (ascending/descending/none)

- [ ] **Task 4: URL State Management** (AC: #5)
  - [ ] 4.1 Create `src/hooks/use-sort-params.ts`
  - [ ] 4.2 Read `sortBy` and `sortOrder` from URL
  - [ ] 4.3 Update URL when sort changes (router.replace)
  - [ ] 4.4 Validate sortBy against allowed columns
  - [ ] 4.5 Default: sortBy=createdAt, sortOrder=desc (not in URL)

- [ ] **Task 5: Update useLeads Hook** (AC: #8)
  - [ ] 5.1 Add `sortBy` and `sortOrder` parameters to useLeads
  - [ ] 5.2 Update queryKey: `['leads', { ...filters, sortBy, sortOrder }]`
  - [ ] 5.3 Pass sort params to API: `GET /api/admin/leads?sortBy=company&sortOrder=asc`
  - [ ] 5.4 Ensure sort works with all filters

- [ ] **Task 6: Update API Route** (AC: #8)
  - [ ] 6.1 Update `src/app/api/admin/leads/route.ts` to pass sort params
  - [ ] 6.2 Verify backend supports `sortBy` and `sortOrder` query parameters
  - [ ] 6.3 Backend already supports: company, status, createdAt (date alias)
  - [ ] 6.4 Add `salesOwnerName` sort support to backend if not exists

- [ ] **Task 7: Integration with LeadTable** (AC: #1-8)
  - [ ] 7.1 Pass sorting state to TanStack Table
  - [ ] 7.2 Connect URL params to table sorting state
  - [ ] 7.3 Reset to page 1 when sort changes
  - [ ] 7.4 Ensure sort works with pagination and filters

- [ ] **Task 8: Testing** (AC: #1-9)
  - [ ] 8.1 Test sortable columns have sort indicators
  - [ ] 8.2 Test clicking header toggles sort
  - [ ] 8.3 Test URL params sync (sortBy, sortOrder)
  - [ ] 8.4 Test sort resets pagination to page 1
  - [ ] 8.5 Test sort works with filters
  - [ ] 8.6 Test keyboard navigation
  - [ ] 8.7 Test accessibility (aria-sort)
  - [ ] 8.8 Test default sort on page load

## Dev Notes

### Backend Sort Support

Backend already supports sorting via query params (confirmed in Story 4-1):

```typescript
// Request: GET /api/admin/leads?sortBy=company&sortOrder=asc&page=1&limit=20
// Supported sortBy values: company, status, createdAt (alias: date)
// NOTE: salesOwnerName may need backend support - verify or add to backend

interface LeadsResponse {
  success: boolean;
  data: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Sortable Columns

| Column | sortBy Value | Default Order |
|--------|--------------|---------------|
| Company | `company` | A-Z (asc) |
| Status | `status` | A-Z (asc) |
| Sales Owner | `salesOwnerName` | A-Z (asc) |
| Created Date | `createdAt` | Newest first (desc) |

Non-sortable: Row #, Email, Phone, Campaign, Actions

### TanStack Table Sorting Setup (from Story 4-1)

```typescript
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';

// Sorting state synced with URL
const [sorting, setSorting] = useState<SortingState>([
  { id: 'createdAt', desc: true }  // Default sort
]);

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  onSortingChange: setSorting,
  state: { sorting },
  manualSorting: true,  // Server-side sorting
});
```

### Sort Indicator Component

```typescript
// src/components/leads/sortable-header.tsx
import { type Column } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/lead';

interface SortableHeaderProps {
  column: Column<Lead, unknown>;
  children: React.ReactNode;
}

export function SortableHeader({ column, children }: SortableHeaderProps) {
  const isSorted = column.getIsSorted();

  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-1 hover:bg-muted/50 px-2 py-1 -mx-2 rounded',
        isSorted && 'text-primary'
      )}
      onClick={() => column.toggleSorting()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          column.toggleSorting();
        }
      }}
      aria-sort={
        isSorted === 'asc' ? 'ascending' :
        isSorted === 'desc' ? 'descending' : 'none'
      }
      tabIndex={0}
    >
      {children}
      {isSorted === 'asc' ? (
        <ArrowUp className="h-4 w-4" />
      ) : isSorted === 'desc' ? (
        <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}
```

### Column Definition with Sorting

```typescript
const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'company',
    header: ({ column }) => (
      <SortableHeader column={column}>Company</SortableHeader>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <SortableHeader column={column}>Status</SortableHeader>
    ),
    enableSorting: true,
    cell: ({ getValue }) => <LeadStatusBadge status={getValue() as LeadStatus} />,
  },
  {
    accessorKey: 'salesOwnerName',
    header: ({ column }) => (
      <SortableHeader column={column}>Sales Owner</SortableHeader>
    ),
    enableSorting: true,
    cell: ({ getValue }) => getValue() || 'Unassigned',
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <SortableHeader column={column}>Created Date</SortableHeader>
    ),
    enableSorting: true,
    cell: ({ getValue }) => format(new Date(getValue() as string), 'dd MMM yyyy'),
  },
  // Non-sortable columns
  {
    accessorKey: 'email',
    header: 'Email',
    enableSorting: false,
  },
];
```

### URL Sort Params Hook

```typescript
// src/hooks/use-sort-params.ts
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

const VALID_SORT_COLUMNS = ['company', 'status', 'salesOwnerName', 'createdAt'];
const VALID_SORT_ORDERS = ['asc', 'desc'] as const;

type SortOrder = typeof VALID_SORT_ORDERS[number];

interface SortParams {
  sortBy: string;
  sortOrder: SortOrder;
}

const DEFAULT_SORT: SortParams = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export function useSortParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse sort from URL
  const sortByParam = searchParams.get('sortBy');
  const sortOrderParam = searchParams.get('sortOrder') as SortOrder | null;

  const sortBy = VALID_SORT_COLUMNS.includes(sortByParam || '')
    ? sortByParam!
    : DEFAULT_SORT.sortBy;

  const sortOrder = VALID_SORT_ORDERS.includes(sortOrderParam as SortOrder)
    ? sortOrderParam!
    : DEFAULT_SORT.sortOrder;

  const setSort = useCallback((newSortBy: string, newSortOrder: SortOrder) => {
    const params = new URLSearchParams(searchParams.toString());

    // Only set URL params if different from default
    if (newSortBy === DEFAULT_SORT.sortBy && newSortOrder === DEFAULT_SORT.sortOrder) {
      params.delete('sortBy');
      params.delete('sortOrder');
    } else {
      params.set('sortBy', newSortBy);
      params.set('sortOrder', newSortOrder);
    }

    // Reset to page 1 when sort changes
    params.set('page', '1');

    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const toggleSort = useCallback((columnId: string) => {
    if (sortBy === columnId) {
      // Toggle order
      setSort(columnId, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending (except createdAt which defaults to desc)
      const defaultOrder = columnId === 'createdAt' ? 'desc' : 'asc';
      setSort(columnId, defaultOrder);
    }
  }, [sortBy, sortOrder, setSort]);

  return { sortBy, sortOrder, setSort, toggleSort };
}
```

### LeadTable Props Update

```typescript
// Update LeadTable component props
interface LeadTableProps {
  data: Lead[];
  isLoading: boolean;
  isFetching: boolean;
  sorting: SortingState;
  onSortingChange: (columnId: string) => void;
}
```

### Integration with Container

```typescript
// In lead-table-container.tsx (updated)
'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import type { SortingState } from '@tanstack/react-table';
import { useDebounce } from '@/hooks/use-debounce';
import { useLeadSearchParams } from '@/hooks/use-search-params';
import { usePaginationParams } from '@/hooks/use-pagination-params';
import {
  useStatusFilterParams,
  useOwnerFilterParams,
  useDateFilterParams,
} from '@/hooks/use-filter-params';
import { useSortParams } from '@/hooks/use-sort-params';
import { useLeads } from '@/hooks/use-leads';
// ... other imports

export function LeadTableContainer() {
  const { search, setSearch } = useLeadSearchParams();
  const { page, limit, setPage, setLimit } = usePaginationParams();
  const { statuses, setStatuses } = useStatusFilterParams();
  const { owners, setOwners } = useOwnerFilterParams();
  const { dateRange, setDateRange } = useDateFilterParams();
  const { sortBy, sortOrder, toggleSort } = useSortParams();

  // Convert URL sort params to TanStack Table SortingState
  const sorting: SortingState = useMemo(() => [
    { id: sortBy, desc: sortOrder === 'desc' }
  ], [sortBy, sortOrder]);

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
    sortBy,
    sortOrder,
  });

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* ... search and filter components */}
      </div>

      <LeadTable
        data={data?.data ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        sorting={sorting}
        onSortingChange={toggleSort}
      />

      <LeadPagination
        {/* ... pagination props */}
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
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useLeads({
  page = 1,
  limit = 20,
  search = '',
  status = [],
  owner = [],
  from,
  to,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}: UseLeadsParams = {}) {
  return useQuery({
    queryKey: ['leads', { page, limit, search, status, owner, from, to, sortBy, sortOrder }],
    queryFn: () => fetchLeads({ page, limit, search, status, owner, from, to, sortBy, sortOrder }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
```

### Component Structure

```
src/
├── components/leads/
│   ├── sortable-header.tsx         # Sort indicator component (new)
│   ├── lead-table.tsx              # Updated with sorting
│   └── lead-table-container.tsx    # Updated with sort params
├── hooks/
│   ├── use-leads.ts                # Updated with sortBy/sortOrder
│   └── use-sort-params.ts          # Sort URL sync (new)
└── app/api/admin/leads/
    └── route.ts                    # Already supports sorting
```

### Architecture Compliance

From project-context.md:
- TanStack Table for sorting (manualSorting: true for server-side)
- TanStack Query v5 object syntax
- URL state for shareable links
- useSearchParams needs Suspense wrapper

### Testing Patterns

From Test Pattern Library:
- Mock next/navigation for URL params (Pattern 2.1)
- Component callback testing (Pattern 1.3)
- Keyboard navigation testing

### Critical Don't-Miss Rules

1. **Server-side sorting** - Use `manualSorting: true` in TanStack Table
2. **Reset to page 1** - When sort changes
3. **Preserve filters** - Don't lose search/status/owner/date
4. **Default not in URL** - createdAt desc is default, don't put in URL
5. **4 sortable columns** - company, status, salesOwnerName, createdAt
6. **Accessibility** - aria-sort, keyboard support, focus states

### Dependencies

Existing:
- `@tanstack/react-table` - Table with sorting
- `@tanstack/react-query` - Data fetching
- `lucide-react` - ArrowUp, ArrowDown, ArrowUpDown icons

### References

- [Source: epics.md#F-04.7] - Feature definition "เรียงตามคอลัมน์"
- [Source: stories/4-1-lead-list-table.md] - TanStack Table setup, getSortedRowModel
- [Source: stories/4-1-lead-list-table.md#Code Review] - Backend sort support confirmed
- [Source: project-context.md] - TanStack Table patterns
- [Source: docs/test-pattern-library.md] - Testing patterns

## Code Review

_To be completed after implementation_

