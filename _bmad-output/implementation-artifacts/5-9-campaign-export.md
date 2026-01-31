# Story 5.9: Campaign Export

Status: done

## Story

As an **ENEOS manager**,
I want **to export campaign analytics data to Excel or CSV**,
so that **I can share email campaign performance reports with stakeholders, analyze data offline, or present metrics in meetings**.

## Acceptance Criteria

1. **AC1: Export Button Placement**
   - Given I am on the Campaigns page (`/campaigns`)
   - When the page loads
   - Then I see an "Export" dropdown button in the page header (next to date filter)
   - And the button shows a download icon (FileDown)

2. **AC2: Export Format Options**
   - Given I click the Export dropdown
   - When the menu opens
   - Then I see options: "Export to Excel (.xlsx)" and "Export to CSV (.csv)"
   - And each option has an appropriate icon (FileSpreadsheet, FileText)

3. **AC3: Export with Current Filters**
   - Given I have applied a date filter (e.g., "This Month")
   - When I click Export
   - Then only campaigns matching the current filter are exported
   - And the filename includes the date range: `campaigns_export_2026-01-01_2026-01-31.xlsx`

4. **AC4: Export All Campaigns**
   - Given no date filter is applied ("All Time")
   - When I click Export
   - Then all campaigns are exported
   - And the filename is: `campaigns_export_all_2026-01-31.xlsx`

5. **AC5: Export Columns**
   - Given I export campaign data
   - When the file is generated
   - Then it includes columns: Campaign ID, Campaign Name, Delivered, Opened, Clicked, Unique Opens, Unique Clicks, Open Rate (%), Click Rate (%), First Event, Last Updated
   - And numeric columns are properly formatted (rates as percentages)
   - And dates are formatted as `YYYY-MM-DD HH:mm`

6. **AC6: Loading State**
   - Given I click Export
   - When the export is processing
   - Then the dropdown button shows a loading spinner
   - And the button is disabled to prevent double-clicks
   - And a "Exporting..." text appears

7. **AC7: Success Feedback**
   - Given the export completes successfully
   - When the file downloads
   - Then a success toast shows: "Exported X campaigns to Excel/CSV"
   - And the button returns to normal state

8. **AC8: Empty Data Handling**
   - Given no campaigns match the current filter
   - When I click Export
   - Then an info toast shows: "No campaigns to export"
   - And no file is downloaded

9. **AC9: Error Handling**
   - Given an error occurs during export
   - When the export fails
   - Then an error toast shows: "Export failed. Please try again."
   - And the button returns to normal state
   - And the error is logged to console

10. **AC10: Large Dataset Confirmation**
    - Given there are >100 campaigns to export
    - When I click Export
    - Then a confirmation dialog appears: "Export 150 campaigns?"
    - And I can click "Export" to proceed or "Cancel" to abort

11. **AC11: Accessibility**
    - Given I use keyboard or screen reader
    - When interacting with export
    - Then the dropdown is keyboard accessible (Enter/Space to open, Arrow keys to navigate)
    - And export actions have descriptive aria-labels
    - And loading state is announced to screen readers

## Tasks / Subtasks

