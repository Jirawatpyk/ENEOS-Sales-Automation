# ADR-001: Lead-Campaign Unification

> **Status:** SUPERSEDED by [ADR-002: Supabase Migration](ADR-002-supabase-migration.md)
> **Date:** 2026-02-09
> **Deciders:** Jiraw, Winston (Architect)
> **Reviewed by:** Rex (Code Review), Amelia (Dev), Murat (TEA), Bob (SM)
> **Scope:** Backend API + Admin Dashboard
> **Data State:** Pre-production (test data only — no migration needed)
> **Note:** All ADR-001 objectives are included in ADR-002. Supabase migration eliminates the need for Google Sheets workarounds designed here.

---

## Context

The current system has two disconnected data flows and two separate deduplication systems:

1. **Campaign Events** (`POST /webhook/brevo/campaign`) — tracks email engagement (delivered/opened/click) with real `camp_id`
2. **Lead Creation** (`POST /webhook/brevo`) — creates leads from Automation webhook with `workflow_id` (NOT `camp_id`)

This creates four problems:

| # | Problem | Impact |
|---|---------|--------|
| 1 | Lead stores `workflow_id` instead of real `camp_id` | Cannot link Lead to its Campaign |
| 2 | `Campaign_Contacts` sheet duplicates 9 fields from `Leads` | Data redundancy, maintenance burden |
| 3 | Campaign Events and Lead lifecycle are disconnected | No full-funnel visibility |
| 4 | Two separate dedup systems with different patterns | Lead dedup uses 3-tier cache (fast), Event dedup scans full sheet O(n) (slow) |

## Decision

**Unify Lead and Campaign data + Deduplication** by:

1. Consolidating Lead dedup and Event dedup into a **Unified Dedup Service** with shared 3-tier cache
2. Adding `Brevo_Campaign_ID` column to Leads (real `camp_id` from Campaign_Events)
3. Removing `Campaign_Contacts` sheet and related service
4. Enriching Lead Detail API with campaign event history
5. Changing Campaign Detail join from Campaign_Contacts to Leads

---

## Architecture Changes

### 0. Unified Dedup Service (NEW)

#### Problem: Two Dedup Patterns

| | Lead Dedup (current) | Event Dedup (current) |
|--|---------------------|----------------------|
| **Key** | `email + leadSource` | `eventId + campId + eventType` |
| **Storage** | Redis → Memory → Deduplication_Log sheet | Campaign_Events sheet (full scan) |
| **Speed** | O(1) with cache | O(n) scan every request |
| **TTL** | 24 hours | Permanent |
| **Code** | `deduplication.service.ts` | Inline in `campaign-stats.service.ts` |

#### Solution: Shared Infrastructure, Different Keys

```
┌──────────────────────────────────────────────────┐
│              Unified Dedup Service                │
│                                                   │
│  checkAndMark(key: string, options?: DedupOptions)│
│                                                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐  │
│  │  Redis   │ → │  Memory  │ → │ Dedup_Log    │  │
│  │  O(1)    │   │  O(1)    │   │ Sheet (scan) │  │
│  └──────────┘   └──────────┘   └──────────────┘  │
└──────────────────────────────────────────────────┘
        │                              │
   ┌────┴────────┐          ┌──────────┴──────────┐
   │ Lead Dedup  │          │   Event Dedup       │
   │ lead:email  │          │   evt:id:camp:type  │
   │ TTL: 24h    │          │   TTL: permanent    │
   └─────────────┘          └─────────────────────┘
```

#### Interface

```typescript
interface DedupOptions {
  ttl?: number;  // seconds. undefined = permanent in Sheet, but memory cache capped at 7 days
}

class UnifiedDedupService {
  /**
   * Check if key is duplicate. If not, mark as processed.
   * Uses 3-tier cache: Redis → Memory → Deduplication_Log sheet
   */
  async checkAndMark(key: string, options?: DedupOptions): Promise<boolean>;

  /**
   * Check only (without marking)
   */
  async isDuplicate(key: string): Promise<boolean>;
}
```

#### Usage

