# Story 0-11: Backend Contacted_At Column & Metrics Fix

## Story Information
| Field | Value |
|-------|-------|
| Story ID | 0-11 |
| Epic | Epic-0: Backend API (Maintenance) |
| Priority | High (Critical Bug) |
| Status | done |
| Created | 2026-01-18 |

## User Story
**As a** Admin Dashboard user
**I want** accurate Response Time and Closing Time metrics
**So that** I can properly evaluate sales team performance

## Background / Problem Statement

### Current Issues Found:
1. **Missing `Contacted_At` Column**: Google Sheets doesn't have this column
2. **Wrong Response Time Calculation**: Uses `clickedAt - date` instead of `Contacted_At - date`
3. **Wrong Closing Time Calculation**: Uses `closedAt - clickedAt` instead of `closedAt - Contacted_At`

### Why This Matters:
- `clickedAt` = When customer clicked email link (from Brevo)
- `date` = Lead creation timestamp
- `Contacted_At` = When sales person accepted the lead (MISSING!)

Current calculation measures time from email click, not from when sales claimed the lead.

## Acceptance Criteria

### AC#1: Add Contacted_At Column to Google Sheets
- [x] Add Column AD: `Contacted_At`
- [x] Format: ISO 8601 timestamp
- [x] Document column mapping in `sheets.service.ts`

### AC#2: Update claimLead() to Set Contacted_At
- [x] When status changes to `contacted`, set `Contacted_At` = current timestamp
- [x] Preserve existing behavior for other timestamps
- [x] Add to `LeadRow` type definition

### AC#3: Fix Response Time Calculation
- [x] Change from `clickedAt - date` to `Contacted_At - date`
- [x] Handle null Contacted_At gracefully (return 0)
- [x] Update unit tests

### AC#4: Fix Closing Time Calculation
- [x] Change from `closedAt - clickedAt` to `closedAt - Contacted_At`
- [x] Handle null Contacted_At gracefully
- [x] Update unit tests

### AC#5: Update Admin API Response Types
- [x] Add `contactedAt` to `LeadListItem` interface
- [x] Map from Google Sheets column AD
- [x] Update API documentation

### AC#6: Backwards Compatibility
- [x] Existing leads without Contacted_At will show metrics = 0 (accepted)
- [x] Fallback logic in `admin.controller.ts` (not service layer)
- [x] No breaking changes to API response structure

## Technical Implementation

### Files to Modify:

1. **`src/services/sheets.service.ts`**
   - Update column mapping comment (line 47-49)
   - Add `contactedAt` to `rowToLead()` function
   - Update `leadToRow()` function
   - Update `claimLead()` to set contactedAt

2. **`src/types/index.ts`** (or relevant type file)
   - Add `contactedAt: string | null` to `LeadRow` interface

3. **`src/controllers/admin.controller.ts`**
   - Fix `getLeadById()` metrics (lines 752-758)
   - Fix `getSalesPerformance()` responseTimes (lines 886-888)
   - Fix `getSalesPerformance()` closingTimes (lines 897-899)
   - Fix `getDashboard()` stale leads daysSinceContact (line 356)
   - Map `contactedAt` in leads endpoint (line 575-577)

4. **`src/types/admin.types.ts`**
   - Already has `contactedAt` field (line 219) - just needs mapping

### Column Mapping Update:
```
Current: A-AC (29 columns)
Add: AD = Contacted_At

Updated mapping:
A: date, B: customerName, C: email, D: phone, E: company
F: industryAI, G: website, H: capital, I: status
J: salesOwnerId, K: salesOwnerName, L: campaignId, M: campaignName
N: emailSubject, O: source, P: leadId, Q: eventId, R: clickedAt
S: talkingPoint, T: closedAt, U: lostAt, V: unreachableAt, W: version
X: leadSource, Y: jobTitle, Z: city
AA: leadUUID, AB: createdAt, AC: updatedAt
AD: contactedAt  <-- NEW
```

### Metrics Calculation Fix:
```typescript
// BEFORE (wrong)
const metrics: LeadMetrics = {
  responseTime: lead.salesOwnerId
    ? getMinutesBetween(lead.date, lead.clickedAt)
    : 0,
  closingTime: lead.closedAt
    ? getMinutesBetween(lead.clickedAt || lead.date, lead.closedAt)
    : 0,
};

// AFTER (correct)
const metrics: LeadMetrics = {
  responseTime: lead.contactedAt
    ? getMinutesBetween(lead.date, lead.contactedAt)
    : 0,
  closingTime: lead.closedAt && lead.contactedAt
    ? getMinutesBetween(lead.contactedAt, lead.closedAt)
    : 0,
};
```

## Tasks

### Task 1: Google Sheets Column Setup
- [x] 1.1 Add Column AD header "Contacted_At" to Leads sheet
- [x] 1.2 Update column mapping comment in sheets.service.ts

### Task 2: Type Definitions
- [x] 2.1 Add `contactedAt: string | null` to LeadRow in types/index.ts
- [x] 2.2 Verify admin.types.ts already has the field

