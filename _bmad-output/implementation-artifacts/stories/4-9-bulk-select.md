# Story 4.9: Bulk Select

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to select multiple leads from the table**,
so that **I can perform bulk actions like exporting selected leads or viewing summary statistics**.

## Acceptance Criteria

1. **AC1: Selection Checkbox Column**
   - Given I view the Lead List Table
   - When the table renders
   - Then I see a checkbox column as the first column (before Company)
   - And the checkbox column header contains a "select all" checkbox
   - And the checkbox column has a fixed width (40px)
   - And the checkbox column is sticky (stays visible on horizontal scroll)

2. **AC2: Select Individual Rows**
   - Given I click a checkbox in a row
   - When the checkbox is clicked
   - Then that row becomes selected (checkbox checked)
   - And the row has a visual highlight (light blue background)
   - And clicking the row elsewhere still opens the detail sheet
   - And clicking the checkbox again deselects the row

3. **AC3: Select All (Current Page)**
   - Given I click the "select all" checkbox in the header
   - When it is clicked
   - Then all visible rows on the current page are selected
   - And clicking again deselects all rows
   - And the header checkbox shows indeterminate state when some (but not all) rows are selected

4. **AC4: Selection Count Display**
   - Given I have selected one or more rows
   - When selection exists
   - Then I see a selection toolbar above the table
   - And it displays "{count} leads selected"
   - And it shows a "Clear selection" button
   - And the toolbar has a subtle background color to stand out

5. **AC5: Clear Selection**
   - Given I have rows selected
   - When I click "Clear selection" button
   - Then all selections are cleared
   - And the selection toolbar disappears
   - And all checkboxes become unchecked

6. **AC6: Selection Persists Across Page Changes**
   - Given I select leads on page 1
   - When I navigate to page 2 and back to page 1
   - Then my selections on page 1 are preserved
   - And selected rows show as checked

7. **AC7: Selection Cleared on Filter/Search Change**
   - Given I have rows selected
   - When I change a filter or search term
   - Then all selections are cleared (to prevent invalid selections)
   - And a brief toast notification appears: "Selection cleared due to filter change"

8. **AC8: Keyboard Accessibility**
   - Given I focus on a checkbox
   - When I press Space
   - Then the checkbox toggles
   - And focus remains on the checkbox
   - And screen readers announce selection state

9. **AC9: Selection State Available for Export**
   - Given I have rows selected
   - When Story 4-10 (Quick Export) is implemented
   - Then the selected lead row IDs are available via a hook
   - And export can operate on selected leads only

## Tasks / Subtasks