```typescript
// Lead dedup (same behavior as before):
const isLeadDup = await dedupService.checkAndMark(
  `lead:${email}:${leadSource}`,
  { ttl: 86400 }  // 24 hours
);

// Event dedup (NEW — uses 3-tier cache instead of sheet scan):
const isEventDup = await dedupService.checkAndMark(
  `evt:${eventId}:${campaignId}:${eventType}`
  // no ttl = permanent
);
```

#### What Changes

| Before | After |
|--------|-------|
| Event dedup: O(n) scan Campaign_Events sheet | Event dedup: O(1) Redis/Memory cache |
| Campaign_Events used for data storage + dedup | Campaign_Events **only stores data** |
| Two separate code paths for dedup | Single service, single code path |
| Deduplication_Log stores only Lead keys | Deduplication_Log stores `lead:*` + `evt:*` keys |
| `checkDuplicateEvent()` in campaign-stats.service | Removed — uses Unified Dedup Service |

#### Memory Cache TTL Strategy (Review Fix R2-#1)

| Key type | Redis TTL | Memory TTL | Sheet |
|----------|-----------|------------|-------|
| `lead:*` | 24 hours | 24 hours | Permanent (but irrelevant after TTL) |
| `evt:*` | No expiry | **7 days cap** | Permanent (source of truth) |

> **Rationale:** Event keys without memory TTL cap would accumulate indefinitely → memory leak.
> 7-day cap is safe because Brevo stops retrying after ~48 hours.
> After memory eviction, Redis (persistent) and Sheet (scan) remain as fallback.

### 1. Data Model

#### Leads Sheet — Column Changes

| Action | Column | Letter | Description |
|--------|--------|--------|-------------|
| **RENAME** | Campaign_ID → Workflow_ID | L | Clarify this is Brevo workflow_id, not campaign |
| **ADD** | Brevo_Campaign_ID | AI (col 35) | Real `camp_id` from Campaign_Events lookup |

> **Note:** Add new column at END to preserve existing column positions.

#### Deduplication_Log Sheet — Key Format Change

| Before | After |
|--------|-------|
| Key = `email_leadSource` | Key = `lead:email:leadSource` (Lead) |
| | Key = `evt:eventId:campaignId:eventType` (Event) |

> Column structure unchanged: Key, Email/Info, Source, Processed_At
>
> **Pre-deploy:** Clear Deduplication_Log sheet before deploying (test data only — no production impact). This avoids old key format (`email_source`) conflicting with new format (`lead:email:source`).

#### Sheets to Remove

| Sheet | Reason |
|-------|--------|
| **Campaign_Contacts** | Redundant with Leads — contact data accessible via email join |

#### Sheets Unchanged

- Campaign_Events (source of truth for email engagement — **no longer used for dedup**)
- Campaign_Stats (aggregate metrics)
- Status_History
- Sales_Team

### 2. Webhook Flow Changes

#### Scenario A: Automation → Lead (MODIFIED)

```
POST /webhook/brevo (no event field)
    │
    ├─ Validate → Unified Dedup (lead:email:source) → 200 OK
    │
    ▼ (background processing)
    ┌──────────────────────────────────────────────────┐
    │  PARALLEL EXECUTION                              │
    │                                                  │
    │  ┌─────────────────┐  ┌───────────────────────┐  │
    │  │ lookupCampaignId│  │ Gemini AI Enrichment  │  │
    │  │ (Campaign_Events│  │ (company analysis)    │  │
    │  │  scan by email) │  │                       │  │
    │  └────────┬────────┘  └───────────┬───────────┘  │
    │           └───────────┬───────────┘              │
    │                       ▼                          │
    │              Promise.all([camp_id, aiResult])    │
    └──────────────────────────────────────────────────┘
    │
    ├─ Save Lead with:
    │    ├─ Brevo_Campaign_ID = camp_id (from lookup, null if not found)
    │    ├─ Workflow_ID = workflow_id (from payload)
    │    └─ ... other fields + AI enrichment
    │
    └─ LINE Push (unchanged)
```

#### Scenario C1: Campaign Events (MODIFIED — dedup change only)

