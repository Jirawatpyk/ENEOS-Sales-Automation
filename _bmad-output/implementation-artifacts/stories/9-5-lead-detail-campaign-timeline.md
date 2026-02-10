# Story 9.5: Lead Detail + Campaign Engagement Timeline

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **sales manager**,
I want **lead detail page showing campaign engagement history (delivered, opened, clicked)**,
So that **I can see the full customer journey from email to lead to close**.

## Acceptance Criteria

1. **AC1:** `GET /api/admin/leads/:id` includes `campaignEvents[]` sorted by `event_at` descending (newest first).
2. **AC2:** When lead has matching campaign events (by email), each event includes `campaignName`, `event`, `eventAt`, and optional `url`.
3. **AC3:** When lead has no campaign events, response returns `campaignEvents: []` (empty array, no error).
4. **AC4:** Response includes `timeline[]` that merges campaign events + status history chronologically (newest first). Each timeline entry has `type` ("campaign_event" | "status_change"), `timestamp`, and event-specific fields.
5. **AC5:** Response type matches updated `LeadDetailResponse` with `campaignEvents` and `timeline` fields. TypeScript compiles without errors.

## Tasks / Subtasks

- [x] Task 1: Add `getCampaignEventsByEmail()` to campaign-stats.service.ts (AC: #1, #2, #3)
  - [x] 1.1: Create function signature: `getCampaignEventsByEmail(email: string): Promise<LeadCampaignEvent[]>`
  - [x] 1.2: Query `campaign_events` table filtered by `.eq('email', email.toLowerCase())` ordered by `event_at` desc
  - [x] 1.3: Map DB rows to `LeadCampaignEvent` type (campaignId, campaignName, event, eventAt, url)
  - [x] 1.4: Return empty array on no results (no throw)
  - [x] 1.5: Export from compatibility wrapper `campaignStatsService`

- [x] Task 2: Add types to `src/types/admin.types.ts` (AC: #4, #5)
  - [x] 2.1: Add `LeadCampaignEvent` interface: `{ campaignId: string; campaignName: string; event: string; eventAt: string; url: string | null }`
  - [x] 2.2: Add `TimelineEntry` interface: `{ type: 'campaign_event' | 'status_change'; timestamp: string; event?: string; campaignName?: string; url?: string | null; status?: LeadStatus; changedBy?: string }`
  - [x] 2.3: Update `LeadDetailResponse` to add optional fields: `campaignEvents?: LeadCampaignEvent[]` and `timeline?: TimelineEntry[]` (optional to avoid breaking 15 existing getLeadById tests)

- [x] Task 3: Update `getLeadById()` controller in `src/controllers/admin/leads.controller.ts` (AC: #1, #3, #4)
  - [x] 3.1: Import `campaignStatsService` from `../../services/campaign-stats.service.js` + add `LeadCampaignEvent, TimelineEntry` to existing type import from `admin.types.js`
  - [x] 3.2: After fetching lead, call `campaignStatsService.getCampaignEventsByEmail(lead.email)` in parallel with status history fetch
  - [x] 3.3: Build `campaignEvents` array in response from query results
  - [x] 3.4: Build `timeline[]` by merging campaign events + status history entries, sorted by timestamp desc
  - [x] 3.5: Add both `campaignEvents` and `timeline` to `LeadDetailResponse` object

- [x] Task 4: Write tests for `getCampaignEventsByEmail()` in `campaign-stats.service.test.ts` (AC: #1, #2, #3)
  - [x] 4.1: Test returns events sorted by event_at desc when events exist
  - [x] 4.2: Test returns empty array when no events for email
  - [x] 4.3: Test returns events with all fields mapped correctly (campaignName, event, eventAt, url)
  - [x] 4.4: Test handles Supabase error gracefully (log + return empty array, don't crash)
  - [x] 4.5: Test that email is lowercased before query (e.g., pass "John@EXAMPLE.com", verify `.eq('email', 'john@example.com')` is called)
  - [x] 4.6: Use existing `vi.hoisted()` chainable mock + `resetMockChain()` pattern from that file (do NOT create new mock — reuse `mockSupabase`)

- [x] Task 5: Update existing `getLeadById()` controller tests in `admin.controller.test.ts` (AC: #1, #3, #4, #5)
  - [x] 5.1: Add `campaignStatsService` mock alongside existing mocks
  - [x] 5.2: Test: lead with campaign events returns `campaignEvents[]` in response
  - [x] 5.3: Test: lead with no campaign events returns `campaignEvents: []`
  - [x] 5.4: Test: `timeline` merges status history + campaign events sorted chronologically
  - [x] 5.5: Test: campaign event fetch failure doesn't break lead detail response — use `mockGetCampaignEventsByEmail.mockRejectedValue(new Error('DB error'))`, verify response still returns 200 with `campaignEvents: []` and `timeline` contains only status history entries

- [x] Task 6: Update API contract doc `docs/api/api-contract.md` (AC: #5)
  - [x] 6.1: Add `campaignEvents: LeadCampaignEvent[]` and `timeline: TimelineEntry[]` to GET /api/admin/leads/:id response
  - [x] 6.2: Add `LeadCampaignEvent` and `TimelineEntry` type definitions

- [x] Task 7: Run full test suite + typecheck (AC: #5)
  - [x] 7.1: `npm run typecheck` — zero errors
  - [x] 7.2: `npm test` — all tests pass
  - [x] 7.3: Verify `LeadDetailResponse` includes new fields

## Dev Notes

### Architecture: How campaign_events relates to leads

There is **NO foreign key** between `campaign_events` and `leads`. The relationship is by `email`:
- `leads.email` = the contact email
- `campaign_events.email` = the event recipient email (**always lowercased** — see `recordCampaignEvent` line 55)
- Match via `.eq('email', lead.email.toLowerCase())` — MUST lowercase because leads stores original case

This is the same "two-query JOIN" pattern used in `getCampaignEvents()` (line 333-425 of campaign-stats.service.ts), but simpler since we only need events for one email.

### Current getLeadById() Controller Flow (src/controllers/admin/leads.controller.ts:158-349)

```
1. Validate req.params.id (leadIdSchema)
2. leadsService.getLeadById(leadId) → SupabaseLead
3. supabaseLeadToLeadRow(supabaseLead) → LeadRow
4. statusHistoryService.getStatusHistory(supabaseLead.id) → StatusHistoryEntry[]
5. Build history[] (or fallback from timestamps)
6. Calculate metrics (responseTime, closingTime, age)
7. Fetch salesTeamService.getSalesTeamMember() for owner detail
8. Build LeadDetailResponse
9. Return 200 JSON
```

**After this story, step 4 becomes parallel:**
```
4a. statusHistoryService.getStatusHistory(supabaseLead.id)  // existing
4b. campaignStatsService.getCampaignEventsByEmail(lead.email) // NEW — parallel
```

Use `Promise.all()` for 4a + 4b to avoid sequential latency.

### New Function: getCampaignEventsByEmail()

Add to `src/services/campaign-stats.service.ts`:

```typescript
import type { LeadCampaignEvent } from '../types/admin.types.js';

export async function getCampaignEventsByEmail(email: string): Promise<LeadCampaignEvent[]> {
  const { data, error } = await supabase
    .from('campaign_events')
    .select('campaign_id, campaign_name, event, event_at, url')
    .eq('email', email.toLowerCase())  // CRITICAL: campaign_events stores lowercase emails
    .order('event_at', { ascending: false });

  if (error) {
    logger.warn('Failed to get campaign events by email', { error, email });
    return []; // Graceful degradation — don't crash lead detail
  }

  return (data || []).map(row => ({
    campaignId: String(row.campaign_id),
    campaignName: row.campaign_name || '',
    event: row.event,
    eventAt: row.event_at || '',  // event_at can be null in DB (INSERT uses eventAt || null)
    url: row.url || null,
  }));
}
```

**Key decisions:**
- **CRITICAL:** `.eq('email', email.toLowerCase())` — `campaign_events` stores emails lowercased (line 55 of `recordCampaignEvent`), but `leads` stores original case. Without `.toLowerCase()`, the query will MISS events when lead email has uppercase chars.
- Import `LeadCampaignEvent` type from `../types/admin.types.js`
- Return `[]` on error, NOT throw — this is supplementary data, not critical
- Select only needed columns (not `select('*')`) for efficiency
- Use `String(row.campaign_id)` because campaign_id is stored as text in DB but typed as string in API
- Sort desc (newest first) — matches AC1

### Timeline Merge Logic

The timeline merges two data sources:

```typescript
const timeline: TimelineEntry[] = [];

// Add status history entries
for (const h of history) {
  timeline.push({
    type: 'status_change',
    timestamp: h.timestamp,
    status: h.status,
    changedBy: h.by,
  });
}

// Add campaign events
for (const e of campaignEvents) {
  timeline.push({
    type: 'campaign_event',
    timestamp: e.eventAt,
    event: e.event,
    campaignName: e.campaignName,
    url: e.url,
  });
}

// Sort newest first
timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
```

### Existing Test Setup (src/__tests__/controllers/admin.controller.test.ts)

Current mocks at top of file:
```typescript
vi.mock('../../services/leads.service.js', () => ({ ... }));
vi.mock('../../services/sales-team.service.js', () => ({ salesTeamService: { getSalesTeamMember: ... } }));
vi.mock('../../services/status-history.service.js', () => ({ statusHistoryService: { getStatusHistory: ... } }));
```

**Add this mock:**
```typescript
const mockGetCampaignEventsByEmail = vi.fn();

vi.mock('../../services/campaign-stats.service.js', () => ({
  campaignStatsService: {
    getCampaignEventsByEmail: (email: string) => mockGetCampaignEventsByEmail(email),
  },
}));
```

**In `beforeEach`:** Add `mockGetCampaignEventsByEmail.mockResolvedValue([])` as default (most existing tests don't care about campaign events).

### Type Definitions to Add (src/types/admin.types.ts)

```typescript
/** Campaign event for lead detail timeline */
export interface LeadCampaignEvent {
  campaignId: string;
  campaignName: string;
  event: string;           // delivered | opened | click
  eventAt: string;         // ISO 8601
  url: string | null;      // URL for click events
}

/** Unified timeline entry (campaign event or status change) */
export interface TimelineEntry {
  type: 'campaign_event' | 'status_change';
  timestamp: string;       // ISO 8601
  // Campaign event fields
  event?: string;
  campaignName?: string;
  url?: string | null;
  // Status change fields
  status?: LeadStatus;
  changedBy?: string;
}
```

**Update LeadDetailResponse** (add as OPTIONAL fields to avoid breaking 15 existing tests):
```typescript
export interface LeadDetailResponse {
  // ... existing fields unchanged ...
  campaignEvents?: LeadCampaignEvent[];  // NEW — optional
  timeline?: TimelineEntry[];             // NEW — optional
}
```

### Graceful Degradation — Controller-Level Try-Catch

The service function `getCampaignEventsByEmail()` catches errors internally and returns `[]`. But for extra safety, the controller should ALSO handle unexpected rejections (e.g., mock rejects in tests):

```typescript
// In Promise.all, wrap campaign events with catch:
const [historyEntries, campaignEvents] = await Promise.all([
  statusHistoryService.getStatusHistory(supabaseLead.id),
  campaignStatsService.getCampaignEventsByEmail(lead.email).catch((err) => {
    logger.warn('Failed to fetch campaign events for lead', { err, leadId });
    return [] as LeadCampaignEvent[];
  }),
]);
```

This double-safety pattern ensures lead detail NEVER fails because of campaign data. Task 5.5 tests this by mocking rejection.

### Anti-Patterns to Avoid

1. **DO NOT add FK between campaign_events and leads** — there is no FK by design. Match by email only.
2. **DO NOT throw errors from getCampaignEventsByEmail()** — return empty array on failure. Lead detail must never break because of campaign data.
3. **DO NOT fetch all campaign events then filter in JS** — use `.eq('email', email)` in Supabase query.
4. **DO NOT change existing history[] field** — it stays as-is. The new `timeline[]` is an ADDITIONAL field.
5. **DO NOT break the existing `campaignEvents` endpoint** at `/api/admin/campaigns/:id/events` — this story adds a NEW query, doesn't modify existing.
6. **DO NOT use `getCampaignEvents()` (existing function)** — that's for campaign-level view (by campaignId). Create a NEW function `getCampaignEventsByEmail()` for lead-level view.
7. **DO NOT make campaign events fetch sequential** — use `Promise.all()` with status history fetch.
8. **DO NOT forget `.toLowerCase()` on email** — `campaign_events` stores lowercased emails (`recordCampaignEvent` line 55), but `leads` stores original case. Query MUST lowercase to match.

### Scope Boundaries (DO NOT cross)

- **DO NOT** change campaign_events table schema
- **DO NOT** change existing getCampaignEvents() function
- **DO NOT** change existing frontend Dashboard code (Story 9-6 scope)
- **DO NOT** modify any other endpoint beyond `GET /api/admin/leads/:id`
- **DO NOT** change status_history or leads service logic

### Previous Story Intelligence (Story 9-4)

- Story 9-4 completed the Google Sheets cleanup. All services now use Supabase.
- Test count after 9-4: 55 files, 1412 tests
- `campaignStatsService` compatibility wrapper exists — use it for controller import
- Supabase chainable mock pattern is well-established across the test suite
- `checkSupabaseHealth()` confirmed working — no DB connectivity concerns

### Compatibility Wrapper Pattern

The campaign-stats.service.ts exports a compatibility wrapper at the bottom:

```typescript
export const campaignStatsService = {
  recordCampaignEvent,
  getAllCampaignStats,
  getCampaignStatsById,
  getCampaignEvents,
  healthCheck,
  // Add new function here:
  getCampaignEventsByEmail,
};
```

The controller should import via: `import { campaignStatsService } from '../../services/campaign-stats.service.js'`

### Project Structure Notes

Files to modify:
```
src/services/campaign-stats.service.ts    # Add getCampaignEventsByEmail() + wrapper
src/types/admin.types.ts                  # Add LeadCampaignEvent, TimelineEntry, update LeadDetailResponse
src/controllers/admin/leads.controller.ts # Fetch campaign events + build timeline
src/__tests__/controllers/admin.controller.test.ts  # Add mock + 5 new tests (15 existing tests use beforeEach default)
src/__tests__/services/campaign-stats.service.test.ts  # Add getCampaignEventsByEmail() tests
docs/api/api-contract.md                 # Add campaignEvents + timeline to lead detail response
```

No new files needed. No files deleted.

### References

- [Source: epic-09-supabase-migration.md#Story 9-5] — AC definitions
- [Source: src/controllers/admin/leads.controller.ts:158-349] — Current getLeadById implementation
- [Source: src/services/campaign-stats.service.ts:333-425] — Existing getCampaignEvents (by campaignId)
- [Source: src/types/admin.types.ts:240-277] — Current LeadDetailResponse type
- [Source: src/types/admin.types.ts:919-929] — CampaignEventItem type (reference)
- [Source: src/__tests__/controllers/admin.controller.test.ts:20-38] — Existing mock setup
- [Source: project-context.md] — ES Modules, Vitest patterns, config access rules

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Typecheck: 0 errors
- Test suite: 55 files, 1423 tests pass (11 new tests added)

### Completion Notes List

- Added `getCampaignEventsByEmail()` to campaign-stats.service.ts with graceful degradation
- Added `LeadCampaignEvent` and `TimelineEntry` types to admin.types.ts
- Updated `getLeadById()` controller: fetches campaign events in parallel via `Promise.all()`, builds unified timeline
- Added 6 tests for `getCampaignEventsByEmail()` in campaign-stats.service.test.ts
- Added 4 tests for campaign events + timeline in admin.controller.test.ts
- Updated compatibility wrapper test to include new export
- Updated API contract doc with new response fields and type definitions
- All ACs verified: AC1 (sorted desc), AC2 (fields mapped), AC3 (empty array), AC4 (merged timeline), AC5 (types compile)

### Review Fixes (Rex Code Review)

- **H1:** Made `campaignEvents` and `timeline` required in `LeadDetailResponse` (removed `?`) — aligns type with API contract and actual controller behavior
- **M2:** Added `if (!email) return []` guard in `getCampaignEventsByEmail()` + test
- **M3:** Used `|| 0` NaN fallback in timeline sort comparator for invalid timestamps
- **L1:** Consolidated duplicate import from `admin.types.js` into single import with inline `type` keyword

### File List

| File | Action |
|------|--------|
| `src/services/campaign-stats.service.ts` | Modified — added `getCampaignEventsByEmail()` + updated wrapper |
| `src/types/admin.types.ts` | Modified — added `LeadCampaignEvent`, `TimelineEntry`, updated `LeadDetailResponse` |
| `src/controllers/admin/leads.controller.ts` | Modified — parallel fetch + timeline build + response fields |
| `src/__tests__/services/campaign-stats.service.test.ts` | Modified — 6 new tests + updated wrapper test |
| `src/__tests__/controllers/admin.controller.test.ts` | Modified — added mock + 4 new tests |
| `docs/api/api-contract.md` | Modified — added `campaignEvents` + `timeline` to lead detail response |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Modified — status updated |