- [ ] **Task 1: Add Checkbox Component** (AC: #1, #2)
  - [ ] 1.1 Add shadcn/ui Checkbox component: `npx shadcn@latest add checkbox`
  - [ ] 1.2 Verify Checkbox component in `src/components/ui/checkbox.tsx`
  - [ ] 1.3 Test Checkbox renders correctly with different states

- [ ] **Task 2: Create Selection State Hook** (AC: #2, #6, #7, #9)
  - [ ] 2.1 Create `src/hooks/use-lead-selection.ts` with selection state management
  - [ ] 2.2 Store selected row IDs in state (Set<number>)
  - [ ] 2.3 Implement `toggleSelection(rowId)` function
  - [ ] 2.4 Implement `selectAll(rowIds)` and `clearSelection()` functions
  - [ ] 2.5 Implement `isSelected(rowId)` helper
  - [ ] 2.6 Export `selectedIds` and `selectedCount` for external use

- [ ] **Task 3: Update LeadTable with Checkbox Column** (AC: #1, #2, #3)
  - [ ] 3.1 Add checkbox column definition as first column
  - [ ] 3.2 Implement header checkbox with select all logic
  - [ ] 3.3 Implement row checkbox with toggle logic
  - [ ] 3.4 Add visual highlight for selected rows
  - [ ] 3.5 Prevent row click from triggering when checkbox is clicked
  - [ ] 3.6 Make checkbox column sticky alongside Company column

- [ ] **Task 4: Create SelectionToolbar Component** (AC: #4, #5)
  - [ ] 4.1 Create `src/components/leads/selection-toolbar.tsx`
  - [ ] 4.2 Display selection count: "{count} leads selected"
  - [ ] 4.3 Add "Clear selection" button
  - [ ] 4.4 Style with subtle background (bg-blue-50)
  - [ ] 4.5 Add smooth enter/exit animation

- [ ] **Task 5: Integrate Selection with Table Container** (AC: #4, #7)
  - [ ] 5.1 Add `useLeadSelection` hook to `lead-table-container.tsx`
  - [ ] 5.2 Render SelectionToolbar conditionally when items selected
  - [ ] 5.3 Clear selection when filters/search change
  - [ ] 5.4 Show toast notification on filter-triggered clear

- [ ] **Task 6: Handle Indeterminate State** (AC: #3)
  - [ ] 6.1 Calculate if all, some, or none are selected
  - [ ] 6.2 Apply indeterminate state to header checkbox when partial selection
  - [ ] 6.3 Use Checkbox `data-state` or ref for indeterminate

- [ ] **Task 7: Testing** (AC: #1-9)
  - [ ] 7.1 Test checkbox column renders correctly
  - [ ] 7.2 Test individual row selection toggle
  - [ ] 7.3 Test select all selects all visible rows
  - [ ] 7.4 Test select all with indeterminate state
  - [ ] 7.5 Test selection count displays correctly
  - [ ] 7.6 Test clear selection button works
  - [ ] 7.7 Test selection persists across page navigation
  - [ ] 7.8 Test selection clears on filter change
  - [ ] 7.9 Test keyboard accessibility (Space to toggle)
  - [ ] 7.10 Test checkbox click doesn't open detail sheet

- [ ] **Task 8: Integration Testing** (AC: #6, #7)
  - [ ] 8.1 Test pagination with selection state
  - [ ] 8.2 Test filter change clears selection
  - [ ] 8.3 Test search change clears selection

## Dev Notes

### Selection State Hook

```typescript
// src/hooks/use-lead-selection.ts
'use client';

import { useState, useCallback, useMemo } from 'react';

export interface UseLeadSelectionReturn {
  selectedIds: Set<number>;
  selectedCount: number;
  isSelected: (rowId: number) => boolean;
  toggleSelection: (rowId: number) => void;
  selectAll: (rowIds: number[]) => void;
  clearSelection: () => void;
  isAllSelected: (visibleRowIds: number[]) => boolean;
  isSomeSelected: (visibleRowIds: number[]) => boolean;
}

export function useLeadSelection(): UseLeadSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const isSelected = useCallback(
    (rowId: number) => selectedIds.has(rowId),
    [selectedIds]
  );

  const toggleSelection = useCallback((rowId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((rowIds: number[]) => {
    setSelectedIds((prev) => {
      const allSelected = rowIds.every((id) => prev.has(id));
      if (allSelected) {
        // Deselect all visible rows
        const next = new Set(prev);
        rowIds.forEach((id) => next.delete(id));
        return next;
      } else {
        // Select all visible rows
        const next = new Set(prev);
        rowIds.forEach((id) => next.add(id));
        return next;
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useCallback(
    (visibleRowIds: number[]) => {
      if (visibleRowIds.length === 0) return false;
      return visibleRowIds.every((id) => selectedIds.has(id));
    },
    [selectedIds]
  );

  const isSomeSelected = useCallback(
    (visibleRowIds: number[]) => {
      if (visibleRowIds.length === 0) return false;
      const selectedOnPage = visibleRowIds.filter((id) => selectedIds.has(id)).length;
      return selectedOnPage > 0 && selectedOnPage < visibleRowIds.length;
    },
    [selectedIds]
  );

  return {
    selectedIds,
    selectedCount,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  };
}
```

### Checkbox Column Definition

```typescript
// Add to lead-table.tsx columns array (first position)
import { Checkbox } from '@/components/ui/checkbox';

// New prop for LeadTableProps
interface LeadTableProps {
  data: Lead[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onRowClick: (lead: Lead) => void;
  // New selection props
  selectedIds: Set<number>;
  onToggleSelection: (rowId: number) => void;
  onSelectAll: (rowIds: number[]) => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

// Define table meta type for selection state access
interface TableMeta {
  selectedIds: Set<number>;
  onToggleSelection: (rowId: number) => void;
  onSelectAll: (rowIds: number[]) => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

// Checkbox column (insert at index 0)
// NOTE: Uses table.options.meta to access selection state from column definitions
{
  id: 'select',
  header: ({ table }) => {
    const meta = table.options.meta as TableMeta;
    const allRowIds = table.getRowModel().rows.map((row) => row.original.row);

    // Determine checked state: true | false | 'indeterminate'
    const checkedState = meta.isAllSelected
      ? true
      : meta.isSomeSelected
        ? 'indeterminate'
        : false;

    return (
      <Checkbox
        checked={checkedState}
        onCheckedChange={() => meta.onSelectAll(allRowIds)}
        aria-label="Select all leads on this page"
        onClick={(e) => e.stopPropagation()}
      />
    );
  },
  cell: ({ row, table }) => {
    const meta = table.options.meta as TableMeta;
    return (
      <Checkbox
        checked={meta.selectedIds.has(row.original.row)}
        onCheckedChange={() => meta.onToggleSelection(row.original.row)}
        aria-label={`Select ${row.original.company}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  },
  enableSorting: false,
  size: 40,
}

// Pass meta to useReactTable
const table = useReactTable({
  data,
  columns,
  state: { sorting },
  onSortingChange: /* ... */,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  meta: {
    selectedIds,
    onToggleSelection,
    onSelectAll,
    isAllSelected,
    isSomeSelected,
  } as TableMeta,
});
```

### SelectionToolbar Component

```typescript
// src/components/leads/selection-toolbar.tsx
'use client';

import { Button } from '@/components/ui/button';
import { X, CheckSquare } from 'lucide-react';

interface SelectionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
}

export function SelectionToolbar({ selectedCount, onClearSelection }: SelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-950 border-b rounded-t-lg animate-in slide-in-from-top-2 duration-200"
      role="toolbar"
      aria-label="Selection actions"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
        <CheckSquare className="h-4 w-4" aria-hidden="true" />
        <span>{selectedCount} lead{selectedCount !== 1 ? 's' : ''} selected</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
      >
        <X className="h-4 w-4 mr-1" aria-hidden="true" />
        Clear selection
      </Button>
    </div>
  );
}
```

### Row Highlight Styling

```typescript
// In LeadTable TableRow
<TableRow
  key={row.id}
  className={cn(
    'cursor-pointer hover:bg-muted/50 transition-colors',
    selectedIds.has(row.original.row) && 'bg-blue-50 dark:bg-blue-950/50'
  )}
  // ... rest of props
>
```

### Integration with Container

```typescript
// src/components/leads/lead-table-container.tsx (updated)
'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLeadSelection } from '@/hooks/use-lead-selection';
import { SelectionToolbar } from './selection-toolbar';
// ... other imports

export function LeadTableContainer() {
  const { /* existing hooks */ } = useLeads(/* params */);

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useLeadSelection();

  // Track previous filter values to detect changes
  const prevFiltersRef = useRef({ status, owner, search, dateRange });

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.status !== status ||
      prev.owner !== owner ||
      prev.search !== search ||
      prev.dateRange?.from !== dateRange?.from ||
      prev.dateRange?.to !== dateRange?.to;

    if (filtersChanged && selectedCount > 0) {
      clearSelection();
      toast.info('Selection cleared due to filter change');
    }

    prevFiltersRef.current = { status, owner, search, dateRange };
  }, [status, owner, search, dateRange, selectedCount, clearSelection]);

  const visibleRowIds = leads?.map((lead) => lead.row) ?? [];

  return (
    <div className="space-y-4">
      {/* Filters and Search */}

      {/* Selection Toolbar (conditionally rendered) */}
      <SelectionToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
      />

      {/* Lead Table */}
      <LeadTable
        data={leads}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        onRowClick={handleRowClick}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        onSelectAll={() => selectAll(visibleRowIds)}
        isAllSelected={isAllSelected(visibleRowIds)}
        isSomeSelected={isSomeSelected(visibleRowIds)}
      />

      {/* Pagination */}
    </div>
  );
}
```

### Checkbox Component (shadcn/ui)

After running `npx shadcn@latest add checkbox`, you'll get:

```typescript
// src/components/ui/checkbox.tsx
'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
```

### Component Structure

```
src/
├── components/
│   ├── leads/
│   │   ├── index.ts                     # Update barrel exports
│   │   ├── lead-table.tsx               # UPDATE: Add checkbox column
│   │   ├── lead-table-container.tsx     # UPDATE: Add selection state
│   │   └── selection-toolbar.tsx        # NEW: Selection count & clear
│   └── ui/
│       └── checkbox.tsx                 # NEW: shadcn/ui component
└── hooks/
    └── use-lead-selection.ts            # NEW: Selection state management
```

### Testing Patterns

```typescript
// Test individual selection
it('toggles row selection when checkbox clicked', async () => {
  const { user } = render(<LeadTableContainer />);

  const checkbox = screen.getByLabelText(/select test corp/i);
  await user.click(checkbox);

  expect(screen.getByText('1 lead selected')).toBeInTheDocument();

  await user.click(checkbox);
  expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
});

// Test select all
it('selects all visible rows when header checkbox clicked', async () => {
  const { user } = render(<LeadTableContainer />);

  const selectAllCheckbox = screen.getByLabelText(/select all leads/i);
  await user.click(selectAllCheckbox);

  // Assuming 10 leads on page
  expect(screen.getByText('10 leads selected')).toBeInTheDocument();
});

// Test click propagation
it('does not open detail sheet when checkbox is clicked', async () => {
  const { user } = render(<LeadTableContainer />);

  const checkbox = screen.getByLabelText(/select test corp/i);
  await user.click(checkbox);

  expect(screen.queryByTestId('lead-detail-sheet')).not.toBeInTheDocument();
});
```

### Relationship to Story 4-10 (Quick Export)

This story provides the selection infrastructure that Story 4-10 will consume:

```typescript
// Story 4-10 will use:
const { selectedIds, selectedCount } = useLeadSelection();

// Export only selected leads
const exportSelectedLeads = () => {
  if (selectedCount === 0) {
    toast.error('Please select leads to export');
    return;
  }

  const selectedLeads = leads.filter((lead) => selectedIds.has(lead.row));
  // ... trigger export
};
```

### Accessibility Notes

- Each checkbox has `aria-label` describing what it selects
- Header checkbox: "Select all leads on this page"
- Row checkbox: "Select {company name}"
- SelectionToolbar has `role="toolbar"` and `aria-label="Selection actions"`
- Keyboard: Space toggles checkbox, Tab moves between checkboxes
- Screen readers announce checked/unchecked state

## Code Review

### Review Date: 2026-01-17

**Issues Found: 4**

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | Medium | Column definition can't access selection props - columns in useMemo don't have access to component props | Use TanStack Table's `meta` feature to pass selection state; added `TableMeta` interface |
| 2 | Medium | Indeterminate state using hacky ref approach instead of Radix's native support | Changed to `checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}` |
| 3 | Low | Variable shadowing: `selectedCount` inside `isSomeSelected` shadows outer variable | Renamed to `selectedOnPage` |
| 4 | Low | Missing `type="button"` on SelectionToolbar Button | Added `type="button"` attribute |

**Verdict:** ✅ APPROVED after fixes

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-17 | Code review passed - 4 issues fixed | Claude |
| 2026-01-17 | Story created by SM Agent | Claude |
