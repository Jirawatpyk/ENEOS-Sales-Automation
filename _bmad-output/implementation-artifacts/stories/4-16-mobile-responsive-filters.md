# Story 4.16: Mobile-Responsive Lead Filters

Status: in-progress

## Story

As an **ENEOS sales manager using mobile device**,
I want **a mobile-optimized filter interface for the Lead Management page**,
so that **I can efficiently filter leads by status, owner, date, and source on small screens without cluttered UI**.

## Acceptance Criteria

1. **AC1: Responsive Breakpoint Detection**
   - Given I am viewing the leads page
   - When viewport width is < 768px (mobile - below md breakpoint)
   - Then filters are displayed in mobile-optimized layout
   - When viewport width is >= 768px (desktop - md breakpoint and above)
   - Then filters are displayed in horizontal row layout (existing behavior)
   - Note: iPad Mini (768px) shows desktop layout per Tailwind convention
   - **Edge Case - Window Resize:**
     - Given I have bottom sheet open on mobile
     - When I resize window to >= 768px (desktop)
     - Then bottom sheet auto-closes
     - And desktop horizontal filters are shown
     - And filter state is preserved

2. **AC2: Mobile Filter Layout**
   - Given I am on mobile viewport
   - When the page loads
   - Then I see a full-width search bar at the top
   - And I see a "Filters" button below search with filter icon
   - And I see an "Export All" icon button next to the Filters button
   - And Column Visibility toggle is hidden on mobile
   - And active filter count badge is shown when filters active: "Filters (3)"
   - And button shows just "Filters" text when no filters active

3. **AC3: Active Filter Chips Display**
   - Given I have active filters (status, owner, date, or source)
   - When I view the filter area on mobile
   - Then I see removable chips displaying active filters:
     - "Status: New" with X button (single value)
     - "Status: 2 selected" with X button (multiple values)
     - "Owner: John Doe" with X button (single value)
     - "Owner: 3 selected" with X button (multiple values)
     - "Date: Last 7 Days" with X button
     - "Source: Email" with X button
   - When I tap X on a chip
   - Then that specific filter is removed immediately (bypasses manual-apply for quick removal)
   - And the URL parameters are updated
   - And the table updates immediately
   - And the bottom sheet (if open) reflects the removal

4. **AC4: Bottom Sheet Trigger**
   - Given I am on mobile viewport
   - When I tap the "Filters" button
   - Then a bottom sheet slides up from bottom
   - And the bottom sheet covers 80% of viewport height
   - And the bottom sheet shows draggable handle at top
   - And the bottom sheet has "Filter Leads" title with Close button

5. **AC5: Bottom Sheet Filter Content**
   - Given the bottom sheet is open
   - When I view the content
   - Then I see all 4 filters in this order:
     1. Status Filter (multi-select, reuses LeadStatusFilter component)
     2. Owner Filter (multi-select, reuses LeadOwnerFilter component)
     3. Date Filter (presets + custom range, reuses LeadDateFilter component)
     4. Lead Source Filter (single-select, reuses LeadSourceFilter component)
   - And each filter section is clearly separated with visual dividers
   - And filters are rendered in full-width stacked layout
   - And filter content is scrollable if exceeds bottom sheet height

6. **AC6: Manual Apply Behavior**
   - Given I select multiple filters in the bottom sheet
   - When I change filter selections
   - Then the table does NOT update until I tap "Apply"
   - When I tap "Apply" button
   - Then Apply button shows loading spinner
   - And bottom sheet is disabled during loading (prevent double-submit)
   - And after successful apply (200 OK)
   - Then the bottom sheet closes
   - And the table updates with new filters
   - And URL parameters are updated
   - And active filter chips are displayed
   - When I tap "Cancel", close button (X), swipe down, or tap outside overlay
   - Then filter changes are discarded
   - And the bottom sheet closes without applying

7. **AC7: Clear All Filters**
   - Given I have multiple active filters
   - When I open the bottom sheet
   - Then I see a "Clear All" button at the bottom
   - When I tap "Clear All"
   - Then all filter selections are immediately cleared (checkboxes unchecked)
   - And no toast/dialog confirmation (immediate feedback)
   - When I tap "Apply" after clearing
   - Then all filters are removed
   - And the table shows all leads

