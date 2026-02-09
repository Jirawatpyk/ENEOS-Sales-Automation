# ADR-002: Supabase Migration

> **Status:** APPROVED (Reviewed v2 — Final)
> **Date:** 2026-02-09
> **Deciders:** Jiraw, Winston (Architect)
> **Scope:** Backend API only (Admin Dashboard ไม่ต้องแก้ — ใช้ Backend API เหมือนเดิม)
> **Data State:** Pre-production (test data only — clean migration, no backfill)
> **Supersedes:** ADR-001 (Lead-Campaign Unification) — all ADR-001 changes included here

---

## Context

The system currently uses **Google Sheets as its primary database** — a pragmatic early decision that enabled rapid prototyping but creates significant limitations:

| # | Problem | Impact |
|---|---------|--------|
| 1 | Row number = Primary Key | Fragile — inserting/deleting rows breaks references |
| 2 | No real indexes or constraints | Every lookup = full sheet scan O(n) |
| 3 | No JOIN capability | Must scan multiple sheets and merge in code |
| 4 | Dedup requires 3-tier cache workaround | Redis → Memory → Sheet scan — complex for simple uniqueness |
| 5 | Pagination = read all → slice in memory | Performance degrades as data grows |
| 6 | No ACID transactions | Race conditions handled via version column workaround |
| 7 | Google Sheets API rate limits | 60 req/min per user — bottleneck under load |
| 8 | ADR-001 workarounds are all Sheets-specific | Building throwaway code if we migrate later |

**Decision trigger:** System is pre-production with test data only. Now is the lowest-risk time to migrate.

## Decision

**Migrate all 6 active Google Sheets tabs to Supabase (PostgreSQL)** and integrate ADR-001 (Lead-Campaign Unification) changes directly into the new schema.

### What Changes (Backend Only)

| Component | Before | After |
|-----------|--------|-------|
| Database | Google Sheets (7 tabs) | Supabase PostgreSQL (6 tables) |
| Primary Key | Row number (1-indexed) | UUID |
| Deduplication | 3-tier cache (Redis→Memory→Sheet) | `INSERT ... ON CONFLICT DO NOTHING` |
| Event Dedup | O(n) sheet scan | UNIQUE constraint (O(1)) |
| Joins | Code-level merge after multiple scans | SQL JOIN |
| Pagination | Read all → slice | `LIMIT/OFFSET` |
| Race Condition | Version column + read-check-write | `UPDATE ... WHERE version = $1 RETURNING *` |
| Campaign_Contacts | Separate sheet (redundant) | **Removed** (ADR-001) |

### What Stays the Same

- Express server, routes, middleware
- Brevo webhook validation (Zod schemas)
- LINE webhook handling + signature verification
- Gemini AI enrichment service
- LINE messaging service
- Error handling, logging, rate limiting
- Controller interfaces (services change internally)
- **Admin Dashboard** (connects via Backend API — zero changes needed)

### Dashboard Impact

```
Dashboard (Next.js) → Next.js API Proxy → Backend API (Express) → Supabase
                                                                   ↑ เปลี่ยนตรงนี้เท่านั้น
```

Admin Dashboard (`eneos-admin-dashboard/`) เชื่อมผ่าน Backend API เท่านั้น — ไม่ได้ต่อ Google Sheets ตรง ดังนั้น:
- **Backend เปลี่ยน DB เป็น Supabase → Dashboard ไม่รู้เรื่อง** (ตราบใดที่ API response format เหมือนเดิม)
- Lead ID เปลี่ยนจาก row number → UUID → **อาจต้องแก้ Frontend เล็กน้อย** (route params, TypeScript types)
- Field rename `campaignId` → `workflowId` → **แก้ types ถ้า Frontend ใช้ field นี้**

> **Future:** เมื่อพร้อม อาจย้าย Dashboard ให้อ่าน Supabase โดยตรง (Hybrid pattern) เพื่อ realtime + ลด latency แต่ไม่ทำตอนนี้

---

## Security (Review Fix R1)

### Supabase Key Management

| Key | ใช้ที่ | สิทธิ์ | ข้อห้าม |
|-----|-------|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Backend (Express) เท่านั้น | Bypass RLS ทั้งหมด | ห้ามอยู่ใน client-side code, ห้าม commit, ห้าม log |
| `SUPABASE_ANON_KEY` | Dashboard (อนาคต) | RLS enforced | ยังไม่ต้องใช้ตอนนี้ |

