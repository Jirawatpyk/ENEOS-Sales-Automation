# Story 6.4: Custom Date Range

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **ENEOS manager**,
I want **quick date presets (This Month, This Quarter, This Year) and an enhanced date range picker with validation and record count preview on the Export page**,
so that **I can quickly scope my export to a specific time period and see how many records I'll get before downloading**.

## Project Context

> **IMPORTANT:** This is a **Frontend story** for the Admin Dashboard project.
>
> **Target Project:** `eneos-admin-dashboard/` (Next.js)
> **NOT:** `eneos-sales-automation/` (Express Backend)

## Existing Code to Extend

The following files **already exist** and must be extended (NOT recreated):

| File | Location | What It Does |
|------|----------|--------------|
| `export-form.tsx` | `src/components/export/` | Export form - currently uses basic DateRangePicker |
| `date-range-picker.tsx` | `src/components/ui/` | Basic date range picker (Popover + Calendar, no presets) |
| `use-export.ts` | `src/hooks/` | Export hook with `buildQueryParams` - already handles dateRange |
| `date-filter.tsx` | `src/components/dashboard/` | Dashboard date filter with presets (reuse PERIOD_OPTIONS pattern) |
| `custom-date-range.tsx` | `src/components/dashboard/` | Dashboard custom range with Apply/Clear/Cancel (reuse pattern) |
| `use-leads.ts` | `src/hooks/` | Leads hook - returns `pagination.total` for record count |
| `leads.ts` | `src/lib/api/` | Leads API - supports `from`/`to` date params |

**Key Patterns Already Established:**

```typescript
// Current basic DateRangePicker (date-range-picker.tsx) - TO BE ENHANCED
<DateRangePicker
  value={formData.dateRange}
  onChange={(range) => setFormData({ ...formData, dateRange: range })}
/>

// Dashboard preset pattern (date-filter.tsx) - REUSE THIS
export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
] as const;

// Dashboard CustomDateRange with Apply/Clear pattern - REUSE
<Calendar mode="range" numberOfMonths={2} disabled={{ after: new Date() }} />
<div className="flex justify-end gap-2 p-3 border-t">
  <Button variant="ghost" size="sm" onClick={clearCustomRange}>Clear</Button>
  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
  <Button size="sm" onClick={applyCustomRange} disabled={!date?.from || !date?.to}>Apply</Button>
</div>

// useExport buildQueryParams already handles dateRange (use-export.ts:33-56)
function buildQueryParams(params: ExportParams): URLSearchParams {
  // ... already formats dateRange.from/to as YYYY-MM-DD
}

// useLeads returns pagination.total for record count (use-leads.ts)
const { pagination } = useLeads({ from, to, limit: 1 });
// pagination.total gives count for the date range
```

## Acceptance Criteria

### Core Features (Must Implement)

1. **AC1: Quick Date Presets Above Calendar**
   - Given I am on the Export page and see the Date Range section
   - When the section renders
   - Then I see clickable preset buttons: "This Month", "Last Month", "This Quarter", "This Year"
   - And clicking a preset immediately fills in the date range (from/to)
   - And the calendar visual shows the selected range highlighted
   - And the active preset button is visually highlighted (primary variant)
   - And clicking the same active preset again clears the date range (toggle behavior)

