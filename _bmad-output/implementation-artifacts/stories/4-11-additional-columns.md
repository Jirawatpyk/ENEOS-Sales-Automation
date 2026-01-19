# Story 4.11: Additional Lead Details

Status: done

## Story

As an **ENEOS manager**,
I want **to see additional lead information (Lead Source, Job Title, City) in the lead detail sheet**,
so that **I can understand the full context of each lead when reviewing their details**.

## Scope

This story combines features F-04.11, F-04.12, and F-04.13:
- **F-04.11**: Lead Source (Should Have)
- **F-04.12**: Job Title (Should Have)
- **F-04.13**: City (Should Have)

**Note:** These fields are added to Detail Sheet only. Table columns may be added in a future story.

## Acceptance Criteria

1. **AC1: Lead Source in Detail Sheet**
   - Given I open a lead's detail sheet
   - When the lead has a leadSource value
   - Then I see "Lead Source" displayed in the Campaign Information section (after Source field)
   - And it uses an appropriate icon (Tag)
   - And empty/whitespace-only values are not displayed

2. **AC2: Job Title in Detail Sheet**
   - Given I open a lead's detail sheet
   - When the lead has a jobTitle value
   - Then I see "Job Title" displayed in the Contact Information section
   - And it uses an appropriate icon (Briefcase)
   - And empty values are not displayed
   - Note: This field already exists in current implementation ✅

3. **AC3: City in Detail Sheet**
   - Given I open a lead's detail sheet
   - When the lead has a city value
   - Then I see "City" displayed in the Contact Information section
   - And it uses an appropriate icon (MapPin)
   - And empty values are not displayed
   - Note: This field already exists in current implementation ✅

4. **AC4: Consistent Styling**
   - Given I view the detail sheet
   - When all fields are displayed
   - Then new fields use the same `DetailItem` component as existing fields
   - And icons have consistent sizing (h-4 w-4)
   - And colors are visually distinct but harmonious

5. **AC5: Accessibility**
   - Given I use keyboard or screen reader
   - When viewing the detail sheet
   - Then new fields are properly labeled
   - And content is readable by screen readers

## Tasks / Subtasks

