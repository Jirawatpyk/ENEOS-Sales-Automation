# Story 3.8: Export Individual Performance Report

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to export an individual sales person's performance report**,
so that **I can share their results in meetings, provide feedback documentation, or keep records for performance reviews**.

## Acceptance Criteria

1. **AC1: Export Button in Detail Sheet**
   - Given I have opened a sales person's detail Sheet (Story 3-1)
   - When I view the Sheet header
   - Then I see an "Export" button with download icon
   - And clicking opens export options
   - And button is clearly visible but not dominant

2. **AC2: Export Format Options**
   - Given I click the Export button
   - When the options appear
   - Then I see format choices: Excel (.xlsx), PDF
   - And each option has an icon and label
   - And Excel is the default/first option
   - **MVP:** Excel only; PDF is optional enhancement

3. **AC3: Export Content - Excel**
   - Given I export to Excel
   - When the file is generated
   - Then it contains:
     - Sales person name and export date in header
     - Summary metrics: Claimed, Contacted, Closed, Conversion Rate, Avg Response Time
     - Target comparison (if targets configured)
     - Period information (based on current filter)
   - And data is formatted in a readable table layout
   - And file name follows pattern: `{name}_performance_{date}.xlsx`

4. **AC4: Export Content - PDF** (Optional Enhancement)
   - Given I export to PDF
   - When the file is generated
   - Then it contains same data as Excel
   - And has ENEOS branding/header (optional)
   - And includes visual charts if available
   - And is formatted for printing (A4)

5. **AC5: Period-Based Export**
   - Given the period filter is active (Story 3-6)
   - When I export
   - Then the exported data matches the selected period
   - And the period is clearly labeled in the export
   - And custom date range shows actual dates (e.g., "Jan 1 - Jan 15, 2026")

6. **AC6: Export Progress Feedback**
   - Given I initiate an export
   - When the file is being generated
   - Then I see a loading indicator on the button
   - And the button is disabled during generation
   - And generation completes within 5 seconds

7. **AC7: Download Handling**
   - Given the export file is ready
   - When download initiates
   - Then the file downloads automatically via browser
   - And a toast notification confirms "Report downloaded"
   - And if download fails, show error with retry option

8. **AC8: Export from Table Row** (Optional Enhancement)
   - Given I am viewing the performance table
   - When I right-click or use row actions menu
   - Then I see "Export Report" option
   - And clicking exports that person's data directly
   - **Note:** This is convenience feature; primary export is via Detail Sheet

9. **AC9: Empty Data Handling**
   - Given a sales person has no data for the selected period
   - When I try to export
   - Then I see a message "No data to export for this period"
   - And the export button is disabled with tooltip explaining why
   - And suggestion to select different period
   - **Note:** "No data" = `claimed === 0` (primary metric determines exportability)

10. **AC10: Accessibility**
    - Given I use keyboard or screen reader
    - When interacting with export features
    - Then export button is keyboard accessible
    - And format options can be selected via keyboard
    - And loading state is announced to screen readers

## Tasks / Subtasks

