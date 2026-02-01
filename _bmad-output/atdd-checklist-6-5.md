# ATDD Checklist - Story 6-5: Select Data Fields

**Story**: 6-5 Select Data Fields
**Primary Test Level**: Unit + Component (Vitest + RTL)
**Phase**: RED (Failing tests created)
**Date**: 2026-02-01

---

## Story Summary

As an ENEOS manager, I want to select which data fields/columns are included in my export, so that I can customize the export output to contain only the information I need.

**Scope**: Full-stack (Backend Express + Frontend Next.js)

---

## Acceptance Criteria → Test Mapping

| AC | Description | Test Level | Test File | Status |
|----|-------------|-----------|-----------|--------|
| AC#1 | Field Selection Checkbox List | Component | `export-field-selector.test.tsx` | RED |
| AC#2 | Select/Deselect Individual Fields | Component | `export-field-selector.test.tsx` | RED |
| AC#3 | Select All / Deselect All Toggle | Component | `export-field-selector.test.tsx` | RED |
| AC#4 | Field Count Badge | Component | `export-field-selector.test.tsx` | RED |
| AC#5 | Fields Passed to Backend Export API | Unit (Hook) | `use-export-fields.test.tsx` | RED |
| AC#6 | Fields Applied to Client-Side Export | Unit (Lib) | `export-leads-fields.test.ts` | RED |
| AC#7 | Fields Persist During Session | Component | (verified via state design) | N/A |
| AC#8 | PDF Export Field Limitation | Component + Backend | Both test files | RED |
| AC#9 | Backend Column Filtering | Unit (Controller) | `export-fields.test.ts` | RED |
| AC#10 | Responsive Layout | Component | `export-field-selector.test.tsx` | RED |

---

## Failing Tests Created

### 1. Backend: `eneos-sales-automation/src/__tests__/controllers/admin/export-fields.test.ts`

**8 tests** (4 RED, 4 GREEN backward-compat)

| Test | AC | RED/GREEN | Expected Failure |
|------|----|-----------|-----------------|
| should filter CSV to only include requested columns | AC#9 | RED | CSV has all 23 columns instead of 3 |
| should have exact column header names matching fields param | AC#9 | RED | CSV has all 23 columns |
| should include correct data values for filtered columns | AC#9 | RED | Extra columns present |
| should silently ignore invalid field names | AC#9 | RED | All 23 columns returned |
| should export all 23 columns when fields param is missing | AC#9 | GREEN | Backward compatible ✅ |
| should fallback to all columns when all field names are invalid | AC#9 | GREEN | Backward compatible ✅ |
| should not filter columns for PDF format | AC#8 | GREEN | PDF already works ✅ |
| should generate xlsx with only filtered columns | AC#9 | GREEN | Basic xlsx works ✅ |

### 2. Frontend Component: `eneos-admin-dashboard/src/__tests__/components/export/export-field-selector.test.tsx`