- [x] **Task 1: Verify Existing Fields** (AC: #2, #3)
  - [x] 1.1 Confirm `jobTitle` is already displayed in detail sheet ✅
  - [x] 1.2 Confirm `city` is already displayed in detail sheet ✅
  - [x] 1.3 No changes needed for these fields

- [x] **Task 2: Add Lead Source to Detail Sheet** (AC: #1, #4)
  - [x] 2.1 Update `src/components/leads/lead-detail-sheet.tsx`
  - [x] 2.2 Import `Tag` icon from lucide-react
  - [x] 2.3 Add `leadSource` field in Campaign Information section (after source)
  - [x] 2.4 Use conditional rendering (only show if value exists)
  - [x] 2.5 Position after existing `source` field

- [x] **Task 3: Testing** (AC: #1-5)
  - [x] 3.1 Add tests to `src/__tests__/lead-detail-sheet.test.tsx`
  - [x] 3.2 Test leadSource displays when value exists
  - [x] 3.3 Test leadSource hidden when null/empty
  - [x] 3.4 Test styling matches other fields (icon size, color)
  - [x] 3.5 Test screen reader accessibility (aria-labels)

## Dev Notes

### Prerequisite: Data Flow Bug Fix ✅ COMPLETED

The following files were fixed to pass `leadSource`, `jobTitle`, `city` from backend to frontend:

| File | Change |
|------|--------|
| `eneos-sales-automation/src/types/admin.types.ts` | Added fields to `LeadItem` interface |
| `eneos-sales-automation/src/controllers/admin.controller.ts` | Added fields to lead mapping (lines 570-572) |
| `eneos-admin-dashboard/src/app/api/admin/leads/route.ts` | Map fields from backend response (lines 121-123) |

**This bug fix is already deployed - no action needed.**

---

### Current State

The detail sheet already displays `jobTitle` and `city`:

```typescript
// Already in lead-detail-sheet.tsx (Contact Information section)
{lead.jobTitle && (
  <DetailItem
    label="Job Title"
    icon={<Briefcase className="h-4 w-4 text-purple-500" />}
    value={lead.jobTitle}
  />
)}
{lead.city && (
  <DetailItem
    label="City"
    icon={<MapPin className="h-4 w-4 text-red-500" />}
    value={lead.city}
  />
)}
```

### Add Lead Source

```typescript
// src/components/leads/lead-detail-sheet.tsx

// Step 1: Add 'Tag' to existing lucide-react imports
// Find the existing import line like:
// import { Mail, Phone, Building2, ... } from 'lucide-react';
// Add 'Tag' to the list:
import { Mail, Phone, Building2, Briefcase, MapPin, Tag, ... } from 'lucide-react';

// Step 2: Add in Lead Information section (after existing source field):
{lead.leadSource && (
  <DetailItem
    label="Lead Source"
    icon={<Tag className="h-4 w-4 text-orange-500" />}
    value={lead.leadSource}
  />
)}
```

### Field Locations in Detail Sheet

```
┌─────────────────────────────────────┐
│ Contact Information                 │
│ ├── Email                           │
│ ├── Phone                           │
│ ├── Job Title ✅ (already exists)   │
│ └── City ✅ (already exists)        │
├─────────────────────────────────────┤
│ Company Information                 │
│ ├── Company                         │
│ ├── Industry (AI)                   │
│ ├── Website                         │
│ └── Capital                         │
├─────────────────────────────────────┤
│ Sales Information                   │
│ ├── Sales Owner                     │
│ ├── Owner Email                     │
│ └── Owner Phone                     │
├─────────────────────────────────────┤
│ Campaign Information                │
│ ├── Campaign Name                   │
│ ├── Campaign ID                     │
│ ├── Email Subject                   │
│ ├── Source                          │
│ └── Lead Source ✅ (Story 4.11)     │
└─────────────────────────────────────┘
```

### Data Availability

The `Lead` type already includes these fields (from `src/types/lead.ts`):

```typescript
interface Lead {
  // ... existing fields
  source: string;             // Original source (e.g., "Brevo")
  leadSource: string | null;  // Additional source categorization
  jobTitle: string | null;    // Already displayed ✅
  city: string | null;        // Already displayed ✅
}
```

## Future Consideration

~~If table columns are needed later, create a new story to:~~
~~1. Add `leadSource` column to lead-table.tsx (after Campaign column)~~
~~2. Update leads-constants.ts with tooltip~~
~~3. Update export-leads.ts with new column~~

**✅ COMPLETED (2026-01-19) - Tech Debt: Column Toggle Feature**

Table columns for `leadSource`, `jobTitle`, `city` have been implemented with a Column Visibility Toggle feature:

| File | Purpose |
|------|---------|
| `src/components/leads/column-visibility-dropdown.tsx` | Dropdown to toggle column visibility |
| `src/hooks/use-column-visibility.ts` | Hook with localStorage persistence |
| `src/__tests__/column-visibility-dropdown.test.tsx` | Component tests (17 tests) |
| `src/__tests__/use-column-visibility.test.tsx` | Hook tests (16 tests) |

**Features:**
- Toggle visibility of optional columns (email, phone, leadSource, jobTitle, city)
- Persistence via localStorage (key: `leads-table-column-visibility`)
- Reset to default option
- Badge showing hidden column count
- Full keyboard accessibility

## Dev Agent Record

### Implementation Summary (2026-01-18)

**Implementation Approach:**
- Task 1: Verified `jobTitle` and `city` fields already displayed in `lead-detail-sheet.tsx` (lines 180-193)
- Task 2: Added `Tag` icon import and `leadSource` field after `source` in Campaign Information section
- Task 3: Added 7 new tests covering AC#1-5 for Lead Source functionality

**Key Decisions:**
- Placed `leadSource` in Campaign Information section (after `source`) rather than creating a new "Lead Information" section to maintain consistent UX with existing layout
- Used orange-500 color for Tag icon to visually distinguish from other icons
- Followed existing `DetailItem` pattern for consistent styling

### Completion Notes

- ✅ All acceptance criteria met (AC#1-5)
- ✅ Unit tests added and passing (7 new tests, 25 total in file)
- ✅ No TypeScript/ESLint errors
- ✅ Full test suite passes (1549 tests)
- ✅ Followed red-green-refactor cycle

## File List

| File | Change Type | Description |
|------|-------------|-------------|
| `eneos-admin-dashboard/src/components/leads/lead-detail-sheet.tsx` | Modified | Added Tag import, leadSource DetailItem |
| `eneos-admin-dashboard/src/__tests__/lead-detail-sheet.test.tsx` | Modified | Added Story 4.11 test suite (7 tests) |

## Dependencies

- Story 4-1: Lead List Table (provides detail sheet)
- Story 4-8: Lead Detail Modal (defines detail sheet structure)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-17 | Story created (combined F-04.11, F-04.12, F-04.13) | Claude |
| 2026-01-17 | Simplified to Detail Sheet only (table columns deferred) | Claude |
| 2026-01-17 | Added prerequisite bug fix docs, clarified imports, added test file path | Claude |
| 2026-01-18 | Implementation complete - Added leadSource field with tests | Amelia (Dev Agent) |
| 2026-01-18 | Code review: Fixed 5 issues (whitespace handling, AC wording, headers, diagram) | Amelia (Dev Agent) |
| 2026-01-19 | Tech Debt: Added Column Toggle feature for table columns (leadSource, jobTitle, city) with 33 tests | Claude Dev Agent |

## Code Review

### Story Review (Pre-implementation)

**Review Date:** 2026-01-17
**Reviewer:** Claude (SM Agent)
**Status:** ✅ APPROVED

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Missing data flow bug fix documentation | Medium | ✅ Fixed - Added prerequisite section |
| 2 | Import snippet unclear | Low | ✅ Fixed - Added step-by-step instructions |
| 3 | Missing test file specification | Low | ✅ Fixed - Added test file path to Task 3 |

---

### Senior Developer Review (AI) - Post-implementation

**Review Date:** 2026-01-18
**Reviewer:** Amelia (Dev Agent - Adversarial Mode)
**Outcome:** ✅ APPROVED (all issues fixed)

#### Action Items

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | [x] AC#1 stated "Lead Information section" but impl uses "Campaign Information" | Medium | ✅ Fixed - Updated AC#1 wording |
| 2 | [x] Missing edge case test for whitespace-only leadSource | Medium | ✅ Fixed - Added test + DetailItem fix |
| 3 | [x] Component header missing Story 4.11 reference | Low | ✅ Fixed - Updated header |
| 4 | [x] Test file header missing Story 4.11 reference | Low | ✅ Fixed - Updated header |
| 5 | [x] Dev Notes diagram showed incorrect section structure | Low | ✅ Fixed - Updated diagram |

#### Fixes Applied

1. **DetailItem whitespace handling** (`lead-detail-sheet.tsx:67-69`)
   - Added `if (typeof value === 'string' && value.trim() === '') return null;`
   - Prevents display of whitespace-only values

2. **Test coverage** (`lead-detail-sheet.test.tsx`)
   - Added test: "hides leadSource when value is whitespace only"
   - Total tests: 26 (was 25)

3. **Documentation sync**
   - AC#1 now correctly states "Campaign Information section"
   - Diagram reflects actual component structure
   - File headers include Story 4.11 reference

#### Review Summary

- **Git vs Story:** ✅ All files match
- **ACs Implemented:** ✅ All 5 verified
- **Tasks Complete:** ✅ All 12 subtasks verified
- **Test Quality:** ✅ Real assertions with edge cases
- **Code Quality:** ✅ Follows project patterns