### Task 3: Sheets Service Updates
- [x] 3.1 Update `rowToLead()` to read column AD (index 29)
- [x] 3.2 Update `leadToRow()` to write column AD
- [x] 3.3 Update `claimLead()` to set contactedAt when status='contacted'
- [x] 3.4 Verify array bounds handling for index 29

### Task 4: Admin Controller Updates
- [x] 4.1 Map contactedAt in /api/admin/leads response
- [x] 4.2 Fix responseTime calculation in getLeadById (line 752-753)
- [x] 4.3 Fix closingTime calculation in getLeadById (line 755-756)
- [x] 4.4 Add backwards compatibility for null contactedAt
- [x] 4.5 Fix getSalesPerformance() responseTimes calculation (line 886-888)
- [x] 4.6 Fix getSalesPerformance() closingTimes calculation (line 897-899)
- [x] 4.7 Fix getDashboard() stale leads daysSinceContact (line 356)

### Task 5: Testing
- [x] 5.1 Update sheets.service.test.ts for claimLead
- [x] 5.2 Update admin.controller.test.ts for getLeadById metrics
- [x] 5.3 Update admin.controller.test.ts for getSalesPerformance metrics
- [x] 5.4 Update admin.controller.test.ts for getDashboard stale leads
- [x] 5.5 Test edge cases: null contactedAt, contactedAt before date, instant close
- [x] 5.6 Integration test for metrics calculation
- [x] 5.7 Verify all 300+ tests pass
- [x] 5.8 Test timestamp ordering validation (contactedAt > closedAt should return 0, log warning)

### Task 6: Documentation
- [x] 6.1 Update API documentation if needed
- [x] 6.2 Update CLAUDE.md column mapping section

## Definition of Done
- [x] All ACs implemented and tested
- [x] All unit tests pass (300+)
- [x] Code review passed
- [x] Metrics calculate correctly with new column
- [x] Backwards compatible with existing leads

## Out of Scope
- Status History tracking (separate story)
- Claimed_At column (use Contacted_At instead)
- UI changes (already handles null values)

## Notes
- This is a backend-only change
- Frontend already handles `contactedAt` field from API
- Existing leads will show metrics = 0 (accepted by stakeholder)
- No data migration needed for legacy leads

## Review Notes (2026-01-18)
- Reviewed by: Winston (Architect), John (PM), Bob (SM), Murat (TEA), Amelia (Dev)
- Decision: Fallback logic at controller level, not service layer
- Decision: Legacy leads show 0 metrics (accepted)
- **Party Mode Review (2026-01-18):**
  - Added Task 5.8: Timestamp ordering validation
  - Behavior: if `contactedAt > closedAt`, return 0 and log warning
  - Architecture risk: LOW - straightforward date field addition

## Dev Agent Record

### Implementation Date: 2026-01-18

### Files Modified:
- `src/types/index.ts` - Added `contactedAt: string | null` to Lead interface
- `src/services/sheets.service.ts` - Updated column mapping, rowToLead, leadToRow, claimLead, range A:AC→A:AD
- `src/controllers/admin.controller.ts` - Fixed metrics calculations in getLeadById, getSalesPerformance, getDashboard
- `src/__tests__/services/sheets.service.test.ts` - Updated range expectation, added contactedAt test
- `src/__tests__/controllers/admin.controller.test.ts` - Updated metrics tests, added edge case tests
- `CLAUDE.md` - Updated column mapping documentation

### Tests Added:
- `should set contactedAt timestamp when status is contacted` (sheets.service.test.ts)
- `should return 0 for metrics when contactedAt is null (legacy lead)` (admin.controller.test.ts)
- `should return 0 for closingTime when contactedAt > closedAt (invalid data)` (admin.controller.test.ts)

### Test Results:
- **507 tests passed** (added 3 new tests)
- All existing tests continue to pass
- Typecheck passes with no errors

### Implementation Notes:
1. Column AD (index 29) added for contactedAt
2. Range updated from A:AC to A:AD in addLead, getRow, updateLeadWithLock
3. Metrics calculation changed from clickedAt to contactedAt
4. Backwards compatible: legacy leads without contactedAt show metrics = 0

## Code Review Record (2026-01-18)

### Issues Found: 4
| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | 🟠 Medium | `getLeadByUUID()` range was `A2:AC` not `A2:AD` | Fixed - updated 2 locations |
| 2 | 🟡 Low | Test didn't assert timestamp ordering behavior | Fixed - added validation + `expect(0)` |
| 3 | 🔵 Info | Comment about contactedAt mapping | Already documented at line 578 |
| 4 | 🟢 Very Low | Empty contactDate defensive check | Already handled in `parseDateFromSheets()` |

### Additional Fixes Applied:
- `src/services/sheets.service.ts` - Fixed `A2:AC` → `A2:AD` in `getLeadByUUID()` and `getAllLeads()`
- `src/controllers/admin.controller.ts` - Added timestamp ordering validation (returns 0 + warning log)
- `src/__tests__/controllers/admin.controller.test.ts` - Updated assertion to `expect(closingTime).toBe(0)`

### Final Test Results:
- **507/507 tests passed** ✅
- **Typecheck passed** ✅

## Change Log
- 2026-01-18: Story implemented by Dev Agent (Amelia)
- 2026-01-18: Code review passed - 4 issues fixed
