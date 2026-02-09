# Story 9.2: Migrate Campaign Services

Status: done

## Story

As a **developer**,
I want **campaign events and stats using Supabase with ADR-001 cleanup**,
So that **campaign data uses SQL JOINs, UNIQUE constraint dedup, and eliminates the Campaign_Contacts workaround**.

## Acceptance Criteria

1. **AC1:** Campaign event dedup via UNIQUE constraint `(event_id, campaign_id, event)` — no separate `checkDuplicateEvent()` call needed. Duplicate INSERT returns `{ duplicate: true }` without error.
2. **AC2:** `getCampaignEvents()` joins with `leads` table for contact info (`customer_name`, `company`) via `LEFT JOIN leads ON campaign_events.email = leads.email`.
3. **AC3:** Events without matching lead show email only (no error) — LEFT JOIN produces null for lead fields.
4. **AC4:** C2 handler (Automation webhook, no `event` field) returns `200 OK` + `{ success: true, message: "Acknowledged" }` — no `storeCampaignContact()` call.
5. **AC5:** `campaign-contacts.service.ts` fully deleted, zero imports/references remain in codebase.
6. **AC6:** `recordCampaignEvent()` writes event + updates stats atomically — event write failure = no stats update.
7. **AC7:** Campaign stats `open_rate` = `unique_opens / delivered * 100` and `click_rate` = `unique_clicks / delivered * 100`, calculated via SQL `COUNT(DISTINCT email)`.

## Tasks / Subtasks

