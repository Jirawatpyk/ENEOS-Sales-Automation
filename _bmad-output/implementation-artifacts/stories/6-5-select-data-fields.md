# Story 6.5: Select Data Fields

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **ENEOS manager**,
I want **to select which data fields/columns are included in my export**,
so that **I can customize the export output to contain only the information I need for my reports and meetings**.

## Project Context

> **IMPORTANT:** This is a **Full-Stack story** with both Backend and Frontend changes.
>
> **Frontend:** `eneos-admin-dashboard/` (Next.js)
> **Backend:** `eneos-sales-automation/` (Express Backend)

## Existing Code to Extend

The following files **already exist** and must be extended (NOT recreated):

| File | Location | What It Does |
|------|----------|--------------|
| `export-form.tsx` | `eneos-admin-dashboard/src/components/export/` | Main export form - add field selection UI here |
| `use-export.ts` | `eneos-admin-dashboard/src/hooks/` | Export hook - add `fields` param to `buildQueryParams` |
| `export-leads.ts` | `eneos-admin-dashboard/src/lib/` | `LEAD_EXPORT_COLUMNS` constant (16 columns) + `exportLeadsToExcel/CSV` functions |
| `route.ts` | `eneos-admin-dashboard/src/app/api/export/` | API proxy - forward `fields` param to backend |
| `export.controller.ts` | `eneos-sales-automation/src/controllers/admin/` | Backend export - parse `fields` param and filter columns |
| `admin.validators.ts` | `eneos-sales-automation/src/validators/` | **Already has `fields: z.string().trim().optional()`** (line 189) |

**Key Patterns Already Established:**

```typescript
// LEAD_EXPORT_COLUMNS in export-leads.ts - 16 frontend columns (source of truth)
export const LEAD_EXPORT_COLUMNS: ReadonlyArray<{
  key: keyof Lead;
  header: string;
  width: number;
}> = [
  { key: 'company', header: 'Company', width: 25 },
  { key: 'dbdSector', header: 'DBD Sector', width: 15 },
  { key: 'industryAI', header: 'Industry', width: 20 },
  { key: 'juristicId', header: 'Juristic ID', width: 18 },
  { key: 'capital', header: 'Capital', width: 15 },
  { key: 'province', header: 'Location', width: 20 },
  { key: 'customerName', header: 'Contact Name', width: 20 },
  { key: 'phone', header: 'Phone', width: 15 },
  { key: 'email', header: 'Email', width: 30 },
  { key: 'jobTitle', header: 'Job Title', width: 25 },
  { key: 'website', header: 'Website', width: 30 },
  { key: 'leadSource', header: 'Lead Source', width: 15 },
  { key: 'status', header: 'Status', width: 12 },
  { key: 'salesOwnerName', header: 'Sales Owner', width: 18 },
  { key: 'campaignName', header: 'Campaign', width: 25 },
  { key: 'createdAt', header: 'Created Date', width: 15 },
];

// Backend has 23 hardcoded columns in export.controller.ts (lines 79-103)
// The backend ALSO exports: Row, Full Address, Source, Talking Point,
// Clicked At, Contacted At, Closed At - which frontend doesn't include

// Backend validator ALREADY accepts `fields` param (admin.validators.ts:189)
// fields: z.string().trim().optional(), // comma-separated field names
// BUT `fields` is NOT destructured on line 36 - must add it to the destructuring

// ExportParams in use-export.ts currently:
export interface ExportParams {
  format: ExportFormat;
  dateRange?: DateRange;
  status: ExportStatus;
  owner: string;
  campaign: string;
  // fields NOT here yet - must add
}

// buildQueryParams in use-export.ts (lines 33-56):
// Builds URLSearchParams from ExportParams - must add fields serialization

// API proxy route.ts (lines 44-63):
// Extracts query params and forwards to backend - must forward fields param
```

## Acceptance Criteria

### Core Features (Must Implement)

