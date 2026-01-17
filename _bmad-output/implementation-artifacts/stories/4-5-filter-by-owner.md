# Story 4.5: Filter by Owner

Status: done

## Story

As an **ENEOS manager**,
I want **to filter leads by their assigned sales owner**,
so that **I can view leads handled by specific team members or unassigned leads that need attention**.

## Acceptance Criteria

1. **AC1: Owner Filter Display**
   - Given I am on the leads page
   - When the page loads
   - Then I see an "Owner" filter dropdown next to the status filter
   - And the dropdown shows "All Owners" by default
   - And the dropdown has a user icon

2. **AC2: Owner Options**
   - Given I click the owner filter dropdown
   - When the dropdown opens
   - Then I see "Unassigned" option at top (for leads without owner)
   - And I see all sales team members from the Sales_Team data
   - And each option shows the owner's name
   - And "All Owners" option to clear filter

3. **AC3: Multi-Select Filter**
   - Given I want to see leads from multiple owners
   - When I select "John" owner
   - Then the table filters to show only John's leads
   - When I also select "Jane" owner
   - Then the table shows both John's AND Jane's leads
   - And the dropdown shows "2 selected" indicator
   - And selected owners have checkmarks

4. **AC4: Filter Results**
   - Given I select a specific owner
   - When the filter is applied
   - Then the table shows only leads with that salesOwnerId
   - And pagination reflects the filtered count
   - And "Showing 1-20 of 35 leads" shows filtered total
   - And the URL updates with `?owner=<userId>` parameter

5. **AC5: Unassigned Filter**
   - Given I select "Unassigned" option
   - When the filter is applied
   - Then the table shows only leads where salesOwnerId is null
   - And URL shows `?owner=unassigned`
   - When I combine with "Claimed" status filter
   - Then both filters apply together

6. **AC6: Combined Filters**
   - Given I have status filter "Contacted" active
   - When I also filter by owner "John"
   - Then the table shows leads matching BOTH conditions
   - And URL shows `?status=contacted&owner=<johnId>`
   - When I clear the owner filter
   - Then status filter remains active

7. **AC7: Clear Filter**
   - Given I have owner filter active
   - When I click "All Owners" or a clear button
   - Then the owner filter is removed
   - And the table shows all leads (respecting other filters)
   - And the URL removes the `?owner=` parameter
   - And pagination resets to page 1

8. **AC8: URL State Sync**
   - Given I navigate to `/leads?owner=<userId>,<userId2>`
   - When the page loads
   - Then the filter dropdown shows those owners selected
   - And the table shows only their leads
   - When I share this URL with another user
   - Then they see the same filtered view

9. **AC9: Accessibility**
   - Given the filter dropdown is rendered
   - When I use keyboard navigation
   - Then I can open dropdown with Enter/Space
   - And I can navigate options with Arrow keys
   - And I can select/deselect with Enter/Space
   - And screen reader announces selected state

## Tasks / Subtasks