```
POST /webhook/brevo/campaign (with event field)
    │
    ├─ Validate → 200 OK
    │
    ▼ (async processing)
    ├─ Unified Dedup (evt:eventId:campId:eventType)  ← NEW: O(1) instead of O(n)
    │    ├─ ซ้ำ → หยุด
    │    └─ ไม่ซ้ำ ↓
    ├─ Write Campaign_Events
    ├─ Count unique emails
    └─ Update Campaign_Stats
```

#### Scenario C2: Automation Contact (REMOVED)

```
POST /webhook/brevo/campaign (no event field)
→ Return 200 OK + { message: "Acknowledged" } immediately
→ Do NOT create Lead (avoid dedup collision with Scenario A)
→ Do NOT store in Campaign_Contacts (sheet being removed)
```

### 3. API Changes

#### Lead Detail — Enhanced Response

**Endpoint:** `GET /api/admin/leads/:id`

```typescript
interface LeadDetailResponse {
  lead: LeadDetail;           // lead.brevoCampaignId added
  statusHistory: StatusHistoryEntry[];
  campaignEvents: CampaignEventItem[];  // NEW: from Campaign_Events by email
}
```

#### Campaign Detail Events — Change Join Source

**Endpoint:** `GET /api/admin/campaigns/:id/events`

```
BEFORE: Campaign_Events → JOIN Campaign_Contacts (by email)
AFTER:  Campaign_Events → JOIN Leads (by email, scan cols B-E only)
```

### 4. Files to Remove

| File | Reason |
|------|--------|
| `src/services/campaign-contacts.service.ts` | Sheet removed |
| `src/__tests__/services/campaign-contacts.service.test.ts` | Sheet removed |
| `src/constants/campaign.constants.ts` — `CAMPAIGN_CONTACTS_COLUMNS` export | Sheet removed |
| `src/types/index.ts` — `CampaignContact` interface | Sheet removed |

**Also remove from:**
- `campaign-webhook.controller.ts` — `handleAutomationContact()` function
- `campaign-stats.service.ts` — import of `campaignContactsService`; `checkDuplicateEvent()` method
- `config/index.ts` — `campaignContacts` sheet config

### 5. Files to Modify

| File | Change |
|------|--------|
| `src/services/deduplication.service.ts` | Refactor to Unified Dedup: add key prefix support, TTL option, permanent entries |
| `src/services/campaign-stats.service.ts` | Remove `checkDuplicateEvent()`; use Unified Dedup; change join to Leads; add `getCampaignEventsByEmail()` |
| `src/services/background-processor.service.ts` | Add `lookupCampaignId()` parallel with Gemini AI |
| `src/services/sheets.service.ts` | Add `getAllLeadsByEmail()` (minimal columns); update `addLead()` for new column |
| `src/controllers/campaign-webhook.controller.ts` | Replace C2 handler with 200 OK; use Unified Dedup for events |
| `src/controllers/admin/` (lead detail) | Add `campaignEvents` to response |
| `src/types/index.ts` | Remove `CampaignContact`; update Lead type with `brevoCampaignId` + `workflowId` |
| `src/types/admin.types.ts` | Add `campaignEvents` to `LeadDetailResponse` |
| `src/config/index.ts` | Remove `campaignContacts` sheet config |

### 6. Frontend Changes

#### Lead Detail Modal — Add Campaign Engagement Timeline

```
+-----------------------------------------------+
| Lead Detail: Acme Corp - John Doe              |
+-----------------------------------------------+
|                                                |
| Campaign: "Jan Lubricant Promo"                |
| ---------------------------------------------- |
| Delivered   15 Jan 10:00                       |
| Opened      15 Jan 14:30                       |
| Opened      16 Jan 09:00                       |
| Clicked     16 Jan 09:05                       |
| Lead        16 Jan 09:05                       |
| Contacted   16 Jan 11:00 (Somchai)             |
| Closed      20 Jan 15:00                       |
|                                                |
+-----------------------------------------------+
```

#### Campaign Detail Sheet — Accept Missing Contact Info

For events where the contact did NOT become a Lead (e.g., delivered/opened but no click):
- Show email only (no name/company)
- Acceptable trade-off: contact info for non-leads has low business value

---

## Implementation Plan