8. **AC8: Mobile Table Column Visibility**
   - Given I am on mobile viewport
   - When the lead table renders
   - Then only 4 essential columns are shown:
     - Checkbox (for bulk selection - AC#10)
     - Company (customer company name)
     - Status (colored badge)
     - Owner (sales owner name)
   - And all other columns are hidden (no horizontal scroll)
   - And Column Visibility toggle is hidden on mobile
   - When I tap a row
   - Then Lead Detail Sheet opens with full information

9. **AC9: Export Button Mobile Layout**
   - Given I am on mobile viewport
   - When I view the filter toolbar
   - Then I see "Export All" button as icon-only (download icon from lucide-react)
   - And Export All button is positioned next to Filters button
   - When I tap Export All button
   - Then Export All dropdown opens with format options (CSV, Excel)
   - And it exports all leads matching current filters (same as desktop ExportAllButton)
   - And export respects current active filters

10. **AC10: Selection Toolbar (No Changes)**
    - Given I select rows using checkboxes
    - When Selection Toolbar appears
    - Then it displays in full-width layout (existing behavior)
    - And it works identically on mobile and desktop
    - And Export Selected button is available in toolbar

11. **AC11: Touch-Friendly Interactions**
    - Given I am using touch input on mobile
    - When I interact with filters in bottom sheet
    - Then all tap targets are minimum 44x44px (WCAG 2.5.5)
    - And filter options are full-width with min 44px height
    - And there's no accidental tap through
    - And swipe-to-close gesture works when swiping handle area
    - And scroll gesture inside sheet content does NOT trigger close
    - And swipe-to-close only activates when scrolled to top

12. **AC12: URL State Sync on Mobile**
    - Given I apply filters on mobile
    - When filters are applied
    - Then URL parameters update correctly (same as desktop)
    - When I share the URL or reload page (e.g., `/leads?status=new&owner=U123`)
    - Then filters are restored and applied to table
    - And filter chips are displayed (if any filters in URL)
    - And bottom sheet is CLOSED by default
    - When I open bottom sheet
    - Then it shows the filters from URL pre-selected

13. **AC13: Error Handling**
    - Given I apply filters in bottom sheet
    - When API returns error (network failure, 500, timeout)
    - Then error toast is displayed with message
    - And bottom sheet remains open
    - And Apply button returns to normal state (not loading)
    - And I can retry by clicking Apply again
    - And previous filter state is preserved

## Tasks / Subtasks

- [x] **Task 1: Install Bottom Sheet Component** (AC: #4, #6)
  - [x] 1.1 Check if shadcn/ui Sheet component exists
  - [x] 1.2 If not: `npx shadcn-ui@latest add sheet` (NOT NEEDED - already exists)
  - [x] 1.3 Verify Sheet component supports drag-to-close
  - [x] 1.4 Test Sheet on mobile viewport (Chrome DevTools)

- [x] **Task 2: Create Mobile Filter Sheet Component** (AC: #4, #5, #6, #7, #13)
  - [x] 2.1 Create `src/components/leads/mobile-filter-sheet.tsx`
  - [x] 2.2 Accept props: status, owner, date, leadSource values
  - [x] 2.3 Accept onChange handlers for each filter
  - [x] 2.4 Implement "Apply" and "Cancel" buttons
  - [x] 2.5 Implement "Clear All" button
  - [x] 2.6 Manage temporary filter state (before Apply)
  - [x] 2.7 Reuse existing filter components inside Sheet:
    - [x] 2.7a LeadStatusFilter
    - [x] 2.7b LeadOwnerFilter
    - [x] 2.7c LeadDateFilter
    - [x] 2.7d LeadSourceFilter
    - [x] 2.7e Verify Popover z-index works inside Sheet (see Dev Notes: Filter Component Reuse)
    - [x] 2.7f Test all 4 filters open correctly in bottom sheet without z-index issues
  - [x] 2.8 Style filters for mobile (full-width, larger touch targets):
    - [x] 2.8a Remove Popover wrapper from filters when in bottom sheet (if needed)
    - [x] 2.8b Render filter content directly (no dropdown trigger if possible)
    - [x] 2.8c Make filter options full-width (w-full)
    - [x] 2.8d Increase option heights to 44px minimum
    - [x] 2.8e Test Date filter calendar display inside bottom sheet
  - [x] 2.9 Add filter section dividers
  - [x] 2.10 Handle API errors during filter apply (AC#13)
  - [x] 2.11 Show error toast with retry message
  - [x] 2.12 Keep bottom sheet open on error
  - [x] 2.13 Add loading state to Apply button (disabled + spinner)
  - [x] 2.14 Prevent double-submit during API call
  - [x] 2.15 Handle close behaviors: Cancel button, X button, swipe down, tap outside
  - [x] 2.16 Manage temp filter state for all 4 filter types (status, owner, date, source)

- [x] **Task 3: Create Active Filter Chips Component** (AC: #3)
  - [x] 3.1 Create `src/components/leads/active-filter-chips.tsx`
  - [x] 3.2 Display chips for each active filter type
  - [x] 3.3 Format chip labels with smart truncation:
    - [x] 3.3a Single value: "Status: New" (full)
    - [x] 3.3b 2-3 values: "Status: New, Contacted" (full)
    - [x] 3.3c 4+ values: "Status: 4 selected" (collapsed)
    - [x] 3.3d Long names: truncate with ellipsis (max 20 chars)
  - [x] 3.4 Add X button to each chip (44x44px touch target)
  - [x] 3.5 Implement individual chip removal (bypasses manual-apply, updates immediately)
  - [x] 3.6 Show chips only when filters are active
  - [x] 3.7 Handle mobile layout:
    - [x] 3.7a Wrap chips to multiple rows (max 2-3 rows visible)
    - [x] 3.7b If > 6 chips: show "+N more" chip instead of overflow (deferred to future)
    - [x] 3.7c Consider collapsible chip section on mobile (not needed currently)
  - [x] 3.8 Update bottom sheet filter state when chip removed (handled by parent)

- [x] **Task 4: Create Mobile Filter Toolbar Component** (AC: #2, #9)
  - [x] 4.1 Create `src/components/leads/mobile-filter-toolbar.tsx`
  - [x] 4.2 Layout: Filters button (flex-1) + Export All icon button
  - [x] 4.3 Show active filter count badge on Filters button (when > 0)
  - [x] 4.4 Wire up bottom sheet open/close state
  - [x] 4.5 Export All button: icon-only (Download icon from lucide-react)
  - [x] 4.6 Export dropdown: reuse ExportAllButton component (render icon-only)
  - [x] 4.7 Verify ExportAllButton works correctly when rendered icon-only
  - [x] 4.8 Test Export All respects active filters on mobile (handled by parent)

- [ ] **Task 5: Update LeadTableContainer for Responsive Layout** (AC: #1, #2, #8)
  - [ ] 5.1 Update `src/components/leads/lead-table-container.tsx`
  - [ ] 5.2 Add responsive layout in filter toolbar section:
    - [ ] Find comment: `/* Story 4.3 AC#1, Story 4.4 AC#1... */`
    - [ ] Add desktop layout: `<div className="hidden md:flex items-center gap-4">`
    - [ ] Add mobile layout: `<div className="md:hidden space-y-3">`
  - [ ] 5.3 Hide ColumnVisibilityDropdown on mobile: `className="hidden md:inline-flex"`
  - [ ] 5.4 SelectionToolbar: no changes (already responsive)
  - [ ] 5.5 Handle resize between mobile/desktop: close sheet if open, preserve filter state

- [ ] **Task 6: Mobile Table Column Visibility** (AC: #8)
  - [ ] 6.1 Update `src/components/leads/lead-table.tsx`
  - [ ] 6.2 Define mobile column visibility:
    ```tsx
    const mobileColumns = ['checkbox', 'company', 'status', 'owner'];
    ```
  - [ ] 6.3 Use Tailwind responsive classes to hide columns on mobile:
    ```tsx
    // Example: Industry column
    <TableCell className="hidden md:table-cell">
      {lead.industry}
    </TableCell>
    ```
  - [ ] 6.4 Ensure Checkbox, Company, Status, Owner always visible on mobile
  - [ ] 6.5 Hide: Industry, Campaign, Date, Phone, Email on mobile
  - [ ] 6.6 Verify row click to detail sheet works on mobile

- [ ] **Task 7: Touch-Friendly Styling** (AC: #11)
  - [ ] 7.1 Update bottom sheet filter buttons: min-h-[44px]
  - [ ] 7.2 Increase tap target size for chips X buttons (44x44px)
  - [ ] 7.3 Add spacing between filter sections (py-4)
  - [ ] 7.4 Test on actual mobile device (iPhone/Android)
  - [ ] 7.5 Verify no layout shift or flash on mobile
  - [ ] 7.6 Verify Date filter calendar displays correctly in bottom sheet
  - [ ] 7.7 Verify calendar month navigation works
  - [ ] 7.8 Verify custom date range selection on mobile

- [ ] **Task 8: URL State Sync** (AC: #12)
  - [ ] 8.1 Verify existing URL param hooks work on mobile
  - [ ] 8.2 Test: Apply filters → URL updates
  - [ ] 8.3 Test: Direct URL navigation → filters restored
  - [ ] 8.4 Test: Browser back/forward → filters sync
  - [ ] 8.5 Test: Bottom sheet closed by default when loading from URL

- [ ] **Task 9: Unit Testing** (AC: #1-13)
  - [ ] 9.1 Test MobileFilterSheet component:
    - [ ] Renders with correct initial state
    - [ ] Apply button applies filters
    - [ ] Cancel button discards changes
    - [ ] Clear All button clears all filters
    - [ ] Loading state during Apply
    - [ ] Error state handling
  - [ ] 9.2 Test ActiveFilterChips component:
    - [ ] Renders chips for active filters
    - [ ] X button removes individual filter
    - [ ] Chips wrap correctly on narrow viewports
    - [ ] Smart label truncation (2-3 values vs 4+ values)
  - [ ] 9.3 Test MobileFilterToolbar component:
    - [ ] Shows correct active count badge
    - [ ] Opens bottom sheet on click
    - [ ] Export All button opens dropdown
  - [ ] 9.4 Test LeadTableContainer responsive layout:
    - [ ] Desktop layout renders on >= 768px
    - [ ] Mobile layout renders on < 768px
    - [ ] Column visibility correct on mobile
    - [ ] Window resize closes bottom sheet

- [ ] **Task 10: E2E Testing (Playwright)** (AC: #1-13)
  - [ ] 10.1 Test mobile filter flow:
    - [ ] Set viewport to 375x667 (iPhone SE)
    - [ ] Click Filters button
    - [ ] Bottom sheet opens
    - [ ] Select Status = "New"
    - [ ] Select Owner = "Me"
    - [ ] Click Apply
    - [ ] Verify table filters
    - [ ] Verify URL params
  - [ ] 10.2 Test active filter chips:
    - [ ] Apply filters
    - [ ] Verify chips displayed
    - [ ] Click X on chip
    - [ ] Verify filter removed immediately
  - [ ] 10.3 Test bottom sheet Cancel:
    - [ ] Open bottom sheet
    - [ ] Change filters
    - [ ] Click Cancel
    - [ ] Verify filters NOT applied
  - [ ] 10.4 Test Clear All:
    - [ ] Apply multiple filters
    - [ ] Open bottom sheet
    - [ ] Click Clear All
    - [ ] Click Apply
    - [ ] Verify all filters removed
  - [ ] 10.5 Test mobile table columns:
    - [ ] Set mobile viewport
    - [ ] Verify Checkbox, Company, Status, Owner visible
    - [ ] Verify no horizontal scroll
    - [ ] Click row → Detail sheet opens
  - [ ] 10.6 Test responsive breakpoint:
    - [ ] Resize viewport from mobile to desktop
    - [ ] Verify layout switches correctly
    - [ ] Verify bottom sheet closes on resize
    - [ ] Filters state preserved
  - [ ] 10.7 Test chip removal vs manual apply conflict:
    - [ ] Open bottom sheet
    - [ ] Change Status filter (not applied yet)
    - [ ] Remove Owner chip from toolbar
    - [ ] Verify Owner removed immediately
    - [ ] Verify Status change still pending (not applied)
    - [ ] Click Apply
    - [ ] Verify Status applied correctly
  - [ ] 10.8 Test API error handling:
    - [ ] Mock API error response
    - [ ] Apply filters
    - [ ] Verify error toast displayed
    - [ ] Verify bottom sheet still open
    - [ ] Retry Apply
    - [ ] Verify retry works
  - [ ] 10.9 Test URL load behavior:
    - [ ] Navigate to URL with filters
    - [ ] Verify filters applied
    - [ ] Verify chips displayed
    - [ ] Verify bottom sheet closed
    - [ ] Open bottom sheet
    - [ ] Verify filters pre-selected

## Dev Notes

### Component Reuse Strategy

**Key Decision:** Reuse existing filter components (LeadStatusFilter, LeadOwnerFilter, LeadDateFilter, LeadSourceFilter) inside the bottom sheet instead of creating new mobile-specific versions.

**Benefits:**
- ✅ Single source of truth for filter logic
- ✅ URL param hooks work identically
- ✅ Less code duplication
- ✅ Easier maintenance

**Implementation:**
```tsx
// mobile-filter-sheet.tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Filter Leads</SheetTitle>
      <SheetClose />
    </SheetHeader>

    <div className="space-y-4 py-4">
      {/* Reuse existing components - ensure z-index works */}
      <LeadStatusFilter value={tempStatus} onChange={setTempStatus} />
      <LeadOwnerFilter value={tempOwner} onChange={setTempOwner} />
      <LeadDateFilter value={tempDate} onChange={setTempDate} />
      <LeadSourceFilter value={tempSource} onChange={setTempSource} />
    </div>

    <SheetFooter className="sticky bottom-0 bg-background">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button variant="outline" onClick={onClearAll}>Clear All</Button>
      <Button onClick={onApply} disabled={isApplying}>
        {isApplying ? <Spinner /> : 'Apply'}
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

### Filter Component Reuse - Popover z-index Handling

**Potential Issue:** Existing filter components use Popover (position: absolute). Bottom Sheet is also a Portal → z-index conflicts possible.

**Solution Options:**

**Option A: Verify z-index hierarchy (try first)**
```tsx
// Test if default z-index works
// shadcn/ui Sheet typically has z-50
// shadcn/ui Popover typically has z-50
// Should work if both use same Portal root
```

**Option B: Force Popover to render inside Sheet (if z-index conflict)**
```tsx
// Use modal prop to prevent Popover portal escape
<LeadStatusFilter modal={false} value={tempStatus} onChange={setTempStatus} />
```

**Option C: Conditional rendering (if other solutions fail)**
```tsx
// Pass context prop to filters to render differently in bottom sheet
<LeadStatusFilter
  mode="expanded"  // Render without Popover wrapper
  value={tempStatus}
  onChange={setTempStatus}
/>
```

### Mobile Column Priority

**Business Logic:** Based on code analysis and mobile use case, essential columns are:

1. **Checkbox** - Required for bulk selection (AC#10)
2. **Company** - Primary identifier (clicked most often)
3. **Status** - Critical for workflow (new/contacted/closed)
4. **Owner** - Important for sales team coordination

**Hidden on Mobile:**
- Industry (viewable in detail sheet)
- Campaign (viewable in detail sheet)
- Date (viewable in detail sheet)
- Phone/Email (actionable from detail sheet)

### Temporary Filter State

**Manual Apply Pattern:**
- Bottom sheet maintains temporary filter state
- Changes are NOT applied to URL/table until "Apply" is clicked
- "Cancel" discards temporary state
- **Exception:** Chip removal bypasses manual-apply (immediate update)
- This prevents excessive API calls while user is exploring filters

```tsx
// Pseudo-code
const [tempStatus, setTempStatus] = useState(status); // Copy from props
const [tempOwner, setTempOwner] = useState(owner);
const [tempDate, setTempDate] = useState(dateRange);
const [tempSource, setTempSource] = useState(leadSource);
const [isApplying, setIsApplying] = useState(false);

const handleApply = async () => {
  setIsApplying(true);
  try {
    // Apply temporary state to actual state
    onStatusChange(tempStatus);
    onOwnerChange(tempOwner);
    onDateChange(tempDate);
    onSourceChange(tempSource);
    onClose();
  } catch (error) {
    // Show error toast, keep sheet open
    toast({ title: 'Error', description: 'Failed to apply filters' });
  } finally {
    setIsApplying(false);
  }
};

const handleCancel = () => {
  // Discard changes and reset to current state
  setTempStatus(status);
  setTempOwner(owner);
  setTempDate(dateRange);
  setTempSource(leadSource);
  onClose();
};

const handleChipRemove = (filterType: string) => {
  // Chip removal bypasses manual-apply (immediate update)
  // Update actual state AND temp state
  if (filterType === 'status') {
    onStatusChange([]);
    setTempStatus([]);
  }
  // ...
};
```

### Responsive Breakpoint

**Tailwind `md` breakpoint = 768px:**
- `hidden md:flex` → Hide on mobile, show on desktop
- `md:hidden` → Show on mobile, hide on desktop

**Edge Case:** At exactly 768px = desktop layout (Tailwind convention)
- iPad Mini (768x1024) shows desktop layout

**Window Resize:**
```tsx
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth >= 768 && bottomSheetOpen) {
      setBottomSheetOpen(false); // Auto-close on mobile→desktop resize
    }
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [bottomSheetOpen]);
```

### Active Filter Chips Format

**Display examples:**
- Single value: "Status: New"
- 2-3 values: "Status: New, Contacted"
- 4+ values: "Status: 4 selected"
- Date range: "Date: Jan 20 - Jan 26"
- Owner (long name): "Owner: Jirawatp..." (truncate at 20 chars)

### Touch Target Guidelines (WCAG 2.5.5)

**Minimum tap target size: 44x44 CSS pixels**
- Filter buttons in bottom sheet
- Chip X buttons
- Bottom sheet close button
- Apply/Cancel/Clear All buttons
- Filter option items

### Swipe-to-Close Gesture

**Implementation:**
- Swipe-to-close only on handle area OR when scrolled to top
- Prevent conflict with scroll gesture inside sheet content
- Use Sheet's built-in drag-to-close feature

### Date Filter in Bottom Sheet

**Consideration:** LeadDateFilter includes Calendar (react-day-picker)
- Calendar may be large inside 80vh bottom sheet
- Ensure scrolling works correctly
- Test month navigation on mobile
- Verify custom date range selection

### Testing Viewport Sizes

**Mobile:**
- iPhone SE: 375x667
- iPhone 12/13: 390x844
- iPhone 14 Pro Max: 430x932
- Android (Pixel 5): 393x851

**Tablet:**
- iPad Mini: 768x1024 (should show desktop layout)

**Edge Case Testing:**
- Exactly 768px: desktop layout
- 767px: mobile layout
- Resize from 767 → 768: should close bottom sheet

## Definition of Done

- [ ] All acceptance criteria tested and passing (AC1-AC13)
- [ ] All tasks completed and checked off
- [ ] Unit tests written and passing (>80% coverage)
- [ ] E2E tests written and passing (Playwright)
- [ ] Tested on real mobile devices (iOS + Android)
- [ ] No horizontal scroll on mobile table
- [ ] Touch targets meet WCAG 44x44px minimum
- [ ] URL state sync works on mobile
- [ ] Chip removal immediate update works correctly
- [ ] Manual apply behavior works correctly (no premature updates)
- [ ] API error handling tested (retry works)
- [ ] Loading states tested (Apply button spinner)
- [ ] Window resize behavior tested (auto-close bottom sheet)
- [ ] z-index conflicts resolved (Popover in Sheet)
- [ ] SelectionToolbar unchanged (regression test)
- [ ] Desktop layout unaffected (regression test)
- [ ] Code reviewed and approved
- [ ] No console errors or warnings
- [ ] Performance tested (smooth bottom sheet animation)

## Dependencies

**Stories:**
- Depends on: 4-1, 4-3, 4-4, 4-5, 4-6, 4-14 (existing filter stories)
- Blocks: None

**Components:**
- Requires: shadcn/ui Sheet component
- Reuses: LeadStatusFilter, LeadOwnerFilter, LeadDateFilter, LeadSourceFilter
- Reuses: ExportAllButton (render icon-only on mobile)
- Reuses: LeadExportDropdown, SelectionToolbar

**API:**
- No backend changes required (same API endpoints)

## Estimated Effort

**Complexity:** Medium-High (increased due to edge cases)
**Story Points:** 10 (revised from 8)

**Breakdown:**
- Component creation: 3 points
- Responsive layout + edge cases: 3 points
- Testing (unit + e2e + devices): 3 points
- Bug fixes (z-index, resize, etc.): 1 point

## Review Notes (Rex's Feedback)

**Critical Issues Fixed:**
1. ✅ AC3 vs AC6 conflict resolved (chip removal = immediate, bottom sheet = manual apply)
2. ✅ Popover z-index handling strategy added
3. ✅ Export button clarified (ExportAllButton, icon-only)
4. ✅ Checkbox column included in mobile table
5. ✅ Breakpoint edge case (768px) documented
6. ✅ Bottom sheet state on URL load clarified

**Major Issues Fixed:**
7. ✅ Active filter count badge zero state
8. ✅ Clear All confirmation clarified (immediate, no dialog)
9. ✅ Bottom sheet close behaviors (Cancel, X, swipe, tap outside)
10. ✅ Responsive resize behavior (auto-close sheet)
11. ✅ Filter component mobile styling strategy
12. ✅ Performance - large chip list handling
13. ✅ Line number references replaced with comments
14. ✅ AC13 added (API error handling)
15. ✅ Loading state during manual apply
16. ✅ Swipe gesture conflict prevention
17. ✅ Chip label truncation strategy
18. ✅ Date filter calendar in bottom sheet considerations