**16 tests** (ALL RED - component doesn't exist)

| Test | AC | Expected Failure |
|------|-----|-----------------|
| should render field selector section | AC#1 | Import error - component missing |
| should render 16 checkboxes for all columns | AC#1 | Import error |
| should show column header names on each checkbox | AC#1 | Import error |
| should have all checkboxes checked by default | AC#1 | Import error |
| should call onFieldsChange when unchecking a field | AC#2 | Import error |
| should prevent unchecking the last field and show toast | AC#2 | Import error |
| should show "Deselect All" when all fields selected | AC#3 | Import error |
| should show "Select All" when not all fields selected | AC#3 | Import error |
| should deselect all except Company when clicking Deselect All | AC#3 | Import error |
| should select all fields when clicking Select All | AC#3 | Import error |
| should show "All fields" when all selected | AC#4 | Import error |
| should show count when partial selection | AC#4 | Import error |
| should disable checkboxes when isPdfFormat is true | AC#8 | Import error |
| should show PDF note when isPdfFormat is true | AC#8 | Import error |
| should disable Select All toggle when isPdfFormat is true | AC#8 | Import error |
| should not show PDF note when isPdfFormat is false | AC#8 | Import error |

### 3. Frontend Lib: `eneos-admin-dashboard/src/__tests__/lib/export-leads-fields.test.ts`

**7 tests** (3 RED, 4 GREEN backward-compat)

| Test | AC | RED/GREEN | Expected Failure |
|------|----|-----------|-----------------|
| should filter Excel columns when selectedFields provided | AC#6 | RED | Headers have all 16 columns |
| should maintain LEAD_EXPORT_COLUMNS order regardless of selection | AC#6 | RED | Not filtered |
| should set correct column widths for filtered fields | AC#6 | RED | All 16 widths returned |
| should export all columns when selectedFields is undefined | AC#6 | GREEN | Backward compatible ✅ |
| should filter CSV columns when selectedFields provided | AC#6 | GREEN | Basic CSV works ✅ |
| should export all CSV columns when selectedFields is undefined | AC#6 | GREEN | Backward compatible ✅ |
| should maintain CSV column order from LEAD_EXPORT_COLUMNS | AC#6 | GREEN | Basic CSV works ✅ |

### 4. Frontend Hook: `eneos-admin-dashboard/src/__tests__/hooks/use-export-fields.test.tsx`

**4 tests** (2 RED, 2 GREEN backward-compat)

| Test | AC | RED/GREEN | Expected Failure |
|------|----|-----------|-----------------|
| should include fields param as comma-separated headers | AC#5 | RED | `fields` not in URLSearchParams |
| should serialize field headers in correct format | AC#5 | RED | `fields` not in URLSearchParams |
| should omit fields param when all fields are selected | AC#5 | GREEN | No fields param ✅ |
| should not include fields param when undefined | AC#5 | GREEN | No fields param ✅ |

---

## Data Infrastructure

### Mock Requirements

| Service | Mock Type | Details |
|---------|-----------|---------|
| sheetsService.getAllLeads | `vi.fn()` | Returns sample leads for backend tests |
| XLSX library | `vi.mock('xlsx')` | Captures workbook data for verification |
| useToast | `vi.mock('@/hooks/use-toast')` | Captures toast calls for min-field validation |
| fetch | `vi.stubGlobal('fetch')` | Captures API call URLs for param verification |

### Required data-testid Attributes

**ExportFieldSelector Component:**

| data-testid | Element | Purpose |
|-------------|---------|---------|
| `field-selector` | Root container | Section identification |
| `field-checkbox-grid` | Checkbox grid container | Grid layout verification |
| `field-{key}` | Individual checkbox label | Per-column checkbox (e.g., `field-company`) |
| `field-count` | Badge | Shows "All fields" or "n of 16" |
| `select-all-toggle` | Button | Select All / Deselect All toggle |
| `pdf-note` | Paragraph | PDF disabled explanation text |

---

## Implementation Checklist

### RED Phase (TEA - Complete ✅)

- [x] All failing tests written (13 RED tests)
- [x] Backward compatibility tests pass (10 GREEN tests)
- [x] Tests cover all 10 acceptance criteria
- [x] data-testid requirements documented
- [x] Mock requirements documented

### GREEN Phase (DEV Team)

#### Task 1: Create ExportFieldSelector Component (AC#1, #2, #3, #4, #8, #10)
- [ ] Create `eneos-admin-dashboard/src/components/export/export-field-selector.tsx`
- [ ] Checkbox grid using Shadcn Checkbox + Label
- [ ] Select All / Deselect All toggle button
- [ ] Field count badge ("n of 16" / "All fields")
- [ ] Min 1 field validation with toast
- [ ] PDF disabled state with note
- [ ] Responsive grid (`grid-cols-1 sm:grid-cols-2`)
- [ ] All `data-testid` attributes added
- [ ] Run: `npx vitest run src/__tests__/components/export/export-field-selector.test.tsx`
- [ ] ✅ 16 tests pass

#### Task 2: Update ExportParams and buildQueryParams (AC#5)
- [ ] Add `fields?: string[]` to `ExportParams` in `use-export.ts`
- [ ] Update `buildQueryParams()` to serialize `fields` as comma-separated string
- [ ] Omit `fields` when all fields selected (optimization)
- [ ] Run: `npx vitest run src/__tests__/hooks/use-export-fields.test.tsx`
- [ ] ✅ 4 tests pass

#### Task 3: Update ExportForm (AC#1, #7, #8)
- [ ] Add `selectedFields` state in `export-form.tsx`
- [ ] Place `<ExportFieldSelector>` between Campaign filter and Action Buttons
- [ ] Pass `isPdfFormat` prop to disable field selector
- [ ] Convert Set to header array for `exportData()` calls

#### Task 4: Update API Proxy Route (AC#5)
- [ ] Extract `fields` from searchParams in `route.ts`
- [ ] Forward `fields` param to backend URL

#### Task 5: Implement Backend Column Filtering (AC#9)
- [ ] Destructure `fields` from `validation.data` in `export.controller.ts` (line 36)
- [ ] Parse comma-separated string to array
- [ ] Filter `dataToExport` to only include matching columns
- [ ] Skip filtering for PDF format
- [ ] Guard column widths against missing columns
- [ ] Silently ignore invalid field names
- [ ] Run: `npx vitest run src/__tests__/controllers/admin/export-fields.test.ts`
- [ ] ✅ 8 tests pass

#### Task 6: Update Client-Side Export Functions (AC#6)
- [ ] Add `selectedFields?: Set<keyof Lead>` to `exportLeadsToExcel()`
- [ ] Add `selectedFields?: Set<keyof Lead>` to `exportLeadsToCSV()`
- [ ] Filter `LEAD_EXPORT_COLUMNS` by selectedFields
- [ ] Maintain column order from LEAD_EXPORT_COLUMNS
- [ ] Run: `npx vitest run src/__tests__/lib/export-leads-fields.test.ts`
- [ ] ✅ 7 tests pass

### REFACTOR Phase (DEV Team)

- [ ] All tests passing (GREEN)
- [ ] Code quality review
- [ ] Remove any duplications
- [ ] Ensure no TypeScript errors (`npm run typecheck` both projects)
- [ ] Ensure linter passes (`npm run lint` both projects)

---

## Execution Commands

### Backend (eneos-sales-automation)

```bash
# Run Story 6-5 backend tests
npx vitest run src/__tests__/controllers/admin/export-fields.test.ts

# Run all admin controller tests (regression check)
npx vitest run src/__tests__/controllers/
```

### Frontend (eneos-admin-dashboard)

```bash
# Run Story 6-5 frontend tests (all 3 files)
npx vitest run src/__tests__/components/export/export-field-selector.test.tsx src/__tests__/lib/export-leads-fields.test.ts src/__tests__/hooks/use-export-fields.test.tsx

# Run individual test file
npx vitest run src/__tests__/components/export/export-field-selector.test.tsx
npx vitest run src/__tests__/lib/export-leads-fields.test.ts
npx vitest run src/__tests__/hooks/use-export-fields.test.tsx

# Run all export-related tests (regression check)
npx vitest run --testPathPattern=export
```

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | 35 |
| RED (failing) | 13 |
| GREEN (backward-compat) | 10 |
| Import Error (component missing) | 16 |
| Test Files | 4 |
| ACs Covered | 10/10 |
| data-testid Required | 6 unique patterns |
| Story Points | 5 (Medium) |

**Next Steps for DEV Team:**

1. Run failing tests: See commands above
2. Review this checklist for implementation order
3. Implement one task at a time (RED → GREEN)
4. After all green: Run full test suite for regression
5. Code review by Rex

**Output File**: `_bmad-output/atdd-checklist-6-5.md`
**Story File**: `_bmad-output/implementation-artifacts/stories/6-5-select-data-fields.md`

**Knowledge Base References Applied:**
- Component TDD (red-green-refactor cycle)
- Test quality principles (deterministic, isolated, explicit assertions)
- Data factory patterns (createSampleLead, createMockLead helpers)
- Selector resilience (data-testid attributes)
