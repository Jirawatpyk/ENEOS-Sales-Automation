# Story 4.11: Additional Lead Details

Status: ready-for-dev

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
   - Then I see "Lead Source" displayed in the Lead Information section
   - And it uses an appropriate icon (Tag)
   - And empty values are not displayed

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

- [ ] **Task 1: Verify Existing Fields** (AC: #2, #3)
  - [ ] 1.1 Confirm `jobTitle` is already displayed in detail sheet ✅
  - [ ] 1.2 Confirm `city` is already displayed in detail sheet ✅
  - [ ] 1.3 No changes needed for these fields

- [ ] **Task 2: Add Lead Source to Detail Sheet** (AC: #1, #4)
  - [ ] 2.1 Update `src/components/leads/lead-detail-sheet.tsx`
  - [ ] 2.2 Import `Tag` icon from lucide-react
  - [ ] 2.3 Add `leadSource` field in Lead Information section
  - [ ] 2.4 Use conditional rendering (only show if value exists)
  - [ ] 2.5 Position after existing `source` field

- [ ] **Task 3: Testing** (AC: #1-5)
  - [ ] 3.1 Add tests to `src/components/leads/__tests__/lead-detail-sheet.test.tsx`
  - [ ] 3.2 Test leadSource displays when value exists
  - [ ] 3.3 Test leadSource hidden when null/empty
  - [ ] 3.4 Test styling matches other fields (icon size, color)
  - [ ] 3.5 Test screen reader accessibility (aria-labels)

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
│ Lead Information                    │
│ ├── Status                          │
│ ├── Sales Owner                     │
│ ├── Source (original field)         │
│ └── Lead Source ← ADD HERE          │
├─────────────────────────────────────┤
│ Campaign Information                │
│ └── Campaign                        │
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

If table columns are needed later, create a new story to:
1. Add `leadSource` column to lead-table.tsx (after Campaign column)
2. Update leads-constants.ts with tooltip
3. Update export-leads.ts with new column

## Dependencies

- Story 4-1: Lead List Table (provides detail sheet)
- Story 4-8: Lead Detail Modal (defines detail sheet structure)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-17 | Story created (combined F-04.11, F-04.12, F-04.13) | Claude |
| 2026-01-17 | Simplified to Detail Sheet only (table columns deferred) | Claude |
| 2026-01-17 | Added prerequisite bug fix docs, clarified imports, added test file path | Claude |

## Code Review

**Review Date:** 2026-01-17
**Reviewer:** Claude (SM Agent)
**Status:** ✅ APPROVED

### Issues Found & Fixed

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Missing data flow bug fix documentation | Medium | ✅ Fixed - Added prerequisite section |
| 2 | Import snippet unclear | Low | ✅ Fixed - Added step-by-step instructions |
| 3 | Missing test file specification | Low | ✅ Fixed - Added test file path to Task 3 |

### Review Summary

- **Clarity:** Story is clear and actionable
- **Scope:** Appropriately scoped (Detail Sheet only)
- **Dependencies:** Well documented
- **Dev Notes:** Comprehensive with code snippets
- **Testing:** Test file path and cases specified