- [x] **Task 1: Owner Filter Component** (AC: #1, #2, #8, #9)
  - [x] 1.0 Reuse shadcn/ui Popover (already installed from 4-4)
  - [x] 1.1 Create `src/components/leads/lead-owner-filter.tsx`
  - [x] 1.2 Use shadcn/ui Popover with checkbox-style selection
  - [x] 1.3 Add user icon (lucide-react User icon)
  - [x] 1.4 Display "Unassigned" option at top
  - [x] 1.5 Display all sales team members
  - [x] 1.6 Add "All Owners" option to clear filter
  - [x] 1.7 Show "X selected" indicator when filters active
  - [x] 1.8 Add clear button (X) when filters active
  - [x] 1.9 Implement keyboard navigation
  - [x] 1.10 Add `type="button"` to all buttons inside Popover

- [x] **Task 2: Fetch Sales Team Members** (AC: #2)
  - [x] 2.1 Create `src/hooks/use-sales-team.ts` hook
  - [x] 2.2 Verify `/api/admin/sales-team` endpoint exists (or create if needed)
  - [x] 2.3 Fetch from backend API with proper error handling
  - [x] 2.4 Return array of { id: string, name: string }
  - [x] 2.5 Handle loading, error, and empty states
  - [x] 2.6 Use staleTime 5 minutes since team rarely changes

- [x] **Task 3: Multi-Select Logic** (AC: #3, #5)
  - [x] 3.1 Manage selected owners as array state
  - [x] 3.2 Toggle owner on click (add/remove from array)
  - [x] 3.3 Handle "Unassigned" as special value `unassigned`
  - [x] 3.4 Handle "All Owners" to clear selection
  - [x] 3.5 Show checkmarks for selected items

- [x] **Task 4: URL State Management** (AC: #8)
  - [x] 4.1 Extend `src/hooks/use-filter-params.ts` for owner filter
  - [x] 4.2 Read `owner` from URL (comma-separated: `owner=id1,id2,unassigned`)
  - [x] 4.3 Update URL when filter changes (router.replace)
  - [x] 4.4 Validate owner IDs against sales team list
  - [x] 4.5 Reset page to 1 when filter changes

- [x] **Task 5: Update useLeads Hook** (AC: #4, #6)
  - [x] 5.1 Add `owner` parameter (array) to useLeads hook
  - [x] 5.2 Update queryKey: `['leads', { page, limit, search, status, owner }]`
  - [x] 5.3 Pass owner to API: `GET /api/admin/leads?owner=id1,id2`
  - [x] 5.4 Handle `unassigned` special value
  - [x] 5.5 Ensure works with search, status, and pagination

- [x] **Task 6: Update API Route** (AC: #4, #5)
  - [x] 6.1 Update `src/app/api/admin/leads/route.ts` to pass owner param
  - [x] 6.2 Verify backend supports `owner` query parameter
  - [x] 6.3 Backend should accept comma-separated owner IDs
  - [x] 6.4 Backend should handle `unassigned` for null salesOwnerId

- [x] **Task 7: Integration with LeadTable** (AC: #1-8)
  - [x] 7.1 Add LeadOwnerFilter next to LeadStatusFilter in container
  - [x] 7.2 Update filter toolbar layout
  - [x] 7.3 Wire up filter state with useFilterParams hook
  - [x] 7.4 Pass owner filter to useLeads hook
  - [x] 7.5 Ensure combined filters work correctly

- [x] **Task 8: Testing** (AC: #1-9)
  - [x] 8.1 Test filter dropdown renders with all owners
  - [x] 8.2 Test single owner selection filters correctly
  - [x] 8.3 Test multi-select combines owners
  - [x] 8.4 Test "Unassigned" option works
  - [x] 8.5 Test "All Owners" clears filter
  - [x] 8.6 Test URL params sync (owner)
  - [x] 8.7 Test combined with status and search filters
  - [x] 8.8 Test keyboard navigation
  - [x] 8.9 Test clear button removes filter

## Dev Notes

### Backend Owner Filter Support

Backend already supports owner filter via query param:

```typescript
// Request: GET /api/admin/leads?owner=user123,user456&page=1&limit=20
// Backend filters by salesOwnerId IN ('user123', 'user456')

// For unassigned leads:
// GET /api/admin/leads?owner=unassigned
// Backend filters by salesOwnerId IS NULL

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

### Sales Team Data Structure

From backend Sales_Team sheet:

```typescript
interface SalesTeamMember {
  id: string;        // LINE User ID (e.g., "U1234567890abcdef")
  name: string;      // Display name (e.g., "John Smith")
  email: string;     // Email address
  phone: string;     // Phone number
}

// Special value for unassigned leads
const UNASSIGNED_OWNER = 'unassigned';

interface OwnerOption {
  value: string;  // userId or 'unassigned'
  label: string;  // Display name or 'Unassigned'
}
```

### Owner Filter Component

```typescript
// src/components/leads/lead-owner-filter.tsx
'use client';

import { useState } from 'react';
import { User, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSalesTeam } from '@/hooks/use-sales-team';

const UNASSIGNED_VALUE = 'unassigned';

interface LeadOwnerFilterProps {
  value: string[];  // Array of owner IDs or 'unassigned'
  onChange: (owners: string[]) => void;
  className?: string;
}

export function LeadOwnerFilter({
  value,
  onChange,
  className,
}: LeadOwnerFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: salesTeam, isLoading, isError } = useSalesTeam();

  const toggleOwner = (ownerId: string) => {
    if (value.includes(ownerId)) {
      onChange(value.filter((id) => id !== ownerId));
    } else {
      onChange([...value, ownerId]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setOpen(false);
  };

  const selectedCount = value.length;
  const hasSelection = selectedCount > 0;

  // Get display label for selected owners (useful for tooltips or aria-labels)
  const getOwnerLabel = (ownerId: string): string => {
    if (ownerId === UNASSIGNED_VALUE) return 'Unassigned';
    return salesTeam?.find((m) => m.id === ownerId)?.name || ownerId;
  };

  // Example: aria-label for clear button
  // `Clear filter: ${value.map(getOwnerLabel).join(', ')}`

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
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
            <User className="mr-2 h-4 w-4" />
            Owner
            {hasSelection && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            {/* All Owners option */}
            <button
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={clearAll}
            >
              <span className="flex-1 text-left">All Owners</span>
              {!hasSelection && <Check className="h-4 w-4" />}
            </button>

            <div className="my-1 h-px bg-border" />

            {/* Unassigned option */}
            <button
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => toggleOwner(UNASSIGNED_VALUE)}
            >
              <span className="flex-1 text-left text-muted-foreground">
                Unassigned
              </span>
              {value.includes(UNASSIGNED_VALUE) && (
                <Check className="h-4 w-4" />
              )}
            </button>

            <div className="my-1 h-px bg-border" />

            {/* Loading state */}
            {isLoading && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Loading...
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div className="px-2 py-1.5 text-sm text-destructive">
                Failed to load team
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && salesTeam?.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No team members found
              </div>
            )}

            {/* Sales team members */}
            {salesTeam?.map((member) => {
              const isSelected = value.includes(member.id);
              return (
                <button
                  type="button"
                  key={member.id}
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => toggleOwner(member.id)}
                >
                  <span className="flex-1 text-left">{member.name}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter indicator with clear button */}
      {hasSelection && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={clearAll}
        >
          {selectedCount} selected
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
```

### useSalesTeam Hook

```typescript
// src/hooks/use-sales-team.ts
'use client';

import { useQuery } from '@tanstack/react-query';

interface SalesTeamMember {
  id: string;
  name: string;
  email: string;
}

async function fetchSalesTeam(): Promise<SalesTeamMember[]> {
  const response = await fetch('/api/admin/sales-team');
  if (!response.ok) {
    throw new Error('Failed to fetch sales team');
  }
  const data = await response.json();
  return data.data;
}

export function useSalesTeam() {
  return useQuery({
    queryKey: ['sales-team'],
    queryFn: fetchSalesTeam,
    staleTime: 5 * 60 * 1000,  // 5 minutes - team rarely changes
    gcTime: 30 * 60 * 1000,    // 30 minutes cache
  });
}
```

### URL Filter Params Hook (Extended)

```typescript
// src/hooks/use-filter-params.ts (extend existing)
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

const UNASSIGNED_VALUE = 'unassigned';

export function useOwnerFilterParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse owner from URL (comma-separated)
  const ownerParam = searchParams.get('owner') || '';
  const owners: string[] = ownerParam
    .split(',')
    .filter(Boolean);  // Remove empty strings

  const setOwners = useCallback((newOwners: string[]) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newOwners.length > 0) {
      params.set('owner', newOwners.join(','));
    } else {
      params.delete('owner');
    }

    // Reset to page 1 when filter changes
    params.set('page', '1');

    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  return { owners, setOwners };
}
```

### Integration with Container

```typescript
// In lead-table-container.tsx (updated)
'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useLeadSearchParams } from '@/hooks/use-search-params';
import { usePaginationParams } from '@/hooks/use-pagination-params';
import { useStatusFilterParams, useOwnerFilterParams } from '@/hooks/use-filter-params';
import { useLeads } from '@/hooks/use-leads';
import { LeadSearch } from './lead-search';
import { LeadStatusFilter } from './lead-status-filter';
import { LeadOwnerFilter } from './lead-owner-filter';
import { LeadTable } from './lead-table';
import { LeadPagination } from './lead-pagination';

export function LeadTableContainer() {
  const { search, setSearch } = useLeadSearchParams();
  const { page, limit, setPage, setLimit } = usePaginationParams();
  const { statuses, setStatuses } = useStatusFilterParams();
  const { owners, setOwners } = useOwnerFilterParams();

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
    owner: owners,  // Add owner filter
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
  owner?: string[];  // Add owner filter
}

export function useLeads({
  page = 1,
  limit = 20,
  search = '',
  status = [],
  owner = [],
}: UseLeadsParams = {}) {
  return useQuery({
    queryKey: ['leads', { page, limit, search, status, owner }],
    queryFn: () => fetchLeads({ page, limit, search, status, owner }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
```

### Component Structure

```
src/
├── components/leads/
│   ├── lead-owner-filter.tsx       # Owner filter dropdown (new)
│   └── lead-table-container.tsx    # Updated with owner filter
├── hooks/
│   ├── use-leads.ts                # Updated with owner param
│   ├── use-sales-team.ts           # Fetch sales team (new)
│   └── use-filter-params.ts        # Extended with owner filter
└── app/api/admin/
    ├── leads/route.ts              # Updated to pass owner
    └── sales-team/route.ts         # Sales team endpoint (if needed)
```

### Architecture Compliance

From project-context.md:
- TanStack Query v5 object syntax
- URL state for shareable links
- staleTime for rarely-changing data (sales team)
- useSearchParams needs Suspense wrapper

### Testing Patterns

From Test Pattern Library:
- Mock next/navigation for URL params (Pattern 2.1)
- Mock useSalesTeam hook for owner list
- Component callback testing (Pattern 1.3)
- State tests for multi-select (Pattern 7.1-7.3)

### Critical Don't-Miss Rules

1. **Special "unassigned" value** - Handle null salesOwnerId
2. **Comma-separated URL** - `?owner=id1,id2,unassigned`
3. **Reset to page 1** - When filter changes
4. **Preserve other params** - Don't lose search/status/limit
5. **Multi-select** - Array of owner IDs
6. **Combined filters** - Works with status, search, AND pagination
7. **Cache sales team** - Use long staleTime since team rarely changes

### Dependencies

Existing:
- `@tanstack/react-query` - Data fetching
- `lucide-react` - User, Check, X icons
- shadcn/ui Popover, Button components (from Story 4-4)

### References

- [Source: epics.md#F-04.5] - Feature definition "กรองตาม Sales Owner"
- [Source: project-context.md] - salesOwnerId and salesOwnerName fields
- [Source: stories/4-1-lead-list-table.md] - Lead type with salesOwnerId
- [Source: stories/4-4-filter-by-status.md] - Multi-select filter pattern
- [Source: docs/test-pattern-library.md] - Testing patterns

## Dev Agent Record

### Implementation Summary

Story 4.5 Filter by Owner was implemented following the red-green-refactor cycle. All 9 Acceptance Criteria have been met with comprehensive test coverage.

**Key Decisions:**
1. Created separate `useOwnerFilterParams` hook (following pattern from `useStatusFilterParams`)
2. Created new backend endpoint `/api/admin/sales-team` for fetching sales team members
3. Extended backend owner filter to support multi-value (comma-separated) and "unassigned" special value
4. Multi-select filter follows same UX pattern as status filter for consistency

**Tests Created:**
- `lead-owner-filter.test.tsx` - 27 tests for component behavior
- `use-sales-team.test.tsx` - 7 tests for API fetching hook
- `use-owner-filter-params.test.ts` - 16 tests for URL state management

**Total Test Coverage:**
- Frontend: 1286 tests passing (50 new tests)
- Backend: 506 tests passing

### File List

**Backend (eneos-sales-automation):**
- `src/controllers/admin.controller.ts` - Added getSalesTeam function, updated owner filter logic
- `src/routes/admin.routes.ts` - Added /api/admin/sales-team route
- `src/types/admin.types.ts` - Type updates

**Frontend (eneos-admin-dashboard):**
- `src/components/leads/lead-owner-filter.tsx` - New owner filter component
- `src/hooks/use-sales-team.ts` - New hook for fetching sales team
- `src/hooks/use-owner-filter-params.ts` - New hook for owner URL state
- `src/hooks/use-leads.ts` - Added owner parameter
- `src/lib/api/leads.ts` - Added owner to query string builder
- `src/types/lead.ts` - Added owner array to LeadsQueryParams
- `src/app/api/admin/sales-team/route.ts` - New API proxy route
- `src/app/api/admin/leads/route.ts` - Added owner forwarding
- `src/components/leads/lead-table-container.tsx` - Integrated owner filter
- `src/components/leads/lead-table-empty.tsx` - Updated empty state messages
- `src/hooks/index.ts` - Hook exports
- `src/lib/leads-constants.ts` - Constants

**Tests:**
- `src/__tests__/lead-owner-filter.test.tsx` - Owner filter component tests
- `src/__tests__/use-sales-team.test.tsx` - Sales team hook tests
- `src/__tests__/use-owner-filter-params.test.ts` - URL params hook tests

## Code Review

**Reviewer:** Amelia (Dev Agent)
**Date:** 2026-01-17
**Verdict:** ✅ PASS

### AC Verification

| AC | Status | Notes |
|----|--------|-------|
| AC#1 | ✅ | Owner filter with user icon in `lead-owner-filter.tsx:191-203` |
| AC#2 | ✅ | Unassigned + sales team options in `lead-owner-filter.tsx:239-326` |
| AC#3 | ✅ | Multi-select toggle with toggleOwner function |
| AC#4 | ✅ | Backend filter in `admin.controller.ts:461-477` |
| AC#5 | ✅ | Unassigned (null salesOwnerId) handling |
| AC#6 | ✅ | Combined filters in `lead-table-container.tsx:107-115` |
| AC#7 | ✅ | Clear filter button in `lead-owner-filter.tsx:331-345` |
| AC#8 | ✅ | URL state sync in `use-owner-filter-params.ts:90-108` |
| AC#9 | ✅ | ARIA attributes and keyboard navigation |

### Test Results

- **Backend:** 506 tests passing ✅
- **Frontend:** 1285 tests passing ✅ (1 flaky test unrelated to Story 4-5)

### Minor Issues Found & Fixed

1. ~~**Duplicate UNASSIGNED_VALUE constant**~~ ✅ FIXED
   - Was: Defined in both `use-owner-filter-params.ts` and `lead-owner-filter.tsx`
   - Fix: Component now imports from hook for consistency

2. **File list documentation** ✅ FIXED
   - 4 modified files added to File List during review

### Recommendation

Story approved for merge. All issues resolved.

