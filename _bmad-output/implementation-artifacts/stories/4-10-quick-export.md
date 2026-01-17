# Story 4.10: Quick Export

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to quickly export selected leads to a file**,
so that **I can share lead information with colleagues, prepare meeting materials, or keep offline records**.

## Acceptance Criteria

1. **AC1: Export Button in Selection Toolbar**
   - Given I have selected one or more leads (Story 4-9)
   - When the selection toolbar appears
   - Then I see an "Export" button with download icon
   - And the button is positioned after the selection count
   - And the button shows "Export ({count})" to indicate how many leads will be exported

2. **AC2: Export Format Options**
   - Given I click the Export button
   - When the dropdown appears
   - Then I see format choices: Excel (.xlsx), CSV
   - And each option has an icon and label
   - And Excel is the first/default option

3. **AC3: Export Content - Excel**
   - Given I export selected leads to Excel
   - When the file is generated
   - Then it contains a header row with column names
   - And includes all selected lead data: Company, Contact Name, Email, Phone, Status, Sales Owner, Campaign, Created Date, Industry
   - And file name follows pattern: `leads_export_{date}.xlsx`
   - And data is formatted in a readable table layout

4. **AC4: Export Content - CSV**
   - Given I export selected leads to CSV
   - When the file is generated
   - Then it contains a header row with column names
   - And includes same data as Excel export
   - And file name follows pattern: `leads_export_{date}.csv`
   - And uses UTF-8 encoding with BOM for Excel compatibility

5. **AC5: Export All Visible (Alternative)**
   - Given I have NOT selected any leads
   - When I view the table toolbar
   - Then I see an "Export All" option in the toolbar
   - And clicking exports all leads matching current filters
   - And respects pagination (exports current page or all pages based on option)

6. **AC6: Export Progress Feedback**
   - Given I initiate an export
   - When the file is being generated
   - Then I see a loading indicator on the button
   - And the button is disabled during generation
   - And generation completes within 3 seconds for typical selections

7. **AC7: Download Handling**
   - Given the export file is ready
   - When download initiates
   - Then the file downloads automatically via browser
   - And a toast notification confirms "Exported {count} leads"
   - And if download fails, show error toast with retry suggestion

8. **AC8: Large Selection Warning**
   - Given I have selected more than 100 leads
   - When I click Export
   - Then I see a confirmation dialog: "Export {count} leads?"
   - And option to proceed or cancel
   - And note about potential file size

9. **AC9: Empty Selection Handling**
   - Given I have no leads selected
   - When the Export button in selection toolbar would appear
   - Then the selection toolbar is not shown (per Story 4-9)
   - And the "Export All" option in main toolbar is available instead

10. **AC10: Accessibility**
    - Given I use keyboard or screen reader
    - When interacting with export features
    - Then export button is keyboard accessible
    - And format options can be selected via keyboard (arrow keys)
    - And loading state is announced to screen readers

## Tasks / Subtasks

