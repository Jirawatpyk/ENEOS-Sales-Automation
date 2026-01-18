# Story 0-12: Status History Tracking

## Story Information
| Field | Value |
|-------|-------|
| Story ID | 0-12 |
| Epic | Epic-0: Backend API (Maintenance) |
| Priority | Medium (Enhancement) |
| Status | done |
| Created | 2026-01-18 |
| Depends On | 0-11 (Contacted_At column) |

## User Story
**As a** Admin Dashboard user
**I want** to see the actual history of status changes for each lead
**So that** I can understand the complete journey of a lead through the sales pipeline

## Background / Problem Statement

### Current Issues Found:
1. **Mocked Status History**: `admin.controller.ts:698` has comment: `// สร้าง status history (mock - ในอนาคตควรเก็บจริงใน Sheets)`
2. **Reconstructed from Timestamps**: History is currently reconstructed from `closedAt`, `lostAt`, `unreachableAt` timestamps
3. **Missing Events**: Cannot track who changed status, when, or status change sequence

### Why This Matters:
- Cannot audit who made changes and when
- Cannot track status change sequences (e.g., contacted → lost → contacted → closed)
- Cannot identify patterns in sales process

## Acceptance Criteria

### AC#1: Create Status_History Sheet
- [x] Create new Google Sheet tab: `Status_History`
- [x] Columns: `Lead_UUID`, `Status`, `Changed_By_ID`, `Changed_By_Name`, `Timestamp`, `Notes`
- [x] Use Lead_UUID for Supabase migration compatibility