### Story 8-0: Unified Dedup Service (NEW — Prerequisite)

**Scope:** Consolidate Lead dedup + Event dedup into single service with shared 3-tier cache

**Changes:**
1. Refactor `deduplication.service.ts` to support generic keys with prefix (`lead:*`, `evt:*`)
2. Add `DedupOptions` with optional TTL (undefined = permanent)
3. Migrate Event dedup from `campaign-stats.service.ts` inline scan → Unified Dedup Service
4. Remove `checkDuplicateEvent()` from `campaign-stats.service.ts`
5. Update Deduplication_Log sheet to accept both key formats

**Acceptance Criteria:**
- AC1: Lead dedup works identically to before (key = `lead:email:source`, TTL = 24h)
- AC2: Event dedup uses 3-tier cache (Redis → Memory → Sheet) instead of Campaign_Events scan
- AC3: Event dedup key = `evt:{eventId}:{campaignId}:{eventType}`, no TTL (permanent)
- AC4: `checkDuplicateEvent()` removed from `campaign-stats.service.ts`
- AC5: Campaign_Events sheet is no longer scanned for dedup purposes
- AC6: All existing Lead dedup tests still pass
- AC7: New Event dedup tests cover: duplicate detected, new event, different campaign same eventId, **TTL behavior (lead key expires after 24h, event key persists in memory up to 7 days)**

### Story 8-1: Add Brevo_Campaign_ID to Leads + Parallel Lookup

**Scope:** Data model change + background processor enhancement

**Changes:**
1. Add `Brevo_Campaign_ID` column to Leads sheet (col AI)
2. Rename `Campaign_ID` → `Workflow_ID` in TypeScript types (column L position unchanged)
3. Add `lookupCampaignId(email)` function in background processor
4. Run lookup **parallel with Gemini AI** via `Promise.all()`
5. Update `addLead()` to write new column

**Acceptance Criteria:**
- AC1: New Lead created from Automation webhook has `Brevo_Campaign_ID` populated when matching Campaign_Events exist for that email
- AC2: When no Campaign_Events exist for email, `Brevo_Campaign_ID` is stored as empty string (not error)
- AC3: `lookupCampaignId()` runs in parallel with Gemini AI — total processing time does NOT increase
- AC4: When multiple campaigns exist for same email, most recent event's `camp_id` is used
- AC5: Existing TypeScript field `campaignId` renamed to `workflowId` across codebase

### Story 8-2: Remove Campaign_Contacts + Change Join

**Scope:** Remove redundant sheet/service + change Campaign Detail join source

**Changes:**
1. Replace `campaignContactsService.getAllContactsByEmail()` with `sheetsService.getAllLeadsByEmail()`
2. `getAllLeadsByEmail()` scans only columns B-E (name, email, phone, company) for performance
3. Replace C2 handler (`handleAutomationContact`) with simple 200 OK response
4. Delete `campaign-contacts.service.ts` + test file
5. Remove `CAMPAIGN_CONTACTS_COLUMNS`, `CampaignContact` type, sheet config

**Acceptance Criteria:**
- AC1: `GET /api/admin/campaigns/:id/events` returns name/company from Leads sheet when Lead exists for that email
- AC2: Events for emails without a matching Lead show empty name/company (email only)
- AC3: `POST /webhook/brevo/campaign` with no event field returns `200 OK` + `{ success: true, message: "Acknowledged" }` (no Lead created, no error)
- AC4: All references to `campaign-contacts.service` removed from codebase
- AC5: `getAllLeadsByEmail()` reads only 4 columns (not full 34-column row)

**Test Plan:**
- Replace deleted Campaign_Contacts tests with equivalent coverage:
  - `getAllLeadsByEmail()` unit tests (found/not found/multiple)
  - Campaign Detail join integration tests (lead exists / no lead / mixed)
  - C2 handler 200 OK response test
  - Edge case: email in Campaign_Events but NOT in Leads

### Story 8-3: Lead Detail + Campaign Engagement Timeline

**Scope:** API enrichment + Frontend timeline component

