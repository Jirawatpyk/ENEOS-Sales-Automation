# Story 4.3: Search

Status: done

## Story

As an **ENEOS manager**,
I want **to search leads by company name, email, or contact name**,
so that **I can quickly find specific leads without scrolling through the entire list**.

## Acceptance Criteria

1. **AC1: Search Input Display**
   - Given I am on the leads page
   - When the page loads
   - Then I see a search input field above the table
   - And the input has a placeholder "Search by company, email, or name..."
   - And the input has a search icon on the left
   - And the input has a clear button (X) when text is entered

2. **AC2: Real-time Search with Debounce**
   - Given I type in the search input
   - When I type characters
   - Then the search is NOT triggered immediately
   - And the search is triggered after 300ms of no typing (debounce)
   - And a loading indicator shows during search
   - When I continue typing before 300ms
   - Then the previous pending search is cancelled

3. **AC3: Search Results**
   - Given I enter "ENEOS" in the search field
   - When the debounce completes
   - Then the table shows only leads matching "ENEOS" in company, email, OR contact name
   - And the search is case-insensitive
   - And partial matches are included (e.g., "test" matches "testing@example.com")
   - And the URL updates with `?search=ENEOS` parameter

4. **AC4: Search with Pagination**
   - Given I have 100 leads matching "test"
   - When the search results load
   - Then pagination is applied to search results
   - And "Showing 1-20 of 100 leads" reflects filtered count
   - When I navigate to page 2 of search results
   - Then the search term remains active

5. **AC5: Clear Search**
   - Given I have entered a search term
   - When I click the clear button (X)
   - Then the search input is cleared
   - And the table shows all leads (no filter)
   - And the URL removes the `?search=` parameter
   - And pagination resets to page 1

6. **AC6: Empty Search Results**
   - Given I search for "xyznonexistent123"
   - When no leads match
   - Then I see "No leads found for 'xyznonexistent123'"
   - And a suggestion to clear search or try different keywords
   - And the empty state includes a "Clear search" button

7. **AC7: URL State Sync**
   - Given I navigate to `/leads?search=ENEOS`
   - When the page loads
   - Then the search input shows "ENEOS"
   - And the table shows filtered results
   - When I share this URL with another user
   - Then they see the same search and results

8. **AC8: Keyboard Shortcuts**
   - Given I am on the leads page
   - When I press `/` (slash) key
   - Then the search input is focused
   - When I press `Escape` while in search input
   - Then the search is cleared and input is blurred
   - And these shortcuts are discoverable (tooltip on search icon)

9. **AC9: Accessibility**
   - Given the search input is rendered
   - When I use a screen reader
   - Then the input has proper aria-label "Search leads"
   - And live region announces result count ("Found 25 leads")
   - And loading state is announced

## Tasks / Subtasks

