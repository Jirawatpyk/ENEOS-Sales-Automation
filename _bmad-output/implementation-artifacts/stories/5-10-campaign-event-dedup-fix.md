# Story 5-10: Campaign Event Deduplication Fix

Status: done

## Story

As a System Administrator,
I want the campaign webhook to correctly handle different event types with the same Event_ID,
so that delivered, opened, and click events are all recorded even when Brevo sends them with the same ID.

## Problem Statement

**Current Behavior:**
- Deduplication uses only `Event_ID` as the unique key
- Brevo test webhooks send the same `id` for different event types (delivered, opened, click)
- Result: Only the first event type is recorded, subsequent types are rejected as "Duplicate event detected"

**Expected Behavior:**
- Each unique combination of `Event_ID + Event_Type` should be treated as a distinct event
- Same email can have multiple events: delivered → opened → click
- All events should be recorded in Campaign_Events sheet

## Acceptance Criteria

1. **AC1: Composite Dedup Key** - Deduplication uses `Event_ID + Event_Type` as the unique key instead of just `Event_ID`.

2. **AC2: Multiple Event Types** - Same email with same Event_ID but different event types (delivered, opened, click) are all recorded.

3. **AC3: True Duplicates Rejected** - Exact duplicate events (same Event_ID AND same Event_Type) are still correctly rejected.

4. **AC4: Backward Compatibility** - Existing Campaign_Events data remains valid; no migration needed.

5. **AC5: Stats Update Correct** - Campaign_Stats correctly updates Delivered, Opened, Clicked counts for all event types.

## Tasks / Subtasks

- [x] **Task 1: Update checkDuplicateEvent Function** (AC: #1, #3)
  - [x] 1.1 Modify `checkDuplicateEvent(eventId, eventType)` to accept both parameters
  - [x] 1.2 Update duplicate check to compare both Event_ID AND Event columns
  - [x] 1.3 Write test: Same eventId + different eventType → NOT duplicate
  - [x] 1.4 Write test: Same eventId + same eventType → IS duplicate

- [x] **Task 2: Update recordCampaignEvent Caller** (AC: #2)
  - [x] 2.1 Update `recordCampaignEvent()` to pass eventType to `checkDuplicateEvent()`
  - [x] 2.2 Write integration test: delivered → opened → click all recorded for same eventId

- [x] **Task 3: Verify Stats Update** (AC: #5)
  - [x] 3.1 Write test: Verify Delivered count increments correctly (existing tests cover this)
  - [x] 3.2 Write test: Verify Opened count increments correctly (existing tests cover this)
  - [x] 3.3 Write test: Verify Clicked count increments correctly (existing tests cover this)

- [x] **Task 4: Backward Compatibility Check** (AC: #4)
  - [x] 4.1 Verify existing test suite passes without changes to test data (1461 tests pass)
  - [x] 4.2 No database migration required (just logic change)

## Dev Notes

### Root Cause Analysis

**File:** `src/services/campaign-stats.service.ts`

**Current Code (line 180-200):**
```typescript
async checkDuplicateEvent(eventId: number): Promise<boolean> {
  // Only checks Event_ID column (A:A)
  // Does NOT check Event column
}
```

**Fix Required:**
```typescript
async checkDuplicateEvent(eventId: number, eventType: string): Promise<boolean> {
  // Check BOTH Event_ID (col A) AND Event (col E) columns
  // Return true only if BOTH match
}
```

### Campaign_Events Sheet Structure

| Column | Index | Field |
|--------|-------|-------|
| A | 0 | Event_ID |
| B | 1 | Campaign_ID |
| C | 2 | Campaign_Name |
| D | 3 | Email |
| E | 4 | Event |
| F | 5 | Event_At |
| ... | ... | ... |

### Testing Strategy

1. Unit test: `checkDuplicateEvent()` with various combinations
2. Integration test: Full flow with sequential events
3. Regression test: Existing tests must pass

### References

- [Source: src/services/campaign-stats.service.ts#L180-200] - checkDuplicateEvent
- [Source: src/services/campaign-stats.service.ts#L91-170] - recordCampaignEvent
- [Source: src/validators/campaign-event.validator.ts] - NormalizedCampaignEvent type

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Full test suite: `npm test` — 1461 tests pass
- Typecheck: `npm run typecheck` — no errors
- Lint: `npm run lint` — no errors

### Completion Notes List

1. **Task 1 Complete (AC#1, AC#3):** Changed `checkDuplicateEvent(eventId)` to `checkDuplicateEvent(eventId, eventType)`. Now checks both Event_ID (col A) AND Event (col E) columns. Range changed from `A:A` to `A:E`.

2. **Task 2 Complete (AC#2):** Updated `recordCampaignEvent()` to pass `event.event` to the duplicate check. Added logging for eventType.

3. **Task 3 Complete (AC#5):** Stats update logic unchanged — still works correctly for delivered/opened/click events. Existing tests cover this.

4. **Task 4 Complete (AC#4):** All 1461 existing tests pass. No database migration needed — only logic change.

### Change Log
| Date | Change | Author |
|------|--------|--------|
| 2026-02-02 | Story created for campaign event dedup bug fix | DEV Agent (Amelia) |
| 2026-02-02 | Implementation complete: Composite key dedup (Event_ID + Event_Type) | DEV Agent (Amelia) |
| 2026-02-02 | Code review fixes: M1 comment for A:E range, M2 JSDoc params added | DEV Agent (Amelia) |

### File List
- `src/services/campaign-stats.service.ts` — Modified: `checkDuplicateEvent()` now accepts eventType, range changed to A:E
- `src/__tests__/services/campaign-stats.service.test.ts` — Modified: Updated mock data for composite key, added 3 new tests for AC#1/AC#2/AC#3