- [x] Task 1: Rewrite `campaign-stats.service.ts` to Supabase (AC: #1, #2, #3, #6, #7)
  - [x] 1.1: Replace class-based service with exported functions (match project pattern)
  - [x] 1.2: `recordCampaignEvent()` — INSERT ON CONFLICT DO NOTHING for event, then upsert stats
  - [x] 1.3: Remove `checkDuplicateEvent()` — UNIQUE constraint handles dedup
  - [x] 1.4: Remove `countUniqueEmailsForEvent()` — use SQL `COUNT(DISTINCT email)` instead
  - [x] 1.5: `updateCampaignStats()` — UPSERT via `INSERT ON CONFLICT (campaign_id) DO UPDATE`
  - [x] 1.6: `getAllCampaignStats()` — Supabase query with filter, sort, pagination
  - [x] 1.7: `getCampaignStatsById()` — Supabase single row lookup
  - [x] 1.8: `getCampaignEvents()` — LEFT JOIN leads for contact info (AC #2, #3)
  - [x] 1.9: Remove all Google Sheets imports (`googleapis`, `CircuitBreaker`, `withRetry`)
  - [x] 1.10: Remove `campaignContactsService` import (AC #5)

- [x] Task 2: Update `campaign-webhook.controller.ts` (AC: #4, #5)
  - [x] 2.1: Replace `handleAutomationContact()` body — return `200 OK` + `{ success: true, message: "Acknowledged" }` immediately, no background processing
  - [x] 2.2: Remove `campaignContactsService` import
  - [x] 2.3: Remove `validateBrevoWebhook` import (no longer needed for automation path) — N/A: import never existed in controller
  - [x] 2.4: Keep `handleCampaignEvent()` flow unchanged (validate → 200 → async process) — `campaignStatsService.recordCampaignEvent()` import unchanged if using compatibility wrapper

- [x] Task 3: Delete `campaign-contacts.service.ts` + cleanup references (AC: #5)
  - [x] 3.1: Delete `src/services/campaign-contacts.service.ts`
  - [x] 3.2: Delete `src/__tests__/services/campaign-contacts.service.test.ts`
  - [x] 3.3: Remove `CAMPAIGN_CONTACTS_COLUMNS`, `CAMPAIGN_CONTACTS_RANGE`, `CAMPAIGN_CONTACTS_SHEET_NAME`, `CAMPAIGN_SHEETS.CONTACTS` from `campaign.constants.ts`
  - [x] 3.4: Remove `CampaignContact` interface from `src/types/index.ts`
  - [x] 3.5: Remove `campaignContacts` from `config.google.sheets` in `src/config/index.ts` AND remove `CAMPAIGN_CONTACTS_SHEET_NAME` from the Zod env schema + `.env.example`
  - [x] 3.6: Grep entire codebase for any remaining references to `campaign-contacts`, `CampaignContact`, `CAMPAIGN_CONTACTS`

- [x] Task 4: Update `campaign.constants.ts` (AC: #1)
  - [x] 4.1: Remove all `CAMPAIGN_EVENTS_COLUMNS` and `CAMPAIGN_STATS_COLUMNS` (Google Sheets column indices no longer needed — Supabase uses named columns)
  - [x] 4.2: Keep `CAMPAIGN_EVENTS`, `ENABLED_EVENTS`, `isEventEnabled()`, `CampaignEventType` (still used by controller)
  - [x] 4.3: Remove `createDefaultStatsRow()` (replaced by Supabase UPSERT)
  - [x] 4.4: Remove `CAMPAIGN_EVENTS_RANGE`, `CAMPAIGN_STATS_RANGE`

- [x] Task 5: Rewrite `campaign-stats.service.test.ts` for Supabase (AC: #1-#7)
  - [x] 5.1: Replace Google Sheets mock with Supabase mock pattern
  - [x] 5.2: Test `recordCampaignEvent()` — successful insert + stats upsert
  - [x] 5.3: Test duplicate event — INSERT ON CONFLICT returns no row → duplicate=true
  - [x] 5.4: Test `getCampaignEvents()` returns joined contact data from leads
  - [x] 5.5: Test events without matching lead — email only, no error
  - [x] 5.6: Test `getAllCampaignStats()` with filters, sort, pagination
  - [x] 5.7: Test stats calculation — open_rate and click_rate correct
  - [x] 5.8: Test `getCampaignStatsById()` — found and not found

- [x] Task 6: Rewrite `campaign-webhook.controller.test.ts` (AC: #4, #5)
  - [x] 6.1: Remove `campaignContactsService` mock entirely (service deleted)
  - [x] 6.2: Update `campaignStatsService` mock — if using compatibility wrapper, mock stays as `{ recordCampaignEvent: vi.fn() }`; if using direct functions, update mock shape
  - [x] 6.3: Test automation webhook (no `event` field) returns `{ success: true, message: "Acknowledged" }`
  - [x] 6.4: Test automation webhook does NOT call any background processing or DLQ
  - [x] 6.5: Test campaign event webhook unchanged — still validates, responds 200, processes async via `campaignStatsService.recordCampaignEvent()`

- [x] Task 7: Update remaining test files
  - [x] 7.1: Update `campaign-stats.controller.test.ts` — mock imports compatible (uses compatibility wrapper)
  - [x] 7.2: Update `campaign.constants.test.ts` — remove tests for deleted constants/functions
  - [x] 7.3: Verify `campaign.routes.test.ts` still passes
  - [x] 7.4: Run full test suite — zero failures (55 files, 1472 tests passed)

## Dev Notes

### Source Documents
- **[Source: ADR-002-supabase-migration.md#Story 9-2]** — Schema, migration changes, AC definitions
- **[Source: epic-09-supabase-migration.md#Story 9-2]** — Story description and dependencies
- **[Source: stories/9-1b-migrate-controllers-line-postback.md]** — Previous story learnings + patterns
- **[Source: project-context.md]** — ES Modules, Vitest patterns, config access rules

### Critical Implementation Guide

**1. Service Architecture Change: Class → Functions**

Current `campaign-stats.service.ts` uses a class with `new CampaignStatsService()` singleton. The project pattern (established in 9-1a) uses exported functions:

```typescript
// CURRENT (class-based — Google Sheets pattern):
export class CampaignStatsService { ... }
export const campaignStatsService = new CampaignStatsService();

// CHANGE TO (function-based — Supabase pattern):
import { supabase } from '../lib/supabase.js';
export async function recordCampaignEvent(event: NormalizedCampaignEvent): Promise<RecordEventResult> { ... }
export async function getAllCampaignStats(options: CampaignStatsOptions): Promise<...> { ... }
```

> **IMPORTANT:** The admin controller (`campaign-stats.controller.ts`) imports `campaignStatsService` as a named import. You must update all consumer imports from `campaignStatsService.methodName()` to direct function imports.

**2. recordCampaignEvent() — Supabase Implementation**

Replace the 4-step Google Sheets flow with Supabase:

```typescript
export async function recordCampaignEvent(event: NormalizedCampaignEvent): Promise<RecordEventResult> {
  // Step 1: INSERT event (UNIQUE constraint handles dedup)
  const { data: eventRow, error: eventError } = await supabase
    .from('campaign_events')
    .insert({
      event_id: String(event.eventId),
      campaign_id: String(event.campaignId),
      campaign_name: event.campaignName,
      email: event.email.toLowerCase(),
      event: event.event,
      event_at: event.eventAt || null,
      sent_at: event.sentAt || null,
      url: event.url || null,
      tag: event.tag || null,
      segment_ids: event.segmentIds.length > 0 ? event.segmentIds : null,
    })
    .select('id')
    .maybeSingle();

  // Duplicate check: UNIQUE constraint violation = code 23505
  if (eventError) {
    if (eventError.code === '23505') {
      return { success: true, duplicate: true, eventId: event.eventId, campaignId: event.campaignId };
    }
    throw eventError;
  }

  // Step 2: Upsert campaign stats
  await upsertCampaignStats(event);

  return { success: true, duplicate: false, eventId: event.eventId, campaignId: event.campaignId };
}
```

> **CRITICAL:** `event_id` in the DB schema is `TEXT NOT NULL` but `NormalizedCampaignEvent.eventId` is `number`. You MUST convert: `String(event.eventId)`. Same for `campaign_id`: `String(event.campaignId)`.

**3. upsertCampaignStats() — Accurate Unique Count via SQL**

Replace the read-all-then-count approach with SQL:

```typescript
async function upsertCampaignStats(event: NormalizedCampaignEvent): Promise<void> {
  const campaignId = String(event.campaignId);

  // Get unique counts from campaign_events table (source of truth)
  const { data: uniqueData } = await supabase.rpc('get_campaign_unique_counts', {
    p_campaign_id: campaignId,
  });
  // OR use raw queries:
  // Count total delivered, opened, clicked + unique opens/clicks for this campaign

  // Upsert stats row
  const { error } = await supabase
    .from('campaign_stats')
    .upsert({
      campaign_id: campaignId,
      campaign_name: event.campaignName,
      delivered: ...,     // count from events
      opened: ...,
      clicked: ...,
      unique_opens: ...,  // COUNT(DISTINCT email) WHERE event='opened'
      unique_clicks: ..., // COUNT(DISTINCT email) WHERE event='click'
      open_rate: ...,     // unique_opens / delivered * 100
      click_rate: ...,    // unique_clicks / delivered * 100
      first_event: ...,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'campaign_id' });
}
```

> **Simpler approach:** Instead of RPC, query counts directly:
```typescript
// Count all events for this campaign by type
const { data: counts } = await supabase
  .from('campaign_events')
  .select('event', { count: 'exact', head: false })
  .eq('campaign_id', campaignId);

// OR: aggregate via separate queries for each metric
const { count: deliveredCount } = await supabase
  .from('campaign_events')
  .select('*', { count: 'exact', head: true })
  .eq('campaign_id', campaignId)
  .eq('event', 'delivered');
```

> **Note on unique counts:** Supabase JS doesn't support `COUNT(DISTINCT email)` directly. Options:
> 1. Use `supabase.rpc()` with a custom function
> 2. Query emails + deduplicate in JS: `SELECT DISTINCT email FROM campaign_events WHERE campaign_id=$1 AND event=$2`
> 3. Accept the two-query approach (simple, correct)
>
> **Recommended:** Use approach 2 — `SELECT DISTINCT email` gives unique count, `SELECT *` with count gives total.

**4. getCampaignEvents() — LEFT JOIN leads**

```typescript
export async function getCampaignEvents(campaignId: string, options: { ... }): Promise<{ data: CampaignEventItem[], pagination: PaginationMeta }> {
  // Supabase doesn't support cross-table JOINs in .select() without foreign keys
  // Since campaign_events.email → leads.email is NOT a FK, we need a different approach:

  // Option A: Two queries (recommended — simple, reliable)
  // 1. Get events from campaign_events
  const { data: events, count } = await supabase
    .from('campaign_events')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .order('event_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // 2. Get contact data from leads by emails
  const uniqueEmails = [...new Set(events.map(e => e.email))];
  const { data: leads } = await supabase
    .from('leads')
    .select('email, customer_name, company')
    .in('email', uniqueEmails);

  // 3. Merge
  const leadsMap = new Map(leads.map(l => [l.email, l]));
  const result = events.map(e => ({
    ...mapEventRow(e),
    firstname: leadsMap.get(e.email)?.customer_name || '',
    company: leadsMap.get(e.email)?.company || '',
  }));

  // Option B: Use supabase.rpc() with a custom SQL function (more complex but single query)
}
```

> **CRITICAL CHOICE:** The current `getCampaignEvents()` uses `campaignContactsService.getAllContactsByEmail()` to join contact data. After deleting Campaign_Contacts, use `leads` table instead. The `leads` table has `email`, `customer_name`, `company` which replaces `firstname`, `lastname`, `company` from Campaign_Contacts.

> **Field mapping change (CRITICAL):**
> - Before: `contact.firstname`, `contact.lastname`, `contact.company` (from Campaign_Contacts)
> - After: `lead.customer_name`, `lead.company` (from leads table)
> - The `leads` table has `customer_name` (full name like "สมชาย ใจดี") — NOT separate first/last.
> - **Resolution:** Map `customer_name` → `CampaignEventItem.firstname`, set `lastname` to empty string `''`. This preserves the existing `CampaignEventItem` interface and Dashboard compatibility. The Dashboard already shows these fields; changing the interface shape is Story 9-6 scope.
>
> ```typescript
> // Mapping example:
> firstname: leadsMap.get(e.email)?.customer_name || '',
> lastname: '',  // leads table has full name only — no split needed
> company: leadsMap.get(e.email)?.company || '',
> ```

**5. handleAutomationContact() — Simplified (AC #4)**

```typescript
// CURRENT: validates, stores to Campaign_Contacts, DLQ on error
async function handleAutomationContact(req, res, _next) {
  // ... lots of code ...
  campaignContactsService.storeCampaignContact(contact)...
}

// CHANGE TO:
async function handleAutomationContact(req: Request, res: Response, _next: NextFunction): Promise<void> {
  logger.info('Received automation contact webhook (acknowledged)', {
    email: req.body?.email,
  });
  res.status(200).json({ success: true, message: 'Acknowledged' });
}
```

> **Note:** Automation webhooks (Brevo workflow triggers without `event` field) previously stored contact data in Campaign_Contacts for later join. Since Campaign_Contacts is being deleted (AC #5), and leads table already has this contact data from the lead creation flow, we simply acknowledge. No DLQ needed.

**6. Type Changes**

`NormalizedCampaignEvent` types — `eventId` is `number`, `campaignId` is `number` from validator, but Supabase schema uses `TEXT`. Must convert when inserting:
- `event_id: String(event.eventId)`
- `campaign_id: String(event.campaignId)`

The `CampaignStatsItem` and `CampaignEventItem` in `admin.types.ts` currently use `number` for `campaignId` and `eventId`. After migration, these should become `string` to match Supabase TEXT columns. **However**, the Admin Dashboard frontend may depend on these being numbers. Check the admin controller to determine impact.

> **Decision:** Keep `campaignId: number` and `eventId: number` in the admin response types for now — convert from Supabase TEXT in the **service layer** mapper functions (e.g., `Number(row.campaign_id)`). This avoids Dashboard breaking changes (Story 9-6 scope). All type conversions happen at the service boundary — controllers see the same types as before.

**7. RecordEventResult Type — Keep Compatible**

```typescript
export interface RecordEventResult {
  success: boolean;
  duplicate: boolean;
  error?: string;
  eventId?: number;
  campaignId?: number;
}
```

Keep this interface — the `campaign-webhook.controller.ts` checks `result.duplicate` and `result.success`.

### Supabase Mock Pattern (for tests)

Follow the pattern established in Story 9-1a `leads.service.ts` tests:

```typescript
const mockSupabase = vi.hoisted(() => {
  const chainable = () => {
    const chain: Record<string, any> = {};
    const methods = ['from', 'select', 'insert', 'upsert', 'update', 'delete',
      'eq', 'neq', 'in', 'order', 'range', 'limit', 'maybeSingle', 'single'];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    return chain;
  };
  return chainable();
});

vi.mock('../../lib/supabase.js', () => ({
  supabase: mockSupabase,
}));
```

> **CRITICAL mock pattern:** For testing `INSERT ON CONFLICT` (duplicate detection), mock the error:
```typescript
// Simulate duplicate
mockSupabase.maybeSingle.mockResolvedValueOnce({
  data: null,
  error: { code: '23505', message: 'duplicate key value violates unique constraint' },
});
```

### Anti-Patterns to Avoid

1. **DO NOT keep the class-based pattern** — convert to exported functions (project convention from 9-1a)
2. **DO NOT keep `CircuitBreaker` or `withRetry` wrappers** — Supabase client has built-in retry and connection pooling
3. **DO NOT keep `googleapis` import** — this is the whole point of migration
4. **DO NOT create a custom SQL function for unique counts** unless simpler approaches fail — prefer query + JS dedup
5. **DO NOT change `NormalizedCampaignEvent` type** — it's defined in `validators/campaign-event.validator.ts` and used by existing code. Convert types at the service boundary.
6. **DO NOT change admin controller response shape** — keep `CampaignStatsItem` and `CampaignEventItem` interfaces compatible to avoid Dashboard changes
7. **DO NOT forget to convert `eventId` (number) → `String()` when inserting to Supabase** — DB column is TEXT
8. **DO NOT import logger from a new module** — use existing `campaignLogger as logger` from `utils/logger.js`

### Scope Boundaries (DO NOT cross)

- **DO NOT** migrate sales_team or status_history — Story 9-3
- **DO NOT** remove Google Sheets config or `sheets.service.ts` — Story 9-4
- **DO NOT** change lead detail API response — Story 9-5
- **DO NOT** change admin Dashboard TypeScript types — Story 9-6
- **DO NOT** change `leads.service.ts` — already migrated in Story 9-1a
- **DO NOT** change LINE webhook or postback — already migrated in Story 9-1b
- **DO NOT** change Brevo automation webhook validator (`brevo.validator.ts`) — still used by lead creation flow

### Files to Modify

| File | Change | Scope |
|------|--------|-------|
| `src/services/campaign-stats.service.ts` | Full rewrite: class → functions, Google Sheets → Supabase | **PRIMARY** |
| `src/controllers/campaign-webhook.controller.ts` | Simplify `handleAutomationContact()`, remove Campaign_Contacts import | **PRIMARY** |
| `src/constants/campaign.constants.ts` | Remove Sheet column constants, contacts constants, `createDefaultStatsRow()` | **PRIMARY** |
| `src/types/index.ts` | Remove `CampaignContact` interface | **SECONDARY** |
| `src/config/index.ts` | Remove `campaignContacts` from `google.sheets` | **SECONDARY** |
| `src/controllers/admin/campaign-stats.controller.ts` | Update imports from class instance to direct functions | **SECONDARY** |
| `src/__tests__/services/campaign-stats.service.test.ts` | Full rewrite for Supabase mock | **PRIMARY** |
| `src/__tests__/controllers/campaign-webhook.controller.test.ts` | Update automation handler tests, remove contacts mock | **PRIMARY** |
| `src/__tests__/controllers/campaign-stats.controller.test.ts` | Update mock imports if needed | **SECONDARY** |
| `src/__tests__/constants/campaign.constants.test.ts` | Remove tests for deleted constants | **SECONDARY** |

### Files to Delete

| File | Reason |
|------|--------|
| `src/services/campaign-contacts.service.ts` | ADR-001: Campaign_Contacts removed |
| `src/__tests__/services/campaign-contacts.service.test.ts` | Service deleted |

### Files NOT to Touch

- `src/services/leads.service.ts` — already migrated in 9-1a
- `src/services/deduplication.service.ts` — already migrated in 9-1a
- `src/controllers/line.controller.ts` — already migrated in 9-1b
- `src/services/background-processor.service.ts` — already migrated in 9-1b
- `src/templates/flex-message.ts` — already migrated in 9-1b
- `src/validators/campaign-event.validator.ts` — no changes needed
- `src/validators/brevo.validator.ts` — still used by lead creation flow
- `src/routes/campaign.routes.ts` — routes unchanged
- `src/services/sheets.service.ts` — cleanup in Story 9-4
- `src/types/admin.types.ts` — keep response types compatible

### Previous Story Intelligence (Story 9-1a + 9-1b)

**Key learnings from 9-1a:**
- `supabase` imported from `../lib/supabase.js` — same pattern here
- Services export functions, NOT classes (converted from singleton pattern)
- `createModuleLogger` mock needed if test imports `leads.service.ts` transitively
- Mock chainable Supabase calls: `from().select().eq().order().limit().maybeSingle()`
- Error code `23505` = unique constraint violation (used for dedup)
- `.maybeSingle()` returns `{ data: null, error: null }` when no match (not an error)

**Key learnings from 9-1b:**
- `Promise.all()` pattern with individual `.catch()` for parallel operations
- Test count baseline: ~1550 tests across 56 files
- Husky pre-commit hooks active — lint-staged + pre-push tests will run

### Git Intelligence

Recent commits:
```
fcadfdd feat: migrate controllers + LINE postback to UUID-only (Story 9-1b)
74d40ff feat: migrate Leads + Dedup data layer to Supabase (Story 9-1a)
178e775 feat: Supabase setup, schema, client + code review fixes (Story 9-0)
97b62fb fix: add campaignId to event dedup key to prevent cross-campaign blocking (#4)
```

Commit `97b62fb` is relevant — it added `campaignId` to the composite dedup key. The Supabase UNIQUE constraint `(event_id, campaign_id, event)` already handles this natively.

### Existing Patterns to Follow

- **ES Modules:** ALL imports MUST include `.js` extension
- **Logger:** Use `campaignLogger as logger` from `utils/logger.js` (already used)
- **Config:** Use `config` object, never `process.env` directly
- **Supabase client:** Import `supabase` from `../lib/supabase.js`
- **Error handling:** Wrap service functions in try-catch, return result objects
- **Pagination:** Use `PaginationMeta` type from `admin.types.ts`

### Admin Controller Import Migration

Current (class instance):
```typescript
// src/controllers/admin/campaign-stats.controller.ts
import { campaignStatsService } from '../../services/campaign-stats.service.js';
// Usage:
const result = await campaignStatsService.getAllCampaignStats({ ... });
const campaign = await campaignStatsService.getCampaignStatsById(campaignId);
const result = await campaignStatsService.getCampaignEvents(campaignId, { ... });
```

After (direct functions):
```typescript
import { getAllCampaignStats, getCampaignStatsById, getCampaignEvents } from '../../services/campaign-stats.service.js';
// Usage:
const result = await getAllCampaignStats({ ... });
const campaign = await getCampaignStatsById(campaignId);
const result = await getCampaignEvents(campaignId, { ... });
```

> **RECOMMENDED: Export a compatibility object** to avoid touching every consumer (admin controller + webhook controller + all their tests):
```typescript
// At bottom of campaign-stats.service.ts:
export const campaignStatsService = { recordCampaignEvent, getAllCampaignStats, getCampaignStatsById, getCampaignEvents, healthCheck };
```
> This keeps all existing `campaignStatsService.methodName()` calls working without changes. Both `campaign-webhook.controller.ts` (line 9) and `campaign-stats.controller.ts` (line 13) import `{ campaignStatsService }` — the compatibility wrapper avoids modifying both controllers + their test mocks.

### Supabase Schema Reference

**campaign_events table:**
```sql
CREATE TABLE campaign_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      TEXT NOT NULL,
  campaign_id   TEXT NOT NULL,
  campaign_name TEXT,
  email         TEXT NOT NULL,
  event         TEXT NOT NULL,          -- delivered, opened, click
  event_at      TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  url           TEXT,
  tag           TEXT,
  segment_ids   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, campaign_id, event)
);
CREATE INDEX idx_campaign_events_email ON campaign_events(email);
CREATE INDEX idx_campaign_events_campaign ON campaign_events(campaign_id);
```

**campaign_stats table:**
```sql
CREATE TABLE campaign_stats (
  campaign_id   TEXT PRIMARY KEY,
  campaign_name TEXT,
  delivered     INTEGER NOT NULL DEFAULT 0,
  opened        INTEGER NOT NULL DEFAULT 0,
  clicked       INTEGER NOT NULL DEFAULT 0,
  unique_opens  INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  open_rate     NUMERIC(5,2) NOT NULL DEFAULT 0,
  click_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  hard_bounce   INTEGER NOT NULL DEFAULT 0,
  soft_bounce   INTEGER NOT NULL DEFAULT 0,
  unsubscribe   INTEGER NOT NULL DEFAULT 0,
  spam          INTEGER NOT NULL DEFAULT 0,
  first_event   TIMESTAMPTZ,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Project Structure Notes

- `campaign-stats.service.ts` is 933 lines — will shrink significantly (Supabase queries replace manual Sheets iteration)
- `campaign-contacts.service.ts` is 286 lines — entirely deleted
- `campaign-webhook.controller.ts` is 240 lines — `handleAutomationContact()` simplified to ~5 lines
- `campaign.constants.ts` — ~60% of content removed (Sheet column indices)
- Net code reduction: ~600+ lines removed

### References

- [Source: ADR-002-supabase-migration.md#Story 9-2] — AC definitions, migration map
- [Source: ADR-002-supabase-migration.md#Schema Design] — campaign_events + campaign_stats schemas
- [Source: epic-09-supabase-migration.md#Story 9-2] — Story description and dependencies
- [Source: stories/9-1a-migrate-leads-dedup-data-layer.md] — Supabase mock patterns, service function export pattern
- [Source: stories/9-1b-migrate-controllers-line-postback.md] — Previous story with integration patterns
- [Source: project-context.md#Testing Rules] — vi.hoisted pattern, mock strategy
- [Source: project-context.md#Service Pattern] — Services export functions, not classes

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Full test suite: 55 files, 1472 tests, 0 failures
- Test count delta: 1455 → 1472 (17 net new tests from rewritten test files)
- Previous test count (from 9-1b notes): ~1550 across 56 files — 1 file deleted (campaign-contacts.service.test.ts)

### Completion Notes List

1. **Service rewrite:** 933-line class-based Google Sheets → 522-line function-based Supabase (~44% reduction)
2. **Compatibility wrapper:** `export const campaignStatsService = { ... }` keeps all consumer imports working without changes
3. **Two-query JOIN:** campaign_events + leads (no FK) — fetches events, then bulk lookup by email
4. **Field mapping:** `leads.customer_name` → `CampaignEventItem.firstname`, `lastname` = '' (Dashboard-compatible)
5. **Type conversion boundary:** `eventId`/`campaignId` are `number` in app types but `TEXT` in Supabase — `String()` on insert, `Number()` on read
6. **Stats calculation:** `countEvents()` + `countUniqueEmails()` → JS Set dedup for unique counts
7. **AC #6 implementation:** Event write in outer try-catch, stats upsert in inner try-catch — event is source of truth
8. **Test fix pattern:** Payload without `event` key now routes to automation handler (200) instead of validation error (400) — tests updated to include `event` key
9. **app.test.ts fix:** Added `supabase` to config mock to prevent `config.supabase.url` undefined error from `lib/supabase.ts` init

### File List

**Modified:**
- `src/services/campaign-stats.service.ts` — Full rewrite (class → functions, Sheets → Supabase)
- `src/controllers/campaign-webhook.controller.ts` — Simplified automation handler, removed Campaign_Contacts
- `src/constants/campaign.constants.ts` — Removed Sheets column indices, contacts constants
- `src/types/index.ts` — Removed `CampaignContact` interface
- `src/config/index.ts` — Removed `CAMPAIGN_CONTACTS_SHEET_NAME` from env schema + config
- `src/__tests__/services/campaign-stats.service.test.ts` — Full rewrite for Supabase mock
- `src/__tests__/controllers/campaign-webhook.controller.test.ts` — Updated for AC #4, removed contacts mock
- `src/__tests__/constants/campaign.constants.test.ts` — Removed tests for deleted constants
- `src/__tests__/routes/campaign.routes.test.ts` — Fixed invalid payload test (needs `event` key)
- `src/__tests__/app.test.ts` — Added `supabase` config to mock

**Modified (review fixes):**
- `.env.example` — Removed `CAMPAIGN_CONTACTS_SHEET_NAME` (H1 fix)
- `src/services/campaign-stats.service.ts` — Escaped LIKE wildcards in search (M1 fix), added perf note (M3)
- `src/types/admin.types.ts` — Updated comments from Campaign_Contacts → leads (M2 fix)

**Deleted:**
- `src/services/campaign-contacts.service.ts` — ADR-001 cleanup
- `src/__tests__/services/campaign-contacts.service.test.ts` — Service deleted

## Senior Developer Review (AI)

**Reviewer:** Rex (Code-Reviewer Agent)
**Date:** 2026-02-09
**Verdict:** ✅ APPROVED (after fixes)

### Review Summary
- **Issues Found:** 1 High, 3 Medium, 2 Low
- **Issues Fixed:** 4 (H1, M1, M2, M3)
- **Issues Accepted:** 2 (L1, L2 — documentation-only)
- **Tests after fixes:** 55 files, 1472 tests, 0 failures

### Fixes Applied
1. **H1** (AC #5): Removed `CAMPAIGN_CONTACTS_SHEET_NAME` from `.env.example:33`
2. **M1** (Security): Escaped LIKE wildcards (`%`, `_`, `\`) in search input before `ilike()` in `campaign-stats.service.ts:267`
3. **M2** (Documentation): Updated `admin.types.ts:925-928` comments to reference `leads` table instead of `Campaign_Contacts`
4. **M3** (Performance): Added performance note to `countUniqueEmails` about memory usage for high-volume campaigns
5. **L2** (Story doc): Annotated Task 2.3 — `validateBrevoWebhook` import never existed

### AC Verification
| AC | Status |
|----|--------|
| AC1: UNIQUE constraint dedup | ✅ |
| AC2: getCampaignEvents joins leads | ✅ |
| AC3: Events without lead = email only | ✅ |
| AC4: Automation handler 200+Acknowledged | ✅ |
| AC5: campaign-contacts.service.ts deleted | ✅ (after H1 fix) |
| AC6: Event + stats atomicity | ✅ |
| AC7: Rate calculation | ✅ |
