# Story 6.8: Export to CSV

Status: ready-for-dev

## Story

As an Admin user,
I want to export lead data as a CSV file with proper Thai character support,
so that I can open the data in any spreadsheet application or import it into other systems.

## Project Context

> **IMPORTANT:** This is a **Full-Stack story** spanning two repositories.
>
> **Frontend:** `eneos-admin-dashboard/` (Next.js)
> **Backend:** `eneos-sales-automation/` (Express)

## Current Implementation State

CSV export is **already functional end-to-end**. This story focuses on:
1. Adding descriptive text to format options (the only UI change needed)
2. Comprehensive testing and verification
3. Edge case handling

| Component | Status | Location |
|-----------|--------|----------|
| Backend CSV generation | ✅ Done | `eneos-sales-automation/src/controllers/admin/export.controller.ts:216-229` |
| Backend validator | ✅ Done | `eneos-sales-automation/src/validators/admin.validators.ts:182` |
| Frontend format type | ✅ Done | `eneos-admin-dashboard/src/hooks/use-export.ts:6` |
| Export form CSV option | ✅ Done | `eneos-admin-dashboard/src/components/export/export-form.tsx:157-170` |
| Quick reports CSV option | ✅ Done | `eneos-admin-dashboard/src/components/export/report-card.tsx:96-98` |
| useExport hook CSV support | ✅ Done | `eneos-admin-dashboard/src/hooks/use-export.ts` |
| Format description text | ❌ TODO | `eneos-admin-dashboard/src/components/export/export-form.tsx` |

## Acceptance Criteria

1. **AC1: Format Descriptions** - Each format option displays descriptive text explaining the format:
   - Excel: "Formatted spreadsheet with styling"
   - CSV: "Plain text, universal compatibility"
   - PDF: "Print-ready document (max 100 rows)"

2. **AC2: CSV Download** - Clicking export with CSV format downloads a `.csv` file with `Content-Type: text/csv; charset=utf-8` and UTF-8 BOM.

3. **AC3: Thai Character Support** - CSV opens correctly in Excel, Google Sheets, and Numbers with Thai characters displayed properly.

4. **AC4: All Filters Applied** - CSV export respects: date range, status, sales owner, campaign filters.

5. **AC5: Field Selection Integration** - When field selection is active, CSV exports only selected columns. *(Blocked by Story 6-5 completion)*

6. **AC6: Quick Reports CSV** - Quick Reports support CSV format (already implemented in report-card.tsx).

7. **AC7: Large Dataset** - CSV export handles up to 10,000 rows within 5 seconds.

8. **AC8: Error Handling** - Failed exports show toast notification. Network timeout shows appropriate message.

9. **AC9: Accessibility** - Format options have proper ARIA labels. Button states announced to screen readers.

## Tasks / Subtasks

- [ ] **Task 1: Add Format Description Text** (AC: #1)
  - [ ] 1.1 Update `eneos-admin-dashboard/src/components/export/export-form.tsx` - Add description below each format label
  - [ ] 1.2 Style descriptions with `text-xs text-muted-foreground`
  - [ ] 1.3 Write component test for description rendering

- [ ] **Task 2: Backend CSV Verification** (AC: #2, #3, #4, #7)
  - [ ] 2.1 Write test: Verify BOM prefix (`\uFEFF`) in output
  - [ ] 2.2 Write test: Verify Thai characters in Company, Industry, Talking Point columns
  - [ ] 2.3 Write test: Verify all filters (date, status, owner, campaign) apply correctly
  - [ ] 2.4 Write test: 10,000 row export completes within 5 seconds
  - [ ] 2.5 Write test: CSV escaping for commas, quotes, newlines in values

- [ ] **Task 3: Frontend Integration Testing** (AC: #6, #8, #9)
  - [ ] 3.1 Write test: Quick report generates valid CSV for each period type
  - [ ] 3.2 Write test: Error toast shows on network failure
  - [ ] 3.3 Write test: ARIA labels present on format radio buttons
  - [ ] 3.4 Write test: Keyboard navigation between format options

- [ ] **Task 4: Field Selection Integration** (AC: #5) - *Blocked by Story 6-5*
  - [ ] 4.1 After 6-5 complete: Verify CSV exports only selected columns
  - [ ] 4.2 Write test: CSV with subset of fields
  - [ ] 4.3 Write test: CSV with all fields (backward compatibility)

## Dev Notes

### File Locations (Correct Paths)

**Frontend (`eneos-admin-dashboard/`):**
```
src/
├── components/export/
│   ├── export-form.tsx      ← Add format descriptions here (Task 1)
│   ├── report-card.tsx      ← Already has CSV option (lines 96-98)
│   └── ...
├── hooks/
│   └── use-export.ts        ← Already handles CSV (type line 6)
└── app/api/export/
    └── route.ts             ← Already forwards all formats
```

**Backend (`eneos-sales-automation/`):**
```
src/
├── controllers/admin/
│   └── export.controller.ts ← CSV generation (lines 216-229)
├── validators/
│   └── admin.validators.ts  ← format: z.enum(['xlsx', 'csv', 'pdf'])
└── constants/
    └── admin.constants.ts   ← EXPORT_FORMATS, ExportFormat type
```

### Task 1 Implementation Guide

Current format card structure (export-form.tsx lines 143-185):
```tsx
<Label htmlFor="format-xlsx" className="...">
  <FileSpreadsheet className="mb-3 h-6 w-6" />
  <span className="text-sm font-medium">Excel (.xlsx)</span>
  {/* ADD: <span className="text-xs text-muted-foreground">Formatted with styling</span> */}
</Label>
```

Add description span below each format name. Adjust card height if needed with `min-h-[120px]`.

### Backend CSV Implementation (Reference Only)

Already implemented at `export.controller.ts:216-229`:
```typescript
const { parse } = await import('json2csv');
const csv = parse(dataToExport);
const csvWithBOM = '\uFEFF' + csv;  // Excel Thai compatibility
res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.send(csvWithBOM);
```

### Testing Strategy

**Backend tests** (`eneos-sales-automation/src/__tests__/controllers/admin/`):
- Extend `export.controller.test.ts` with CSV-specific scenarios
- Use supertest for HTTP testing
- Verify response headers and BOM prefix

**Frontend tests** (`eneos-admin-dashboard/src/__tests__/`):
- Component tests for format descriptions
- Hook tests for CSV blob handling
- Use vi.hoisted() pattern for mocks

### Anti-Patterns to Avoid

1. **DO NOT** create new CSV library - `json2csv` already works
2. **DO NOT** add toast after `exportData()` - hook handles toasts internally
3. **DO NOT** add CSV preview modal - CSV is data format, not visual
4. **DO NOT** add delimiter options - BOM + comma is universal standard
5. **DO NOT** install new packages

### Dependencies

- **Blocked by:** Story 6-5 (Select Data Fields) for AC#5 testing
- **No blockers for:** AC#1-4, AC#6-9

### References

- [Source: eneos-sales-automation/src/controllers/admin/export.controller.ts#L216-229] - Backend CSV
- [Source: eneos-admin-dashboard/src/components/export/export-form.tsx#L157-170] - Format selector
- [Source: eneos-admin-dashboard/src/components/export/report-card.tsx#L96-98] - Quick reports CSV
- [Source: eneos-admin-dashboard/src/hooks/use-export.ts#L6] - ExportFormat type

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log
| Date | Change | Author |
|------|--------|--------|
| 2026-02-01 | Story created | SM Agent (Bob) |
| 2026-02-01 | Quality review: Fixed paths, marked completed items, reduced scope | SM Agent (Bob) |

### File List