**Rules:**
- `SERVICE_ROLE_KEY` ต้อง set เป็น secret ใน Railway (not visible in deploy logs)
- ห้าม expose ใน API response หรือ error message
- ใช้เฉพาะ server-side (`src/lib/supabase.ts`) — import guard ป้องกัน client usage
- RLS enable บนทุก table แม้ Backend bypass (defense in depth สำหรับอนาคต)

---

## Schema Design

### 1. leads

```sql
CREATE TABLE leads (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  phone         TEXT DEFAULT '',
  company       TEXT DEFAULT '',
  industry_ai   TEXT DEFAULT '',
  website       TEXT,
  capital       TEXT,

  -- Status & Ownership
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','claimed','contacted','closed','lost','unreachable')),
  sales_owner_id   TEXT,
  sales_owner_name TEXT,

  -- Campaign Info (ADR-001: renamed + new field)
  workflow_id        TEXT DEFAULT '',    -- was "campaign_id" (Brevo Automation workflow_id)
  brevo_campaign_id  TEXT,              -- NEW: real camp_id from Campaign_Events lookup
  campaign_name      TEXT DEFAULT '',
  email_subject      TEXT DEFAULT '',
  source             TEXT DEFAULT 'Brevo',

  -- Brevo Identifiers
  lead_id    TEXT DEFAULT '',           -- Brevo contact_id
  event_id   TEXT DEFAULT '',           -- Brevo message-id
  clicked_at TIMESTAMPTZ,

  -- AI Enrichment
  talking_point TEXT,

  -- Status Timestamps
  closed_at      TIMESTAMPTZ,
  lost_at        TIMESTAMPTZ,
  unreachable_at TIMESTAMPTZ,
  contacted_at   TIMESTAMPTZ,

  -- Optimistic Locking
  version INTEGER NOT NULL DEFAULT 1,

  -- Contact Attributes (from Brevo)
  lead_source TEXT,
  job_title   TEXT,
  city        TEXT,

  -- Google Search Grounding
  juristic_id  TEXT,
  dbd_sector   TEXT,
  province     TEXT,
  full_address TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_sales_owner ON leads(sales_owner_id) WHERE sales_owner_id IS NOT NULL;
CREATE INDEX idx_leads_brevo_campaign ON leads(brevo_campaign_id) WHERE brevo_campaign_id IS NOT NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2. dedup_log

```sql
-- Lead Dedup — trivially simple on PostgreSQL
-- Event dedup is handled by UNIQUE constraint on campaign_events table (not here)
CREATE TABLE dedup_log (
  key          TEXT PRIMARY KEY,       -- lead:email:source (lead dedup only)
  info         TEXT,                   -- email
  source       TEXT,                   -- lead source
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage: INSERT INTO dedup_log (key, info, source)
--        VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING
--        RETURNING key;
-- If RETURNING returns nothing → duplicate!
```

> **Note:** The entire 3-tier cache (Redis → Memory → Sheet scan) is replaced by one SQL statement. Redis remains optional for general application caching but is no longer needed for deduplication.
>
> **Dedup Strategy (Review Fix R2-1):**
> - **Lead dedup:** `dedup_log` table (`INSERT ON CONFLICT DO NOTHING`)
> - **Event dedup:** `campaign_events` UNIQUE constraint (`event_id, campaign_id, event`) — no `dedup_log` entry needed
>
> **Cleanup (Review Fix R5):** Lead keys accumulate in `dedup_log`. Add `pg_cron` scheduled cleanup for entries older than 90 days when data grows significantly. Not needed now (pre-production).

### 3. sales_team

```sql
CREATE TABLE sales_team (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT UNIQUE,           -- Can be NULL (unlinked dashboard member)
  name         TEXT NOT NULL,
  email        TEXT UNIQUE,           -- Login identifier
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'sales'
               CHECK (role IN ('admin', 'sales')),
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_team_email ON sales_team(email) WHERE email IS NOT NULL;
CREATE INDEX idx_sales_team_line ON sales_team(line_user_id) WHERE line_user_id IS NOT NULL;
```

### 4. status_history

```sql
CREATE TABLE status_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  changed_by_id   TEXT,               -- LINE User ID or 'system'
  changed_by_name TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_lead ON status_history(lead_id);
CREATE INDEX idx_status_history_created ON status_history(created_at DESC);
```

### 5. campaign_events

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

  -- Event dedup built into schema (ADR-001 Story 8-0)
  UNIQUE(event_id, campaign_id, event)
);

CREATE INDEX idx_campaign_events_email ON campaign_events(email);
CREATE INDEX idx_campaign_events_campaign ON campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_email_recent ON campaign_events(email, event_at DESC);
```

### 6. campaign_stats

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

### ER Diagram

```
┌──────────────┐       ┌──────────────────┐
│  sales_team  │       │  status_history  │
│──────────────│       │──────────────────│
│  id (PK)     │       │  id (PK)         │
│  line_user_id│       │  lead_id (FK) ───┼──┐
│  name        │       │  status          │  │
│  email       │       │  changed_by_id   │  │
│  role        │       │  created_at      │  │
└──────────────┘       └──────────────────┘  │
                                              │
┌──────────────┐       ┌──────────────────┐  │
│  dedup_log   │       │     leads        │◄─┘
│──────────────│       │──────────────────│
│  key (PK)    │       │  id (PK, UUID)   │
│  info        │       │  email           │
│  source      │       │  status          │
│  processed_at│       │  workflow_id     │
└──────────────┘       │  brevo_campaign_id│
                       │  version         │
                       │  created_at      │
                       └──────────────────┘
                              │ (email join)
                              ▼
┌──────────────────┐   ┌──────────────────┐
│  campaign_stats  │   │ campaign_events  │
│──────────────────│   │──────────────────│
│  campaign_id(PK) │◄──│  campaign_id     │
│  campaign_name   │   │  event_id        │
│  delivered       │   │  email           │
│  unique_opens    │   │  event           │
│  open_rate       │   │  event_at        │
│  ...             │   │  UNIQUE(eid,cid,e)│
└──────────────────┘   └──────────────────┘
```

---

## Supabase Client Choice (Review Fix A2)

**Decision: Use `@supabase/supabase-js`** (not raw `pg`)

| Factor | `@supabase/supabase-js` | `pg` (node-postgres) |
|--------|------------------------|---------------------|
| API | Query builder (`.from().select()`) | Raw SQL strings |
| Type safety | Built-in generated types | Manual |
| Retry | Built-in | Manual |
| Consistency | Dashboard จะใช้ตัวเดียวกัน | Dashboard ต้องใช้ Supabase JS อยู่ดี |
| Portability | ผูกกับ Supabase | DB-agnostic |

> **Rationale:** Convenience + consistency outweigh portability concern. If we leave Supabase in the future, refactor at `src/lib/supabase.ts` one place.

---

## Test Strategy (Review Fix M1)

| Test Level | Tool | Database |
|------------|------|----------|
| **Unit tests** | Vitest + mock Supabase client | Mock (ไม่ต้องต่อ DB) |
| **Integration tests** | Vitest + Supabase local (Docker) | Local PostgreSQL |
| **Smoke tests** | Manual / script | Staging Supabase |

### Unit Test Mocking Pattern

```typescript
// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockLead, error: null }),
};

vi.mock('../lib/supabase.js', () => ({
  supabase: mockSupabase,
}));
```

### Integration Test (Optional — Supabase Local)

```bash
# Start Supabase locally
npx supabase start
# Run integration tests against local DB
npm run test:integration
```

> **CI Pipeline:** Unit tests (mock) run in CI as-is. Integration tests with Supabase local are optional — add when ready.

---

## Service Migration Map

### Files to CREATE

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client (service role key, server-side only) |

### Files to REWRITE (internal logic, same interface)

| File | Key Changes |
|------|-------------|
| `src/services/sheets.service.ts` → `src/services/leads.service.ts` | Google Sheets → Supabase queries. Row number → UUID. Version check via SQL WHERE. Split into focused service. |
| `src/services/deduplication.service.ts` | 3-tier cache → single `INSERT ON CONFLICT`. Remove Redis/Memory cache for dedup. ~200 lines → ~30 lines. |
| `src/services/campaign-stats.service.ts` | Sheet scan → SQL queries. `checkDuplicateEvent()` → removed (UNIQUE constraint). Join Campaign_Contacts → JOIN leads. |

### Files to CREATE (split from sheets.service.ts)

| File | Purpose |
|------|---------|
| `src/services/sales-team.service.ts` | Sales team CRUD (extracted from sheets.service.ts) |
| `src/services/status-history.service.ts` | Status history (extracted from sheets.service.ts) |

> **Rationale:** `sheets.service.ts` is a monolith handling 4 sheets. Split during migration (not before) to avoid double work. (Review Fix A4)

### Files to DELETE

| File | Reason |
|------|--------|
| `src/services/campaign-contacts.service.ts` | ADR-001: Campaign_Contacts removed |
| `src/__tests__/services/campaign-contacts.service.test.ts` | Service deleted |
| `src/constants/campaign.constants.ts` — `CAMPAIGN_CONTACTS_COLUMNS` | Sheet removed |
| `src/types/index.ts` — `CampaignContact` interface | Sheet removed |

### Files to MODIFY

| File | Change |
|------|--------|
| `src/config/index.ts` | Add Supabase env vars. Remove Google Sheets config (sheetId, sheet names). |
| `src/controllers/webhook.controller.ts` | Service calls same interface, but import from new service name |
| `src/controllers/campaign-webhook.controller.ts` | Remove `handleAutomationContact()` → 200 OK. Use UNIQUE constraint for event dedup. |
| `src/controllers/line-webhook.controller.ts` | `rowId` → `leadId` (UUID). Lead lookup by UUID instead of row number. |
| `src/types/index.ts` | `LeadRow.rowNumber` → `Lead.id` (UUID). Remove `CampaignContact`. Add `brevoCampaignId`. Rename `campaignId` → `workflowId`. |
| `src/types/admin.types.ts` | Update Lead types + add `campaignEvents` to `LeadDetailResponse` |
| `src/templates/lead-notification.ts` | LINE Flex Message: postback data uses UUID instead of row number |
| `src/utils/retry.ts` | Remove `CircuitBreaker` class. Add Supabase connection timeout config. (Review Fix R3) |
| `package.json` | Add `@supabase/supabase-js`. Remove `googleapis` (after full migration). |

---

## ADR-001 Integration

All ADR-001 changes are implemented directly in the Supabase schema — no workarounds needed:

| ADR-001 Story | Sheets Workaround | Supabase Implementation |
|---------------|-------------------|------------------------|
| **8-0: Unified Dedup** | 3-tier cache, key prefix, 7-day TTL cap | `dedup_log` table + `INSERT ON CONFLICT` |
| **8-1: Brevo_Campaign_ID** | Scan Campaign_Events sheet for email | `SELECT campaign_id FROM campaign_events WHERE email=$1 ORDER BY event_at DESC LIMIT 1` |
| **8-2: Remove Campaign_Contacts** | Delete service + scan Leads sheet for join | Delete service + `JOIN leads ON email` |
| **8-3: Lead Detail Timeline** | Scan Campaign_Events + merge in code | `SELECT * FROM campaign_events WHERE email=$1 ORDER BY event_at` |

**ADR-001 status: Superseded — all objectives achieved natively via Supabase schema design.**

> **Sprint Status (Review Fix B2):** Update `sprint-status.yaml` — mark EPIC-08 stories (8-0 to 8-3) as "superseded by EPIC-09".

---

## LINE Postback Migration (Review Fix R2)

Current LINE Flex Message postback uses `row_id`:
```json
{ "action": "claim", "row_id": 42 }
```

After migration, uses `lead_id` (UUID):
```json
{ "action": "claim", "lead_id": "550e8400-e29b-41d4-a716-446655440000" }
```

### Backward Compatibility

Old LINE Flex Messages (sent before migration) still contain `row_id`. When user taps these:

```typescript
// line-webhook.controller.ts
if (data.row_id && !data.lead_id) {
  // Legacy postback — lead reference no longer valid
  await lineService.replyMessage(replyToken, {
    type: 'text',
    text: 'Lead นี้ใช้ระบบเก่า กรุณารอ notification ใหม่จากระบบครับ'
  });
  return;
}
```

> **Note:** Legacy messages will expire naturally as LINE Flex Messages are replaced by new notifications.

---

## Connection & Error Handling (Review Fix R3)

| Before (Google Sheets) | After (Supabase) |
|------------------------|-------------------|
| `CircuitBreaker` class (5 failures → 60s open) | Supabase connection pool (pgbouncer built-in) |
| `withRetry()` wrapper on every call | Supabase client built-in retry |
| Google API rate limit (60 req/min) | PostgreSQL — no practical limit |

**Supabase client config:**
```typescript
const supabase = createClient(url, key, {
  db: { schema: 'public' },
  auth: { persistSession: false },  // Server-side, no session
  global: {
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) // 10s timeout
  }
});
```

> **Health check:** `/health` endpoint checks Supabase connectivity (simple `SELECT 1`) instead of Google Sheets API.

---

## Environment Variables

### Add

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend key (bypasses RLS) — **SECRET** | `eyJ...` |

> **Note:** `SUPABASE_ANON_KEY` ไม่ต้องใช้ตอนนี้ — จะเพิ่มเมื่อ Dashboard ต่อ Supabase ตรง

### Remove (after full migration)

| Variable | Reason |
|----------|--------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No longer using Google Sheets |
| `GOOGLE_PRIVATE_KEY` | No longer using Google Sheets |
| `GOOGLE_SHEET_ID` | No longer using Google Sheets |
| All `*_SHEET_NAME` variables (7 total) | No longer using Google Sheets |

### Keep (unchanged)

- `GEMINI_API_KEY` — AI enrichment
- `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `LINE_GROUP_ID` — LINE integration
- `BREVO_WEBHOOK_SECRET` — Webhook auth
- `REDIS_URL` (optional) — General caching (no longer for dedup)
- All feature flags (`ENABLE_AI_ENRICHMENT`, etc.)

---

## Implementation Plan

### Story 9-0: Supabase Setup + Schema + Client

**Scope:** Project setup, all 6 tables, Supabase client module

**Changes:**
1. Create Supabase project (or configure existing)
2. Run migration SQL — all 6 tables with indexes, constraints, triggers
3. Create `src/lib/supabase.ts` — client module with service role key
4. Update `src/config/index.ts` — add Supabase env validation
5. Update `package.json` — add `@supabase/supabase-js`
6. Update `.env.example` with new variables

**Acceptance Criteria:**
- AC1: All 6 tables created with correct columns, types, and constraints
- AC2: `dedup_log.key` has PRIMARY KEY (dedup via `ON CONFLICT`)
- AC3: `campaign_events` has UNIQUE constraint on `(event_id, campaign_id, event)`
- AC4: `leads` has `updated_at` auto-trigger
- AC5: Supabase client connects successfully from Express app
- AC6: All indexes created per schema design
- AC7: RLS enabled on all tables (basic allow-all policies — refined when Dashboard connects directly)
- AC8: Audit existing test files — list tests that need Supabase mock migration (Review Fix A3)
- AC9: Test strategy documented: unit tests = mock Supabase, integration tests = Supabase local (Review Fix M1)

---

### Story 9-1a: Migrate Leads + Dedup Service (Data Layer)

**Scope:** Core data services — leads CRUD + unified dedup (Review Fix A1/B1: split from original 9-1)

**Changes:**
1. Create `src/services/leads.service.ts` — replace lead operations from `sheets.service.ts`
   - `addLead()` → `INSERT INTO leads ... RETURNING *`
   - `getLeadById(uuid)` → `SELECT * FROM leads WHERE id = $1`
   - `updateLeadWithLock()` → `UPDATE leads SET ... WHERE id = $1 AND version = $2 RETURNING *`
   - `claimLead()` → `UPDATE leads SET status='claimed', sales_owner_id=$1 WHERE id=$2 AND version=$3`
   - `getLeadsWithPagination()` → `SELECT ... LIMIT $1 OFFSET $2`
   - `getLeadsCountByStatus()` → `SELECT status, COUNT(*) FROM leads GROUP BY status`
   - `getAllLeadsByEmail()` → `SELECT id, customer_name, email, phone, company FROM leads` (for campaign join)
2. Rewrite `src/services/deduplication.service.ts`
   - Remove 3-tier cache (Redis → Memory → Sheet)
   - `checkAndMark(key)` → `INSERT INTO dedup_log ON CONFLICT DO NOTHING RETURNING key`
   - If RETURNING returns row → new. If empty → duplicate.
   - ~200 lines → ~30 lines
3. Add `lookupCampaignId(email)` in leads service (ADR-001 Story 8-1)
   - `SELECT campaign_id FROM campaign_events WHERE email = $1 ORDER BY event_at DESC LIMIT 1`

> **Timing Note (Review Fix A2-1):** `lookupCampaignId()` returns null until Story 9-2 deploys (campaign_events table empty before campaign service migration). This is expected — `brevo_campaign_id` will populate once both 9-1a and 9-2 are deployed.

**Acceptance Criteria:**
- AC1: `addLead()` creates lead with UUID, returns full lead object
- AC2: `checkAndMark()` prevents duplicates via DB constraint (no Redis/Memory needed)
- AC3: `updateLeadWithLock()` throws `RaceConditionError` when version mismatch
- AC4: `claimLead()` sets `contacted_at` timestamp and increments version
- AC5: `getLeadsWithPagination()` supports filter by status, date range, search
- AC6: `lookupCampaignId()` returns most recent campaign_id for email (or null)
- AC7: Lead dedup key format: `lead:{email}:{source}` (ADR-001)
- AC8: All lead + dedup service tests rewritten for Supabase mock

---

### Story 9-1b: Migrate Controllers + LINE Postback (Integration Layer)

**Scope:** Wire up new services to controllers + LINE postback migration (Review Fix A1/B1)

**Changes:**
1. Update `src/controllers/webhook.controller.ts` — import from new leads.service
2. Run `lookupCampaignId()` **parallel with Gemini AI** via `Promise.all()` in background processor
3. Update `src/controllers/line-webhook.controller.ts` — UUID-based lead lookup
4. Add backward compatibility for legacy `row_id` postback (graceful error message)
5. Update `src/templates/lead-notification.ts` — postback data with UUID

**Acceptance Criteria:**
- AC1: `lookupCampaignId()` runs parallel with Gemini via `Promise.all()`
- AC2: LINE postback uses `lead_id` (UUID)
- AC3: Legacy `row_id` postback returns friendly Thai error message (not crash)
- AC4: LINE Flex Message template sends UUID in postback data
- AC5: Brevo webhook → Lead creation → LINE notification end-to-end works

---

### Story 9-2: Migrate Campaign Services

**Scope:** Campaign events + stats + ADR-001 cleanup

**Changes:**
1. Rewrite `src/services/campaign-stats.service.ts` — Supabase queries
   - `recordCampaignEvent()` → `INSERT INTO campaign_events ... ON CONFLICT DO NOTHING`
   - Remove `checkDuplicateEvent()` — handled by UNIQUE constraint
   - `updateCampaignStats()` → `INSERT INTO campaign_stats ... ON CONFLICT (campaign_id) DO UPDATE`
   - `getCampaignEvents()` → `SELECT ce.*, l.customer_name, l.company FROM campaign_events ce LEFT JOIN leads l ON ce.email = l.email`
   - `getCampaignEventsByEmail()` → `SELECT * FROM campaign_events WHERE email = $1 ORDER BY event_at` (ADR-001 Story 8-3)
2. Delete `src/services/campaign-contacts.service.ts` (ADR-001 Story 8-2)
3. Update `src/controllers/campaign-webhook.controller.ts`
   - Remove `handleAutomationContact()` → return 200 OK
   - Event processing: `INSERT ON CONFLICT` (dedup built-in)
4. Remove `CAMPAIGN_CONTACTS_COLUMNS` from constants
5. Remove `CampaignContact` from types

**Acceptance Criteria:**
- AC1: Campaign event dedup via UNIQUE constraint — no separate dedup call needed
- AC2: `getCampaignEvents()` joins with `leads` table for contact info
- AC3: Events without matching lead show email only (no error)
- AC4: C2 handler (Automation, no event field) returns `200 OK` + `{ success: true, message: "Acknowledged" }`
- AC5: `campaign-contacts.service.ts` fully deleted, zero references remain
- AC6: `recordCampaignEvent()` + stats update in single transaction
- AC7: Campaign stats `open_rate` and `click_rate` calculated correctly

---

### Story 9-3: Migrate Sales_Team + Status_History

**Scope:** Extract and migrate remaining services

**Changes:**
1. Create `src/services/sales-team.service.ts` (extracted from `sheets.service.ts`)
   - All team CRUD operations via Supabase
   - `getUserByEmail()` for auth
   - `linkLINEAccount()` for account linking
2. Create `src/services/status-history.service.ts` (extracted from `sheets.service.ts`)
   - `addStatusHistory()` — fire-and-forget pattern preserved
   - `getStatusHistory(leadId)` — uses FK reference instead of UUID text match
   - `getAllStatusHistory()` — with pagination
3. Update controllers that reference these operations

**Acceptance Criteria:**
- AC1: `getSalesTeamMember(lineUserId)` returns team member by LINE ID
- AC2: `getUserByEmail(email)` returns team member for auth
- AC3: `linkLINEAccount()` updates existing member's `line_user_id`
- AC4: `addStatusHistory()` is fire-and-forget (does not block main operation)
- AC5: `status_history.lead_id` is FK to `leads.id` — cascade delete works
- AC6: All team management + history tests rewritten

---

### Story 9-4: Cleanup Google Sheets + Documentation

**Scope:** Remove all Google Sheets code, dependencies, and update docs

**Changes:**
1. Delete `src/services/sheets.service.ts` (replaced by leads, sales-team, status-history services)
2. Remove `googleapis` from `package.json`
3. Remove Google Sheets config from `src/config/index.ts`
4. Remove Google Sheets env vars from `.env.example`
5. Remove `CircuitBreaker` class from `src/utils/retry.ts` (if only used for Sheets)
6. Update health check — remove Google Sheets connectivity check, add Supabase check
7. Delete all Google Sheets mock patterns from tests

**Acceptance Criteria:**
- AC1: Zero imports of `googleapis` in codebase
- AC2: `npm ls googleapis` returns empty (package removed)
- AC3: Health check reports Supabase connectivity status
- AC4: All tests pass without Google Sheets mocks
- AC5: `.env.example` has Supabase vars, no Google Sheets vars
- AC6: `CLAUDE.md` updated to reflect Supabase architecture
- AC7: All documentation updated — `ARCHITECTURE.md`, `docs/services.md`, `docs/data-flow.md`, `docs/api-reference.md` (Review Fix B3)
- AC8: Full test suite passes + manual smoke test: POST /webhook/brevo, POST /webhook/line, GET /health (Review Fix M2)

---

### Story 9-5: Lead Detail + Campaign Engagement Timeline (ADR-001 Story 8-3)

**Scope:** API enrichment for Lead Detail — enabled by Supabase JOINs

**Changes:**
1. Enrich `GET /api/admin/leads/:id` response with `campaignEvents[]`
2. Query: `SELECT * FROM campaign_events WHERE email = (SELECT email FROM leads WHERE id = $1) ORDER BY event_at`
3. Merge `statusHistory[]` + `campaignEvents[]` into unified timeline
4. Update `LeadDetailResponse` type

**Acceptance Criteria:**
- AC1: `GET /api/admin/leads/:id` includes `campaignEvents[]` sorted by `event_at`
- AC2: When lead has `brevo_campaign_id`, events show campaign name
- AC3: When lead has no campaign events, response returns empty array (no error)
- AC4: Timeline merges campaign events + status history chronologically
- AC5: Response type matches `LeadDetailResponse` with `campaignEvents` field

---

### Story 9-6: Frontend Type Updates (Admin Dashboard)

**Scope:** Minor TypeScript type updates in Dashboard project — if needed

**Changes:**
1. Update Lead ID type: `number` (row) → `string` (UUID) in Dashboard types
2. Update route params if using lead ID in URLs
3. Update field name `campaignId` → `workflowId` if used in display
4. Add `brevoCampaignId` to Lead type (optional — for future timeline display)

**Acceptance Criteria:**
- AC1: Dashboard TypeScript compiles without errors
- AC2: Lead detail page works with UUID-based lead IDs
- AC3: All existing Dashboard tests pass
- AC4: No functional changes — display and behavior identical

> **Note:** This story may be empty (no changes needed) if the Dashboard doesn't reference lead IDs directly. Verify during implementation.

---

## Story Dependencies

```
Story 9-0 (Supabase Setup + Schema)
    │
    ├──→ Story 9-1a (Leads + Dedup — Data Layer)
    │       │
    │       └──→ Story 9-1b (Controllers + LINE — Integration)
    │               │
    │               ├──→ Story 9-3 (Sales_Team + Status_History)
    │               │       │
    │               │       └──→ Story 9-4 (Cleanup + Docs)
    │               │
    │               └──→ Story 9-5 (Lead Detail Timeline)
    │
    ├──→ Story 9-2 (Campaign Services)
    │       │
    │       └──→ Story 9-4 (Cleanup + Docs)
    │
    └──→ Story 9-6 (Frontend Types) — can start anytime after 9-0
```

- **9-0** = prerequisite for everything
- **9-1a** and **9-2** can run in **parallel** after 9-0
- **9-1b** depends on 9-1a (needs data layer first)
- **9-3** depends on 9-1b (status_history FK → leads)
- **9-4** depends on 9-1b + 9-2 + 9-3 (all services migrated before cleanup)
- **9-5** depends on 9-1b + 9-2 (needs both leads and campaign_events)
- **9-6** is independent — can start after 9-0, merge anytime

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase connection issues on Railway | Low | High | Connection pooling (pgbouncer built-in). Health check. 10s timeout. |
| Large test rewrite effort | High | Medium | Test structure same — only mock layer changes. Audit in 9-0 AC8. |
| LINE postback breaking (row_id → UUID) | Medium | High | Backward compat: graceful Thai error for legacy postback. (Story 9-1b AC3) |
| Supabase free tier limits | Low | Medium | Free tier: 500MB DB, 1GB bandwidth — sufficient for current scale. |
| Missing edge cases in SQL queries | Medium | Medium | Comprehensive test coverage. Supabase dashboard for manual verification. |
| Service role key exposure | Low | Critical | Security rules enforced (see Security section). Railway secret config. |
| dedup_log table growth | Low | Low | pg_cron cleanup for old entries when needed. |

---

## Migration Checklist

- [ ] Create Supabase project
- [ ] Run schema migration SQL
- [ ] Set environment variables (Railway + local)
- [ ] Implement Stories 9-0 through 9-5
- [ ] Verify all tests pass (rewritten for Supabase)
- [ ] Update sprint-status.yaml — mark EPIC-08 as superseded
- [ ] Update all documentation (CLAUDE.md, ARCHITECTURE.md, docs/)
- [ ] Deploy to Railway
- [ ] Verify health check
- [ ] Smoke test: Brevo webhook, LINE webhook, Admin Dashboard
- [ ] Remove Google Sheets from Google Cloud Console (optional)

---

## Review Feedback Applied

| # | Feedback | Source | Resolution |
|---|----------|--------|------------|
| R1 | Service role key security practices | Rex | Applied: Security section added |
| R2 | LINE postback backward compat | Rex | Applied: Graceful error + Story 9-1b AC3 |
| R3 | Circuit breaker replacement strategy | Rex | Applied: Connection timeout + health check section |
| R4 | ~~RLS policies too high-level~~ | Rex | Waived: Dashboard ไม่ต้องทำตอนนี้ — refine เมื่อ Dashboard ต่อ Supabase ตรง |
| R5 | dedup_log cleanup strategy | Rex | Applied: pg_cron note in schema section |
| A1 | Story 9-1 too large — split | Amelia | Applied: Split to 9-1a (data) + 9-1b (integration) |
| A2 | Supabase client vs raw pg | Amelia | Applied: Decision section with rationale |
| A3 | Test rewrite scope audit | Amelia | Applied: Story 9-0 AC8 |
| A4 | Split sheets.service.ts during migrate | Amelia | Applied: Note in Service Migration Map |
| B1 | Story 9-1 too large (agree A1) | Bob | Applied: Same as A1 |
| B2 | EPIC-08 formal close in sprint-status | Bob | Applied: Note in ADR-001 Integration + checklist |
| B3 | Story 9-4 doc scope incomplete | Bob | Applied: Story 9-4 AC7 expanded |
| M1 | Test strategy unclear | Murat | Applied: Test Strategy section + Story 9-0 AC9 |
| M2 | Migration validation tests | Murat | Applied: Story 9-4 AC8 smoke test |
| M3 | ~~CI pipeline changes~~ | Murat | Deferred: Unit tests use mock (no CI change). Integration tests optional. |
| SC | Dashboard scope clarification | Jiraw | Applied: Scope = Backend only. Dashboard section rewritten. Story 9-6 added for minor type updates. |
| R2-1 | dedup_log comment conflicts with UNIQUE constraint | Rex (R2) | Applied: dedup_log = lead only, event dedup = UNIQUE constraint |
| A2-1 | lookupCampaignId timing during parallel deploy | Amelia (R2) | Applied: Timing note added to Story 9-1a |

---

## Decision Record

- **2026-02-09:** ADR-001 (Lead-Campaign Unification) approved — designed for Google Sheets
- **2026-02-09:** Decision to migrate Supabase FIRST, incorporating ADR-001 changes
- **2026-02-09:** ADR-002 drafted — Jiraw chose: migrate all, cut Sheets completely
- **2026-02-09:** Scope clarified: Backend only — Dashboard connects via Backend API (no changes needed)
- **2026-02-09:** Review Round 1 (Party Mode) — 13 issues applied, 2 waived/deferred
- **2026-02-09:** Review Round 2 (Party Mode Final) — 2 minor fixes applied. All agents APPROVED.
- **Scope:** 8 stories as EPIC-09 (Supabase Migration): 9-0, 9-1a, 9-1b, 9-2, 9-3, 9-4, 9-5, 9-6
- **ADR-001 Status:** Superseded by ADR-002 (all objectives included)