- [ ] **Task 1: Export Button UI** (AC: #1)
  - [ ] 1.1 Add export button to `sales-detail-sheet.tsx` header
  - [ ] 1.2 Use Download icon from lucide-react
  - [ ] 1.3 Style as secondary/outline button
  - [ ] 1.4 Position in SheetHeader actions area

- [ ] **Task 2: Export Options Dropdown** (AC: #2)
  - [ ] 2.0 Install DropdownMenu: `npx shadcn@latest add dropdown-menu`
  - [ ] 2.1 Create `export-dropdown.tsx` using DropdownMenu from shadcn/ui
  - [ ] 2.2 Add Excel option with FileSpreadsheet icon
  - [ ] 2.3 Add PDF option with FileText icon (optional, disabled)
  - [ ] 2.4 Handle option selection

- [ ] **Task 3: Excel Export Service** (AC: #3, #5)
  - [ ] 3.0 Install xlsx library: `npm install xlsx`
  - [ ] 3.1 Create `src/lib/export-utils.ts`
  - [ ] 3.2 Implement `exportIndividualToExcel(data, period)` function
  - [ ] 3.3 Format data into worksheet with headers
  - [ ] 3.4 Include summary section at top
  - [ ] 3.5 Include period information
  - [ ] 3.6 Generate file with proper naming (remove invalid chars, keep Thai, truncate to 50 chars)
  - [ ] 3.7 Add guard logic for null/undefined metrics (use `?? 0` fallback)

- [ ] **Task 4: PDF Export Service** (AC: #4) - Optional
  - [ ] 4.0 Install jsPDF library: `npm install jspdf`
  - [ ] 4.1 Implement `exportIndividualToPDF(data, period)` function
  - [ ] 4.2 Create PDF layout with headers
  - [ ] 4.3 Add optional ENEOS branding
  - [ ] 4.4 Format for A4 printing

- [ ] **Task 5: Download Handler** (AC: #6, #7)
  - [ ] 5.1 Create `useExportIndividual` hook
  - [ ] 5.2 Manage loading state during generation
  - [ ] 5.3 Trigger browser download via Blob URL
  - [ ] 5.4 Show toast notification on success/failure
  - [ ] 5.5 Handle errors with retry option

- [ ] **Task 6: Empty State Handling** (AC: #9)
  - [ ] 6.1 Check if person has data for selected period
  - [ ] 6.2 Disable export button if no data
  - [ ] 6.3 Show tooltip explaining why disabled
  - [ ] 6.4 Suggest different period selection

- [ ] **Task 7: Row Action Export** (AC: #8) - Optional
  - [ ] 7.1 Add "Export Report" to table row context menu
  - [ ] 7.2 Or add export icon button in actions column
  - [ ] 7.3 Open detail sheet with export or export directly

- [ ] **Task 8: Accessibility** (AC: #10)
  - [ ] 8.1 Add aria-label to export button
  - [ ] 8.2 Ensure dropdown is keyboard navigable
  - [ ] 8.3 Add aria-busy during loading
  - [ ] 8.4 Announce success/failure to screen readers

- [ ] **Task 9: Integration** (AC: #1-10)
  - [ ] 9.1 Connect export to useSalesPerformance data
  - [ ] 9.2 Pass current period from filter context
  - [ ] 9.3 Get individual person data from props
  - [ ] 9.4 Wire up toast notifications

- [ ] **Task 10: Testing** (AC: #1-10)
  - [ ] 10.1 Test export button renders in detail sheet
  - [ ] 10.2 Test dropdown opens with format options
  - [ ] 10.3 Test Excel file generation with correct data
  - [ ] 10.4 Test file naming pattern (English name)
  - [ ] 10.5 Test period information included
  - [ ] 10.6 Test loading state during export
  - [ ] 10.7 Test download triggers correctly
  - [ ] 10.8 Test empty data handling (claimed === 0)
  - [ ] 10.9 Test keyboard accessibility
  - [ ] 10.10 Test toast notifications
  - [ ] 10.11 Test Thai name filename generation (keep Thai chars)
  - [ ] 10.12 Test long name truncation (max 50 chars)
  - [ ] 10.13 Test null/undefined metrics fallback to 0

## Dev Notes

### Export Data Structure

```typescript
interface IndividualExportData {
  // Person info
  name: string;
  userId: string;

  // Period info
  period: string;
  dateFrom: string;
  dateTo: string;

  // Metrics
  claimed: number;
  contacted: number;
  closed: number;
  conversionRate: number;
  avgResponseTime: number;

  // Target comparison (optional)
  target?: {
    closed: number;
    progress: number;  // percentage
    status: 'above' | 'on' | 'below';
  };

  // Export metadata
  exportedAt: string;
  exportedBy?: string;
}
```

### Component Structure

```
src/components/sales/
├── export-dropdown.tsx           # Export format dropdown
├── sales-detail-sheet.tsx        # Update to include export button
└── index.ts                      # Update exports

src/lib/
└── export-utils.ts               # Excel/PDF export functions

src/hooks/
└── use-export-individual.ts      # Export state management
```

### Export Button in Detail Sheet

```typescript
// Update to sales-detail-sheet.tsx
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ExportDropdown } from './export-dropdown';

export function SalesDetailSheet({ open, onOpenChange, salesPerson }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>{salesPerson?.name}</SheetTitle>
          {salesPerson && (
            <ExportDropdown
              data={salesPerson}
              disabled={!salesPerson.claimed} // Disable if no data
            />
          )}
        </SheetHeader>
        {/* ... rest of content ... */}
      </SheetContent>
    </Sheet>
  );
}
```

### Export Dropdown Component

```typescript
// src/components/sales/export-dropdown.tsx
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
import { useExportIndividual } from '@/hooks/use-export-individual';
import { SalesPersonMetrics } from '@/types';

interface ExportDropdownProps {
  data: SalesPersonMetrics;
  disabled?: boolean;
}

export function ExportDropdown({ data, disabled }: ExportDropdownProps) {
  const { exportToExcel, exportToPDF, isExporting } = useExportIndividual();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          aria-label="Export report"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToExcel(data)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF(data)} disabled>
          <FileText className="h-4 w-4 mr-2" />
          PDF (Coming Soon)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Export Hook

```typescript
// src/hooks/use-export-individual.ts
'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { exportIndividualToExcel, exportIndividualToPDF } from '@/lib/export-utils';
import { useSalesPeriodFilter } from './use-sales-period-filter';
import { SalesPersonMetrics } from '@/types';

export function useExportIndividual() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { period, from, to } = useSalesPeriodFilter();

  const exportToExcel = async (data: SalesPersonMetrics) => {
    setIsExporting(true);
    try {
      await exportIndividualToExcel(data, { period, from, to });
      toast({
        title: 'Report downloaded',
        description: `${data.name}'s performance report has been exported.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Unable to generate report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async (data: SalesPersonMetrics) => {
    // TODO: Implement PDF export
    toast({
      title: 'Coming Soon',
      description: 'PDF export will be available in a future update.',
    });
  };

  return { exportToExcel, exportToPDF, isExporting };
}
```

### Excel Export Utility

```typescript
// src/lib/export-utils.ts
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { SalesPersonMetrics } from '@/types';
import { formatResponseTime } from './format-utils';

interface ExportOptions {
  period: string;
  from: Date;
  to: Date;
}

export async function exportIndividualToExcel(
  data: SalesPersonMetrics,
  options: ExportOptions
): Promise<void> {
  const { period, from, to } = options;

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Summary section (with null guards)
  const summaryData = [
    ['Individual Performance Report'],
    [],
    ['Name', data.name],
    ['Period', getPeriodLabel(period)],
    ['Date Range', `${format(from, 'MMM d, yyyy')} - ${format(to, 'MMM d, yyyy')}`],
    ['Generated', format(new Date(), 'MMM d, yyyy HH:mm')],
    [],
    ['Metrics'],
    ['Claimed Leads', data.claimed ?? 0],
    ['Contacted', data.contacted ?? 0],
    ['Closed Deals', data.closed ?? 0],
    ['Conversion Rate', `${(data.conversionRate ?? 0).toFixed(1)}%`],
    ['Avg Response Time', formatResponseTime(data.avgResponseTime ?? 0)],
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  ws['!cols'] = [{ wch: 20 }, { wch: 30 }];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Performance');

  // Generate filename (keep Thai chars, remove only invalid filesystem chars, truncate)
  const safeName = data.name
    .replace(/[\\/:*?"<>|]/g, '_')  // Remove filesystem-invalid chars only
    .slice(0, 50);                   // Truncate to max 50 chars
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `${safeName}_performance_${dateStr}.xlsx`;

  // Trigger download
  XLSX.writeFile(wb, filename);
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'quarter': return 'This Quarter';
    case 'lastQuarter': return 'Last Quarter';
    case 'custom': return 'Custom Range';
    default: return period;
  }
}
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
```

### Dependencies

```bash
npm install xlsx          # Excel export
npm install jspdf         # PDF export (optional)
```

### File Naming Convention

```
{name}_performance_{date}.xlsx

Examples:
- John_Smith_performance_2026-01-15.xlsx
- สมชาย_performance_2026-01-15.xlsx (Thai names supported)
```

### Dependencies on Previous Stories

- **Story 3-1:** Detail Sheet component to add export button
- **Story 3-2/3-4:** Metrics data structure
- **Story 3-6:** Period filter for date range
- **Story 3-7:** Target data for comparison (optional)

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-03.8] - Export Individual feature
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-06.1] - Export to Excel pattern
- [Source: _bmad-output/implementation-artifacts/stories/3-1-performance-table.md] - Detail Sheet

### Previous Story Intelligence

From Story 3-1:
- Detail Sheet component exists
- salesPerson data structure available

From Story 3-6:
- Period filter provides date range
- useSalesPeriodFilter hook available

### Critical Don't-Miss Rules

1. **MVP is Excel only** - PDF is optional enhancement
2. **Include period in export** - Data must match current filter
3. **Safe filename** - Remove only filesystem-invalid chars (`\/:*?"<>|`), keep Thai/Unicode
4. **Thai character support** - xlsx library handles Unicode, filename keeps Thai chars
5. **Filename truncation** - Max 50 characters for safeName portion
6. **Loading state** - Show spinner during export generation
7. **Toast feedback** - Confirm success/failure to user
8. **Empty data check** - Don't export if `claimed === 0` (primary metric)
9. **Null guards** - Use `?? 0` for all metrics to prevent `.toFixed()` crash
10. **Client-side export** - No backend needed for MVP (xlsx runs in browser)

### Export Location Options

**Option A: Detail Sheet Header (Recommended)**
- Export button in sheet header
- Export data for currently viewed person
- Cleaner UX, focused context

**Option B: Table Row Action**
- Export icon in each row
- Quick access without opening sheet
- More cluttered table

**Selected: Option A** - Primary in Detail Sheet, Option B is optional enhancement

### Edge Cases

- Person with `claimed === 0` → disable export button, show tooltip "No data for this period"
- Very long name → truncate filename to max 50 chars (safeName portion)
- Filesystem-invalid characters → replace `\/:*?"<>|` with underscore (keep Thai/Unicode)
- Export during loading → prevent via disabled button
- Browser blocks download → show error toast, suggest allowing popups
- Large data set → should still be fast (single person data is small)
- Null/undefined metrics → use `?? 0` fallback to prevent crash

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

