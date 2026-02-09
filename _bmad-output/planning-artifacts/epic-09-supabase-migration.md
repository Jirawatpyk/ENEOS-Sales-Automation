# EPIC-09: Supabase Migration

> **Source:** [ADR-002: Supabase Migration](ADR-002-supabase-migration.md)
> **Scope:** Backend API only (Admin Dashboard unchanged)
> **Data State:** Pre-production (test data only)
> **Supersedes:** EPIC-08 (proposed in ADR-001, never created)

## Description

ย้าย Database จาก Google Sheets ไป Supabase (PostgreSQL) พร้อมรวมการเปลี่ยนแปลงจาก ADR-001 (Lead-Campaign Unification) เข้ามาด้วย

## Business Value

- **Performance:** ลด O(n) sheet scan → O(1) indexed queries
- **Reliability:** ACID transactions, UNIQUE constraints, Foreign Keys
- **Simplicity:** Dedup ลดจาก ~200 lines → ~30 lines, ลบ Campaign_Contacts ทั้ง service
- **Scalability:** ไม่ติด Google API rate limit (60 req/min)
- **Developer Experience:** SQL JOINs, local dev environment, Supabase Dashboard

## Dependencies

- Supabase project created
- Railway env vars configured

## Stories

### Story 9-0: Supabase Setup + Schema + Client

As a **developer**,
I want **Supabase project with all 6 tables created and client configured**,
So that **other stories can start migrating services to Supabase**.

**Acceptance Criteria:**
- AC1: All 6 tables created with correct columns, types, and constraints
- AC2: `dedup_log.key` has PRIMARY KEY (dedup via `ON CONFLICT`)
- AC3: `campaign_events` has UNIQUE constraint on `(event_id, campaign_id, event)`
- AC4: `leads` has `updated_at` auto-trigger
- AC5: Supabase client connects successfully from Express app
- AC6: All indexes created per schema design
- AC7: RLS enabled on all tables (basic allow-all policies)
- AC8: Audit existing test files — list tests that need Supabase mock migration
- AC9: Test strategy documented: unit tests = mock Supabase, integration tests = Supabase local

---

### Story 9-1a: Migrate Leads + Dedup Service (Data Layer)

As a **developer**,
I want **leads CRUD and dedup operations using Supabase instead of Google Sheets**,
So that **lead management uses proper database with UUID, indexes, and constraints**.

**Acceptance Criteria:**
- AC1: `addLead()` creates lead with UUID, returns full lead object
- AC2: `checkAndMark()` prevents duplicates via DB constraint (no Redis/Memory needed)
- AC3: `updateLeadWithLock()` throws `RaceConditionError` when version mismatch
- AC4: `claimLead()` sets `contacted_at` timestamp and increments version
- AC5: `getLeadsWithPagination()` supports filter by status, date range, search
- AC6: `lookupCampaignId()` returns most recent campaign_id for email (or null)
- AC7: Lead dedup key format: `lead:{email}:{source}`
- AC8: All lead + dedup service tests rewritten for Supabase mock

> **Note:** `lookupCampaignId()` returns null until Story 9-2 deploys (campaign_events table empty before campaign service migration). This is expected.

---

### Story 9-1b: Migrate Controllers + LINE Postback (Integration Layer)

As a **developer**,
I want **controllers wired to new Supabase-backed services with UUID-based LINE postback**,
So that **webhooks and LINE interactions work end-to-end on Supabase**.

**Acceptance Criteria:**
- AC1: `lookupCampaignId()` runs parallel with Gemini via `Promise.all()`
- AC2: LINE postback uses `lead_id` (UUID)
- AC3: Legacy `row_id` postback returns friendly Thai error message (not crash)
- AC4: LINE Flex Message template sends UUID in postback data
- AC5: Brevo webhook → Lead creation → LINE notification end-to-end works

---

### Story 9-2: Migrate Campaign Services

As a **developer**,
I want **campaign events and stats using Supabase with ADR-001 cleanup**,
So that **campaign data uses SQL JOINs and UNIQUE constraint dedup**.

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

As a **developer**,
I want **sales team and status history services extracted and migrated to Supabase**,
So that **team management and audit logs use proper database with FK relationships**.

**Acceptance Criteria:**
- AC1: `getSalesTeamMember(lineUserId)` returns team member by LINE ID
- AC2: `getUserByEmail(email)` returns team member for auth
- AC3: `linkLINEAccount()` updates existing member's `line_user_id`
- AC4: `addStatusHistory()` is fire-and-forget (does not block main operation)
- AC5: `status_history.lead_id` is FK to `leads.id` — cascade delete works
- AC6: All team management + history tests rewritten

---

### Story 9-4: Cleanup Google Sheets + Documentation

As a **developer**,
I want **all Google Sheets dependencies removed and documentation updated**,
So that **codebase is clean with zero legacy DB code and accurate docs**.

**Acceptance Criteria:**
- AC1: Zero imports of `googleapis` in codebase
- AC2: `npm ls googleapis` returns empty (package removed)
- AC3: Health check reports Supabase connectivity status
- AC4: All tests pass without Google Sheets mocks
- AC5: `.env.example` has Supabase vars, no Google Sheets vars
- AC6: `CLAUDE.md` updated to reflect Supabase architecture
- AC7: All documentation updated — `ARCHITECTURE.md`, `docs/services.md`, `docs/data-flow.md`, `docs/api-reference.md`
- AC8: Full test suite passes + manual smoke test: POST /webhook/brevo, POST /webhook/line, GET /health

---

### Story 9-5: Lead Detail + Campaign Engagement Timeline

As a **sales manager**,
I want **lead detail page showing campaign engagement history (delivered, opened, clicked)**,
So that **I can see the full customer journey from email to lead to close**.

**Acceptance Criteria:**
- AC1: `GET /api/admin/leads/:id` includes `campaignEvents[]` sorted by `event_at`
- AC2: When lead has `brevo_campaign_id`, events show campaign name
- AC3: When lead has no campaign events, response returns empty array (no error)
- AC4: Timeline merges campaign events + status history chronologically
- AC5: Response type matches `LeadDetailResponse` with `campaignEvents` field

---

### Story 9-6: Frontend Type Updates (Admin Dashboard)

As a **developer**,
I want **Dashboard TypeScript types updated for UUID-based lead IDs**,
So that **Dashboard compiles and works correctly with new Backend responses**.

**Acceptance Criteria:**
- AC1: Dashboard TypeScript compiles without errors
- AC2: Lead detail page works with UUID-based lead IDs
- AC3: All existing Dashboard tests pass
- AC4: No functional changes — display and behavior identical

> **Note:** This story may be empty if Dashboard doesn't reference lead IDs directly. Verify during implementation.

---

## Story Dependencies

```
9-0 (Setup + Schema)
 ├──→ 9-1a (Leads + Dedup)
 │      └──→ 9-1b (Controllers + LINE)
 │              ├──→ 9-3 (Sales_Team + Status_History)
 │              │      └──→ 9-4 (Cleanup + Docs)
 │              └──→ 9-5 (Lead Detail Timeline) ◄── also needs 9-2
 ├──→ 9-2 (Campaign Services)
 │      ├──→ 9-4 (Cleanup + Docs)
 │      └──→ 9-5 (Lead Detail Timeline) ◄── needs campaign_events data
 └──→ 9-6 (Frontend Types) — independent
```

## Technical Reference

- **Schema SQL:** See ADR-002 Schema Design section
- **Service Migration Map:** See ADR-002 Service Migration Map
- **Test Strategy:** See ADR-002 Test Strategy section
- **Security:** See ADR-002 Security section
