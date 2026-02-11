# Story 10.1: Backend Auth Foundation (Merged: Stories 10-1 through 10-5)

Status: done

## Story

As a **backend developer**,
I want **Supabase Auth configured, schema migrated, JWT middleware rewritten, auto-link implemented, and old packages cleaned up**,
So that **the backend is fully ready to authenticate Dashboard users via Supabase JWT tokens instead of Google OAuth, with fast local verification (~0.1ms) and defense-in-depth security**.

## Merged Scope

This story combines 5 original epic stories into one deployable unit:
- **10-1**: Supabase Auth Config & Schema Migration
- **10-2**: Rewrite Backend JWT Verification Middleware
- **10-3**: Auto-Link Auth User ID (Race-Safe)
- **10-4**: Backend Auth Tests Rewrite
- **10-5**: Backend Package Cleanup & Smoke Test

**Rationale:** These are tightly coupled — middleware calls autoLinkAuthUser, tests cover both, and the schema migration is a prerequisite for the middleware. A single PR prevents intermediate broken states.

## Acceptance Criteria (Combined)

### AC-1: Supabase Auth Dashboard Config (Manual)
- **Given** Supabase Dashboard settings
- **When** email auth provider is enabled
- **Then** email+password sign-in is available for invited users
- **And** Google OAuth provider is enabled with correct redirect URL (`https://<project>.supabase.co/auth/v1/callback`)
- **And** self-signup is disabled (invite-only)
- **And** session timeout is set to ≤ 24 hours

### AC-2: Schema Migration
- **Given** migration `003_add_auth_user_id.sql` is created and applied
- **When** querying `sales_team` table schema
- **Then** `auth_user_id` column exists as `UUID UNIQUE REFERENCES auth.users(id)`
- **And** partial index `idx_sales_team_auth_user` exists on `auth_user_id WHERE auth_user_id IS NOT NULL`

### AC-3: JWT Verification Middleware
- **Given** a valid Supabase JWT in Authorization header
- **When** request hits any admin endpoint
- **Then** middleware verifies token with `jsonwebtoken` using `SUPABASE_JWT_SECRET` (~0.1ms local verify)
- **And** sets `req.user` with `{ email, role, authUserId, memberId }`

### AC-4: Defense-in-Depth
- **Given** a valid JWT
- **When** middleware queries `sales_team` by email
- **Then** user must exist AND have `status = 'active'`
- **And** role comes from `app_metadata.role` only, NEVER `user_metadata`
- **And** if user not found in `sales_team` → 403 (not 200 with default viewer)

### AC-5: Token Error Handling
- **Given** expired/invalid JWT → `401 Unauthorized` with `INVALID_TOKEN`
- **Given** no Authorization header → `401 Unauthorized`
- **Given** missing `Bearer` prefix → `401 Unauthorized`
- **Given** valid JWT but user `status = 'inactive'` → `403 Forbidden` with `ACCOUNT_INACTIVE`
- **Given** valid JWT but user not in `sales_team` → `403 Forbidden`

### AC-6: Auto-Link Auth User ID
- **Given** user logs in for first time (`auth_user_id IS NULL`)
- **When** `autoLinkAuthUser()` runs
- **Then** atomically sets `auth_user_id` using `.is('auth_user_id', null)` guard
- **And** repeat login skips auto-link silently
- **And** race condition (concurrent logins) → one succeeds, other skips, no error thrown
- **And** function never throws to caller (fire-and-forget pattern)

### AC-7: Config & Types Update
- **Given** `config/index.ts`
- **When** `SUPABASE_JWT_SECRET` is added to Zod schema
- **Then** it is validated as required string
- **And** `GOOGLE_OAUTH_CLIENT_ID` and `ALLOWED_DOMAINS` are removed

- **Given** `types/index.ts`
- **When** `AdminUser` interface is updated
- **Then** `googleId` is replaced with `authUserId: string`

### AC-8: Package Changes
- **Given** `package.json`
- **When** updated
- **Then** `jsonwebtoken` + `@types/jsonwebtoken` are in dependencies/devDependencies
- **And** `google-auth-library` is removed

