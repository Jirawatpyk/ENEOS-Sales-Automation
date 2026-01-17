# Story 4.6: Filter by Date

Status: done

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

- [x] **Task 1: Date Filter Component** (AC: #1, #2, #9)
  - [x] 1.0 Install shadcn/ui Calendar if not exists: `npx shadcn-ui@latest add calendar`
  - [x] 1.1 Create `src/components/leads/lead-date-filter.tsx`
  - [x] 1.2 Use shadcn/ui Popover with preset buttons
  - [x] 1.3 Add calendar icon (lucide-react Calendar icon)
  - [x] 1.4 Display all 7 preset options
  - [x] 1.5 Add "All Time" option to clear filter
  - [x] 1.6 Show selected date range in button label
  - [x] 1.7 Add clear button (X) when filter active
  - [x] 1.8 Implement keyboard navigation
  - [x] 1.9 Add `type="button"` to all buttons inside Popover

- [x] **Task 2: Date Range Picker** (AC: #4)
  - [x] 2.1 Integrate shadcn/ui Calendar for date selection
  - [x] 2.2 Implement range selection (start and end dates)
  - [x] 2.3 Add month navigation (prev/next)
  - [x] 2.4 Add "Apply" button for custom range
  - [x] 2.5 Add "Cancel" button to close without applying
  - [x] 2.6 Validate end date >= start date
  - [x] 2.7 Reset tempRange state when popover closes

- [x] **Task 3: Date Preset Logic** (AC: #3)
  - [x] 3.1 Create `src/lib/date-presets.ts` utility
  - [x] 3.2 Implement getPresetDateRange(preset) function
  - [x] 3.3 Use date-fns for date calculations
  - [x] 3.4 Handle timezone correctly (use local time)
  - [x] 3.5 Return { from: Date, to: Date } for each preset

- [x] **Task 4: URL State Management** (AC: #8)
  - [x] 4.1 Create `src/hooks/use-date-filter-params.ts` for date filter
  - [x] 4.2 Read `from` and `to` from URL (YYYY-MM-DD format)
  - [x] 4.3 Update URL when filter changes (router.replace)
  - [x] 4.4 Validate date format and handle invalid params
  - [x] 4.5 Reset page to 1 when filter changes

- [x] **Task 5: Update useLeads Hook** (AC: #5, #6)
  - [x] 5.1 Add `from` and `to` parameters to useLeads hook
  - [x] 5.2 Update queryKey: `['leads', { page, limit, search, status, owner, from, to }]`
  - [x] 5.3 Pass date params to API: `GET /api/admin/leads?from=...&to=...`
  - [x] 5.4 Format dates as YYYY-MM-DD for API
  - [x] 5.5 Ensure works with all other filters

- [x] **Task 6: Update API Route** (AC: #5)
  - [x] 6.1 Update `src/app/api/admin/leads/route.ts` to pass date params
  - [x] 6.2 Verify backend supports `from` and `to` query parameters
  - [x] 6.3 Backend should filter by createdAt >= from AND createdAt <= to

- [x] **Task 7: Integration with LeadTable** (AC: #1-8)
  - [x] 7.1 Add LeadDateFilter next to LeadOwnerFilter in container
  - [x] 7.2 Update filter toolbar layout
  - [x] 7.3 Wire up filter state with useDateFilterParams hook
  - [x] 7.4 Pass date filter to useLeads hook
  - [x] 7.5 Ensure combined filters work correctly

- [x] **Task 8: Testing** (AC: #1-9)
  - [x] 8.1 Test filter button renders with correct label
  - [x] 8.2 Test preset selection calculates correct dates
  - [x] 8.3 Test custom date range selection (E2E)
  - [x] 8.4 Test URL params sync (from, to)
  - [x] 8.5 Test combined with status, owner, and search filters
  - [x] 8.6 Test clear button removes filter
  - [x] 8.7 Test keyboard navigation
  - [x] 8.8 Use fake timers for date calculations (Pattern 3.3)
  - [x] 8.9 Use E2E tests for Calendar component (jsdom issue)

## Dev Agent Record

### Implementation Summary

**Date:** 2026-01-17

**What was implemented:**
1. Created `src/lib/date-presets.ts` - Date preset utility with 7 presets (today, yesterday, last7days, last30days, thisMonth, lastMonth, custom)
2. Created `src/hooks/use-date-filter-params.ts` - URL state management for date filter with from/to params
3. Created `src/components/leads/lead-date-filter.tsx` - Date filter component with:
   - Preset options dropdown
   - Custom date range picker using shadcn/ui Calendar
   - Clear button when filter active
   - Full keyboard navigation support
   - ARIA attributes for accessibility
4. Updated `src/types/lead.ts` - Added from/to to LeadsQueryParams
5. Updated `src/lib/api/leads.ts` - Added from/to to buildQueryString
6. Updated `src/hooks/use-leads.ts` - Added from/to parameters
7. Updated `src/app/api/admin/leads/route.ts` - Pass from/to to backend
8. Updated `src/components/leads/lead-table-container.tsx` - Integrated date filter

**Tests created:**
1. `src/__tests__/date-presets.test.ts` - 17 tests for date preset calculations
2. `src/__tests__/use-date-filter-params.test.ts` - 17 tests for URL state management (3 new from code review)
3. `e2e/lead-date-filter.spec.ts` - E2E tests for Calendar component

**Test results:**
- All 1320 frontend tests passing
- Type check passes

**Decisions made:**
1. Followed existing filter patterns from lead-owner-filter.tsx and use-owner-filter-params.ts
2. Used date-fns v3 named imports per project context
3. Created separate hook file (use-date-filter-params.ts) instead of extending existing file
4. Used formatDateRangeLabel() for button text instead of inline format() calls
5. Calendar component uses react-day-picker's range mode with single month view

## File List

### New Files Created
- `src/lib/date-presets.ts` - Date preset utility functions
- `src/hooks/use-date-filter-params.ts` - URL state management hook
- `src/components/leads/lead-date-filter.tsx` - Date filter component
- `src/__tests__/date-presets.test.ts` - Date preset tests
- `src/__tests__/use-date-filter-params.test.ts` - URL params tests

### Modified Files
- `src/types/lead.ts` - Added from/to to LeadsQueryParams
- `src/lib/api/leads.ts` - Added from/to to buildQueryString
- `src/hooks/use-leads.ts` - Added from/to parameters
- `src/app/api/admin/leads/route.ts` - Pass from/to to backend
- `src/components/leads/lead-table-container.tsx` - Integrated LeadDateFilter

## Code Review

_Ready for code review_