**Changes:**
1. Add `getCampaignEventsByEmail(email)` to campaign-stats service
2. Enrich `GET /api/admin/leads/:id` response with `campaignEvents[]`
3. Frontend: Campaign engagement timeline in Lead Detail Modal
4. Merge `campaignEvents` + `statusHistory` into unified timeline

**Acceptance Criteria:**
- AC1: `GET /api/admin/leads/:id` response includes `campaignEvents[]` array sorted by `eventAt` ascending
- AC2: When Lead has `brevoCampaignId`, events are grouped by campaign name in timeline
- AC3: When Lead has no `brevoCampaignId` (null), timeline still renders correctly using email-matched events
- AC4: Timeline shows both campaign events (delivered/opened/click) and status history (new/contacted/closed) in chronological order
- AC5: Frontend handles Lead with zero campaign events gracefully (no errors, timeline shows only status history)

---

## Story Dependencies

```
Story 8-0 (Unified Dedup)
    │
    ├─→ Story 8-1 (Brevo_Campaign_ID + Lookup)
    │       │
    │       └─→ Story 8-3 (Lead Detail + Timeline)
    │
    └─→ Story 8-2 (Remove Campaign_Contacts)
```

- 8-0 is prerequisite (dedup must be unified before other changes)
- 8-1 and 8-2 can run **in parallel** after 8-0
- 8-3 depends on 8-1 (needs `brevoCampaignId` field)

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Automation arrives before any campaign event | Low (delivered events sent first) | Store null, email join at read time covers this |
| Contact who opened but didn't click has no name in Campaign Detail | Expected | Show email only — acceptable trade-off |
| Multiple campaigns for same email | Medium | Lookup returns most recent; Lead Detail shows ALL campaigns |
| Deduplication_Log grows faster (events + leads) | Medium | Event keys are small; add cleanup for old permanent entries if needed |
| Unified dedup changes break existing Lead dedup | Low | AC6 requires all existing tests pass; Lead key prefix change is backward-compatible |

---

## Review Feedback Applied

| # | Feedback | Source | Resolution |
|---|----------|--------|------------|
| 1 | lookupCampaignId should run parallel with Gemini | Amelia (R1) | Applied: `Promise.all()` in Story 8-1 AC3 |
| 2 | C2 payload must return 200 OK (not error, not create Lead) | Amelia (R1) | Applied: Story 8-2 AC3 |
| 3 | Need test migration plan for 175+ deleted tests | Murat (R1) | Applied: Story 8-2 Test Plan section |
| 4 | Phase 1 too big — split stories + add ACs | Bob (R1) | Applied: Split into Stories 8-0 to 8-3 with ACs |
| 5 | getAllLeadsByEmail should scan minimal columns | Rex (R1) | Applied: Story 8-2 AC5 (4 columns only) |
| 6 | ~~Keep Campaign_Contacts as fallback~~ | Rex (R1) | N/A: Pre-production — safe to delete |
| 7 | ~~Don't rename Campaign_ID~~ | Rex (R1) | N/A: Pre-production — rename is safe |
| 8 | ~~Backfill script required~~ | Murat (R1) | N/A: Pre-production — no data to backfill |
| 9 | Unify Lead + Event dedup into single service | Jiraw/Winston (R2) | Applied: Story 8-0 added |
| 10 | Memory cache needs TTL cap for event keys (prevent leak) | Rex (R2) | Applied: 7-day cap in Memory Cache TTL Strategy |
| 11 | Clear Deduplication_Log before deploy (key format change) | Rex (R2) | Applied: Pre-deploy note in Data Model section |
| 12 | AC7 should include TTL behavior test | Bob/Murat (R2) | Applied: TTL test added to Story 8-0 AC7 |

---

## Decision Record

- **2026-02-09:** Proposed by Winston (Architect), approved by Jiraw
- **2026-02-09:** Review Round 1 (Party Mode) — 5 issues applied, 3 waived (pre-production)
- **2026-02-09:** Review Round 2 (Party Mode) — 3 minor issues applied (memory TTL cap, pre-deploy note, test coverage)
- **Scope:** 4 stories as EPIC-08 (Lead-Campaign Unification)
- **Priority:** After current EPIC-06/07 backlog