### AC#2: Record Status Changes (Fire-and-forget)
- [x] When `claimLead()` is called, add history entry (async, non-blocking)
- [x] When `updateLeadStatus()` is called, add history entry (async, non-blocking)
- [x] Include who made the change (salesUserId, salesUserName)
- [x] Include timestamp of change
- [x] Log errors if history write fails (don't throw)

### AC#3: Fetch History from Sheet
- [x] Create `getStatusHistory(leadUUID)` function in sheets.service
- [x] Return array of `StatusHistoryEntry` sorted by timestamp
- [x] Handle empty history gracefully

### AC#4: Update Lead Detail API
- [x] Replace mock history with real data from Status_History sheet
- [x] Fallback to reconstructed history for legacy leads (using timestamps)
- [x] Return empty array `[]` if no history found
- [x] Maintain backwards compatibility

### AC#5: Initial History for New Leads
- [x] When `addLead()` is called, add initial "new" status entry
- [x] Changed_By = "System" for webhook-created leads

### AC#6: Testing
- [x] Unit tests for history recording
- [x] Unit tests for history retrieval
- [x] Integration test for full flow

## Technical Implementation

### Files to Modify:

1. **Google Sheets**
   - Create new tab: `Status_History`
   - Columns: A=Lead_UUID, B=Status, C=Changed_By_ID, D=Changed_By_Name, E=Timestamp, F=Notes

2. **`src/services/sheets.service.ts`**
   - Add `addStatusHistory()` function
   - Add `getStatusHistory(leadUUID)` function
   - Update `claimLead()` to call addStatusHistory with UUID
   - Update `updateLeadStatus()` to call addStatusHistory with UUID
   - Update `addLead()` to add initial history with UUID

3. **`src/controllers/admin.controller.ts`**
   - Replace mock history generation (lines 698-745)
   - Call `getStatusHistory()` for real data
   - Fallback logic for legacy leads

4. **`src/types/index.ts`**
   - Add `StatusHistoryEntry` type if needed

### Status_History Sheet Schema:
| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | Lead_UUID | string | Unique identifier (e.g., `lead_abc123`) for Supabase migration |
| B | Status | string | new, contacted, closed, lost, unreachable |
| C | Changed_By_ID | string | LINE User ID or "System" |
| D | Changed_By_Name | string | Display name |
| E | Timestamp | string | ISO 8601 |
| F | Notes | string | Optional notes |

### Example History Entries:
```
Lead_UUID    | Status      | Changed_By_ID | Changed_By_Name | Timestamp
-------------|-------------|---------------|-----------------|---------------------
lead_abc123  | new         | System        | System          | 2026-01-15T08:30:00Z
lead_abc123  | contacted   | U1234567890   | สมหญิง          | 2026-01-15T09:15:00Z
lead_abc123  | closed      | U1234567890   | สมหญิง          | 2026-01-16T11:30:00Z
```

## Tasks

### Task 1: Google Sheets Setup
- [x] 1.1 Create Status_History tab in Google Sheets
- [x] 1.2 Add header row with column names
- [x] 1.3 Document sheet structure in CLAUDE.md

### Task 2: Sheets Service - Write Functions
- [x] 2.1 Create `addStatusHistory()` function (async)
- [x] 2.2 Update `claimLead()` to record history (fire-and-forget with .catch logging)
- [x] 2.3 Update `updateLeadStatus()` to record history (fire-and-forget with .catch logging)
- [x] 2.4 Update `addLead()` to record initial "new" status (fire-and-forget)

### Task 3: Sheets Service - Read Functions
- [x] 3.1 Create `getStatusHistory(leadUUID)` function
- [x] 3.2 Sort by timestamp ascending
- [x] 3.3 Handle empty results

### Task 4: Admin Controller Updates
- [x] 4.1 Replace mock history generation
- [x] 4.2 Call getStatusHistory() in getLeadById
- [x] 4.3 Add fallback for legacy leads without history

### Task 5: Testing
- [x] 5.1 Unit tests for addStatusHistory
- [x] 5.2 Unit tests for getStatusHistory
- [x] 5.3 Update claimLead tests (verify fire-and-forget behavior)
- [x] 5.4 Update updateLeadStatus tests
- [x] 5.5 Integration test: new lead → claim → close (happy path)
- [x] 5.6 Integration test: legacy lead without history (fallback path)
- [x] 5.7 Test error logging when history write fails

### Task 6: Documentation
- [x] 6.1 Update CLAUDE.md with Status_History sheet info
- [x] 6.2 Update API documentation

## Definition of Done
- [x] Status_History sheet created
- [x] All status changes recorded in sheet
- [x] Lead detail API returns real history
- [x] All unit tests pass (518 tests)
- [x] Code review passed
- [x] Legacy leads handled gracefully

## Out of Scope
- History editing/deletion
- Bulk history migration for existing leads
- UI for viewing full history (future story)

## Notes
- This story depends on 0-11 (Contacted_At) being completed first
- Existing leads will show reconstructed history until they get a new status change
- Fire-and-forget pattern chosen to meet LINE webhook 1-second timeout
- History write failures logged but don't block main operation

## Review Notes (2026-01-18)
- Reviewed by: Winston (Architect), John (PM), Bob (SM), Murat (TEA), Amelia (Dev)
- Decision: Fire-and-forget pattern for history recording
- Decision: Return empty array for leads without history
- Decision: Log errors, don't throw on history write failure
- Future: Consider Dead Letter Queue for failed history entries
- **Party Mode Review (2026-01-18):**
  - Architecture risk: MEDIUM - new data storage, but fire-and-forget mitigates blocking risk
  - Test coverage: Adequate - includes error logging and fallback tests
  - Dependency: Must complete 0-11 first (contactedAt column required)

## Dev Agent Record

### Implementation Date: 2026-01-18

### Files Modified:
- `src/types/index.ts` - Added `StatusHistoryEntry` interface
- `src/config/index.ts` - Added `STATUS_HISTORY_SHEET_NAME` config
- `src/services/sheets.service.ts` - Added `addStatusHistory()`, `getStatusHistory()`, fire-and-forget calls in `addLead()`, `claimLead()`, `updateLeadStatus()`
- `src/controllers/admin.controller.ts` - Replaced mock history with real data + fallback
- `src/__tests__/services/sheets.service.test.ts` - Added 7 new tests for status history
- `src/__tests__/controllers/admin.controller.test.ts` - Added `mockGetStatusHistory` mock
- `CLAUDE.md` - Updated Google Sheets Structure (4 sheets instead of 3)

### Tests Added:
- `addStatusHistory: should add status history entry successfully`
- `addStatusHistory: should log error but not throw when write fails (fire-and-forget)`
- `addStatusHistory: should handle empty notes gracefully`
- `getStatusHistory: should return history entries for a lead sorted by timestamp`
- `getStatusHistory: should return empty array when no history found`
- `getStatusHistory: should return empty array when sheet is empty`
- `getStatusHistory: should handle missing notes field`
- `Status History Integration: should record initial "new" status when addLead is called`
- `Status History Integration: should record status history when claimLead is called`
- `Status History Integration: should record status history when updateLeadStatus is called`
- `Status History Integration: should NOT record status history for legacy leads without UUID`

### Test Results:
- **518 tests passed** (added 11 new tests)
- All existing tests continue to pass
- Typecheck passes with no errors

### Implementation Notes:
1. New `Status_History` sheet with columns: Lead_UUID, Status, Changed_By_ID, Changed_By_Name, Timestamp, Notes
2. Fire-and-forget pattern: history writes don't block main operations, errors logged but not thrown
3. Fallback for legacy leads: if no history found, reconstruct from timestamps (contactedAt, closedAt, etc.)
4. History sorted by timestamp ascending (oldest first) then reversed for display (newest first)
5. **UUID Migration (2026-01-18):** Changed from row number to Lead_UUID for Supabase compatibility

## Change Log
- 2026-01-18: Story implemented by Dev Agent (Amelia)
- 2026-01-18: Changed from Lead_Row to Lead_UUID for Supabase migration compatibility (user decision)
- 2026-01-18: Code review passed - Fixed issues:
  - H1: Fixed test mock parameter type (rowNumber → leadUUID)
  - H2: Added 4 missing integration tests for fire-and-forget verification
  - M1: Reverted unrelated changes to 4-8-lead-detail-modal.md
  - M2: Added call verification tests for claimLead/updateLeadStatus → addStatusHistory
- 2026-01-18: Bug fix - History not recorded for legacy leads
  - **Root cause:** `claimLead` and `updateLeadStatus` checked `currentLead.leadUUID` (before update)
  - **Fix:** Changed to use `updatedLead.leadUUID` (after `updateLeadWithLock` generates UUID)
  - Legacy leads now get UUID generated and history recorded correctly
