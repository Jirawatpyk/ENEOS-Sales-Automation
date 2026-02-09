# Story 9.1b: Migrate Controllers + LINE Postback (Integration Layer)

Status: done

## Story

As a **developer**,
I want **controllers wired to new Supabase-backed services with UUID-based LINE postback**,
So that **webhooks and LINE interactions work end-to-end on Supabase**.

## Acceptance Criteria

1. **AC1:** `lookupCampaignId()` runs parallel with Gemini via `Promise.all()` in background processor
2. **AC2:** LINE postback uses `lead_id` (UUID) — template sends UUID exclusively
3. **AC3:** Legacy `row_id` postback returns friendly Thai error message (not crash)
4. **AC4:** LINE Flex Message template sends UUID in postback data (remove `row_id`)
5. **AC5:** Brevo webhook → Lead creation → LINE notification end-to-end works

## Tasks / Subtasks

- [x] Task 1: Parallelize Gemini + lookupCampaignId in background processor (AC: #1, #5)
  - [x] 1.1: Wrap Gemini call and `leadsService.lookupCampaignId(email)` in `Promise.all()`
  - [x] 1.2: Map `payload.campaignId` → BOTH `workflowId` AND `campaignId` (deprecated, backward compat), lookup result → `brevoCampaignId` field
  - [x] 1.3: Handle `lookupCampaignId` failure gracefully (catch → null, don't block lead creation)
  - [x] 1.4: Log parallel execution timing for observability

- [x] Task 2: Update LINE Flex Message template — UUID only (AC: #2, #4)
  - [x] 2.1: Remove `row_id` from `createPostbackData()` — send `lead_id` (UUID) only
  - [x] 2.2: If `leadUUID` is missing, postback has `action` only — validator rejects gracefully (no logger import needed)
  - [x] 2.3: Verify all 4 button actions (contacted, unreachable, closed, lost) use UUID postback

- [x] Task 3: Verify LINE controller handles UUID-only and legacy gracefully (AC: #2, #3)
  - [x] 3.1: Verify UUID path works with `lead_id` only (no `row_id` in postback)
  - [x] 3.2: Verify legacy `row_id`-only postback returns Thai error "กรุณากดปุ่มจากข้อความใหม่"
  - [x] 3.3: Verify edge case: postback with both `lead_id` + `row_id` still uses UUID path

- [x] Task 4: Update background-processor tests (AC: #1, #5)
  - [x] 4.1: Add `lookupCampaignId` to leads.service mock
  - [x] 4.2: Test parallel execution: Gemini + lookupCampaignId called concurrently
  - [x] 4.3: Test `lookupCampaignId` failure doesn't block lead creation (brevoCampaignId = null)
  - [x] 4.4: Test lead object has `workflowId` + `campaignId` (from payload) + `brevoCampaignId` (from lookup)
  - [x] 4.5: Test AI disabled + lookup succeeds — only lookup runs, no Gemini
  - [x] 4.6: Add `workflowId` and `brevoCampaignId` to mock payload/lead data (currently missing from mocks)

- [x] Task 5: Update flex-message template tests (AC: #4)
  - [x] 5.1: Update `mockLead` — add `workflowId: '12345'`, `brevoCampaignId: null`, `contactedAt: null` (currently missing)
  - [x] 5.2: Fix test "should include lead_id in postback data" (line 175) — change `expect(params.get('row_id')).toBe('42')` → `expect(params.get('row_id')).toBeNull()`
  - [x] 5.3: Fix test "should include only row_id when leadUUID is not present" (line 201) — this scenario now produces NO identifier; update to verify postback has `action` only (no `lead_id`, no `row_id`)
  - [x] 5.4: Test postback format: `action=contacted&lead_id=<uuid>` (no row_id)
  - [x] 5.5: Test missing `leadUUID` edge case — postback still has `action` but no identifier

- [x] Task 6: Verify LINE controller tests for UUID-only flow (AC: #2, #3)
  - [x] 6.1: Verify existing UUID test passes with `lead_id`-only postback
  - [x] 6.2: Verify legacy `row_id` test still returns friendly error
  - [x] 6.3: Run full test suite to confirm no regressions

## Dev Notes

### Source Documents
- **[Source: ADR-002-supabase-migration.md]** — Schema, service migration map, campaignId→workflowId rename
- **[Source: epic-09-supabase-migration.md#Story 9-1b]** — ACs and story description
- **[Source: stories/9-1a-migrate-leads-dedup-data-layer.md]** — Previous story learnings + all patterns
- **[Source: project-context.md]** — ES Modules, Vitest patterns, config access rules

### Critical Implementation Guide

**1. Background Processor — Promise.all() Pattern (Task 1)**

The main change is in `src/services/background-processor.service.ts` lines 62-108. Currently Gemini runs sequentially, then lead is saved with `campaignId: payload.campaignId`. Change to:

```typescript
// CURRENT (lines 62-80): Sequential Gemini only
if (config.features.aiEnrichment) {
  aiAnalysis = await geminiService.analyzeCompany(domain, payload.company);
}

// CHANGE TO: Parallel Gemini + campaign lookup
const [aiResult, brevoCampaignId] = await Promise.all([
  config.features.aiEnrichment
    ? geminiService.analyzeCompany(domain, payload.company).catch((aiError) => {
        logger.warn('AI analysis failed, using defaults', {
          correlationId,
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
        });
        return aiAnalysis; // Return default CompanyAnalysis
      })
    : Promise.resolve(aiAnalysis),
  leadsService.lookupCampaignId(payload.email).catch((err) => {
    logger.warn('Campaign ID lookup failed', {
      correlationId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return null;
  }),
]);
aiAnalysis = aiResult;
```

Then update the lead object construction (lines 83-108):

```typescript
// CURRENT (line 93):
campaignId: payload.campaignId,

// CHANGE TO:
workflowId: payload.campaignId,        // Brevo automation workflow_id (new canonical field)
campaignId: payload.campaignId,        // Backward compat (deprecated — same value as workflowId)
brevoCampaignId: brevoCampaignId,      // Actual campaign ID from lookup (may be null)
```

> **CRITICAL:** Set BOTH `workflowId` AND `campaignId` during transition. The `toSupabaseLead()` mapper prioritizes `workflowId` → `workflow_id` (line 156). The deprecated `campaignId` ensures backward compat when the lead object is spread into `LeadRow` at line 121 (via `...(lead as Lead)`).

**2. Flex Message Template — Remove row_id (Task 2)**

In `src/templates/flex-message.ts`, function `createPostbackData()` at line 459:

```typescript
// CURRENT:
function createPostbackData(action: string, lead: LeadRow): string {
  const params = new URLSearchParams();
  params.set('action', action);
  if (lead.leadUUID) {
    params.set('lead_id', lead.leadUUID);
  }
  params.set('row_id', lead.rowNumber.toString()); // ← REMOVE THIS LINE
  return params.toString();
}

// CHANGE TO:
function createPostbackData(action: string, lead: LeadRow): string {
  const params = new URLSearchParams();
  params.set('action', action);
  if (lead.leadUUID) {
    params.set('lead_id', lead.leadUUID);
  }
  // No row_id — UUID only after Supabase migration
  // If leadUUID is missing, postback will only have action (validator will reject it)
  return params.toString();
}
```

> **Note:** Do NOT import a logger into `flex-message.ts` just for this warning — the file currently has zero logger imports. If `leadUUID` is missing, the postback will only contain `action` and the LINE validator's `parsePostbackData()` will reject it (requires at least one identifier). This is the correct fail-safe behavior.

**3. LINE Controller — Already Migrated (Task 3)**

The LINE controller was **fully migrated in Story 9-1a**. Current state:
- **UUID path** (line 143-163): `leadsService.getLeadById(leadId)` + `getUserProfileSafe()` via `Promise.all()` — **ALREADY CORRECT**
- **Legacy row_id path** (line 165-169): Returns `"กรุณากดปุ่มจากข้อความใหม่"` — **ALREADY CORRECT**

Task 3 is **verification only** — no code changes needed in `line.controller.ts`.

**4. Field Mapping Reference**

| Source | Field | Maps To | Supabase Column |
|--------|-------|---------|-----------------|
| `payload.campaignId` | Raw Brevo automation workflow_id | `lead.workflowId` | `workflow_id` |
| `lookupCampaignId()` | Actual campaign from campaign_events | `lead.brevoCampaignId` | `brevo_campaign_id` |

### Test Patterns

**Background Processor Mock Update:**

Current mock at line 33-35 of `background-processor.service.test.ts`:
```typescript
vi.mock('../../services/leads.service.js', () => ({
  addLead: mockAddLead,
}));
```

Add `lookupCampaignId`:
```typescript
const mockLookupCampaignId = vi.fn();

vi.mock('../../services/leads.service.js', () => ({
  addLead: mockAddLead,
  lookupCampaignId: mockLookupCampaignId,
}));
```

**Test: Parallel execution**
```typescript
it('should run Gemini and lookupCampaignId in parallel', async () => {
  mockAnalyzeCompany.mockResolvedValue(mockAiAnalysis);
  mockLookupCampaignId.mockResolvedValue('campaign-123');
  mockAddLead.mockResolvedValue(mockSavedLead);

  await processLeadInBackground(mockPayload, 'corr-1');

  // Both should be called
  expect(mockAnalyzeCompany).toHaveBeenCalled();
  expect(mockLookupCampaignId).toHaveBeenCalledWith(mockPayload.email);

  // Lead should have brevoCampaignId
  expect(mockAddLead).toHaveBeenCalledWith(
    expect.objectContaining({
      workflowId: mockPayload.campaignId,
      brevoCampaignId: 'campaign-123',
    })
  );
});
```

**Test: lookupCampaignId failure doesn't block**
```typescript
it('should save lead even if lookupCampaignId fails', async () => {
  mockLookupCampaignId.mockRejectedValue(new Error('DB error'));
  mockAddLead.mockResolvedValue(mockSavedLead);

  await processLeadInBackground(mockPayload, 'corr-1');

  expect(mockAddLead).toHaveBeenCalledWith(
    expect.objectContaining({
      brevoCampaignId: null,
    })
  );
});
```

**Flex Message Template Test:**
```typescript
it('should create postback with UUID only, no row_id', () => {
  const lead: LeadRow = {
    ...mockLead,
    leadUUID: 'uuid-123-456',
    rowNumber: 0,
  };

  const message = createLeadFlexMessage(lead, mockAnalysis);
  // Extract postback data from button actions
  const postbackData = extractPostbackData(message);

  expect(postbackData).toContain('lead_id=uuid-123-456');
  expect(postbackData).not.toContain('row_id');
});
```

### Anti-Patterns to Avoid

1. **DO NOT wrap `Promise.all()` in another try-catch** — each promise already has its own `.catch()` handler. The outer try-catch at the function level handles remaining errors.
2. **DO NOT change LINE controller code** — it's already correct from Story 9-1a.
3. **DO NOT change `NormalizedBrevoPayload` type** — `payload.campaignId` stays as-is (raw Brevo field). Map to `workflowId` in the service layer.
4. **DO NOT remove `campaignId` from `Lead` interface** — it's marked `@deprecated` but may still be read by Dashboard or other code. Set both `campaignId` AND `workflowId` during transition.
5. **DO NOT run `lookupCampaignId()` BEFORE `Promise.all()`** — the whole point is parallelism.
6. **DO NOT change the LINE validator** — `parsePostbackData()` already handles both `lead_id` and `row_id` correctly.

### Scope Boundaries (DO NOT cross)

- **DO NOT** migrate campaign services — Story 9-2
- **DO NOT** migrate sales_team or status_history — Story 9-3
- **DO NOT** remove Google Sheets code/config — Story 9-4
- **DO NOT** change `webhook.controller.ts` — it only delegates to background processor
- **DO NOT** change `line.controller.ts` — already migrated in Story 9-1a
- **DO NOT** change `leads.service.ts` — `lookupCampaignId()` already exists from Story 9-1a

### Files to Modify

| File | Change | Scope |
|------|--------|-------|
| `src/services/background-processor.service.ts` | Add `Promise.all()` for Gemini + lookupCampaignId, map to `workflowId` + `brevoCampaignId` | **PRIMARY** |
| `src/templates/flex-message.ts` | Remove `row_id` from `createPostbackData()`, UUID only | **PRIMARY** |
| `src/__tests__/services/background-processor.service.test.ts` | Add lookupCampaignId mock + parallel tests | **PRIMARY** |
| `src/__tests__/templates/flex-message.test.ts` | Update postback tests for UUID-only format | **SECONDARY** |

### Files NOT to Touch

- `src/controllers/webhook.controller.ts` — delegates to background processor, no changes
- `src/controllers/line.controller.ts` — already migrated in 9-1a
- `src/services/leads.service.ts` — `lookupCampaignId()` already implemented
- `src/services/line.service.ts` — receives `LeadRow`, no changes needed
- `src/validators/line.validator.ts` — `parsePostbackData()` handles both formats
- `src/types/index.ts` — all types already defined in 9-1a
- Any admin controller files — not in scope

### Previous Story Intelligence (Story 9-1a)

**Completed:** Story 9-1a successfully migrated the data layer:
- `leads.service.ts`: 11 exported functions including `lookupCampaignId()`
- `deduplication.service.ts`: Rewritten to Supabase `INSERT ON CONFLICT`
- LINE controller: Already fully migrated to `leadsService` (getLeadById, claimLead)
- Background processor: Already uses `leadsService.addLead()`, constructs `LeadRow` with UUID
- All 1521 tests passing

**Key learnings from 9-1a:**
- Mock pattern: Tests importing `leads.service.ts` need `createModuleLogger` in logger mock
- `addLead` returns `SupabaseLead` object `{ id, version, created_at, updated_at }` not row number
- `claimLead` returns `{ success, lead: LeadRow, alreadyClaimed, isNewClaim, owner? }`
- Background processor sets `rowNumber: 0` in LeadRow (no row in Supabase)
- LINE controller legacy `row_id` path already returns error — tests use UUID-based events

### Git Intelligence

Recent commits:
```
178e775 feat: Supabase setup, schema, client + code review fixes (Story 9-0)
97b62fb fix: add campaignId to event dedup key
1b47885 chore: add Husky pre-commit (lint-staged) and pre-push (test) hooks
```

- Husky pre-commit hooks active — `lint-staged` + pre-push tests will run
- Story 9-1a changes are staged but not yet committed to main (in review)
- Test count: ~1521 tests across 55+ files

### Existing Patterns to Follow

- **ES Modules:** ALL imports MUST include `.js` extension
- **Logger:** Use existing `logger` from `utils/logger.js` (already imported in background-processor)
- **Config:** Use `config` object, never `process.env` directly
- **Error handling:** `.catch()` on individual promises within `Promise.all()` — don't let one failure kill both

### Project Structure Notes

- No new files created — this story only modifies existing files
- Minimal change footprint: 2 production files + 2 test files
- `src/templates/flex-message.ts` is the LINE Flex Message builder (uses `LeadRow` type)
- `src/services/background-processor.service.ts` is the async lead processor (fire-and-forget after webhook 200 OK)

### References

- [Source: ADR-002-supabase-migration.md#Story 9-1b] — AC definitions
- [Source: epic-09-supabase-migration.md#Story 9-1b] — Story description and dependencies
- [Source: stories/9-1a-migrate-leads-dedup-data-layer.md] — Previous story with all migration patterns
- [Source: stories/9-1a-migrate-leads-dedup-data-layer.md#Dev Notes Decision 7] — Status history fire-and-forget
- [Source: stories/9-1a-migrate-leads-dedup-data-layer.md#Dev Notes Decision 8] — lookupCampaignId returns null
- [Source: stories/9-1a-migrate-leads-dedup-data-layer.md#Dev Notes Decision 9] — addLead return type change
- [Source: project-context.md#Testing Rules] — vi.hoisted pattern, mock strategy
- [Source: project-context.md#LINE Bot SDK] — 1-second response rule, signature verification

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Full test suite: 56 files, 1550 tests — ALL PASSING (0 failures)
- Baseline before changes: 1533 tests (integration timeout pre-existing)
- New tests added: 8 (6 in background-processor, 2 in flex-message)

### Completion Notes List

1. **Task 1**: Replaced sequential Gemini-only block with `Promise.all([gemini, lookupCampaignId])`. Each promise has its own `.catch()` handler. Added `workflowId` + `brevoCampaignId` to lead object alongside deprecated `campaignId`.
2. **Task 2**: Removed `row_id` line from `createPostbackData()`. Now sends UUID only. Missing `leadUUID` = action-only postback (validator rejects it).
3. **Task 3**: Verified LINE controller already correct from Story 9-1a — UUID path uses `getLeadById()`, legacy `row_id` path returns Thai error. No code changes needed.
4. **Task 4**: Added `lookupCampaignId` mock + 6 new test cases covering parallel execution, failure isolation, AI disabled + lookup, null return.
5. **Task 5**: Updated `mockLead` with `workflowId`, `brevoCampaignId`, `contactedAt`, grounding fields. Fixed 2 existing tests, added 2 new tests (all 4 buttons verify UUID, no row_id).
6. **Task 6**: Fixed integration test `background-processing.integration.test.ts` which was missing `lookupCampaignId` in leads.service mock (caused 6 failures). All 1550 tests pass.

### Code Review Fixes (Rex Review → Amelia Fix)

7. **H1 Fix**: Fixed `campaignId` type mismatch in test mock — changed `12345` (number) to `'12345'` (string) to match `NormalizedBrevoPayload` type. Also fixed `workflowId: 12345` → `'12345'` and `registeredCapital: 10000000` → `'10,000,000 บาท'` to match `CompanyAnalysis` type.
8. **M1 Fix**: Updated stale comment in `line.controller.ts:165` — "Story 9-1b will update templates" → "Templates now send UUID only (updated in Story 9-1b)".
9. **M2 Fix**: Fixed Thai typo in `background-processor.service.ts:44` — `คุณภาะสูง` → `คุณภาพสูง`.
10. **M3 Fix**: Fixed `registeredCapital` type in both test mocks — number → string to match `CompanyAnalysis` interface (background-processor + integration tests).

### File List

| File | Change |
|------|--------|
| `src/services/background-processor.service.ts` | `Promise.all()` for Gemini + lookupCampaignId, `workflowId` + `brevoCampaignId` mapping, Thai typo fix |
| `src/templates/flex-message.ts` | Removed `row_id` from `createPostbackData()`, UUID only |
| `src/controllers/line.controller.ts` | Updated stale comment (Story 9-1b reference) |
| `src/__tests__/services/background-processor.service.test.ts` | Added `lookupCampaignId` mock + 6 new parallel enrichment tests, fixed mock types (campaignId, workflowId, registeredCapital) |
| `src/__tests__/templates/flex-message.test.ts` | Updated mockLead fields, fixed 2 postback tests, added 2 new tests |
| `src/__tests__/integration/background-processing.integration.test.ts` | Added `lookupCampaignId` to mock + default setup, fixed registeredCapital type |
| `_bmad-output/implementation-artifacts/stories/9-1b-migrate-controllers-line-postback.md` | Story status → dev-complete, added review fix record |