1. **AC1: Field Selection Checkbox List**
   - Given I am on the Export page
   - When the form renders
   - Then I see a "Data Fields" section with a checkbox list of all 16 available columns
   - And all checkboxes are checked by default (export all fields)
   - And each checkbox shows the column header name (e.g., "Company", "DBD Sector", "Industry")
   - And columns are organized in a 2-column grid layout

2. **AC2: Select/Deselect Individual Fields**
   - Given the field selection checkboxes
   - When I uncheck a field (e.g., "Website")
   - Then that field is excluded from the export
   - And the checkbox visually shows unchecked state
   - And at least 1 field must remain selected (cannot deselect all)
   - And if user tries to uncheck the last field, show toast: "At least one field must be selected"

3. **AC3: Select All / Deselect All Toggle**
   - Given the field selection section
   - When I see the section header
   - Then there is a "Select All" / "Deselect All" toggle button
   - And "Deselect All" selects only the minimum required field (Company)
   - And "Select All" re-checks all 16 fields
   - And the button label changes based on current state

4. **AC4: Field Count Badge**
   - Given I have selected some fields
   - When the selection changes
   - Then a badge shows "{n} of 16 fields selected" next to the section label
   - And if all 16 are selected, show "All fields" instead

5. **AC5: Fields Passed to Backend Export API**
   - Given I have selected specific fields (e.g., Company, Email, Status)
   - When I click Export (xlsx/csv via backend API)
   - Then the `fields` query param is sent as comma-separated column headers: `fields=Company,Email,Status`
   - And the backend filters the export to only include those columns
   - And the exported file contains only the selected columns with correct headers and widths
   - And if all fields are selected, omit the `fields` param entirely (backend default = all)

6. **AC6: Fields Applied to Client-Side Export**
   - Given I have selected specific fields
   - When client-side export functions (`exportLeadsToExcel`, `exportLeadsToCSV`) are used
   - Then only the selected columns are included in the generated file
   - And the column order matches `LEAD_EXPORT_COLUMNS` order (not selection order)

7. **AC7: Fields Persist During Session**
   - Given I have customized field selection
   - When I change other filters (date, status, owner, campaign)
   - Then my field selection remains unchanged
   - And when I change export format (xlsx/csv/pdf)
   - Then my field selection remains unchanged

8. **AC8: PDF Export Field Limitation**
   - Given I have PDF format selected
   - When I look at the field selection
   - Then the field selection is disabled (greyed out) with a note: "PDF uses a fixed layout"
   - And the PDF export continues to use its own hardcoded column set (9 columns in export.controller.ts)
   - And switching back to xlsx/csv re-enables field selection

9. **AC9: Backend Column Filtering**
   - Given the backend receives `fields=Company,Email,Status` query param
   - When generating xlsx/csv export
   - Then only the requested columns are included in the output
   - And column headers match exactly the field names passed
   - And Excel column widths are correct for the selected subset
   - And if `fields` param is missing, export all 23 columns (backward compatible)
   - And invalid field names in the `fields` param are silently ignored

10. **AC10: Responsive Layout**
    - Given I view the Export page on different screen sizes
    - Then on Desktop: 2-column checkbox grid, Select All button inline with label
    - And on Tablet: 2-column grid maintained
    - And on Mobile: 1-column checkbox list, full-width Select All button

## Tasks / Subtasks