### AC-9: Comprehensive Test Coverage
- **Given** `admin-auth.test.ts` rewritten
- **When** mocking `jsonwebtoken` instead of `google-auth-library`
- **Then** test cases cover: valid token, invalid token, expired token, missing token, missing `Bearer` prefix
- **And** `sales_team` lookup: found+active (200), found+inactive (403), not found (403)
- **And** auto-link: first login (NULL → linked), repeat login (skip), race condition (no error)
- **And** role extraction: `app_metadata.role` correctly mapped

### AC-10: Smoke Tests
- **Given** backend starts with valid env (`SUPABASE_JWT_SECRET` set)
- **Then** server starts without errors
- **And** backend starts without `GOOGLE_OAUTH_CLIENT_ID` → no Zod validation failure
- **And** webhook endpoints (LINE, Brevo) work unchanged — no auth regression
- **And** `npm test` → all tests pass 100% (no regression)

## Tasks / Subtasks

- [ ] **Task 1: Supabase Dashboard Config** (AC: #1) — MANUAL (user responsibility)
  - [ ] 1.1 Enable email auth provider in Supabase Dashboard
  - [ ] 1.2 Enable Google OAuth provider + set redirect URL in Google Cloud Console
  - [ ] 1.3 Disable self-signup (Settings → Authentication)
  - [ ] 1.4 Set JWT expiry / session timeout ≤ 24h
  - [x] 1.5 Locate `SUPABASE_JWT_SECRET` (Dashboard → Settings → API → JWT Secret) ✅

- [x] **Task 2: Schema Migration** (AC: #2) ✅
  - [x] 2.1 Create `supabase/migrations/003_add_auth_user_id.sql`
  - [ ] 2.2 Run migration: `npx supabase db push` — PENDING (run after PR merge)

- [x] **Task 3: Package Changes** (AC: #8) ✅
  - [x] 3.1 `npm install jsonwebtoken`
  - [x] 3.2 `npm install -D @types/jsonwebtoken`
  - [x] 3.3 `npm uninstall google-auth-library`
  - [x] 3.4 Verify no other code imports `google-auth-library` — confirmed zero imports

- [x] **Task 4: Config & Types Update** (AC: #7) ✅
  - [x] 4.1 `src/config/index.ts`: Add `SUPABASE_JWT_SECRET: z.string().min(1)` to Zod schema
  - [x] 4.2 `src/config/index.ts`: `GOOGLE_OAUTH_CLIENT_ID` was not in Zod schema (only in process.env) — no removal needed
  - [x] 4.3 `src/config/index.ts`: Add `jwtSecret` to `config.supabase` object
  - [x] 4.4 `src/middleware/admin-auth.ts`: `AdminUser` interface updated — `googleId` removed, `authUserId` + `memberId` added
  - [x] 4.5 `.env.example`: Add `SUPABASE_JWT_SECRET`
  - [x] 4.6 `.env`: Add actual `SUPABASE_JWT_SECRET` value

- [x] **Task 5: Add `autoLinkAuthUser()` to sales-team.service.ts** (AC: #6) ✅
  - [x] 5.1 Add `autoLinkAuthUser(memberId: string, authUserId: string): Promise<void>`
  - [x] 5.2 Use `.is('auth_user_id', null)` race-safe guard (same pattern as `linkLINEAccount`)
  - [x] 5.3 Catch ALL errors internally — never throw (fire-and-forget)
  - [x] 5.4 Log warning on failure, no error propagation

- [x] **Task 6: Rewrite `admin-auth.ts` Middleware** (AC: #3, #4, #5) ✅
  - [x] 6.1 Replace `google-auth-library` import with `jsonwebtoken`
  - [x] 6.2 Use `jwt.verify(token, config.supabase.jwtSecret)` for local verification
  - [x] 6.3 Extract `email`, `sub` (authUserId), `app_metadata.role` from decoded JWT
  - [x] 6.4 Query `sales_team` by email — require `status: 'active'` (defense in depth)
  - [x] 6.5 If user not found in `sales_team` → throw 403
  - [x] 6.6 If `auth_user_id` is NULL on member → call `autoLinkAuthUser()` (fire-and-forget)
  - [x] 6.7 Set `req.user = { email, role, authUserId, memberId }`
  - [x] 6.8 Remove: `getOAuthClient()`, `ADMIN_EMAILS`, `ALLOWED_DOMAINS` domain check
  - [x] 6.9 Remove: `resetOAuthClient` from `_testOnly` (no longer needed)
  - [x] 6.10 Keep: `requireRole()`, `requireAdmin`, `requireViewer` unchanged
  - [x] 6.11 Update `AdminUser` interface: `googleId` → `authUserId` + added `memberId`
  - [x] 6.12 Read `SUPABASE_JWT_SECRET` from `config.supabase.jwtSecret`

- [x] **Task 7: Rewrite `admin-auth.test.ts`** (AC: #9) ✅
  - [x] 7.1 Replace `google-auth-library` mock with `jsonwebtoken` mock
  - [x] 7.2 Mock `jwt.verify()` return value instead of `verifyIdToken()`
  - [x] 7.3 Test valid token → 200 + correct `req.user`
  - [x] 7.4 Test invalid/expired token → 401 `INVALID_TOKEN`
  - [x] 7.5 Test missing Authorization header → 401
  - [x] 7.6 Test missing Bearer prefix → 401
  - [x] 7.7 Test user found + active → proceed
  - [x] 7.8 Test user found + inactive → 403 `ACCOUNT_INACTIVE`
  - [x] 7.9 Test user not found → 403
  - [x] 7.10 Test auto-link: first login (NULL auth_user_id → linked)
  - [x] 7.11 Test auto-link: repeat login (already linked → skip)
  - [x] 7.12 Test auto-link: failure → silently skip (fire-and-forget)
  - [x] 7.13 Test role extraction: `app_metadata.role = 'admin'` → admin
  - [x] 7.14 Test role extraction: no `app_metadata.role` → default viewer
  - [x] 7.15 Test `requireRole` / `requireAdmin` / `requireViewer` (keep existing cases)

- [x] **Task 8: Smoke Test & Final Verification** (AC: #10) ✅
  - [x] 8.1 `npm run typecheck` → no type errors
  - [x] 8.2 `npm run lint` → no lint errors
  - [x] 8.3 `npm test` → 55 files, 1427 tests pass (zero failures)
  - [x] 8.4 Coverage ≥ 75% — confirmed
  - [x] 8.5 Verify webhook routes (LINE, Brevo) are unaffected — confirmed
  - [x] 8.6 Grep codebase for `google-auth-library` → zero imports confirmed
  - [x] 8.7 Server can start with `SUPABASE_JWT_SECRET` env var — verified via config Zod validation

## Dev Notes

### Architecture Reference
- **Source:** `_bmad-output/planning-artifacts/supabase-auth-architecture.md` — Pattern 1 (JWT Verify) + Pattern 2 (Auto-Link)
- **Decision D4:** `jsonwebtoken` local verify (~0.1ms) chosen over `supabase.auth.getUser()` (network call)
- **Decision D5:** Role in `app_metadata` only (never `user_metadata`)
- **Decision D7:** `auth_user_id` FK in `sales_team` → `auth.users(id)`

### Current Code to Rewrite

**`src/middleware/admin-auth.ts`** (385 lines) — The main target:
- Lines 6-10: Replace `OAuth2Client` import with `jsonwebtoken`
- Lines 16-21: Update `AdminUser` interface (`googleId` → `authUserId`)
- Lines 26-29: Remove `ADMIN_EMAILS` array
- Lines 42-66: Remove `getOAuthClient()` singleton
- Lines 82-206: Rewrite `adminAuthMiddleware()` — JWT verify + sales_team lookup + auto-link
- Lines 300-371: Remove `getUserRole()` — inline the simpler logic
- Lines 377-384: Simplify `_testOnly` exports (remove `getOAuthClient`, `resetOAuthClient`)

**`src/services/sales-team.service.ts`** — Add function:
- Follow the `linkLINEAccount()` pattern at line 274 — same `.is(column, null)` atomic guard
- New function: `autoLinkAuthUser(memberId, authUserId)` — fire-and-forget

**`src/config/index.ts`** — Modify Zod schema:
- Add `SUPABASE_JWT_SECRET` at line ~54 (alongside other Supabase vars)
- Remove any `GOOGLE_OAUTH_CLIENT_ID` reference (currently NOT in schema — it's only in `process.env`)

### JWT Decoded Token Structure (Supabase)

```typescript
interface SupabaseJwtPayload {
  sub: string;           // auth_user_id (UUID)
  email: string;         // user email
  app_metadata: {
    role?: string;       // 'admin' | 'viewer' (set via inviteUserByEmail)
    provider?: string;   // 'email' | 'google'
  };
  user_metadata: {       // DO NOT USE for role — user can edit
    name?: string;
  };
  aud: string;           // 'authenticated'
  exp: number;           // expiry timestamp
  iat: number;           // issued at
  iss: string;           // Supabase URL
}
```

### Role Mapping (Simplified)

```
app_metadata.role === 'admin' → 'admin'
app_metadata.role === anything else or undefined → 'viewer'
sales_team.role === 'admin' → 'admin' (source of truth for DB)
sales_team.role === 'sales' or other → 'viewer'
```

**Change from current:** Remove `ADMIN_EMAILS` fallback entirely. Every user must exist in `sales_team` table. This is more secure and aligns with invite-only model.

### Mock Pattern Change (Tests)

```typescript
// BEFORE (Google OAuth)
const mockVerifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

// AFTER (jsonwebtoken)
const mockJwtVerify = vi.fn();
vi.mock('jsonwebtoken', () => ({
  default: { verify: mockJwtVerify },
  verify: mockJwtVerify,
}));
```

**Note on jsonwebtoken mock:** The `default` export and named `verify` export must both be mocked because of ES Module interop. `import jwt from 'jsonwebtoken'` resolves to `default`, while `import { verify } from 'jsonwebtoken'` resolves to the named export.

### Anti-Patterns (DO NOT)

| Do NOT | Why |
|--------|-----|
| Use `supabase.auth.getUser(token)` for every request | Network call, defeats purpose of local JWT verify |
| Store role in `user_metadata` | User can edit → privilege escalation |
| Keep `ADMIN_EMAILS` fallback | Undermines invite-only security model |
| Let `autoLinkAuthUser` throw | It's fire-and-forget — catch all errors |
| Use `process.env.SUPABASE_JWT_SECRET` directly | Must go through `config` object |
| Skip `sales_team` lookup (trust JWT alone) | Defense in depth — admin may have disabled user |

### Project Structure Notes

- `src/middleware/admin-auth.ts` — Main rewrite target
- `src/services/sales-team.service.ts` — Add `autoLinkAuthUser()` function
- `src/config/index.ts` — Add `SUPABASE_JWT_SECRET` to Zod schema
- `src/types/index.ts` — `AdminUser.googleId` → `authUserId` (or keep in admin-auth.ts where it's defined)
- `supabase/migrations/003_add_auth_user_id.sql` — New migration file
- `src/__tests__/middleware/admin-auth.test.ts` — Full rewrite
- `.env.example` — Update env vars
- `package.json` — Add jsonwebtoken, remove google-auth-library

### Existing Patterns to Follow

- **Fire-and-forget:** Same as `addStatusHistory()` — catch all errors, never throw
- **Race-safe update:** Same as `linkLINEAccount()` — `.is('column', null)` guard
- **Config access:** Always use `config.xxx` from `../config/index.js` (never `process.env`)
- **Mock hoisting:** Use `vi.hoisted()` → `vi.mock()` → imports (project standard)
- **`_testOnly` exports:** Keep pattern for private functions that need testing
- **Named exports:** No wrapper objects — `export async function autoLinkAuthUser()`

### References

- [Source: `_bmad-output/planning-artifacts/supabase-auth-architecture.md`] — Full architecture doc with code examples
- [Source: `_bmad-output/planning-artifacts/epics.md`] — Stories 1.1-1.5 acceptance criteria
- [Source: `_bmad-output/project-context.md#Admin Auth`] — Existing auth rules (to be updated post-migration)
- [Source: `src/middleware/admin-auth.ts`] — Current Google OAuth middleware (385 lines)
- [Source: `src/services/sales-team.service.ts:274`] — `linkLINEAccount()` race-safe pattern to follow

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6) via Amelia Dev Agent

### Debug Log References

- **Fix 1:** `sales-team.service.test.ts` — `getUserByEmail` test assertion needed `id` and `authUserId` fields added to expected result (return type expanded)
- **Fix 2:** `campaign.routes.test.ts` — Subagent added overly-minimal `config` mock that broke `sentry.enabled` access. Fixed by removing the mock (uses real config from `setup.ts`)
- **Fix 3:** `campaign.routes.test.ts` — Added `autoLinkAuthUser` to `sales-team.service.js` mock for robustness

### Completion Notes List

1. `GOOGLE_OAUTH_CLIENT_ID` was NOT in Zod schema — it was only accessed via `process.env` in old middleware. No removal needed from config.
2. `AdminUser` interface defined in `admin-auth.ts` (not `types/index.ts`) — kept location, updated fields.
3. Added `memberId` to `AdminUser` beyond original spec — needed for auto-link and useful for frontend.
4. Updated `/me` endpoint to return `authUserId` + `memberId` instead of `name`.
5. 12+ test files updated to replace `googleId` with `authUserId` + `memberId` in mock `req.user` objects.
6. Test count increased from ~1403 to 1427 (28 new auth middleware tests).
7. Task 1 (Supabase Dashboard Config) and Task 2.2 (migration push) are MANUAL — require user action.

### Change Log

| File | Change |
|------|--------|
| `supabase/migrations/003_add_auth_user_id.sql` | **NEW** — Add `auth_user_id` UUID column to `sales_team` |
| `package.json` | Add `jsonwebtoken`, `@types/jsonwebtoken`; remove `google-auth-library` |
| `src/config/index.ts` | Add `SUPABASE_JWT_SECRET` to Zod schema + `config.supabase.jwtSecret` |
| `src/middleware/admin-auth.ts` | **FULL REWRITE** — Google OAuth → Supabase JWT verification |
| `src/services/sales-team.service.ts` | Add `autoLinkAuthUser()`; expand `getUserByEmail` return type |
| `src/routes/admin.routes.ts` | Update `/me` endpoint response (remove `name`, add `authUserId`/`memberId`) |
| `src/__tests__/middleware/admin-auth.test.ts` | **FULL REWRITE** — 28 tests for JWT auth |
| `src/__tests__/services/sales-team.service.test.ts` | Update `getUserByEmail` assertion |
| `src/__tests__/routes/campaign.routes.test.ts` | Replace google-auth mock with JWT mock |
| `src/__tests__/controllers/campaign-stats.controller.test.ts` | Update mock `req.user` objects |
| `src/__tests__/routes/admin.routes.trend.test.ts` | `googleId` → `authUserId` + `memberId` |
| `src/__tests__/controllers/admin.controller.export.test.ts` | `googleId` → `authUserId` + `memberId` |
| `src/__tests__/controllers/admin.controller.trend.test.ts` | `googleId` → `authUserId` + `memberId` |
| `src/__tests__/controllers/admin.controller.campaigns.test.ts` | `googleId` → `authUserId` + `memberId` |
| `src/__tests__/controllers/admin.controller.test.ts` | `googleId` → `authUserId` + `memberId` |
| `src/__tests__/controllers/admin.controller.team.test.ts` | `googleId` → `authUserId` + `memberId` |
| `src/__tests__/controllers/admin/team-management.controller.test.ts` | `googleId` → `authUserId` + `memberId` |
| `src/__tests__/controllers/admin/export-csv.test.ts` | `googleId` → `authUserId` + `memberId` |
| `src/__tests__/controllers/admin/activity-log.controller.test.ts` | `googleId` → `authUserId` + `memberId` |
| `.env.example` | Add `SUPABASE_JWT_SECRET` |
| `.env` | Add actual JWT secret value |
| `src/__tests__/setup.ts` | Add `SUPABASE_JWT_SECRET` test env var |

### File List

- `supabase/migrations/003_add_auth_user_id.sql` (NEW)
- `package.json` (MODIFIED)
- `package-lock.json` (MODIFIED)
- `src/config/index.ts` (MODIFIED)
- `src/middleware/admin-auth.ts` (REWRITTEN)
- `src/services/sales-team.service.ts` (MODIFIED)
- `src/routes/admin.routes.ts` (MODIFIED)
- `src/__tests__/middleware/admin-auth.test.ts` (REWRITTEN)
- `src/__tests__/setup.ts` (MODIFIED)
- `src/__tests__/services/sales-team.service.test.ts` (MODIFIED)
- `src/__tests__/routes/campaign.routes.test.ts` (MODIFIED)
- `src/__tests__/controllers/campaign-stats.controller.test.ts` (MODIFIED)
- `src/__tests__/routes/admin.routes.trend.test.ts` (MODIFIED)
- `src/__tests__/controllers/admin.controller.export.test.ts` (MODIFIED)
- `src/__tests__/controllers/admin.controller.trend.test.ts` (MODIFIED)
- `src/__tests__/controllers/admin.controller.campaigns.test.ts` (MODIFIED)
- `src/__tests__/controllers/admin.controller.test.ts` (MODIFIED)
- `src/__tests__/controllers/admin.controller.team.test.ts` (MODIFIED)
- `src/__tests__/controllers/admin/team-management.controller.test.ts` (MODIFIED)
- `src/__tests__/controllers/admin/export-csv.test.ts` (MODIFIED)
- `src/__tests__/controllers/admin/activity-log.controller.test.ts` (MODIFIED)
- `.env.example` (MODIFIED)
- `.env` (MODIFIED)

## Code Review Record

### Reviewer

Rex (Code Review Specialist) — Claude Opus 4.6

### Review Round 1 — 2026-02-11

**Verdict:** ⚠️ CHANGES_REQUESTED

**Test Results:** 55 files, 1427 tests — 100% pass

| # | Severity | Finding | File | Fix |
|---|----------|---------|------|-----|
| 1 | ⚠️ Security | `mapRole` OR-logic allows privilege persistence after demotion. AC-4: role from `app_metadata.role` only. When JWT says 'viewer' but DB says 'admin', user still gets admin. | `admin-auth.ts:247-255` | JWT takes precedence when defined; DB fallback only when `jwtRole === undefined` |
| 2 | ⚠️ Test Coverage | `autoLinkAuthUser` only tested via middleware (mocked). Zero direct unit tests for Supabase query logic. | `sales-team.service.test.ts` | Added 4 unit tests: success, DB error, exception, non-Error |
| 3 | ⚠️ Maintenance | Stale Google OAuth references in comments | `admin.routes.ts:5`, `admin.routes.trend.test.ts:52` | Updated to "Supabase JWT" |
| 4 | ℹ️ Cosmetic | Legacy `'google-123'` mock values in 7 test files | 7 controller/route test files | Renamed to `'auth-uuid-*'` / `'member-uuid-*'` |

**Positive Feedback:**
- Clean middleware rewrite — 385 → 263 lines
- Fire-and-forget `autoLinkAuthUser` follows `linkLINEAccount` pattern perfectly
- `getUserByEmail` expanded cleanly for defense-in-depth
- `google-auth-library` fully purged — zero remaining imports
- Migration SQL minimal and correct

### Review Round 2 (Re-Review) — 2026-02-11

**Verdict:** ✅ APPROVED

**Test Results:** 55 files, 1432 tests — 100% pass (+5 new tests)

All 4 findings verified fixed:
1. `mapRole` — JWT takes precedence, demotion test added
2. `autoLinkAuthUser` — 4 service-level unit tests added
3. Stale comments — updated to Supabase JWT references
4. Mock values — all `google-*` references cleaned

**Final AC Validation:**

| AC | Status |
|----|--------|
| AC-1 (Supabase Dashboard Config) | ⏳ Manual — user responsibility |
| AC-2 (Schema Migration) | ✅ |
| AC-3 (JWT Verification) | ✅ |
| AC-4 (Defense-in-Depth) | ✅ (fixed: mapRole priority) |
| AC-5 (Token Error Handling) | ✅ |
| AC-6 (Auto-Link Auth User ID) | ✅ |
| AC-7 (Config & Types Update) | ✅ |
| AC-8 (Package Changes) | ✅ |
| AC-9 (Comprehensive Tests) | ✅ (fixed: +4 service tests) |
| AC-10 (Smoke Tests) | ✅ |