- [x] **Task 1: Create Campaign Export Column Config** (AC: #5)
  - [x] 1.1 Create `src/lib/export-campaigns.ts`
  - [x] 1.2 Define `CAMPAIGN_EXPORT_COLUMNS` array with key, header, width, format
  - [x] 1.3 Include all campaign stats fields: campaignId, campaignName, delivered, opened, clicked, uniqueOpens, uniqueClicks, openRate, clickRate, firstEvent, lastUpdated
  - [x] 1.4 Add format functions for percentages and dates
  - [x] 1.5 Export `exportCampaignsToExcel()` function
  - [x] 1.6 Export `exportCampaignsToCSV()` function
  - [x] 1.7 Write unit tests (24 test cases)

- [x] **Task 2: Create Campaign Export Hook** (AC: #3, #6, #7, #8, #9)
  - [x] 2.1 Create `src/hooks/use-export-campaigns.ts`
  - [x] 2.2 Accept `dateFrom` and `dateTo` params for filtered export
  - [x] 2.3 Manage `isExporting` loading state
  - [x] 2.4 Fetch all campaign data using existing `fetchCampaignStats()`
  - [x] 2.5 Call export functions from `export-campaigns.ts`
  - [x] 2.6 Show success/error toasts using `useToast()`
  - [x] 2.7 Handle empty results with info toast
  - [x] 2.8 Write unit tests (17 test cases)

- [x] **Task 3: Create Campaign Export Dropdown Component** (AC: #1, #2, #10, #11)
  - [x] 3.1 Create `src/components/campaigns/campaign-export-dropdown.tsx`
  - [x] 3.2 REUSE pattern from `src/components/leads/lead-export-dropdown.tsx`
  - [x] 3.3 Use shadcn/ui DropdownMenu component
  - [x] 3.4 Add Excel and CSV options with icons (FileSpreadsheet, FileText)
  - [x] 3.5 Show loading spinner during export
  - [x] 3.6 Add confirmation dialog for large exports (>100 campaigns)
  - [x] 3.7 Add aria-labels and keyboard accessibility
  - [x] 3.8 Write unit tests (14 test cases)

- [x] **Task 4: Update Campaigns Content Component** (AC: #1, #3)
  - [x] 4.1 Update `src/components/campaigns/campaigns-content.tsx`
  - [x] 4.2 Import and add `CampaignExportDropdown` to header
  - [x] 4.3 Pass `dateFrom` and `dateTo` props from `useCampaignDateFilter()`
  - [x] 4.4 Position export dropdown next to date filter

- [x] **Task 5: Update Barrel Exports** (AC: #1)
  - [x] 5.1 Update `src/components/campaigns/index.ts`
  - [x] 5.2 Export `CampaignExportDropdown`
  - [x] 5.3 Update `src/hooks/index.ts` (if exists)
  - [x] 5.4 Export `useExportCampaigns`

- [x] **Task 6: Testing** (AC: #1-#11)
  - [x] 6.1 Test export dropdown renders correctly
  - [x] 6.2 Test Excel export generates valid file
  - [x] 6.3 Test CSV export generates valid file
  - [x] 6.4 Test date filter is applied to export
  - [x] 6.5 Test loading state during export
  - [x] 6.6 Test success toast after export
  - [x] 6.7 Test empty data shows info toast
  - [x] 6.8 Test large dataset confirmation dialog
  - [x] 6.9 Test keyboard accessibility

## Dev Notes

### Campaign Count Source (IMPORTANT)

The `campaignCount` prop for the confirmation dialog can be obtained from:
1. **Option A:** `useCampaignStats({ dateFrom, dateTo })` → `response.data.data.length`
2. **Option B:** If backend returns `totalCampaigns` field, use that

**Reference:** Story 5-2 Campaign Stats API for exact response format.

### CRITICAL: Reuse Existing Patterns

**DO NOT reinvent the wheel.** Copy patterns from these existing files:

| Source File | What to Reuse |
|-------------|---------------|
| `src/components/leads/lead-export-dropdown.tsx` | Dropdown UI, loading state, confirmation dialog |
| `src/lib/export-leads.ts` | Column config pattern, Excel/CSV generation |
| `src/hooks/use-export-leads.ts` | Hook structure, toast notifications |

### Campaign Export Column Configuration

```typescript
// src/lib/export-campaigns.ts
import XLSX from 'xlsx';
import { format } from 'date-fns';
import type { CampaignStatsItem } from '@/types/campaigns';

export const CAMPAIGN_EXPORT_COLUMNS: ReadonlyArray<{
  key: keyof CampaignStatsItem;
  header: string;
  width: number;
  format?: (value: unknown) => string | number;
}> = [
  { key: 'campaignId', header: 'Campaign ID', width: 15 },
  { key: 'campaignName', header: 'Campaign Name', width: 35 },
  { key: 'delivered', header: 'Delivered', width: 12 },
  { key: 'opened', header: 'Opened', width: 12 },
  { key: 'clicked', header: 'Clicked', width: 12 },
  { key: 'uniqueOpens', header: 'Unique Opens', width: 14 },
  { key: 'uniqueClicks', header: 'Unique Clicks', width: 14 },
  {
    key: 'openRate',
    header: 'Open Rate (%)',
    width: 14,
    format: (v) => typeof v === 'number' ? `${v.toFixed(2)}%` : '0%'
  },
  {
    key: 'clickRate',
    header: 'Click Rate (%)',
    width: 14,
    format: (v) => typeof v === 'number' ? `${v.toFixed(2)}%` : '0%'
  },
  {
    key: 'firstEvent',
    header: 'First Event',
    width: 18,
    format: (v) => v ? format(new Date(v as string), 'yyyy-MM-dd HH:mm') : ''
  },
  {
    key: 'lastUpdated',
    header: 'Last Updated',
    width: 18,
    format: (v) => v ? format(new Date(v as string), 'yyyy-MM-dd HH:mm') : ''
  },
];
```

### Export Functions

```typescript
// src/lib/export-campaigns.ts (continued)

function generateFilename(
  fileFormat: 'xlsx' | 'csv',
  dateFrom?: string,
  dateTo?: string
): string {
  const today = format(new Date(), 'yyyy-MM-dd');

  if (dateFrom && dateTo) {
    const from = format(new Date(dateFrom), 'yyyy-MM-dd');
    const to = format(new Date(dateTo), 'yyyy-MM-dd');
    return `campaigns_export_${from}_${to}.${fileFormat}`;
  }

  return `campaigns_export_all_${today}.${fileFormat}`;
}

export function exportCampaignsToExcel(
  campaigns: CampaignStatsItem[],
  dateFrom?: string,
  dateTo?: string
): void {
  const headers = CAMPAIGN_EXPORT_COLUMNS.map((col) => col.header);

  const rows = campaigns.map((campaign) =>
    CAMPAIGN_EXPORT_COLUMNS.map((col) => {
      const value = campaign[col.key];
      return col.format ? col.format(value) : value ?? '';
    })
  );

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws['!cols'] = CAMPAIGN_EXPORT_COLUMNS.map((col) => ({ wch: col.width }));

  XLSX.utils.book_append_sheet(wb, ws, 'Campaigns');
  XLSX.writeFile(wb, generateFilename('xlsx', dateFrom, dateTo));
}

// Note: generateFilename uses 'fileFormat' param to avoid shadowing date-fns 'format' import

export function exportCampaignsToCSV(
  campaigns: CampaignStatsItem[],
  dateFrom?: string,
  dateTo?: string
): void {
  const headers = CAMPAIGN_EXPORT_COLUMNS.map((col) => col.header);

  const rows = campaigns.map((campaign) =>
    CAMPAIGN_EXPORT_COLUMNS.map((col) => {
      const value = campaign[col.key];
      const formatted = col.format ? col.format(value) : value ?? '';
      // Escape quotes and wrap in quotes if contains comma
      const str = String(formatted);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateFilename('csv', dateFrom, dateTo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### Export Hook

```typescript
// src/hooks/use-export-campaigns.ts
'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchCampaignStats } from '@/lib/api/campaigns';
import { exportCampaignsToExcel, exportCampaignsToCSV } from '@/lib/export-campaigns';
import type { CampaignStatsItem } from '@/types/campaigns';

export type CampaignExportFormat = 'excel' | 'csv';

interface UseExportCampaignsOptions {
  dateFrom?: string;
  dateTo?: string;
}

interface UseExportCampaignsReturn {
  exportCampaigns: (format: CampaignExportFormat) => Promise<void>;
  isExporting: boolean;
}

export function useExportCampaigns(
  options: UseExportCampaignsOptions = {}
): UseExportCampaignsReturn {
  const { dateFrom, dateTo } = options;
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportCampaigns = useCallback(
    async (format: CampaignExportFormat) => {
      setIsExporting(true);

      try {
        // Fetch all campaigns (large limit to get all)
        const response = await fetchCampaignStats({
          limit: 1000, // Adjust based on expected max campaigns
          dateFrom,
          dateTo,
        });

        const campaigns: CampaignStatsItem[] = response.data.data;

        if (campaigns.length === 0) {
          toast({
            title: 'No campaigns to export',
            description: 'There are no campaigns matching your current filters.',
            variant: 'default',
          });
          return;
        }

        // Small delay for UX feedback
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Generate export file
        if (format === 'excel') {
          exportCampaignsToExcel(campaigns, dateFrom, dateTo);
        } else {
          exportCampaignsToCSV(campaigns, dateFrom, dateTo);
        }

        toast({
          title: 'Export complete',
          description: `Exported ${campaigns.length} campaigns to ${format === 'excel' ? 'Excel' : 'CSV'}`,
        });
      } catch (error) {
        console.error('Campaign export failed:', error);
        toast({
          title: 'Export failed',
          description: 'Please try again. If the problem persists, contact support.',
          variant: 'destructive',
        });
      } finally {
        setIsExporting(false);
      }
    },
    [dateFrom, dateTo, toast]
  );

  return {
    exportCampaigns,
    isExporting,
  };
}
```

### Export Dropdown Component

```typescript
// src/components/campaigns/campaign-export-dropdown.tsx
'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useExportCampaigns, type CampaignExportFormat } from '@/hooks/use-export-campaigns';

interface CampaignExportDropdownProps {
  dateFrom?: string;
  dateTo?: string;
  campaignCount?: number;
  disabled?: boolean;  // Disable while data is loading
}

const LARGE_EXPORT_THRESHOLD = 100;

export function CampaignExportDropdown({
  dateFrom,
  dateTo,
  campaignCount = 0,
  disabled = false,
}: CampaignExportDropdownProps) {
  const { exportCampaigns, isExporting } = useExportCampaigns({ dateFrom, dateTo });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<CampaignExportFormat | null>(null);

  const handleExport = (format: CampaignExportFormat) => {
    if (campaignCount > LARGE_EXPORT_THRESHOLD) {
      setPendingFormat(format);
      setShowConfirmDialog(true);
    } else {
      exportCampaigns(format);
    }
  };

  const confirmExport = () => {
    if (pendingFormat) {
      exportCampaigns(pendingFormat);
    }
    setShowConfirmDialog(false);
    setPendingFormat(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || disabled}
            aria-label={`Export ${campaignCount} campaigns`}
            aria-busy={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Export</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            aria-label="Export to Excel"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />
            Export to Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            aria-label="Export to CSV"
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Export to CSV (.csv)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export {campaignCount} campaigns?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to export a large number of campaigns. This may take a moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExport}>Export</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### Update Campaigns Content Component

```typescript
// src/components/campaigns/campaigns-content.tsx - UPDATE
'use client';

import { Suspense } from 'react';
import { CampaignDateFilter } from './campaign-date-filter';
import { CampaignExportDropdown } from './campaign-export-dropdown';  // ADD
import { CampaignKPICardsGrid, CampaignKPICardsSkeleton } from './campaign-kpi-cards-grid';
import { CampaignTable } from './campaign-table';
import { CampaignTableSkeleton } from './campaign-table-skeleton';
import { useCampaignDateFilter } from '@/hooks/use-campaign-date-filter';
import { useCampaignStats } from '@/hooks/use-campaign-stats';  // ADD for count

export function CampaignsContent() {
  const { dateFrom, dateTo } = useCampaignDateFilter();
  // Fetch campaign stats to get count for export confirmation dialog
  const { data: statsData, isLoading: isStatsLoading } = useCampaignStats({ dateFrom, dateTo });
  // Use data.length as count (or statsData?.totalCampaigns if backend provides it)
  const campaignCount = statsData?.campaigns?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header with Date Filter and Export */}
      <div className="flex justify-end items-center gap-2">
        <CampaignDateFilter />
        <CampaignExportDropdown
          dateFrom={dateFrom}
          dateTo={dateTo}
          campaignCount={campaignCount}
          disabled={isStatsLoading}
        />
      </div>

      {/* KPI Cards with date filter */}
      <Suspense fallback={<CampaignKPICardsSkeleton />}>
        <CampaignKPICardsGrid dateFrom={dateFrom} dateTo={dateTo} />
      </Suspense>

      {/* Campaign Table with date filter */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Campaigns</h2>
        <Suspense fallback={<CampaignTableSkeleton />}>
          <CampaignTable dateFrom={dateFrom} dateTo={dateTo} />
        </Suspense>
      </div>
    </div>
  );
}
```

### File Structure

```
eneos-admin-dashboard/src/
├── lib/
│   └── export-campaigns.ts              # NEW - Column config + export functions
├── hooks/
│   └── use-export-campaigns.ts          # NEW - Export hook with toast
├── components/campaigns/
│   ├── campaign-export-dropdown.tsx     # NEW - Export UI with dropdown
│   ├── campaigns-content.tsx            # UPDATE - Add export dropdown
│   └── index.ts                         # UPDATE - Add exports
└── __tests__/
    ├── lib/export-campaigns.test.ts     # NEW - 6+ tests
    ├── hooks/use-export-campaigns.test.ts  # NEW - 8+ tests
    └── components/campaign-export-dropdown.test.tsx  # NEW - 6+ tests
```

**Summary: 3 NEW files, 2 UPDATE files**

### TypeScript Types (Verify from Story 5-2)

**Note:** Verify `CampaignStatsItem` type exists in `src/types/campaigns.ts` from Story 5-2 implementation.

```typescript
// src/types/campaigns.ts - SHOULD EXIST FROM STORY 5-2
export interface CampaignStatsItem {
  campaignId: number;
  campaignName: string;
  delivered: number;
  opened: number;
  clicked: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  hardBounce: number;
  softBounce: number;
  unsubscribe: number;
  spam: number;
  firstEvent: string;
  lastUpdated: string;
}
```

### Dependencies (Already Installed)

- `xlsx` (SheetJS) - Excel/CSV generation
- `date-fns` - Date formatting
- `lucide-react` - Icons (FileDown, FileSpreadsheet, FileText, Loader2)
- shadcn/ui - DropdownMenu, AlertDialog, Button components

### Testing Strategy

| Test File | Test Cases | Focus |
|-----------|------------|-------|
| `export-campaigns.test.ts` | 6+ | Column config, Excel generation, CSV generation, filename patterns |
| `use-export-campaigns.test.ts` | 8+ | Hook state, fetch integration, toast notifications, error handling |
| `campaign-export-dropdown.test.tsx` | 6+ | Dropdown UI, loading state, confirmation dialog, accessibility |

**Total: ~20+ test cases**

### Do NOT

- ❌ Create backend endpoint - Use existing `fetchCampaignStats()` API
- ❌ Add PDF export - Out of scope (Could Have feature)
- ❌ Change existing campaign types - Use `CampaignStatsItem` as-is
- ❌ Add server-side export - Client-side XLSX is sufficient for campaign counts
- ❌ Skip confirmation dialog - Required for UX on large exports

### Edge Cases to Handle

0. **Data still loading**: Disable export button until `useCampaignStats` returns data (check `isLoading` state)
1. **No campaigns**: Show info toast, don't download empty file
2. **Network error**: Show error toast, reset loading state
3. **Large export**: Show confirmation dialog (>100 campaigns)
4. **Date filter applied**: Include date range in filename
5. **Special characters in campaign name**: Escape for CSV

### Project Structure Notes

- Follows existing Lead Export pattern from Story 4-10 and 6-1
- Uses same shadcn/ui components for consistency
- Hook pattern matches `use-export-leads.ts`
- Column config pattern matches `export-leads.ts`

### References

- [Source: _bmad-output/implementation-artifacts/stories/6-1-export-to-excel.md] - Export pattern with bugfixes
- [Source: _bmad-output/implementation-artifacts/5-8-campaign-date-filter.md] - Date filter integration
- [Source: eneos-admin-dashboard/src/lib/export-leads.ts] - Column config and export functions
- [Source: eneos-admin-dashboard/src/components/leads/lead-export-dropdown.tsx] - Dropdown UI pattern
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-05.F7] - Feature specification

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. All 11 acceptance criteria implemented and tested
2. Followed existing Lead Export patterns from Story 4.10 and 6.1
3. Total 58 tests passing:
   - export-campaigns.test.ts: 25 tests
   - use-export-campaigns.test.tsx: 17 tests
   - campaign-export-dropdown.test.tsx: 16 tests
4. Date filter integration working with filename generation
5. Confirmation dialog triggers for >100 campaigns
6. Full accessibility support (aria-labels, keyboard navigation, screen reader announcements)
7. **Code Review Fixes (Rex - 2026-01-31):**
   - Fixed invalid date handling in format functions (returns empty string instead of "Invalid Date")
   - Added CSV header escaping for future-proofing
   - Added 3 new tests: invalid date edge cases (1) + loading state display (2)

### File List

**NEW FILES (Frontend - eneos-admin-dashboard):**
- `src/lib/export-campaigns.ts` - Column config and export functions
- `src/hooks/use-export-campaigns.ts` - Export hook with toast notifications
- `src/components/campaigns/campaign-export-dropdown.tsx` - Export dropdown UI
- `src/__tests__/lib/export-campaigns.test.ts` - Export functions tests
- `src/__tests__/hooks/use-export-campaigns.test.tsx` - Hook tests
- `src/__tests__/components/campaign-export-dropdown.test.tsx` - Component tests

**UPDATED FILES:**
- `src/components/campaigns/campaigns-content.tsx` - Added export dropdown
- `src/components/campaigns/index.ts` - Added CampaignExportDropdown export
- `src/hooks/index.ts` - Added useExportCampaigns export

