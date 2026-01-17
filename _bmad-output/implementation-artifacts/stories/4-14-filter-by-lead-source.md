# Story 4.14: Filter by Lead Source

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to filter leads by their source (e.g., Email Campaign, Website, Referral)**,
so that **I can analyze lead quality and conversion rates by acquisition channel**.

## Acceptance Criteria

1. **AC1: Filter Dropdown Display**
   - Given I am on the leads page
   - When the page loads
   - Then I see a "Lead Source" filter dropdown in the filter toolbar
   - And the dropdown shows "All Sources" by default
   - And the dropdown has a filter icon

2. **AC2: Source Options**
   - Given I click the lead source filter dropdown
   - When the dropdown opens
   - Then I see all available lead sources from the data
   - And I see an "All Sources" option to clear filter
   - And sources are listed alphabetically

3. **AC3: Single-Select Filter**
   - Given I want to see leads from "Email Campaign"
   - When I select "Email Campaign"
   - Then the table filters to show only leads from that source
   - And the dropdown shows the selected source name
   - And selecting another source replaces the current filter

4. **AC4: Filter Results**
   - Given I select "Website" source
   - When the filter is applied
   - Then the table shows only leads with leadSource = "Website"
   - And pagination reflects the filtered count
   - And the URL updates with `?source=Website` parameter

5. **AC5: Combined Filters**
   - Given I have status filter "New" active
   - When I also filter by "Email" source
   - Then the table shows leads matching BOTH conditions (status=new AND source=Email)
   - And URL shows `?status=new&source=Email`
   - When I clear the source filter
   - Then status filter remains active

6. **AC6: Clear Filter**
   - Given I have lead source filter active
   - When I click "All Sources" or the clear button
   - Then the source filter is removed
   - And the table shows all leads (respecting other filters)
   - And pagination resets to page 1

7. **AC7: URL State Sync**
   - Given I navigate to `/leads?source=Referral`
   - When the page loads
   - Then the filter dropdown shows "Referral" selected
   - And the table shows only referral leads
   - When I share this URL with another user
   - Then they see the same filtered view

8. **AC8: Empty Source Handling**
   - Given some leads have null/empty leadSource
   - When I view the filter options
   - Then I see an "Unknown" option for leads without source
   - And selecting "Unknown" shows leads with null leadSource

9. **AC9: Accessibility**
   - Given the filter dropdown is rendered
   - When I use keyboard navigation
   - Then I can open dropdown with Enter/Space
   - And I can navigate options with Arrow keys
   - And I can select with Enter
   - And screen reader announces selected state

## Tasks / Subtasks