2. **AC2: Enhanced Date Range Picker with Apply/Clear**
   - Given the current basic DateRangePicker (just a calendar popup)
   - When I interact with the date range section
   - Then I see a "Custom Range" option that opens the calendar
   - And the calendar has Apply/Clear/Cancel buttons at the bottom (like dashboard's CustomDateRange)
   - And selecting a date range requires clicking "Apply" to confirm
   - And "Clear" resets the date range to undefined (no filter)
   - And "Cancel" closes the popover without changes

3. **AC3: Max Date Range Validation (1 Year)**
   - Given I select a custom date range
   - When the range exceeds 365 days
   - Then the "Apply" button is disabled
   - And a validation message shows: "Date range cannot exceed 1 year"
   - And the message uses the project's existing info banner pattern (blue border)

4. **AC4: Future Date Prevention**
   - Given the calendar is open
   - When I try to select a date in the future
   - Then future dates are disabled/greyed out (using `disabled={{ after: new Date() }}`)

5. **AC5: Record Count Preview**
   - Given I have selected or applied a date range
   - When the date range is set
   - Then below the date range picker, I see "Estimated records: {count}" text
   - And the count is fetched from the leads API with `limit=1` (uses `pagination.total`)
   - And during loading, show "Estimated records: ..." (simple text, no skeleton)
   - And if the count fails to load, show "Estimated records: --"
   - And the count updates when date range, status, or owner filter changes
   - And filter changes are debounced via React 19 `useDeferredValue` to avoid excessive API calls
   - **NOTE:** Campaign filter is NOT supported by the leads API count endpoint. When campaign filter is active, show a small disclaimer: "Count excludes campaign filter"

6. **AC6: Display Selected Range Text**
   - Given a date range is selected (via preset or custom)
   - When the range is active
   - Then the trigger button shows the range: "Jan 1, 2026 - Jan 31, 2026"
   - And if no range is selected, show "All dates (no filter)"
   - And if a preset is active, also show the preset label as a badge next to the range

7. **AC7: Presets Calculate Correct Date Ranges**
   - "This Month": 1st of current month to today
   - "Last Month": 1st of previous month to last day of previous month
   - "This Quarter": 1st day of current quarter to today (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)
   - "This Year": Jan 1 of current year to today

8. **AC8: Responsive Layout**
   - Given I view the Export page on different screen sizes
   - When the date range section renders
   - Then on Desktop: Preset buttons in a horizontal row, calendar opens in popover
   - And on Tablet: Preset buttons wrap to 2 rows if needed
   - And on Mobile: Preset buttons in a 2x2 grid, full-width trigger button

9. **AC9: Integration with Export Form Filters**
   - Given I have selected a date range
   - When I click Export
   - Then the date range is passed as `startDate`/`endDate` query params (existing behavior)
   - And the record count reflects active filters (status, owner + date range; campaign filter excluded from count)
   - And clearing the date range removes the date filter from the export

10. **AC10: Keyboard Accessibility**
    - Given I navigate using keyboard
    - When I Tab through the date range section
    - Then preset buttons are focusable and activatable with Enter/Space
    - And the calendar popover opens with Enter on the trigger
    - And the calendar supports keyboard navigation (arrows, Enter)

## Tasks / Subtasks

- [x] **Task 1: Create Export Date Presets** (AC: #1, #7, #8)
  - [x] 1.1 Create `src/components/export/export-date-presets.tsx` - preset buttons row
  - [x] 1.2 Define `EXPORT_DATE_PRESETS` config array with type, label, and date calculator
  - [x] 1.3 Use `date-fns` for date calculations: `startOfMonth`, `endOfMonth`, `startOfQuarter`, `startOfYear`, `subMonths`
  - [x] 1.4 Highlight active preset with `variant="default"` vs `variant="outline"`
  - [x] 1.5 Responsive: `flex flex-wrap gap-2` with `min-w-[100px]` on buttons

- [x] **Task 2: Enhance DateRangePicker with Apply/Clear** (AC: #2, #3, #4, #6)
  - [x] 2.1 Create `src/components/export/export-date-range-picker.tsx` - enhanced picker
  - [x] 2.2 Wrap existing Calendar in Popover with Apply/Clear/Cancel footer (reuse dashboard pattern)
  - [x] 2.3 Add 1 year validation: `differenceInDays(to, from) > 365` disables Apply
  - [x] 2.4 Add validation message (info banner when range exceeds 1 year)
  - [x] 2.5 `disabled={{ after: new Date() }}` on Calendar to prevent future dates
  - [x] 2.6 Display selected range or "All dates (no filter)" on trigger button

- [x] **Task 3: Create useRecordCount Hook** (AC: #5, #9)
  - [x] 3.1 Create `src/hooks/use-record-count.ts`
  - [x] 3.2 Call `useLeads` with `limit: 1` and current filters to get `pagination.total`
  - [x] 3.3 Accept params: `{ dateRange?, status?, owner? }` (no campaign - leads API doesn't support it)
  - [x] 3.4 Return `{ count: number | undefined, isLoading: boolean }`
  - [x] 3.5 Use React 19 `useDeferredValue` to debounce filter changes (avoids custom debounce logic)
  - [x] 3.6 Filter out `'all'` status value: pass `undefined` to useLeads (LeadStatus[] does NOT include 'all')

- [x] **Task 4: Create Date Preset Utilities** (AC: #7)
  - [x] 4.1 Create `src/lib/export-date-presets.ts` - pure date calculation functions
  - [x] 4.2 `getExportDateRange(preset: ExportPresetType): DateRange` - returns date range
  - [x] 4.3 `validateDateRange(range: DateRange): { valid: boolean, error?: string }` - 1 year check
  - [x] 4.4 All date calculations use `date-fns` (v3.6.0, already installed)

- [x] **Task 5: Update Export Form** (AC: #1, #2, #5, #6, #9)
  - [x] 5.1 Edit `src/components/export/export-form.tsx`
  - [x] 5.2 Replace `<DateRangePicker>` with `<ExportDatePresets>` + `<ExportDateRangePicker>`
  - [x] 5.3 Add record count display below date section using `useRecordCount`
  - [x] 5.4 Track active preset in state: `useState<ExportPresetType | null>(null)`
  - [x] 5.5 Pass all filter values to `useRecordCount` for accurate count

- [x] **Task 6: Testing** (All ACs)
  - [x] 6.1 Unit test `export-date-presets.ts` - date range calculations (15 tests)
  - [x] 6.2 Unit test `use-record-count.ts` hook - fetching, loading, error (10 tests)
  - [x] 6.3 Unit test `export-date-presets.tsx` - rendering, preset clicks, active state (9 tests)
  - [x] 6.4 Unit test `export-date-range-picker.tsx` - Apply/Clear/Cancel, validation (11 tests)
  - [x] 6.5 Integration test: Export form with presets + custom range + record count (11 tests)
  - [x] 6.6 Test edge cases: year boundary, leap year, empty range, max range validation

## Dev Notes

### Component Hierarchy

```
ExportForm (export-form.tsx) - Client Component [MODIFY]
├── Card: Export Lead Data
│   ├── Format Selection (existing, no changes)
│   ├── PDF Row Limit Warning (existing, no changes)
│   ├── Date Range Section [ENHANCED]
│   │   ├── ExportDatePresets (export-date-presets.tsx) [NEW]
│   │   │   └── Button x4 (This Month, Last Month, This Quarter, This Year)
│   │   ├── ExportDateRangePicker (export-date-range-picker.tsx) [NEW]
│   │   │   ├── Popover Trigger (shows range or "All dates")
│   │   │   └── PopoverContent
│   │   │       ├── Calendar (range mode, 2 months, future disabled)
│   │   │       ├── Validation Message (if range > 1 year)
│   │   │       └── Footer: Clear | Cancel | Apply
│   │   └── Record Count Label ("Estimated records: 156") [NEW]
│   ├── Status Filter (existing, no changes)
│   ├── Owner Filter (existing, no changes)
│   ├── Campaign Filter (existing, no changes)
│   └── Action Buttons (existing, no changes)
└── PdfPreviewModal (existing, no changes)
```

### Export Date Presets Design

```typescript
// src/lib/export-date-presets.ts
import {
  startOfMonth, endOfMonth, startOfQuarter, startOfYear,
  subMonths, differenceInDays
} from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type ExportPresetType = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear';

export interface ExportPreset {
  type: ExportPresetType;
  label: string;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  { type: 'thisMonth', label: 'This Month' },
  { type: 'lastMonth', label: 'Last Month' },
  { type: 'thisQuarter', label: 'This Quarter' },
  { type: 'thisYear', label: 'This Year' },
];

export function getExportDateRange(preset: ExportPresetType): DateRange {
  const now = new Date();
  switch (preset) {
    case 'thisMonth':
      return { from: startOfMonth(now), to: now };
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'thisQuarter':
      return { from: startOfQuarter(now), to: now };
    case 'thisYear':
      return { from: startOfYear(now), to: now };
  }
}

const MAX_RANGE_DAYS = 365;

export function validateDateRange(range: DateRange): { valid: boolean; error?: string } {
  if (!range.from || !range.to) return { valid: true }; // incomplete range is OK
  const days = differenceInDays(range.to, range.from);
  if (days > MAX_RANGE_DAYS) {
    return { valid: false, error: 'Date range cannot exceed 1 year' };
  }
  return { valid: true };
}
```

### ExportDatePresets Component

```typescript
// src/components/export/export-date-presets.tsx
'use client';

import { Button } from '@/components/ui/button';
import { EXPORT_PRESETS, type ExportPresetType } from '@/lib/export-date-presets';

interface ExportDatePresetsProps {
  activePreset: ExportPresetType | null;
  onPresetSelect: (preset: ExportPresetType) => void;
}

export function ExportDatePresets({ activePreset, onPresetSelect }: ExportDatePresetsProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="export-date-presets">
      {EXPORT_PRESETS.map((preset) => (
        <Button
          key={preset.type}
          variant={activePreset === preset.type ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPresetSelect(preset.type)}
          data-testid={`preset-${preset.type}`}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
```

### ExportDateRangePicker Component

```typescript
// src/components/export/export-date-range-picker.tsx
// Enhanced version of DateRangePicker with Apply/Clear/Cancel + validation
// Pattern reused from dashboard's custom-date-range.tsx

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Info } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { validateDateRange } from '@/lib/export-date-presets';

interface ExportDateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  onClear: () => void;
}

export function ExportDateRangePicker({ value, onChange, onClear }: ExportDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value);

  // Sync draft when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setDraft(value);
    setOpen(isOpen);
  };

  const validation = draft ? validateDateRange(draft) : { valid: true };

  const handleApply = () => {
    if (draft?.from && draft?.to && validation.valid) {
      onChange(draft);
      setOpen(false);
    }
  };

  const handleClear = () => {
    setDraft(undefined);
    onClear();
    setOpen(false);
  };

  const displayText = value?.from
    ? value.to
      ? `${format(value.from, 'LLL dd, y')} - ${format(value.to, 'LLL dd, y')}`
      : format(value.from, 'LLL dd, y')
    : 'All dates (no filter)';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
          aria-label="Select custom date range"
          data-testid="date-range-trigger"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={draft?.from}
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
        />
        {!validation.valid && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950">
            <Info className="h-4 w-4 shrink-0" />
            {validation.error}
          </div>
        )}
        <div className="flex justify-end gap-2 p-3 border-t">
          <Button variant="ghost" size="sm" onClick={handleClear} data-testid="date-range-clear">Clear</Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} data-testid="date-range-cancel">Cancel</Button>
          <Button size="sm" onClick={handleApply} disabled={!draft?.from || !draft?.to || !validation.valid} data-testid="date-range-apply">Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### useRecordCount Hook Design

```typescript
// src/hooks/use-record-count.ts
import { useDeferredValue } from 'react';
import { useLeads } from '@/hooks/use-leads';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface UseRecordCountParams {
  dateRange?: DateRange;
  status?: string;   // ExportStatus: 'all' | 'new' | 'contacted' | ...
  owner?: string;    // 'all' | LINE_User_ID
}

export function useRecordCount(params: UseRecordCountParams) {
  // Build from/to strings for the API (YYYY-MM-DD format)
  const from = params.dateRange?.from ? format(params.dateRange.from, 'yyyy-MM-dd') : undefined;
  const to = params.dateRange?.to ? format(params.dateRange.to, 'yyyy-MM-dd') : undefined;

  // CRITICAL: LeadStatus[] does NOT include 'all' - pass undefined for 'all'
  // LeadStatus = 'new' | 'contacted' | 'closed' | 'lost' | 'unreachable'
  const statusArray = params.status && params.status !== 'all' ? [params.status] : undefined;
  const ownerArray = params.owner && params.owner !== 'all' ? [params.owner] : undefined;

  // React 19 useDeferredValue: debounces re-render when filters change rapidly
  // This prevents excessive API calls when user is still clicking filters
  const deferredFrom = useDeferredValue(from);
  const deferredTo = useDeferredValue(to);
  const deferredStatus = useDeferredValue(statusArray);
  const deferredOwner = useDeferredValue(ownerArray);

  // Use useLeads with limit=1 to get only pagination.total (minimal data transfer)
  // NOTE: campaign filter is NOT available in leads API - count ignores campaign
  const { pagination, isLoading } = useLeads({
    limit: 1,
    page: 1,
    from: deferredFrom,
    to: deferredTo,
    status: deferredStatus,
    owner: deferredOwner,
  });

  return {
    count: pagination?.total,
    isLoading,
  };
}
```

### Updated Export Form - Key Changes

```typescript
// src/components/export/export-form.tsx - MODIFIED SECTIONS ONLY

// NEW imports
import { ExportDatePresets } from '@/components/export/export-date-presets';
import { ExportDateRangePicker } from '@/components/export/export-date-range-picker';
import { useRecordCount } from '@/hooks/use-record-count';
import { getExportDateRange, type ExportPresetType } from '@/lib/export-date-presets';

// NEW state
const [activePreset, setActivePreset] = useState<ExportPresetType | null>(null);

// Record count from leads API (no campaign - leads API doesn't support it)
const { count: recordCount, isLoading: isCountLoading } = useRecordCount({
  dateRange: formData.dateRange,
  status: formData.status,
  owner: formData.owner,
});
const hasCampaignFilter = formData.campaign !== 'all';

// NEW handler - toggle: clicking active preset clears it
const handlePresetSelect = (preset: ExportPresetType) => {
  if (activePreset === preset) {
    // Toggle off: clicking same preset clears the date range
    setActivePreset(null);
    setFormData({ ...formData, dateRange: undefined });
  } else {
    const range = getExportDateRange(preset);
    setActivePreset(preset);
    setFormData({ ...formData, dateRange: range });
  }
};

const handleCustomDateChange = (range: DateRange | undefined) => {
  setActivePreset(null); // Custom range clears preset
  setFormData({ ...formData, dateRange: range });
};

const handleDateClear = () => {
  setActivePreset(null);
  setFormData({ ...formData, dateRange: undefined });
};

// REPLACE the Date Range Filter section in JSX:
{/* Date Range Filter (Enhanced - Story 6.4) */}
<div className="space-y-3" data-testid="date-range-section">
  <Label>Date Range</Label>
  <ExportDatePresets
    activePreset={activePreset}
    onPresetSelect={handlePresetSelect}
  />
  <ExportDateRangePicker
    value={formData.dateRange}
    onChange={handleCustomDateChange}
    onClear={handleDateClear}
  />
  <p className="text-sm text-muted-foreground" data-testid="record-count">
    Estimated records:{' '}
    <span className="font-medium">
      {isCountLoading ? '...' : (recordCount?.toLocaleString() ?? '--')}
    </span>
    {hasCampaignFilter && (
      <span className="ml-1 text-xs text-muted-foreground/70">(excludes campaign filter)</span>
    )}
  </p>
</div>
```

### Project Structure Notes

```
src/components/export/
├── export-form.tsx                # MODIFY - Replace DateRangePicker section
├── export-date-presets.tsx        # NEW - Quick preset buttons
├── export-date-range-picker.tsx   # NEW - Enhanced picker with Apply/Clear
├── pdf-preview-modal.tsx          # EXISTING - no changes
├── pdf-viewer.tsx                 # EXISTING - no changes
├── quick-export-button.tsx        # EXISTING - no changes
├── quick-reports.tsx              # May exist if 6-3 done first
└── report-card.tsx                # May exist if 6-3 done first

src/hooks/
├── use-export.ts                  # EXISTING - no changes (already handles dateRange)
├── use-leads.ts                   # EXISTING - reuse for record count
├── use-record-count.ts            # NEW - Record count hook
└── use-dashboard-data.ts          # EXISTING - no changes

src/lib/
├── export-date-presets.ts         # NEW - Date preset calculations + validation
├── export-utils.ts                # EXISTING - no changes
└── utils.ts                       # EXISTING - cn() utility
```

### Libraries & Dependencies

**Already installed (NO new packages needed):**
- `date-fns` v3.6.0 - `startOfMonth`, `endOfMonth`, `startOfQuarter`, `startOfYear`, `subMonths`, `differenceInDays`, `format`
- `react-day-picker` v9.13.0 - `DateRange` type (v9 API: `mode="range"`, `onSelect`, `disabled` object syntax)
- `react` v19.2.3 - `useDeferredValue` for debouncing (built-in, no external debounce library needed)
- `lucide-react` - `CalendarIcon`, `Info` icons
- `@tanstack/react-query` v5.90.16 - Via existing `useLeads` hook
- Shadcn components: Button, Calendar, Popover, PopoverContent, PopoverTrigger, Skeleton, Label

### Architecture Compliance

| Requirement | Implementation |
|-------------|----------------|
| State Management | useState for activePreset, useRecordCount for server data |
| Component Pattern | Client components with 'use client' directive |
| Styling | Tailwind CSS + Shadcn Button/Popover/Calendar/Skeleton |
| Date Library | date-fns v3.6.0 (already installed, NOT moment/dayjs) |
| Type Safety | DateRange from react-day-picker, strict TypeScript |
| Error Handling | Fallback "--" for failed count, validation messages |
| Accessibility | ARIA labels, keyboard navigable buttons, focusable calendar |
| Data Fetching | Reuse useLeads with limit=1 for record count (efficient) |

### Testing Standards

- **Framework:** Vitest v4.0.17 + React Testing Library
- **Mock Pattern:** `vi.hoisted()` + `vi.mock()` for hooks
- **Coverage Target:** 80%+ for new code
- **Test Location:** `src/__tests__/` mirroring source structure
- **NOTE:** No existing export component tests exist. Follow dashboard test patterns (e.g. `src/__tests__/components/dashboard/`).
- **All components must include `data-testid` attributes** (consistent with dashboard pattern)

**Mock Setup Example for useLeads:**
```typescript
// For testing useRecordCount or components that use it
const { mockUseLeads } = vi.hoisted(() => ({
  mockUseLeads: vi.fn().mockReturnValue({
    data: undefined,
    pagination: { total: 42, page: 1, limit: 1, totalPages: 42 },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-leads', () => ({
  useLeads: mockUseLeads,
}));
```

### Previous Story Intelligence

**From Story 6-1 (Export to Excel):**
- Export form uses `ExportFormData` with `dateRange?: DateRange`
- `useExport().exportData()` handles toast notifications internally
- `buildQueryParams()` already formats dateRange as YYYY-MM-DD
- DO NOT add custom toasts - export hook handles them

**From Story 6-2 (Export to PDF):**
- PDF preview uses same form data including date range
- `previewPdf()` accepts same `ExportParams` type
- Date range affects both export and preview operations

**From Story 6-3 (Quick Reports - if implemented first):**
- May have created `report-date-utils.ts` with `getReportDateRange()` - do NOT duplicate
- Quick Reports has its own date logic for daily/weekly/monthly (different from export presets)
- Quick Reports section may be above the export form on the page

**Key Dashboard Pattern to Reuse:**
- `date-filter.tsx` shows how to do preset selection with visual feedback
- `custom-date-range.tsx` shows Apply/Clear/Cancel popover pattern with `disabled={{ after: new Date() }}`
- These components use URL params (router.push) - export presets should use local state instead

### Anti-Pattern Prevention

- **DO NOT** modify `use-export.ts` - it already handles dateRange correctly
- **DO NOT** modify `date-range-picker.tsx` (shared UI component) - create a new export-specific picker
- **DO NOT** use router/URL params for date presets - use local component state (unlike dashboard)
- **DO NOT** add new npm packages - date-fns + react-day-picker already installed
- **DO NOT** create a separate page/route - this enhances the existing Export page
- **DO NOT** call a separate "count" API - reuse useLeads with limit=1
- **DO NOT** add toast notifications - exportData() handles toasts internally
- **DO NOT** modify backend API - frontend-only story
- **DO NOT** use Tremor components - project uses Shadcn/ui exclusively
- **DO NOT** duplicate date-fns imports - use specific named imports

### References

- [Architecture: ExportPage component tree - architecture.md]
- [Epic Feature: F-06.4 Custom Date Range - epics.md]
- [Existing Export Form: eneos-admin-dashboard/src/components/export/export-form.tsx]
- [Existing DateRangePicker: eneos-admin-dashboard/src/components/ui/date-range-picker.tsx]
- [Dashboard Date Filter: eneos-admin-dashboard/src/components/dashboard/date-filter.tsx]
- [Dashboard Custom Date Range: eneos-admin-dashboard/src/components/dashboard/custom-date-range.tsx]
- [Export Hook: eneos-admin-dashboard/src/hooks/use-export.ts]
- [Leads Hook: eneos-admin-dashboard/src/hooks/use-leads.ts]
- [Leads API: eneos-admin-dashboard/src/lib/api/leads.ts]

## Dependencies

### Required (Already Done)
- Story 6-1: Export to Excel - Export form, hook, API proxy established
- Story 6-2: Export to PDF - Extended useExport hook
- Backend `/api/admin/export` endpoint with startDate/endDate filtering
- Backend `/api/admin/leads` endpoint with from/to date filtering + pagination.total

### Optional (Future)
- Story 6-3: Quick Reports - May add QuickReports section above (no conflict)
- Story 6-5: Select Data Fields - Will extend export form with field selection
- Story 6-6: Export History - Will add history section below export form

## Definition of Done

- [x] All 10 Acceptance Criteria pass
- [x] All 6 Tasks completed
- [x] TypeScript compiles with 0 errors for story files
- [x] Linter passes with 0 warnings for story files
- [x] Unit tests pass (56 new tests, all passing)
- [x] Quick presets correctly calculate date ranges (This Month/Last Month/Quarter/Year)
- [x] Custom range with Apply/Clear/Cancel works correctly
- [x] Max 1 year validation prevents oversized ranges
- [x] Record count preview shows accurate count for selected filters
- [x] Responsive design: flex-wrap layout for presets, full-width trigger
- [x] Code review approved by Rex (Code Reviewer)
- [x] Sprint status updated: `6-4-custom-date-range: done`

---

**Story Created By:** Bob (Scrum Master Agent)
**Created Date:** 2026-01-31
**Epic:** 6 - Export & Reports
**Story Points:** 5 (Medium - Reuses existing patterns, no new packages, no backend changes)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Badge component (`src/components/ui/badge.tsx`) does not exist in project - replaced with inline `<span>` styled with Tailwind
- TypeScript error: `DateRange` requires `from` field - `{ to: new Date() }` not assignable, fixed with `{ from: undefined, to: new Date() }`
- react-pdf `DOMMatrix` error in jsdom - fixed by mocking `react-pdf` and `PdfPreviewModal` in integration tests
- Existing `export-form.test.tsx` regression: `useRecordCount` -> `useLeads` -> `useQuery` requires `QueryClientProvider` - fixed by adding mock and wrapper
- Pre-existing: 2 failing tests in `middleware-role.test.ts` (unrelated to this story)

### Completion Notes List

- **57 new tests** added across 5 test files, all passing
- **4 new files** created: `export-date-presets.tsx`, `export-date-range-picker.tsx`, `use-record-count.ts`, `export-form-date-range.test.tsx`
- **4 existing files** modified: `export-form.tsx` (integration), `export-form.test.tsx` (regression fix + act() warnings), `export-date-presets.ts` (negative range guard), `export-date-presets.test.ts` (negative range test)
- All 10 Acceptance Criteria implemented
- All 6 Tasks with subtasks completed
- No new npm packages required (date-fns, react-day-picker, React 19 useDeferredValue already available)
- Task execution order: Task 4 -> 1 -> 2 -> 3 -> 5 -> 6 (utilities first for dependency)

### Code Review Fixes Applied

- **M1 (useDeferredValue on arrays):** Refactored `use-record-count.ts` to defer primitive strings then useMemo arrays for referential stability
- **M2 (act() warnings):** Wrapped async operations in `export-form.test.tsx` with `act()` and `waitFor()` — 0 warnings now
- **M3 (File List accuracy):** Corrected File List — `export-date-presets.ts` was pre-existing from Stories 6-1/6-2/6-3
- **L1 (verbose JSDoc):** Removed story/AC reference comments from source files
- **L3 (negative range):** Added negative range guard to `validateDateRange` + test

### File List

**New Files (4):**
- `eneos-admin-dashboard/src/components/export/export-date-presets.tsx` - Preset buttons component with active state
- `eneos-admin-dashboard/src/components/export/export-date-range-picker.tsx` - Enhanced picker with Apply/Clear/Cancel, validation, preset badge
- `eneos-admin-dashboard/src/hooks/use-record-count.ts` - Record count hook using useLeads with limit=1 + useDeferredValue + useMemo
- `eneos-admin-dashboard/src/__tests__/components/export/export-form-date-range.test.tsx` - Integration tests (11 tests)

**Modified Files (4):**
- `eneos-admin-dashboard/src/components/export/export-form.tsx` - Replaced DateRangePicker with new components, added preset/record count state
- `eneos-admin-dashboard/src/lib/export-date-presets.ts` - Added negative range validation guard
- `eneos-admin-dashboard/src/__tests__/components/export-form.test.tsx` - Added useLeads mock + act()/waitFor() fixes
- `eneos-admin-dashboard/src/__tests__/lib/export-date-presets.test.ts` - Added negative range test case

**Test Files (5, 57 tests total):**
- `src/__tests__/lib/export-date-presets.test.ts` - 16 tests (presets, date ranges, validation, negative range)
- `src/__tests__/components/export/export-date-presets.test.tsx` - 9 tests (rendering, clicks, active state)
- `src/__tests__/components/export/export-date-range-picker.test.tsx` - 11 tests (display, Apply/Clear, validation)
- `src/__tests__/hooks/use-record-count.test.tsx` - 10 tests (count, loading, filter conversion)
- `src/__tests__/components/export/export-form-date-range.test.tsx` - 11 tests (integration)