- [ ] **Task 1: Create ExportFieldSelector Component** (AC: #1, #2, #3, #4, #8, #10)
  - [ ] 1.1 Create `eneos-admin-dashboard/src/components/export/export-field-selector.tsx`
  - [ ] 1.2 Import `LEAD_EXPORT_COLUMNS` from `@/lib/export-leads` for column definitions
  - [ ] 1.3 Checkbox grid using Shadcn `Checkbox` + `Label` in 2-column grid (`grid grid-cols-2 gap-2`)
  - [ ] 1.4 "Select All / Deselect All" button at top using Shadcn `Button` variant="ghost" size="sm"
  - [ ] 1.5 Badge showing `{n} of 16 fields` or "All fields" using Shadcn `Badge`
  - [ ] 1.6 Minimum 1 field validation - prevent unchecking last field, show toast
  - [ ] 1.7 Disabled state with note when PDF format selected (`isPdfFormat` prop)
  - [ ] 1.8 Responsive: `grid-cols-1 sm:grid-cols-2` for mobile/desktop
  - [ ] 1.9 All elements have `data-testid` attributes

- [ ] **Task 2: Update ExportParams and useExport Hook** (AC: #5)
  - [ ] 2.1 Add `fields?: string[]` to `ExportParams` interface in `use-export.ts`
  - [ ] 2.2 Update `buildQueryParams()` to serialize fields: `fields=Company,Email,Status` (comma-separated headers)
  - [ ] 2.3 Only add `fields` param if not all fields are selected (optimization)
  - [ ] 2.4 Map field keys to headers using `LEAD_EXPORT_COLUMNS` for the param value

- [ ] **Task 3: Update ExportForm to Include Field Selector** (AC: #1, #7, #8)
  - [ ] 3.1 Edit `eneos-admin-dashboard/src/components/export/export-form.tsx`
  - [ ] 3.2 Add `selectedFields` state: `useState<Set<keyof Lead>>(new Set(LEAD_EXPORT_COLUMNS.map(c => c.key)))`
  - [ ] 3.3 Place `<ExportFieldSelector>` between Campaign filter and Action Buttons
  - [ ] 3.4 Pass `isPdfFormat` to disable field selector when PDF selected
  - [ ] 3.5 Convert `selectedFields` Set to header string array when calling `exportData()` and `previewPdf()`
  - [ ] 3.6 Do NOT add `fields` to `ExportFormData` - keep `selectedFields` as separate state, merge only when calling hooks

- [ ] **Task 4: Update API Proxy Route** (AC: #5)
  - [ ] 4.1 Edit `eneos-admin-dashboard/src/app/api/export/route.ts`
  - [ ] 4.2 Extract `fields` from searchParams
  - [ ] 4.3 Forward `fields` param to backend URL if present

- [ ] **Task 5: Implement Backend Column Filtering** (AC: #9)
  - [ ] 5.1 Edit `eneos-sales-automation/src/controllers/admin/export.controller.ts`
  - [ ] 5.2 After line 36 (`const { type, format, ... } = validation.data`), also destructure `fields`
  - [ ] 5.3 Parse `fields` as comma-separated string: `const requestedFields = fields?.split(',').map(f => f.trim()) || null`
  - [ ] 5.4 Create a `filterColumns` helper: if `requestedFields` is set, filter `dataToExport` to only include matching column keys
  - [ ] 5.5 Apply column filtering AFTER the existing `dataToExport` mapping (line 79-103)
  - [ ] 5.6 For xlsx: dynamically build column widths from the filtered column set
  - [ ] 5.7 For csv: only include filtered columns in output
  - [ ] 5.8 For pdf: **SKIP** field filtering (PDF has its own fixed 9-column layout)
  - [ ] 5.9 Invalid field names silently ignored (filter against known column headers)

- [ ] **Task 6: Update Client-Side Export Functions** (AC: #6)
  - [ ] 6.1 Edit `eneos-admin-dashboard/src/lib/export-leads.ts`
  - [ ] 6.2 Add optional `selectedFields?: Set<keyof Lead>` parameter to `exportLeadsToExcel(leads, selectedFields?)`
  - [ ] 6.3 Add optional `selectedFields?: Set<keyof Lead>` parameter to `exportLeadsToCSV(leads, selectedFields?)`
  - [ ] 6.4 Filter `LEAD_EXPORT_COLUMNS` by `selectedFields` set if provided
  - [ ] 6.5 Maintain column order from `LEAD_EXPORT_COLUMNS` (not selection order)

- [ ] **Task 7: Testing** (All ACs)
  - [ ] 7.1 Unit test `export-field-selector.tsx` - rendering, checking/unchecking, select all, minimum validation (10-12 tests)
  - [ ] 7.2 Unit test updated `export-form.tsx` - field selector integration, PDF disable, state persistence (6-8 tests)
  - [ ] 7.3 Unit test `buildQueryParams()` - fields serialization, all-fields optimization (4-6 tests)
  - [ ] 7.4 Unit test `exportLeadsToExcel/CSV` with selected fields - column filtering, order (6-8 tests)
  - [ ] 7.5 Backend test: export controller with `fields` param - filtering, invalid fields, all fields (8-10 tests)
  - [ ] 7.6 Integration test: full export flow with field selection (3-4 tests)

## Dev Notes

### Component Hierarchy

```
ExportForm (export-form.tsx) - Client Component [MODIFY]
├── Card: Export Lead Data
│   ├── Format Selection (existing, no changes)
│   ├── PDF Row Limit Warning (existing, no changes)
│   ├── Date Range Section (existing from 6-4, no changes)
│   │   ├── ExportDatePresets (existing)
│   │   ├── ExportDateRangePicker (existing)
│   │   └── Record Count Label (existing)
│   ├── Status Filter (existing, no changes)
│   ├── Owner Filter (existing, no changes)
│   ├── Campaign Filter (existing, no changes)
│   ├── ExportFieldSelector (export-field-selector.tsx) [NEW]  ← INSERT HERE
│   │   ├── Header Row: Label + Badge + Select All Button
│   │   ├── Checkbox Grid (2 columns)
│   │   │   ├── Checkbox: Company ✓
│   │   │   ├── Checkbox: DBD Sector ✓
│   │   │   ├── Checkbox: Industry ✓
│   │   │   ├── ... (16 total from LEAD_EXPORT_COLUMNS)
│   │   │   └── Checkbox: Created Date ✓
│   │   └── PDF Disabled Note (when isPdfFormat)
│   └── Action Buttons (existing, no changes)
└── PdfPreviewModal (existing, no changes)
```

### ExportFieldSelector Component Design

```typescript
// src/components/export/export-field-selector.tsx
'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LEAD_EXPORT_COLUMNS } from '@/lib/export-leads';
import type { Lead } from '@/types/lead';

interface ExportFieldSelectorProps {
  selectedFields: Set<keyof Lead>;
  onFieldsChange: (fields: Set<keyof Lead>) => void;
  isPdfFormat: boolean;
}

export function ExportFieldSelector({
  selectedFields,
  onFieldsChange,
  isPdfFormat,
}: ExportFieldSelectorProps) {
  const { toast } = useToast();
  const totalFields = LEAD_EXPORT_COLUMNS.length;
  const selectedCount = selectedFields.size;
  const allSelected = selectedCount === totalFields;

  const handleToggleField = (key: keyof Lead, checked: boolean) => {
    if (!checked && selectedCount <= 1) {
      toast({
        title: 'Cannot deselect',
        description: 'At least one field must be selected',
        variant: 'destructive',
      });
      return;
    }
    const next = new Set(selectedFields);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    onFieldsChange(next);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all except Company (first column)
      onFieldsChange(new Set([LEAD_EXPORT_COLUMNS[0].key]));
    } else {
      onFieldsChange(new Set(LEAD_EXPORT_COLUMNS.map((c) => c.key)));
    }
  };

  return (
    <div className="space-y-3" data-testid="field-selector">
      {/* Header row: label + badge + toggle button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Data Fields</Label>
          <Badge variant="secondary" data-testid="field-count">
            {allSelected ? 'All fields' : `${selectedCount} of ${totalFields}`}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          disabled={isPdfFormat}
          data-testid="select-all-toggle"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {/* PDF disabled note */}
      {isPdfFormat && (
        <p className="text-sm text-muted-foreground" data-testid="pdf-note">
          PDF uses a fixed layout — field selection applies to Excel and CSV only.
        </p>
      )}

      {/* Checkbox grid */}
      <div className={cn(
        'grid grid-cols-1 sm:grid-cols-2 gap-2',
        isPdfFormat && 'opacity-50 pointer-events-none'
      )} data-testid="field-checkbox-grid">
        {LEAD_EXPORT_COLUMNS.map((col) => (
          <label
            key={col.key}
            className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent"
            data-testid={`field-${col.key}`}
          >
            <Checkbox
              checked={selectedFields.has(col.key)}
              onCheckedChange={(checked) => handleToggleField(col.key, !!checked)}
              disabled={isPdfFormat}
            />
            <span className="text-sm">{col.header}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

**NOTE:** The `cn` utility must be imported: `import { cn } from '@/lib/utils';`

### Updated ExportParams Interface

```typescript
// In use-export.ts - add fields to ExportParams
export interface ExportParams {
  format: ExportFormat;
  dateRange?: DateRange;
  status: ExportStatus;
  owner: string;
  campaign: string;
  fields?: string[];  // Array of column header strings (e.g., ['Company', 'Email', 'Status'])
}

// Updated buildQueryParams
function buildQueryParams(params: ExportParams): URLSearchParams {
  const queryParams = new URLSearchParams({
    format: params.format,
    status: params.status,
    owner: params.owner,
    campaign: params.campaign,
  });

  // Date range (existing logic unchanged)
  if (params.dateRange?.from) { /* ... existing ... */ }
  if (params.dateRange?.to) { /* ... existing ... */ }

  // Add fields param if not all fields selected
  if (params.fields && params.fields.length > 0 && params.fields.length < LEAD_EXPORT_COLUMNS.length) {
    queryParams.append('fields', params.fields.join(','));
  }

  return queryParams;
}
```

### Updated ExportForm - Key Changes

```typescript
// In export-form.tsx - add selectedFields state and pass to ExportFieldSelector

// NEW import
import { ExportFieldSelector } from '@/components/export/export-field-selector';

// NEW state - all fields selected by default
const [selectedFields, setSelectedFields] = useState<Set<keyof Lead>>(
  new Set(LEAD_EXPORT_COLUMNS.map((c) => c.key))
);

// Convert Set<keyof Lead> to header strings for ExportParams
const selectedFieldHeaders = LEAD_EXPORT_COLUMNS
  .filter((col) => selectedFields.has(col.key))
  .map((col) => col.header);

// Pass to export calls (fields omitted for PDF since backend ignores it)
const handleExport = async () => {
  try {
    await exportData({ ...formData, fields: selectedFieldHeaders });
  } catch { /* ... */ }
};

// previewPdf also gets fields for type consistency (backend ignores for PDF)
const handlePreviewPdf = async () => {
  try {
    const result = await previewPdf({ ...formData, fields: selectedFieldHeaders });
    // ... existing blob/modal logic unchanged
  } catch { /* ... */ }
};

// In JSX - insert ExportFieldSelector between Campaign filter and Action Buttons:
<ExportFieldSelector
  selectedFields={selectedFields}
  onFieldsChange={setSelectedFields}
  isPdfFormat={isPdfFormat}
/>
```

### Backend Controller Changes

```typescript
// In export.controller.ts - after line 36, add fields destructuring
const { type, format, startDate, endDate, status, owner, campaign, fields } = validation.data;

// After dataToExport is built (line 103), add column filtering:
// ALL_EXPORT_COLUMNS is the list of all known column header strings
const ALL_EXPORT_COLUMNS = [
  'Row', 'Company', 'DBD Sector', 'Industry', 'Juristic ID', 'Capital',
  'Location', 'Full Address', 'Contact Name', 'Phone', 'Email', 'Job Title',
  'Website', 'Lead Source', 'Status', 'Sales Owner', 'Campaign', 'Source',
  'Talking Point', 'Created Date', 'Clicked At', 'Contacted At', 'Closed At'
];

// Parse requested fields (skip for PDF - PDF has fixed layout)
let filteredColumns: string[] | null = null;
if (fields && format !== 'pdf') {
  const requestedFields = fields.split(',').map(f => f.trim());
  filteredColumns = requestedFields.filter(f => ALL_EXPORT_COLUMNS.includes(f));
  if (filteredColumns.length === 0) filteredColumns = null; // fallback to all
}

// Apply column filter to dataToExport
if (filteredColumns) {
  dataToExport = dataToExport.map(row => {
    const filtered: Record<string, string | number> = {};
    for (const col of filteredColumns!) {
      if (col in row) {
        filtered[col] = row[col];
      }
    }
    return filtered;
  });
}

// For xlsx: column widths are already dynamically derived from Object.keys(dataToExport[0])
// The existing code on lines 114-118 already handles this:
// const columns = Object.keys(dataToExport[0]).map(key => ({ header: key, key, width: 20 }));
// Then specific widths are set below - need to guard with try/catch for missing columns
```

### API Route Proxy Changes

```typescript
// In eneos-admin-dashboard/src/app/api/export/route.ts
// After line 51, add:
const fields = searchParams.get('fields');

// After line 63 (campaign forwarding), add:
if (fields) apiUrl.searchParams.append('fields', fields);
```

### Client-Side Export Changes

```typescript
// In export-leads.ts - add optional selectedFields parameter

export function exportLeadsToExcel(
  leads: Lead[],
  selectedFields?: Set<keyof Lead>
): void {
  // Filter columns if selectedFields provided
  const columns = selectedFields
    ? LEAD_EXPORT_COLUMNS.filter(col => selectedFields.has(col.key))
    : LEAD_EXPORT_COLUMNS;

  const wb = XLSX.utils.book_new();
  const headers = columns.map(col => col.header);
  const rows = leads.map(lead => {
    const formatted = formatLeadForExport(lead);
    return columns.map(col => formatted[col.key] || '');
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = columns.map(col => ({ wch: col.width }));
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, generateFilename('xlsx'));
}

// Same pattern for exportLeadsToCSV
export function exportLeadsToCSV(
  leads: Lead[],
  selectedFields?: Set<keyof Lead>
): void {
  const columns = selectedFields
    ? LEAD_EXPORT_COLUMNS.filter(col => selectedFields.has(col.key))
    : LEAD_EXPORT_COLUMNS;
  // ... rest same but use columns instead of LEAD_EXPORT_COLUMNS
}
```

### Project Structure Notes

```
eneos-admin-dashboard/src/
├── components/export/
│   ├── export-form.tsx                # MODIFY - Add selectedFields state + ExportFieldSelector
│   ├── export-field-selector.tsx      # NEW - Checkbox grid for field selection
│   ├── export-date-presets.tsx        # EXISTING - no changes
│   ├── export-date-range-picker.tsx   # EXISTING - no changes
│   ├── pdf-preview-modal.tsx          # EXISTING - no changes
│   ├── pdf-viewer.tsx                 # EXISTING - no changes
│   └── quick-export-button.tsx        # EXISTING - no changes
├── hooks/
│   ├── use-export.ts                  # MODIFY - Add fields to ExportParams + buildQueryParams
│   ├── use-export-leads.ts            # EXISTING - no changes (uses export-leads.ts which changes)
│   └── use-record-count.ts            # EXISTING - no changes
├── lib/
│   ├── export-leads.ts                # MODIFY - Add selectedFields param to export functions
│   └── export-date-presets.ts         # EXISTING - no changes
└── app/api/export/
    └── route.ts                       # MODIFY - Forward fields param to backend

eneos-sales-automation/src/
├── controllers/admin/
│   └── export.controller.ts           # MODIFY - Parse & apply fields column filtering
└── validators/
    └── admin.validators.ts            # EXISTING - Already has fields param (no change needed!)
```

### Libraries & Dependencies

**NO new packages needed:**
- Shadcn `Checkbox` component - may need to install via `npx shadcn@latest add checkbox` if not present
- All other components already available: Button, Label, Badge, Card

**Check if Checkbox is installed:**
```bash
# In eneos-admin-dashboard/
ls src/components/ui/checkbox.tsx
# If not present: npx shadcn@latest add checkbox
```

### Architecture Compliance

| Requirement | Implementation |
|-------------|----------------|
| State Management | `useState<Set<keyof Lead>>` for field selection |
| Component Pattern | Client component with 'use client' directive |
| Styling | Tailwind CSS + Shadcn Checkbox/Label/Badge/Button |
| Type Safety | `keyof Lead` constraint ensures only valid fields selectable |
| Backend Validation | `fields` param already validated in Zod schema |
| Backward Compatible | Missing `fields` param = export all columns (no breaking change) |
| PDF Special Case | Field selection disabled for PDF (fixed layout) |
| Single Source of Truth | `LEAD_EXPORT_COLUMNS` defines available fields |

### Testing Standards

- **Framework:** Vitest + React Testing Library (frontend), Vitest (backend)
- **Mock Pattern:** `vi.hoisted()` + `vi.mock()` for hooks
- **Coverage Target:** 80%+ for new code
- **Test Location:** `src/__tests__/` mirroring source structure
- **All components must include `data-testid` attributes**

**Mock Setup for ExportFieldSelector tests:**
```typescript
const { mockToast } = vi.hoisted(() => ({
  mockToast: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));
```

**Backend test pattern for export controller:**
```typescript
// In eneos-sales-automation/src/__tests__/controllers/admin/export.controller.test.ts
import request from 'supertest';
import app from '../../../app.js';

it('should filter columns when fields param provided', async () => {
  const response = await request(app)
    .get('/api/admin/export')
    .query({ type: 'leads', format: 'csv', fields: 'Company,Email,Status' })
    .set('Authorization', `Bearer ${mockToken}`);

  expect(response.status).toBe(200);
  // Parse CSV and verify only 3 columns present
});
```

### Previous Story Intelligence

**From Story 6-4 (Custom Date Range):**
- Export form uses `ExportFormData` with `format`, `dateRange?`, `status`, `owner`, `campaign`
- Must add `fields` to this interface without breaking existing flow
- `useExport().exportData()` handles toast notifications internally - DO NOT add custom toasts for export
- Date presets + record count already in form - field selector goes BELOW campaign filter

**From Story 6-1 (Export to Excel):**
- `LEAD_EXPORT_COLUMNS` is the single source of truth for frontend columns
- `exportLeadsToExcel` and `exportLeadsToCSV` functions must accept optional field filter
- DO NOT modify column definitions - just filter which columns to include

**From Story 6-2 (Export to PDF):**
- PDF has its own 9-column layout hardcoded in backend (lines 297-307)
- PDF export does NOT use `LEAD_EXPORT_COLUMNS`
- Field selection should be disabled when PDF format is selected

**Backend Export Controller Patterns:**
- Lines 79-103: Builds `dataToExport` array with 23 columns as Record<string, string | number>
- Lines 107-205: xlsx generation reads columns from `Object.keys(dataToExport[0])`
- Lines 216-228: csv generation uses json2csv which auto-detects columns
- Lines 230-403: pdf generation has its own column set - do NOT modify
- Column widths (lines 122-144) reference specific column names - must guard against missing columns when fields are filtered

### Anti-Pattern Prevention

- **DO NOT** modify `admin.validators.ts` - `fields` param already exists in the schema
- **DO NOT** modify PDF export logic - PDF has a fixed layout
- **DO NOT** create a separate "field config" file - use `LEAD_EXPORT_COLUMNS` as source of truth
- **DO NOT** use localStorage for field persistence - session state only (reset on page reload)
- **DO NOT** add new npm packages - Shadcn Checkbox may need installing via CLI but it's not a new dependency
- **DO NOT** change column order - always follow `LEAD_EXPORT_COLUMNS` order
- **DO NOT** add toast notifications in `handleExport` - the `useExport` hook handles toasts
- **DO NOT** use Tremor components - project uses Shadcn/ui exclusively
- **DO NOT** modify `formatLeadForExport()` function - it formats all fields regardless of selection
- **DO NOT** break backward compatibility - omit `fields` param when all selected
- **DO NOT** modify `use-export-leads.ts` or `use-export-all-leads.ts` - these are used by Lead Management page's quick export (`lead-export-dropdown.tsx`) and should always export all columns. The optional `selectedFields?` param in `exportLeadsToExcel/CSV` keeps them backward compatible.
- **DO NOT** add `fields` to `ExportFormData` interface - keep `selectedFields` as separate `useState<Set<keyof Lead>>` state and merge into `ExportParams` only when calling `exportData()`/`previewPdf()`

### Backend Column Width Guard

The backend `export.controller.ts` sets column widths by name (lines 122-144). When columns are filtered, trying to set width on a missing column throws. Add a guard:

```typescript
// Replace direct worksheet.getColumn('Company').width = 25 calls with:
const columnWidthMap: Record<string, number> = {
  'Row': 8, 'Company': 25, 'DBD Sector': 15, 'Industry': 20,
  'Juristic ID': 18, 'Capital': 15, 'Location': 20, 'Full Address': 40,
  'Contact Name': 20, 'Phone': 15, 'Email': 25, 'Job Title': 20,
  'Website': 30, 'Lead Source': 15, 'Status': 12, 'Sales Owner': 20,
  'Campaign': 25, 'Source': 15, 'Talking Point': 30, 'Created Date': 18,
  'Clicked At': 18, 'Contacted At': 18, 'Closed At': 18,
};

// Apply widths only for columns that exist
if (dataToExport.length > 0) {
  const existingColumns = Object.keys(dataToExport[0]);
  for (const col of existingColumns) {
    if (columnWidthMap[col]) {
      try {
        worksheet.getColumn(col).width = columnWidthMap[col];
      } catch {
        // Column not in current export set - skip
      }
    }
  }
}
```

### References

- [LEAD_EXPORT_COLUMNS: eneos-admin-dashboard/src/lib/export-leads.ts:35-56]
- [ExportParams: eneos-admin-dashboard/src/hooks/use-export.ts:8-14]
- [buildQueryParams: eneos-admin-dashboard/src/hooks/use-export.ts:33-56]
- [Export Form: eneos-admin-dashboard/src/components/export/export-form.tsx]
- [API Route: eneos-admin-dashboard/src/app/api/export/route.ts]
- [Backend Controller: eneos-sales-automation/src/controllers/admin/export.controller.ts]
- [Backend Validator: eneos-sales-automation/src/validators/admin.validators.ts:177-190]
- [Backend Column Widths: eneos-sales-automation/src/controllers/admin/export.controller.ts:122-144]

## Dependencies

### Required (Already Done)
- Story 6-1: Export to Excel - Export form, hook, export-leads.ts established
- Story 6-2: Export to PDF - PDF preview modal and export hook extension
- Story 6-4: Custom Date Range - Date presets and enhanced date picker in form
- Backend `/api/admin/export` endpoint with `fields` param in validator schema

### Optional (Future)
- Story 6-6: Export History - Will add history section (no conflict)
- Story 6-7: Scheduled Reports - May reuse field selection for scheduled exports
- Story 6-8: Export to CSV - Already supported via current export system

## Definition of Done

- [ ] All 10 Acceptance Criteria pass
- [ ] All 7 Tasks completed
- [ ] TypeScript compiles with 0 errors (`npm run typecheck` in both projects)
- [ ] Linter passes with 0 warnings (`npm run lint` in both projects)
- [ ] Unit tests pass (40+ new tests, 80%+ coverage for new code)
- [ ] Field selector renders all 16 columns with checkboxes
- [ ] Select All / Deselect All toggle works correctly
- [ ] Minimum 1 field validation prevents empty selection
- [ ] Fields correctly passed through: Frontend → API Route → Backend
- [ ] Backend filters columns in xlsx/csv output (not PDF)
- [ ] Client-side export functions respect field selection
- [ ] Backward compatible: no `fields` param = all columns exported
- [ ] PDF format disables field selector with explanation
- [ ] Responsive design verified on Desktop, Tablet, Mobile
- [ ] Code review approved by Rex (Code Reviewer)
- [ ] Sprint status updated: `6-5-select-data-fields: done`

---

**Story Created By:** Bob (Scrum Master Agent)
**Created Date:** 2026-01-31
**Epic:** 6 - Export & Reports
**Story Points:** 5 (Medium - Full-stack but reuses established patterns, backend validator already ready)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