- [ ] **Task 0: Backend API Support** (AC: #4)
  - [ ] 0.1 Verify backend `/api/admin/leads` supports `leadSource` filter param
  - [ ] 0.2 If not supported, add to `eneos-sales-automation/src/controllers/admin.controller.ts`
  - [ ] 0.3 Update frontend API proxy to pass `source` param to backend

- [ ] **Task 1: Create Lead Source Filter Component** (AC: #1, #2, #9)
  - [ ] 1.1 Create `src/components/leads/lead-source-filter.tsx`
  - [ ] 1.2 Use shadcn/ui Select component (single-select)
  - [ ] 1.3 Add "All Sources" option at top
  - [ ] 1.4 Display available sources alphabetically
  - [ ] 1.5 Add filter icon (`Filter` from lucide-react)
  - [ ] 1.6 Handle "Unknown" option for null sources

- [ ] **Task 2: Get Available Sources** (AC: #2, #8)
  - [ ] 2.1 Create `src/hooks/use-lead-sources.ts`
  - [ ] 2.2 Fetch distinct lead sources from API (or derive from leads data)
  - [ ] 2.3 Include "Unknown" for null sources
  - [ ] 2.4 Cache source list with React Query

- [ ] **Task 3: URL State Management** (AC: #7)
  - [ ] 3.1 Extend `src/hooks/use-filter-params.ts`
  - [ ] 3.2 Add `source` parameter (single string)
  - [ ] 3.3 Update URL when filter changes
  - [ ] 3.4 Parse source value from URL
  - [ ] 3.5 Reset page to 1 when filter changes

- [ ] **Task 4: Update useLeads Hook** (AC: #4, #5)
  - [ ] 4.1 Add `source` parameter to useLeads hook
  - [ ] 4.2 Update queryKey: `['leads', { page, limit, search, status, source }]`
  - [ ] 4.3 Pass source to API: `GET /api/admin/leads?source=Email`

- [ ] **Task 5: Update API Route** (AC: #4, #8)
  - [ ] 5.1 Update `src/app/api/admin/leads/route.ts` to accept `source` param
  - [ ] 5.2 Filter by leadSource field (handle null as "Unknown")
  - [ ] 5.3 Ensure works with existing status and search filters

- [ ] **Task 6: Integration** (AC: #1-8)
  - [ ] 6.1 Add LeadSourceFilter to filter toolbar (after status filter)
  - [ ] 6.2 Wire up with useFilterParams
  - [ ] 6.3 Pass source to useLeads hook
  - [ ] 6.4 Ensure combined filters work correctly

- [ ] **Task 7: Testing** (AC: #1-9)
  - [ ] 7.1 Create `src/components/leads/__tests__/lead-source-filter.test.tsx`
  - [ ] 7.2 Test filter dropdown renders with sources
  - [ ] 7.3 Test selecting source filters table
  - [ ] 7.4 Test "All Sources" clears filter
  - [ ] 7.5 Test URL params sync (source)
  - [ ] 7.6 Test combined with status and search
  - [ ] 7.7 Test "Unknown" handles null sources
  - [ ] 7.8 Test keyboard accessibility
  - [ ] 7.9 Test pagination with filtered results

## Dev Notes

### Lead Source Filter Component

```typescript
// src/components/leads/lead-source-filter.tsx
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { useLeadSources } from '@/hooks/use-lead-sources';

interface LeadSourceFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

const ALL_SOURCES = '__all__';
const UNKNOWN_SOURCE = '__unknown__';

export function LeadSourceFilter({ value, onChange, disabled }: LeadSourceFilterProps) {
  const { sources, isLoading } = useLeadSources();

  const handleChange = (newValue: string) => {
    if (newValue === ALL_SOURCES) {
      onChange(null);
    } else if (newValue === UNKNOWN_SOURCE) {
      onChange('__unknown__');  // Special value for null sources
    } else {
      onChange(newValue);
    }
  };

  return (
    <Select
      value={value ?? ALL_SOURCES}
      onValueChange={handleChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-[180px]">
        <Filter className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <SelectValue placeholder="All Sources" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_SOURCES}>All Sources</SelectItem>
        <SelectItem value={UNKNOWN_SOURCE}>Unknown</SelectItem>
        {sources.map((source) => (
          <SelectItem key={source} value={source}>
            {source}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### useLeadSources Hook

```typescript
// src/hooks/use-lead-sources.ts
'use client';

import { useQuery } from '@tanstack/react-query';

interface UseLeadSourcesReturn {
  sources: string[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch distinct lead sources
 * Option 1: Separate API endpoint (recommended for large datasets)
 * Option 2: Derive from leads data (simpler, used below)
 */
export function useLeadSources(): UseLeadSourcesReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: async () => {
      const response = await fetch('/api/admin/leads/sources');
      if (!response.ok) {
        throw new Error('Failed to fetch lead sources');
      }
      return response.json() as Promise<{ sources: string[] }>;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    sources: data?.sources ?? [],
    isLoading,
    error: error as Error | null,
  };
}
```

### API Endpoint for Lead Sources

```typescript
// src/app/api/admin/leads/sources/route.ts
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await requireAdminAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get distinct sources from backend or static list
  // For now, return common lead sources
  const sources = [
    'Email Campaign',
    'Website',
    'Referral',
    'LinkedIn',
    'Trade Show',
    'Cold Call',
    'Partnership',
  ];

  return NextResponse.json({ sources });
}
```

### Update useFilterParams Hook

```typescript
// src/hooks/use-filter-params.ts (additions)
export interface FilterParams {
  search: string | null;
  status: string[] | null;  // From Story 4-4
  source: string | null;    // NEW for this story
  owner: string | null;     // From Story 4-5
  // ... other filters
}

export function useFilterParams(): UseFilterParamsReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ... existing code for search, status

  // Lead Source filter
  const source = searchParams.get('source');

  const setSource = useCallback(
    (newSource: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSource) {
        params.set('source', newSource);
      } else {
        params.delete('source');
      }
      params.set('page', '1'); // Reset pagination
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return {
    // ... existing
    source,
    setSource,
  };
}
```

### Update API Route for Source Filter

```typescript
// src/app/api/admin/leads/route.ts (additions)
export async function GET(request: Request) {
  // ... existing auth and params

  const source = searchParams.get('source');

  // Build filter object
  const filters: LeadFilters = {
    search: searchParams.get('search'),
    status: searchParams.get('status')?.split(','),
    source: source === '__unknown__' ? null : source,  // Handle unknown
  };

  // Pass to backend/data layer
  const leads = await getLeads({ ...filters, page, limit });

  return NextResponse.json(leads);
}
```

### Filter Toolbar Layout

```typescript
// In lead-table-container.tsx
<div className="flex flex-wrap items-center gap-3 mb-4">
  <LeadSearch ... />
  <LeadStatusFilter ... />   {/* Story 4-4 */}
  <LeadSourceFilter          {/* This story */}
    value={source}
    onChange={setSource}
  />
  <LeadOwnerFilter ... />    {/* Story 4-5 */}
  <LeadDateFilter ... />     {/* Story 4-6 */}
</div>
```

### Testing Patterns

```typescript
// Test filter renders
it('renders lead source filter with options', async () => {
  render(<LeadSourceFilter value={null} onChange={vi.fn()} />);

  await userEvent.click(screen.getByRole('combobox'));

  expect(screen.getByText('All Sources')).toBeInTheDocument();
  expect(screen.getByText('Email Campaign')).toBeInTheDocument();
  expect(screen.getByText('Unknown')).toBeInTheDocument();
});

// Test filter selection
it('calls onChange with selected source', async () => {
  const onChange = vi.fn();
  render(<LeadSourceFilter value={null} onChange={onChange} />);

  await userEvent.click(screen.getByRole('combobox'));
  await userEvent.click(screen.getByText('Website'));

  expect(onChange).toHaveBeenCalledWith('Website');
});

// Test clear filter
it('clears filter when All Sources selected', async () => {
  const onChange = vi.fn();
  render(<LeadSourceFilter value="Email" onChange={onChange} />);

  await userEvent.click(screen.getByRole('combobox'));
  await userEvent.click(screen.getByText('All Sources'));

  expect(onChange).toHaveBeenCalledWith(null);
});
```

## Dependencies

- Story 4-4: Filter by Status (provides filter pattern and URL state management)
- Data Flow Bug Fix (completed): `leadSource` field is now passed from backend to frontend

## Notes

- **Priority**: Could Have - Nice enhancement for analytics
- **Complexity**: Low-Medium - Follows existing filter patterns from Story 4-4
- **Backend API Support**:
  - Main filter: Check if backend supports `leadSource` query param (Task 0)
  - Sources list: `/api/admin/leads/sources` endpoint is created as part of Task 2
  - Alternative: Hardcode common sources initially, fetch dynamically later

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-17 | Story created | Claude |
| 2026-01-17 | Fixed icon, added backend task, corrected dependencies | Claude |

## Code Review

**Review Date:** 2026-01-17
**Reviewer:** Bob (SM Agent)
**Status:** ✅ APPROVED

### Issues Found & Fixed

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Wrong icon import (Funnel → Filter) | Low | ✅ Fixed |
| 2 | Missing test file path in Task 7 | Low | ✅ Fixed |
| 3 | Incorrect dependency on Story 4-11 | Medium | ✅ Fixed |
| 4 | Missing backend API check task | Medium | ✅ Fixed - Added Task 0 |
| 5 | Sources API endpoint unclear | Medium | ✅ Fixed - Clarified in Notes |

### Review Summary

- **Clarity:** Story is well-structured with comprehensive dev notes
- **Scope:** Appropriate for Could Have feature
- **Code Snippets:** Complete and ready-to-use
- **Testing:** Test patterns provided with file path specified
- **Dependencies:** Correctly references Story 4-4 for filter patterns