- [x] **Task 1: Search Input Component** (AC: #1, #8, #9)
  - [x] 1.1 Create `src/components/leads/lead-search.tsx`
  - [x] 1.2 Add search icon (lucide-react Search icon) on left
  - [x] 1.3 Add placeholder text "Search by company, email, or name..."
  - [x] 1.4 Add clear button (X) that appears when input has value
  - [x] 1.5 Add aria-label and live region for accessibility
  - [x] 1.6 Implement `/` keyboard shortcut to focus
  - [x] 1.7 Implement `Escape` key to clear and blur
  - [x] 1.8 Add tooltip on search icon showing keyboard shortcuts

- [x] **Task 2: Debounce Hook** (AC: #2)
  - [x] 2.1 Create `src/hooks/use-debounce.ts` or use existing
  - [x] 2.2 Implement 300ms debounce delay
  - [x] 2.3 Return debounced value and isPending state
  - [x] 2.4 Cancel pending debounce on new input

- [x] **Task 3: URL State Management** (AC: #7)
  - [x] 3.1 Create `src/hooks/use-search-params.ts` for search URL sync
  - [x] 3.2 Read `search` from URL searchParams
  - [x] 3.3 Update URL when search changes (using router.replace)
  - [x] 3.4 Preserve other params (page, limit) when updating search
  - [x] 3.5 Reset page to 1 when search changes

- [x] **Task 4: Update useLeads Hook** (AC: #3, #4)
  - [x] 4.1 Add `search` parameter to useLeads hook (already existed)
  - [x] 4.2 Update queryKey to include `['leads', { page, limit, search }]` (already existed)
  - [x] 4.3 Pass search param to API: `GET /api/admin/leads?search=xxx`
  - [x] 4.4 Ensure pagination works with filtered results

- [x] **Task 5: Update API Route** (AC: #3)
  - [x] 5.1 Update `src/app/api/admin/leads/route.ts` to pass search param (already existed)
  - [x] 5.2 Verify backend supports `search` query parameter
  - [x] 5.3 Search should match company, email, OR customerName

- [x] **Task 6: Integration with LeadTable** (AC: #1-7)
  - [x] 6.1 Add LeadSearch component above LeadTable in container
  - [x] 6.2 Wire up search state with useSearchParams hook
  - [x] 6.3 Pass search value to useLeads hook
  - [x] 6.4 Show loading indicator during search
  - [x] 6.5 Handle empty search results with custom message

- [x] **Task 7: Empty Search State** (AC: #6)
  - [x] 7.1 Create or update empty state to show search term
  - [x] 7.2 Add "No leads found for '[search]'" message
  - [x] 7.3 Add "Clear search" button in empty state
  - [x] 7.4 Add suggestion text

- [x] **Task 8: Testing** (AC: #1-9)
  - [x] 8.1 Test search input renders with placeholder
  - [x] 8.2 Test debounce delays search by 300ms
  - [x] 8.3 Test search filters results correctly
  - [x] 8.4 Test clear button clears search
  - [x] 8.5 Test URL params sync (search)
  - [x] 8.6 Test keyboard shortcuts (/, Escape)
  - [x] 8.7 Test empty search results message
  - [x] 8.8 Test search with pagination
  - [x] 8.9 Test accessibility (aria-label, live region)

## Dev Notes

### Backend Search Support

Backend already supports search via query param:

```typescript
// Request: GET /api/admin/leads?search=ENEOS&page=1&limit=20
// Backend searches in: company, email, customerName (case-insensitive)

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

### Debounce Hook Pattern

```typescript
// src/hooks/use-debounce.ts
'use client';

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Advanced version with isPending
export function useDebouncedValue<T>(value: T, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(true);
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return { debouncedValue, isPending };
}
```

### Search Input Component

```typescript
// src/components/leads/lead-search.tsx
'use client';

import { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface LeadSearchProps {
  value: string;
  onChange: (value: string) => void;
  isPending?: boolean;
  resultCount?: number;
  className?: string;
}

export function LeadSearch({
  value,
  onChange,
  isPending,
  resultCount,
  className,
}: LeadSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onChange('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn('relative', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Press <kbd className="px-1 bg-muted rounded">/</kbd> to focus, <kbd className="px-1 bg-muted rounded">Esc</kbd> to clear</p>
        </TooltipContent>
      </Tooltip>
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search by company, email, or name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-9"
        aria-label="Search leads"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {isPending && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {/* Live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {resultCount !== undefined && `Found ${resultCount} leads`}
      </div>
    </div>
  );
}
```

### URL Search Params Hook

```typescript
// src/hooks/use-search-params.ts (extend existing or create)
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useLeadSearchParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const search = searchParams.get('search') || '';

  const setSearch = useCallback((newSearch: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newSearch) {
      params.set('search', newSearch);
    } else {
      params.delete('search');
    }

    // Reset to page 1 when search changes
    params.set('page', '1');

    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  return { search, setSearch };
}
```

### Integration Pattern

```typescript
// In lead-table-container.tsx
'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useLeadSearchParams } from '@/hooks/use-search-params';
import { usePaginationParams } from '@/hooks/use-pagination-params';
import { useLeads } from '@/hooks/use-leads';
import { LeadSearch } from './lead-search';
import { LeadTable } from './lead-table';
import { LeadPagination } from './lead-pagination';

export function LeadTableContainer() {
  const { search, setSearch } = useLeadSearchParams();
  const { page, limit, setPage, setLimit } = usePaginationParams();

  const [inputValue, setInputValue] = useState(search);
  const debouncedSearch = useDebounce(inputValue, 300);

  // Sync debounced value to URL
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const { data, isLoading, isFetching } = useLeads({
    page,
    limit,
    search: debouncedSearch,
  });

  return (
    <div className="space-y-4">
      <LeadSearch
        value={inputValue}
        onChange={setInputValue}
        isPending={inputValue !== debouncedSearch}
        resultCount={data?.pagination.total}
      />

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

### Empty Search State

```typescript
// Update lead-table-empty.tsx
interface LeadTableEmptyProps {
  searchTerm?: string;
  onClearSearch?: () => void;
}

export function LeadTableEmpty({ searchTerm, onClearSearch }: LeadTableEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <FileSearch className="h-12 w-12 text-muted-foreground" />
      {searchTerm ? (
        <>
          <h3 className="mt-4 text-lg font-semibold">
            No leads found for "{searchTerm}"
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different search term or clear the search
          </p>
          <Button variant="outline" className="mt-4" onClick={onClearSearch}>
            Clear search
          </Button>
        </>
      ) : (
        <>
          <h3 className="mt-4 text-lg font-semibold">No leads yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Leads will appear here when they are created
          </p>
        </>
      )}
    </div>
  );
}
```

### Component Structure

```
src/
├── components/leads/
│   ├── lead-search.tsx              # Search input component
│   ├── lead-table-empty.tsx         # Updated with search message
│   └── lead-table-container.tsx     # Updated with search integration
├── hooks/
│   ├── use-debounce.ts              # Debounce utility hook
│   ├── use-leads.ts                 # Updated with search param
│   └── use-search-params.ts         # Extended with search
└── app/api/admin/leads/
    └── route.ts                     # Updated to pass search
```

### Architecture Compliance

From project-context.md:
- TanStack Query v5 object syntax
- URL state for shareable links
- Debounce 300ms per Epic acceptance criteria
- useSearchParams needs Suspense wrapper
- Touch targets minimum 44x44px

### Testing Patterns

From Test Pattern Library:
- Mock next/navigation for URL params (Pattern 2.1)
- Fake timers for debounce testing (Pattern 3.3)
- Component state tests (Pattern 7.1-7.3)
- Accessibility testing (Pattern 6.1)

### Critical Don't-Miss Rules

1. **Debounce 300ms** - Per Epic acceptance criteria
2. **Reset to page 1** - When search changes
3. **Case-insensitive** - Backend handles this
4. **Preserve other params** - Don't lose page/limit when searching
5. **Cancel pending** - New input cancels previous debounce
6. **Live region** - Announce results for screen readers

### Dependencies

Existing:
- `@tanstack/react-query` - Data fetching
- `lucide-react` - Search, X icons
- shadcn/ui Input, Button components

### References

- [Source: epics.md#F-04.3] - Feature definition "ค้นหาด้วย Company/Email/Name"
- [Source: epics.md#EPIC-04] - "Search ทำงานแบบ Real-time (debounce 300ms)"
- [Source: project-context.md] - Project rules
- [Source: stories/4-1-lead-list-table.md] - Base table implementation
- [Source: stories/4-2-pagination.md] - URL state patterns
- [Source: docs/test-pattern-library.md] - Testing patterns

## Dev Agent Record

### Implementation Summary

All 8 tasks completed successfully with 74 tests passing.

### Files Created

**Frontend (eneos-admin-dashboard):**
- `src/components/ui/input.tsx` - shadcn/ui Input component
- `src/components/leads/lead-search.tsx` - Search input with keyboard shortcuts, tooltips, accessibility
- `src/hooks/use-debounce.ts` - Debounce and useDebouncedValue hooks (300ms default)
- `src/hooks/use-search-params.ts` - URL state management for search with page reset

### Files Modified

**Frontend (eneos-admin-dashboard):**
- `src/components/leads/lead-table-container.tsx` - Integrated search with debounce, URL sync
- `src/components/leads/lead-table-empty.tsx` - Added searchTerm and onClearSearch props for empty search state
- `src/components/leads/index.ts` - Added LeadSearch export
- `src/hooks/index.ts` - Added debounce and search hooks exports
- `src/hooks/use-leads.ts` - Added Story 4.3 reference comment
- `src/app/api/admin/leads/route.ts` - Added Story 4.3 reference comment

### Tests Created

**Frontend (eneos-admin-dashboard):**
- `src/__tests__/lead-search.test.tsx` - 18 tests for LeadSearch component
- `src/__tests__/use-debounce.test.ts` - 14 tests for debounce hooks
- `src/__tests__/use-search-params.test.tsx` - 13 tests for URL state hook
- `src/__tests__/lead-table-states.test.tsx` - 6 new tests added for empty search state

### Tests Modified

- `src/__tests__/lead-table-container.test.tsx` - Updated mocks for new hooks, added TooltipProvider

### Test Results

- **Total Tests:** 74 search-related tests
- **All Passing:** ✅
- **Type Check:** ✅ No errors
- **Lint:** ✅ No errors

### Decisions Made

1. **useDebounce vs useDebouncedValue:** Created both versions - simple hook for value only, advanced hook with isPending state
2. **Search state sync:** Used local state for immediate UI feedback, synced to URL after debounce
3. **Empty state:** Updated existing LeadTableEmpty to support searchTerm and onClearSearch props
4. **API/Hook:** Tasks 4 & 5 were already implemented from Story 4.1/4.2, just added documentation comments

### Architecture Compliance

- ✅ TanStack Query v5 object syntax
- ✅ URL state for shareable links
- ✅ Debounce 300ms per Epic acceptance criteria
- ✅ useSearchParams wrapped in Suspense boundary (via parent)
- ✅ Accessibility: aria-label, live region, keyboard shortcuts

## Code Review

**Reviewer:** Senior Developer Agent (AI)
**Date:** 2026-01-17
**Outcome:** ✅ APPROVED (after fixes)

### Review Summary

All 9 Acceptance Criteria validated and implemented correctly. Found 6 issues (1 HIGH, 3 MEDIUM, 2 LOW) - all fixed automatically.

### Issues Found & Fixed

#### 🔴 HIGH Issues (1)

1. **useDebouncedValue had incorrect dependency array** (`use-debounce.ts`)
   - **Problem:** `debouncedValue` in useEffect dependencies caused extra effect runs
   - **Fix:** Removed from dependencies, added `useRef` to track initial mount and skip setting isPending on first render
   - **Impact:** Performance improvement, prevents subtle timing bugs

#### 🟡 MEDIUM Issues (3)

2. **URL sync effect logic was confusing** (`lead-table-container.tsx:61-65`)
   - **Problem:** `urlSearch !== searchInput && !searchInput` was hard to understand and had edge cases
   - **Fix:** Rewrote with functional state update and clear comments explaining sync behavior
   - **Impact:** Code maintainability, prevented potential sync bugs

3. **Input component export check** - NOT AN ISSUE
   - **Note:** shadcn/ui components don't use barrel exports, direct imports are standard pattern

4. **Live region announcement logic** (`lead-search.tsx:162-166`)
   - **Problem:** Ternary expression was hard to read
   - **Fix:** Separated into clear conditional expressions with comments
   - **Impact:** Code readability

#### 🟢 LOW Issues (2)

5. **eslint-disable comment removed** (`lead-table-container.tsx:64`)
   - **Problem:** Lint suppression indicated design smell
   - **Fix:** Refactored to use functional state update, removed eslint-disable
   - **Impact:** Better lint compliance

6. **Test typing improved** (`use-search-params.test.tsx:14`)
   - **Problem:** Double cast `as unknown as ReadonlyURLSearchParams` was anti-pattern
   - **Fix:** Added documentation explaining why cast is safe, simplified to single cast
   - **Impact:** Better test maintainability

### Files Modified by Code Review

- `src/hooks/use-debounce.ts` - Fixed dependency array, added useRef for initial mount tracking
- `src/components/leads/lead-table-container.tsx` - Improved URL sync logic, removed lint disable
- `src/components/leads/lead-search.tsx` - Clearer live region logic
- `src/__tests__/use-search-params.test.tsx` - Improved type cast documentation

### Test Results After Fixes

- **Total Tests:** 1187 tests
- **All Passing:** ✅
- **Type Check:** ✅ No errors
- **Lint:** ✅ No errors

### AC Validation

| AC# | Description | Status |
|-----|-------------|--------|
| AC1 | Search input display | ✅ Implemented |
| AC2 | Real-time search with debounce | ✅ Implemented |
| AC3 | Search results | ✅ Implemented |
| AC4 | Search with pagination | ✅ Implemented |
| AC5 | Clear search | ✅ Implemented |
| AC6 | Empty search results | ✅ Implemented |
| AC7 | URL state sync | ✅ Implemented |
| AC8 | Keyboard shortcuts | ✅ Implemented |
| AC9 | Accessibility | ✅ Implemented |

### Recommendation

Story 4-3-search is **APPROVED** and ready for status update to `done`.