- [ ] **Task 1: Create Lead Export Utilities** (AC: #3, #4)
  - [ ] 1.1 Create `src/lib/export-leads.ts`
  - [ ] 1.2 Implement `exportLeadsToExcel(leads)` using XLSX library
  - [ ] 1.3 Implement `exportLeadsToCSV(leads)` with UTF-8 BOM
  - [ ] 1.4 Define export columns (Company, Contact, Email, etc.)
  - [ ] 1.5 Format dates and phone numbers in export
  - [ ] 1.6 Generate filename with current date

- [ ] **Task 2: Create useExportLeads Hook** (AC: #6, #7)
  - [ ] 2.1 Create `src/hooks/use-export-leads.ts`
  - [ ] 2.2 Manage `isExporting` loading state
  - [ ] 2.3 Implement `exportToExcel(leads)` function
  - [ ] 2.4 Implement `exportToCSV(leads)` function
  - [ ] 2.5 Show success/error toast notifications
  - [ ] 2.6 Handle errors with console logging

- [ ] **Task 3: Create LeadExportDropdown Component** (AC: #1, #2)
  - [ ] 3.1 Create `src/components/leads/lead-export-dropdown.tsx`
  - [ ] 3.2 Use DropdownMenu from shadcn/ui (already installed from Story 3-8)
  - [ ] 3.3 Add Excel option with FileSpreadsheet icon
  - [ ] 3.4 Add CSV option with FileText icon
  - [ ] 3.5 Show loading spinner when exporting
  - [ ] 3.6 Disable dropdown during export

- [ ] **Task 4: Update SelectionToolbar** (AC: #1)
  - [ ] 4.1 Add LeadExportDropdown to `selection-toolbar.tsx`
  - [ ] 4.2 Pass selected leads data to export functions
  - [ ] 4.3 Show count in button: "Export ({count})"
  - [ ] 4.4 Position after selection count, before clear button

- [ ] **Task 5: Large Selection Confirmation** (AC: #8)
  - [ ] 5.1 Create confirmation dialog for >100 leads
  - [ ] 5.2 Show lead count and size warning
  - [ ] 5.3 Add "Export anyway" and "Cancel" buttons
  - [ ] 5.4 Use AlertDialog from shadcn/ui

- [ ] **Task 6: Export All Feature** (AC: #5, #9)
  - [ ] 6.1 Add "Export All" button to table toolbar (when no selection)
  - [ ] 6.2 Export all leads matching current filters
  - [ ] 6.3 Respect current sort order
  - [ ] 6.4 Show confirmation for large datasets (>500 leads)

- [ ] **Task 7: Testing** (AC: #1-10)
  - [ ] 7.1 Test export button appears in selection toolbar
  - [ ] 7.2 Test Excel export generates valid file
  - [ ] 7.3 Test CSV export with UTF-8 BOM
  - [ ] 7.4 Test export content includes correct columns
  - [ ] 7.5 Test loading state during export
  - [ ] 7.6 Test success toast notification
  - [ ] 7.7 Test large selection confirmation dialog
  - [ ] 7.8 Test keyboard accessibility
  - [ ] 7.9 Test error handling

- [ ] **Task 8: Integration** (AC: #1-10)
  - [ ] 8.1 Wire up with useLeadSelection from Story 4-9
  - [ ] 8.2 Get selected leads data from table
  - [ ] 8.3 Connect toast notifications
  - [ ] 8.4 Add barrel exports to components/leads/index.ts

## Dev Notes

### Lead Export Utilities

```typescript
// src/lib/export-leads.ts
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatThaiPhone, formatLeadDate } from '@/lib/format-lead';
import { LEAD_STATUS_LABELS } from '@/lib/leads-constants';
import type { Lead, LeadStatus } from '@/types/lead';

/**
 * Export columns configuration
 */
export const LEAD_EXPORT_COLUMNS = [
  { key: 'company', header: 'Company' },
  { key: 'customerName', header: 'Contact Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'status', header: 'Status' },
  { key: 'salesOwnerName', header: 'Sales Owner' },
  { key: 'campaignName', header: 'Campaign' },
  { key: 'createdAt', header: 'Created Date' },
  { key: 'industryAI', header: 'Industry' },
] as const;

/**
 * Format lead data for export
 */
function formatLeadForExport(lead: Lead): Record<string, string> {
  return {
    company: lead.company,
    customerName: lead.customerName,
    email: lead.email,
    phone: formatThaiPhone(lead.phone),
    status: LEAD_STATUS_LABELS[lead.status as LeadStatus] || lead.status,
    salesOwnerName: lead.salesOwnerName || 'Unassigned',
    campaignName: lead.campaignName,
    createdAt: formatLeadDate(lead.createdAt),
    industryAI: lead.industryAI || '-',
  };
}

/**
 * Export leads to Excel format
 * AC#3: Excel Export Content
 */
export function exportLeadsToExcel(leads: Lead[]): void {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Build header row
  const headers = LEAD_EXPORT_COLUMNS.map((col) => col.header);

  // Build data rows
  const rows = leads.map((lead) => {
    const formatted = formatLeadForExport(lead);
    return LEAD_EXPORT_COLUMNS.map((col) => formatted[col.key] || '');
  });

  // Create worksheet from array of arrays
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Company
    { wch: 20 }, // Contact Name
    { wch: 30 }, // Email
    { wch: 15 }, // Phone
    { wch: 12 }, // Status
    { wch: 18 }, // Sales Owner
    { wch: 25 }, // Campaign
    { wch: 15 }, // Created Date
    { wch: 20 }, // Industry
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `leads_export_${dateStr}.xlsx`;

  // Trigger download
  XLSX.writeFile(wb, filename);
}

/**
 * Export leads to CSV format with UTF-8 BOM
 * AC#4: CSV Export Content
 */
export function exportLeadsToCSV(leads: Lead[]): void {
  // Build header row
  const headers = LEAD_EXPORT_COLUMNS.map((col) => col.header);

  // Build data rows
  const rows = leads.map((lead) => {
    const formatted = formatLeadForExport(lead);
    return LEAD_EXPORT_COLUMNS.map((col) => {
      const value = formatted[col.key] || '';
      // Escape quotes and wrap in quotes if contains comma
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
  });

  // Join with commas and newlines
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `leads_export_${dateStr}.csv`;

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### useExportLeads Hook

```typescript
// src/hooks/use-export-leads.ts
'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { exportLeadsToExcel, exportLeadsToCSV } from '@/lib/export-leads';
import type { Lead } from '@/types/lead';

export type ExportFormat = 'excel' | 'csv';

export interface UseExportLeadsReturn {
  exportLeads: (leads: Lead[], format: ExportFormat) => Promise<void>;
  isExporting: boolean;
}

/**
 * Hook for exporting lead data
 * AC#6: Export Progress Feedback
 * AC#7: Download Handling
 */
export function useExportLeads(): UseExportLeadsReturn {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportLeads = useCallback(
    async (leads: Lead[], format: ExportFormat) => {
      if (leads.length === 0) {
        toast({
          title: 'No leads to export',
          description: 'Please select leads to export.',
          variant: 'destructive',
        });
        return;
      }

      setIsExporting(true);

      try {
        // Small delay for UX (shows loading state)
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (format === 'excel') {
          exportLeadsToExcel(leads);
        } else {
          exportLeadsToCSV(leads);
        }

        toast({
          title: 'Export complete',
          description: `Exported ${leads.length} lead${leads.length !== 1 ? 's' : ''} to ${format === 'excel' ? 'Excel' : 'CSV'}.`,
        });
      } catch (error) {
        console.error('Export failed:', error);

        toast({
          title: 'Export failed',
          description: 'Unable to generate export file. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsExporting(false);
      }
    },
    [toast]
  );

  return {
    exportLeads,
    isExporting,
  };
}
```

### LeadExportDropdown Component

```typescript
// src/components/leads/lead-export-dropdown.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useExportLeads, type ExportFormat } from '@/hooks/use-export-leads';
import { ExportConfirmationDialog } from './export-confirmation-dialog';
import type { Lead } from '@/types/lead';

const LARGE_SELECTION_THRESHOLD = 100;

interface LeadExportDropdownProps {
  leads: Lead[];
  disabled?: boolean;
}

export function LeadExportDropdown({ leads, disabled }: LeadExportDropdownProps) {
  const { exportLeads, isExporting } = useExportLeads();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);

  const handleExport = (format: ExportFormat) => {
    // AC#8: Show confirmation for >100 leads
    if (leads.length > LARGE_SELECTION_THRESHOLD) {
      setPendingFormat(format);
      setShowConfirmation(true);
      return;
    }
    void exportLeads(leads, format);
  };

  const handleConfirmExport = () => {
    if (pendingFormat) {
      void exportLeads(leads, pendingFormat);
    }
    setShowConfirmation(false);
    setPendingFormat(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isExporting || leads.length === 0}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Export ({leads.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleExport('excel')}
            disabled={isExporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            CSV (.csv)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AC#8: Large selection confirmation */}
      <ExportConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        count={leads.length}
        onConfirm={handleConfirmExport}
      />
    </>
  );
}
```

### Updated SelectionToolbar

```typescript
// src/components/leads/selection-toolbar.tsx (updated)
'use client';

import { Button } from '@/components/ui/button';
import { X, CheckSquare } from 'lucide-react';
import { LeadExportDropdown } from './lead-export-dropdown';
import type { Lead } from '@/types/lead';

interface SelectionToolbarProps {
  selectedCount: number;
  selectedLeads: Lead[];  // NEW: Pass actual lead data for export
  onClearSelection: () => void;
}

export function SelectionToolbar({
  selectedCount,
  selectedLeads,
  onClearSelection,
}: SelectionToolbarProps) {
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
      <div className="flex items-center gap-2">
        {/* Export dropdown - NEW */}
        <LeadExportDropdown leads={selectedLeads} />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
        >
          <X className="h-4 w-4 mr-1" aria-hidden="true" />
          Clear
        </Button>
      </div>
    </div>
  );
}
```

### Large Selection Confirmation Dialog

```typescript
// src/components/leads/export-confirmation-dialog.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExportConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: () => void;
}

export function ExportConfirmationDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
}: ExportConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Export {count} leads?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to export a large number of leads. This may take a moment
            and result in a larger file size.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Export anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Export All Button (Table Toolbar)

```typescript
// src/components/leads/export-all-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useExportLeads, type ExportFormat } from '@/hooks/use-export-leads';
import { ExportConfirmationDialog } from './export-confirmation-dialog';
import type { Lead } from '@/types/lead';

const LARGE_DATASET_THRESHOLD = 500;

interface ExportAllButtonProps {
  /** All leads matching current filters (not paginated) */
  allFilteredLeads: Lead[];
  disabled?: boolean;
}

/**
 * AC#5: Export All Visible (when no selection)
 * AC#9: Available in main toolbar when no leads selected
 */
export function ExportAllButton({ allFilteredLeads, disabled }: ExportAllButtonProps) {
  const { exportLeads, isExporting } = useExportLeads();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);

  const handleExport = (format: ExportFormat) => {
    // Show confirmation for >500 leads
    if (allFilteredLeads.length > LARGE_DATASET_THRESHOLD) {
      setPendingFormat(format);
      setShowConfirmation(true);
      return;
    }
    void exportLeads(allFilteredLeads, format);
  };

  const handleConfirmExport = () => {
    if (pendingFormat) {
      void exportLeads(allFilteredLeads, pendingFormat);
    }
    setShowConfirmation(false);
    setPendingFormat(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isExporting || allFilteredLeads.length === 0}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Export All
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleExport('excel')}
            disabled={isExporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            CSV (.csv)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        count={allFilteredLeads.length}
        onConfirm={handleConfirmExport}
      />
    </>
  );
}
```

### Component Structure

```
src/
├── components/leads/
│   ├── index.ts                     # Update barrel exports
│   ├── selection-toolbar.tsx        # UPDATE: Add export dropdown
│   ├── lead-export-dropdown.tsx     # NEW: Export format dropdown (AC#1, AC#2)
│   ├── export-all-button.tsx        # NEW: Export all in toolbar (AC#5, AC#9)
│   └── export-confirmation-dialog.tsx # NEW: Large selection warning (AC#8)
├── hooks/
│   └── use-export-leads.ts          # NEW: Export state management
└── lib/
    └── export-leads.ts              # NEW: Lead export utilities
```

### Integration with Story 4-9

Story 4-9 (Bulk Select) provides via `useLeadSelection` hook:
- `selectedIds: Set<number>` - IDs (row numbers) of selected leads
- `clearSelection: () => void` - Clear all selections

Note: `selectedCount` is derived as `selectedIds.size`, not returned directly from the hook.

This story needs actual lead data for export, so:

```typescript
// In lead-table-container.tsx
const { selectedIds, clearSelection } = useLeadSelection();

// Derive selectedCount from Set size (Story 4-9 hook returns Set<number>)
const selectedCount = selectedIds.size;

// Get actual lead data for selected IDs
const selectedLeads = useMemo(
  () => leads?.filter((lead) => selectedIds.has(lead.row)) ?? [],
  [leads, selectedIds]
);

// Pass to SelectionToolbar
<SelectionToolbar
  selectedCount={selectedCount}
  selectedLeads={selectedLeads}
  onClearSelection={clearSelection}
/>
```

### Testing Patterns

```typescript
// Test export generates valid file
it('exports selected leads to Excel', async () => {
  const mockLeads = [
    { row: 1, company: 'Test Corp', email: 'test@example.com', ... },
    { row: 2, company: 'Demo Inc', email: 'demo@example.com', ... },
  ];

  const { user } = render(<LeadTableContainer />);

  // Select leads
  await user.click(screen.getByLabelText(/select test corp/i));
  await user.click(screen.getByLabelText(/select demo inc/i));

  // Click export
  await user.click(screen.getByRole('button', { name: /export/i }));
  await user.click(screen.getByText(/excel/i));

  // Verify toast
  expect(screen.getByText(/exported 2 leads/i)).toBeInTheDocument();
});

// Test large selection confirmation
it('shows confirmation for >100 leads', async () => {
  // ... setup with >100 selected leads

  await user.click(screen.getByRole('button', { name: /export/i }));

  expect(screen.getByText(/export 150 leads\?/i)).toBeInTheDocument();
});
```

### Relationship to Epic 6 (Export & Reports)

This "Quick Export" feature (Could Have) provides basic client-side export for selected leads.

**Epic 6** will provide more comprehensive server-side export including:
- Export to PDF with formatting
- Custom field selection
- Export history tracking
- Scheduled reports
- Larger dataset handling

This story is intentionally lightweight to deliver quick value.

### Accessibility Notes

- Export button has clear label: "Export ({count})"
- Dropdown items have icons and text labels
- Loading state disables button and shows spinner
- Success/error announced via toast (uses live region)
- Keyboard: Tab to button, Enter to open, Arrow keys to navigate options

## Code Review

**Review Date:** 2026-01-17
**Reviewer:** Claude (SM Agent)
**Status:** ✅ PASSED (5 issues found and fixed)

### Issues Found and Fixed

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | Low | Duplicate LEAD_EXPORT_COLUMNS definitions (lines 147-162 vs 178-188) with inconsistent columns | Removed redundant first definition |
| 2 | Medium | LeadExportDropdown missing confirmation dialog integration (AC#8) | Added state management, threshold check, and ExportConfirmationDialog integration |
| 3 | Medium | Missing Export All implementation (Task 6, AC#5/AC#9) | Added ExportAllButton component with full code snippet |
| 4 | Medium | Integration code uses non-existent `selectedCount` from useLeadSelection hook | Changed to derive from `selectedIds.size` |
| 5 | Low | Floating promise in handleExport violates ESLint no-floating-promises | Added `void` prefix to explicitly mark fire-and-forget |

### Verification Checklist

- [x] All ACs have corresponding code snippets
- [x] Export utilities properly handle both Excel and CSV formats
- [x] Confirmation dialog integrated for large selections (>100 for selected, >500 for all)
- [x] Component structure documented with all new files
- [x] Integration with Story 4-9 clearly documented
- [x] Accessibility requirements addressed (keyboard, screen reader)
- [x] Testing patterns provided

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-17 | Story created by SM Agent | Claude |
| 2026-01-17 | Code Review: Fixed 5 issues (confirmation dialog, export all, selectedCount) | Claude |
