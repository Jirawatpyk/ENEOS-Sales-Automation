# Story 0-12: Status History Tracking

## Story Information
| Field | Value |
|-------|-------|
| Story ID | 0-12 |
| Epic | Epic-0: Backend API (Maintenance) |
| Priority | Medium (Enhancement) |
| Status | ready-for-dev |
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

### Current Mock Implementation:
```typescript
// สร้าง status history (mock - ในอนาคตควรเก็บจริงใน Sheets)
const history: StatusHistoryItem[] = [];

// Add creation event
history.push({
  status: 'new',
  by: 'System',
  timestamp: lead.date,
});

// Add claim event if owner exists
if (lead.salesOwnerId) {
  history.push({
    status: 'contacted',
    by: lead.salesOwnerName || 'Unknown',
    timestamp: lead.clickedAt || lead.date, // ❌ Wrong - should be contactedAt
  });
}
// ... reconstructed from timestamps
```

### Why This Matters:
- Cannot audit who made changes and when
- Cannot track status change sequences (e.g., contacted → lost → contacted → closed)
- Cannot identify patterns in sales process

## Acceptance Criteria

### AC#1: Create Status_History Sheet
- [ ] Create new Google Sheet tab: `Status_History`
- [ ] Columns: `Lead_Row`, `Status`, `Changed_By_ID`, `Changed_By_Name`, `Timestamp`, `Notes`
- [ ] Index by Lead_Row for efficient lookups

### AC#2: Record Status Changes (Fire-and-forget)
- [ ] When `claimLead()` is called, add history entry (async, non-blocking)
- [ ] When `updateLeadStatus()` is called, add history entry (async, non-blocking)
- [ ] Include who made the change (salesUserId, salesUserName)
- [ ] Include timestamp of change
- [ ] Log errors if history write fails (don't throw)

### AC#3: Fetch History from Sheet
- [ ] Create `getStatusHistory(rowNumber)` function in sheets.service
- [ ] Return array of `StatusHistoryItem` sorted by timestamp
- [ ] Handle empty history gracefully

### AC#4: Update Lead Detail API
- [ ] Replace mock history with real data from Status_History sheet
- [ ] Fallback to reconstructed history for legacy leads (using timestamps)
- [ ] Return empty array `[]` if no history found
- [ ] Maintain backwards compatibility

### AC#5: Initial History for New Leads
- [ ] When `addLead()` is called, add initial "new" status entry
- [ ] Changed_By = "System" for webhook-created leads

### AC#6: Testing
- [ ] Unit tests for history recording
- [ ] Unit tests for history retrieval
- [ ] Integration test for full flow

## Technical Implementation

### Files to Modify:

1. **Google Sheets**
   - Create new tab: `Status_History`
   - Columns: A=Lead_Row, B=Status, C=Changed_By_ID, D=Changed_By_Name, E=Timestamp, F=Notes

2. **`src/services/sheets.service.ts`**
   - Add `addStatusHistory()` function
   - Add `getStatusHistory(rowNumber)` function
   - Update `claimLead()` to call addStatusHistory
   - Update `updateLeadStatus()` to call addStatusHistory
   - Update `addLead()` to add initial history

3. **`src/controllers/admin.controller.ts`**
   - Replace mock history generation (lines 698-745)
   - Call `getStatusHistory()` for real data
   - Fallback logic for legacy leads

4. **`src/types/index.ts`**
   - Add `StatusHistoryEntry` type if needed

### Status_History Sheet Schema:
| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | Lead_Row | number | Reference to Leads sheet row |
| B | Status | string | new, contacted, closed, lost, unreachable |
| C | Changed_By_ID | string | LINE User ID or "System" |
| D | Changed_By_Name | string | Display name |
| E | Timestamp | string | ISO 8601 |
| F | Notes | string | Optional notes |

### Example History Entries:
```
Lead_Row | Status      | Changed_By_ID | Changed_By_Name | Timestamp
---------|-------------|---------------|-----------------|---------------------
42       | new         | System        | System          | 2026-01-15T08:30:00Z
42       | contacted   | U1234567890   | สมหญิง          | 2026-01-15T09:15:00Z
42       | closed      | U1234567890   | สมหญิง          | 2026-01-16T11:30:00Z
```

## Tasks

### Task 1: Google Sheets Setup
- [ ] 1.1 Create Status_History tab in Google Sheets
- [ ] 1.2 Add header row with column names
- [ ] 1.3 Document sheet structure in CLAUDE.md

### Task 2: Sheets Service - Write Functions
- [ ] 2.1 Create `addStatusHistory()` function (async)
- [ ] 2.2 Update `claimLead()` to record history (fire-and-forget with .catch logging)
- [ ] 2.3 Update `updateLeadStatus()` to record history (fire-and-forget with .catch logging)
- [ ] 2.4 Update `addLead()` to record initial "new" status (fire-and-forget)

### Task 3: Sheets Service - Read Functions
- [ ] 3.1 Create `getStatusHistory(rowNumber)` function
- [ ] 3.2 Sort by timestamp ascending
- [ ] 3.3 Handle empty results

### Task 4: Admin Controller Updates
- [ ] 4.1 Replace mock history generation
- [ ] 4.2 Call getStatusHistory() in getLeadById
- [ ] 4.3 Add fallback for legacy leads without history

### Task 5: Testing
- [ ] 5.1 Unit tests for addStatusHistory
- [ ] 5.2 Unit tests for getStatusHistory
- [ ] 5.3 Update claimLead tests (verify fire-and-forget behavior)
- [ ] 5.4 Update updateLeadStatus tests
- [ ] 5.5 Integration test: new lead → claim → close (happy path)
- [ ] 5.6 Integration test: legacy lead without history (fallback path)
- [ ] 5.7 Test error logging when history write fails

### Task 6: Documentation
- [ ] 6.1 Update CLAUDE.md with Status_History sheet info
- [ ] 6.2 Update API documentation

## Definition of Done
- [ ] Status_History sheet created
- [ ] All status changes recorded in sheet
- [ ] Lead detail API returns real history
- [ ] All unit tests pass (300+)
- [ ] Code review passed
- [ ] Legacy leads handled gracefully

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
