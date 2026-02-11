---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-02-11'
inputDocuments:
  - '_bmad-output/planning-artifacts/supabase-auth-architecture.md'
  - '_bmad-output/planning-artifacts/admin-dashboard/PRD_admin-dashboard-plan.md'
---

# eneos-sales-automation — Supabase Auth Migration - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Supabase Auth Migration, decomposing the requirements from the Admin Dashboard PRD (auth context) and the Supabase Auth Architecture into implementable stories. This migration replaces Google OAuth (NextAuth.js) with Supabase Auth to resolve the production blocker where clients without Google emails cannot access the Admin Dashboard.

## Requirements Inventory

### Functional Requirements

- FR-1: ผู้ใช้ต้อง login ด้วย Email+Password ได้ (primary method)
- FR-2: ผู้ใช้ที่มี Google email ต้อง login ด้วย Google OAuth ได้ (secondary method)
- FR-3: Admin สร้าง account ให้เท่านั้น (invite-only, disable self-signup)
- FR-4: RBAC — admin (full access), viewer (read-only) — ลด role จาก 3 เหลือ 2 (ลบ manager)
- FR-5: Admin จัดการ user ได้ (create, assign role, disable)
- FR-6: Session auto-refresh ไม่ต้องให้ user login ซ้ำบ่อย
- FR-7: Multi-tab sync — logout tab หนึ่ง logout ทุก tab

### NonFunctional Requirements

- NFR-1: Token verification ต้องเร็ว — ใช้ `jsonwebtoken` local verify (~0.1ms) ไม่เรียก external API ทุก request
- NFR-2: Session timeout ≤ 24 ชั่วโมง
- NFR-3: Tokens ต้องอยู่ใน httpOnly cookie เท่านั้น (ไม่เก็บใน localStorage)
- NFR-4: Zero downtime migration — ระบบต้องไม่ล่มระหว่าง switch (Big bang OK เพราะไม่มี active users)
- NFR-5: Backward compatible API — Dashboard endpoint behavior เหมือนเดิม, webhook routes ไม่กระทบ
- NFR-6: ไม่เพิ่ม vendor ใหม่ — ใช้ Supabase ที่มีอยู่แล้ว
- NFR-7: Role ต้องเก็บใน `app_metadata` เท่านั้น (ห้าม `user_metadata` — user แก้ได้เอง = privilege escalation)
- NFR-8: Double-check user ใน `sales_team` table แม้ JWT valid (defense in depth)

### Additional Requirements

**Schema & Database:**
- เพิ่มคอลัมน์ `auth_user_id UUID UNIQUE REFERENCES auth.users(id)` ใน `sales_team` table
- Migration file: `003_add_auth_user_id.sql`
- Index: `idx_sales_team_auth_user` on `auth_user_id WHERE auth_user_id IS NOT NULL`

**Backend Changes:**
- Rewrite `admin-auth.ts` middleware — Google OAuth → `jsonwebtoken` local verify
- Add `autoLinkAuthUser()` function ใน `sales-team.service.ts` (race-safe ด้วย `.is('auth_user_id', null)`)
- Update `config/index.ts` — เพิ่ม `SUPABASE_JWT_SECRET`, ลบ `GOOGLE_OAUTH_CLIENT_ID` + `ALLOWED_DOMAINS`
- Update `types/index.ts` — `AdminUser: googleId → authUserId`
- Rewrite `admin-auth.test.ts` — mock เปลี่ยนจาก google-auth-library → jsonwebtoken
- Package changes: เพิ่ม `jsonwebtoken`, ลบ `google-auth-library`

**Frontend Changes:**
- สร้าง `lib/supabase/` directory: `server.ts`, `client.ts`, `middleware.ts`, `auth-helpers.ts`
- Rewrite login page — Email+Password + Google OAuth form
- เพิ่ม password reset pages: `reset-password/page.tsx`, `update-password/page.tsx`
- เพิ่ม OAuth callback route: `auth/callback/route.ts`
- Modify ทั้ง 16 API proxy routes — `getToken()` → `getSessionOrUnauthorized()` helper
- Rewrite middleware (`proxy.ts`) — NextAuth withAuth → Supabase session check
- Rewrite `providers.tsx` — SessionProvider → Supabase `onAuthStateChange` listener
- Update `hooks/use-session-sync.ts` — Supabase `onAuthStateChange` replaces BroadcastChannel
- Simplify `config/roles.ts` — ลบ `manager`, ใช้แค่ `admin | viewer`
- ลบ `lib/auth.ts` (NextAuth config), `api/auth/[...nextauth]/route.ts`, `types/next-auth.d.ts`
- Package changes: ลบ `next-auth`, `@types/next-auth`, `google-auth-library`; เพิ่ม `@supabase/supabase-js`, `@supabase/ssr` (≥0.5.0)

**Supabase Dashboard Config (Manual):**
- Enable email auth provider
- Enable Google OAuth provider (ต้องตั้ง redirect URL ใน Google Cloud Console ใหม่)
- Disable self-signup (invite-only)
- Configure email templates
- Set session timeout ≤ 24h

**Post-Migration:**
- Update `project-context.md` — auth rules เปลี่ยน
- Update `.env.example` ทั้ง Backend + Frontend
- Post-migration smoke test (9 items)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR-1 | Epic 2 | Email+Password login (Supabase client + login page) |
| FR-2 | Epic 2 | Google OAuth login (รวมกับ login page + callback route) |
| FR-3 | Epic 1 + 4 | Disable self-signup config (Epic 1) + Invite flow (Epic 4) |
| FR-4 | Epic 1 + 4 | Middleware RBAC (Epic 1) + Role assignment UI (Epic 4) |
| FR-5 | Epic 4 | Admin invite, assign role, disable user |
| FR-6 | Epic 2 | Session auto-refresh (@supabase/ssr built-in) |
| FR-7 | Epic 2 | Multi-tab sync (onAuthStateChange) |

| NFR | Epic | Description |
|-----|------|-------------|
| NFR-1 | Epic 1 | jsonwebtoken local verify ~0.1ms |
| NFR-2 | Epic 2 | Session ≤24h (Supabase config) |
| NFR-3 | Epic 2 | httpOnly cookie (@supabase/ssr) |
| NFR-4 | Epic 5 | Zero downtime (end-to-end verification) |
| NFR-5 | Epic 3 | Backward compatible API (proxy migration) |
| NFR-6 | Epic 1 | ใช้ Supabase ที่มีอยู่ |
| NFR-7 | Epic 1 | app_metadata role storage |
| NFR-8 | Epic 1 | Double-check sales_team ทุก request |

**Coverage: 7/7 FRs + 8/8 NFRs = 100%**

## Epic List

### Epic 1: Backend Auth Foundation
Backend พร้อมรับ Supabase JWT token แทน Google token ได้อย่างถูกต้องและปลอดภัย ครอบคลุม Supabase Dashboard config, schema migration, backend middleware rewrite, auto-link function, config/types update, tests rewrite, และ package changes

**FRs covered:** FR-3 (config: disable self-signup), FR-4 (middleware RBAC)
**NFRs covered:** NFR-1, NFR-6, NFR-7, NFR-8

### Epic 2: User Login & Authentication Experience
ผู้ใช้สามารถ login ด้วย Email+Password หรือ Google OAuth, reset password ได้, session auto-refresh ทำงาน, และ multi-tab sync logout ครบถ้วน ครอบคลุม frontend Supabase client setup, login page, OAuth callback, password reset pages, middleware rewrite, providers rewrite, session management

**FRs covered:** FR-1, FR-2, FR-6, FR-7
**NFRs covered:** NFR-2, NFR-3

### Epic 3: Dashboard Data Access (Proxy Migration)
ผู้ใช้ที่ login แล้วสามารถดูข้อมูล Leads, Sales, Campaigns ได้ครบทุกหน้า ครอบคลุมการสร้าง shared auth-helpers.ts และ migrate ทั้ง 16 API proxy routes

**FRs covered:** NFR-5 (backward compatible API)

### Epic 4: Admin User Management
Admin สามารถ invite user ใหม่, assign role (admin/viewer), disable user ได้ ครอบคลุม invite flow (sales_team → Supabase Auth), role assignment UI, user disable, role simplification

**FRs covered:** FR-3 (invite flow), FR-4 (role assignment UI), FR-5

### Epic 5: Cleanup & Production Verification
ระบบสะอาด ไม่มี legacy auth code, documentation up-to-date, end-to-end verified ครอบคลุมการลบ old packages/files, update .env.example, update project-context.md, full e2e smoke test

**FRs covered:** NFR-4 (zero downtime verification)

### Dependencies

```
Epic 1 (Backend) ──→ Epic 2 (Login + OAuth + Reset)
                                    │
                       ┌────────────┼────────────┐
                       ▼                         ▼
                   Epic 3                    Epic 4
                   (Proxy)               (User Mgmt)
                       └────────────┬────────────┘
                                    ▼
                               Epic 5 (Cleanup)
```

Epic 1 → Epic 2 (linear), Epic 3 + 4 parallel ได้หลัง Epic 2, Epic 5 ทำหลังสุด

---

## Epic 1: Backend Auth Foundation

Backend พร้อมรับ Supabase JWT token แทน Google token ได้อย่างถูกต้องและปลอดภัย

### Story 1.1: Supabase Auth Config & Schema Migration

As a **developer**,
I want **Supabase Auth configured and the database schema migrated**,
So that **the backend has the foundation to verify Supabase JWT tokens and link auth users**.

**Acceptance Criteria:**

**Given** Supabase Dashboard settings
**When** email auth provider is enabled
**Then** email+password sign-in is available for invited users

**Given** Supabase Dashboard settings
**When** Google OAuth provider is enabled
**Then** Google sign-in is configured with correct redirect URL (`https://<project>.supabase.co/auth/v1/callback`)

**Given** Supabase Dashboard settings
**When** self-signup is disabled
**Then** only users invited via `inviteUserByEmail()` can create accounts

**Given** migration `003_add_auth_user_id.sql` is applied
**When** querying `sales_team` table schema
**Then** `auth_user_id` column exists as `UUID UNIQUE REFERENCES auth.users(id)`
**And** partial index `idx_sales_team_auth_user` exists on `auth_user_id WHERE auth_user_id IS NOT NULL`

**Given** Supabase Dashboard session settings
**When** JWT expiry is configured
**Then** session timeout is set to ≤ 24 hours (NFR-2)

### Story 1.2: Rewrite Backend JWT Verification Middleware

As a **backend developer**,
I want **the admin-auth middleware to verify Supabase JWT tokens locally**,
So that **Dashboard API requests are authenticated fast (~0.1ms) without external API calls (NFR-1)**.

**Acceptance Criteria:**

**Given** a valid Supabase JWT in Authorization header
**When** request hits any admin endpoint
**Then** middleware verifies token with `jsonwebtoken` using `SUPABASE_JWT_SECRET`
**And** sets `req.user` with `{ email, role, authUserId, memberId }`

**Given** a valid JWT
**When** middleware queries `sales_team` by email
**Then** user must exist and have `status = 'active'` (NFR-8: defense in depth)

**Given** a valid JWT with `app_metadata.role`
**When** role is extracted
**Then** role comes from `app_metadata.role` only, never `user_metadata` (NFR-7)

**Given** an expired or invalid JWT
**When** request hits admin endpoint
**Then** `401 Unauthorized` is returned

**Given** no Authorization header or missing `Bearer` prefix
**When** request hits admin endpoint
**Then** `401 Unauthorized` is returned

**Given** valid JWT but user `status = 'inactive'` in `sales_team`
**When** request hits admin endpoint
**Then** `403 Forbidden` is returned

**Given** `config/index.ts` Zod schema
**When** `SUPABASE_JWT_SECRET` is added
**Then** it is validated as required string
**And** `GOOGLE_OAUTH_CLIENT_ID` and `ALLOWED_DOMAINS` are removed from schema

**Given** `types/index.ts`
**When** `AdminUser` type is updated
**Then** `googleId` is replaced with `authUserId: string`

### Story 1.3: Auto-Link Auth User ID (Race-Safe)

As a **sales team member**,
I want **my Supabase Auth account automatically linked to my sales_team record on first login**,
So that **I don't need manual account linking and the system recognizes me immediately**.

**Acceptance Criteria:**

**Given** user logs in for the first time
**When** `auth_user_id` is `NULL` in their `sales_team` record
**Then** `autoLinkAuthUser()` atomically sets `auth_user_id` using `.is('auth_user_id', null)` guard

**Given** user logs in again (repeat login)
**When** `auth_user_id` is already set
**Then** auto-link step is skipped silently (no update query)

**Given** two concurrent first logins (race condition)
**When** both try to set `auth_user_id` simultaneously
**Then** only one succeeds, the other silently skips — no error thrown

**Given** `autoLinkAuthUser()` function
**When** called from middleware
**Then** it never throws errors to caller (fire-and-forget pattern, catches internally)

**Given** `sales-team.service.ts`
**When** `autoLinkAuthUser(memberId, authUserId)` is added
**Then** it follows the same race-safe pattern as existing `linkLINEAccount()`

### Story 1.4: Backend Auth Tests Rewrite

As a **developer**,
I want **comprehensive tests for the new Supabase JWT auth middleware**,
So that **all authentication paths are verified before deployment**.

**Acceptance Criteria:**

**Given** `admin-auth.test.ts` rewritten
**When** mocking `jsonwebtoken` instead of `google-auth-library`
**Then** test cases cover: valid token, invalid token, expired token, missing token, missing `Bearer` prefix

**Given** `admin-auth.test.ts`
**When** testing `sales_team` lookup paths
**Then** test cases cover: user found + active (200), user found + inactive (403), user not found (403)

**Given** `admin-auth.test.ts`
**When** testing auto-link integration
**Then** test cases cover: first login (NULL → linked), repeat login (already linked → skip), race condition (concurrent → no error)

**Given** `admin-auth.test.ts`
**When** testing role extraction
**Then** verify `app_metadata.role` is used and correctly set on `req.user.role`

**Given** all backend tests
**When** `npm test` runs
**Then** all existing tests + new auth tests pass 100% (no regression)

### Story 1.5: Backend Package Cleanup & Smoke Test

As a **developer**,
I want **old Google auth dependencies removed and the backend verified end-to-end**,
So that **no legacy auth code remains and the new authentication works correctly in production**.

**Acceptance Criteria:**

**Given** `package.json`
**When** `jsonwebtoken` + `@types/jsonwebtoken` are added
**Then** they appear in dependencies/devDependencies

**Given** `package.json`
**When** `google-auth-library` is removed
**Then** it does not appear in dependencies or devDependencies

**Given** `.env.example`
**When** updated
**Then** `SUPABASE_JWT_SECRET` is documented with description
**And** `GOOGLE_OAUTH_CLIENT_ID` is removed

**Given** backend starts with valid env
**When** `SUPABASE_JWT_SECRET` is provided
**Then** server starts without errors

**Given** backend starts without Google env vars
**When** `GOOGLE_OAUTH_CLIENT_ID` is absent
**Then** server starts without Zod validation failure

**Given** smoke test with valid Supabase JWT
**When** sent to any admin endpoint
**Then** `200 OK` returned with correct user data

**Given** smoke test with invalid token
**When** sent to admin endpoint
**Then** `401 Unauthorized` returned

**Given** webhook endpoints (LINE, Brevo)
**When** called with their normal signatures
**Then** they work unchanged — no auth regression

---

## Epic 2: User Login & Authentication Experience

ผู้ใช้สามารถ login ด้วย Email+Password หรือ Google OAuth, reset password, session auto-refresh และ multi-tab sync logout

### Story 2.1: Frontend Supabase Client & Email+Password Login

As a **dashboard user**,
I want **to log in with my email and password**,
So that **I can access the Admin Dashboard without needing a Google account (FR-1)**.

**Acceptance Criteria:**

**Given** frontend project
**When** `@supabase/supabase-js` and `@supabase/ssr` (≥0.5.0) are installed
**Then** packages appear in `package.json` dependencies

**Given** `lib/supabase/server.ts` is created
**When** `createClient()` is called in a Server Component
**Then** it returns a Supabase client using `createServerClient` with cookie-based session handling
**And** uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (never `SERVICE_ROLE_KEY`)

**Given** `lib/supabase/client.ts` is created
**When** `createClient()` is called in a Client Component
**Then** it returns a Supabase client using `createBrowserClient`

**Given** user navigates to `/login`
**When** the login page renders
**Then** an email input, password input, and "Sign In" button are displayed

**Given** user enters valid email+password and clicks Sign In
**When** `supabase.auth.signInWithPassword()` succeeds
**Then** user is redirected to the dashboard
**And** session is stored in httpOnly cookie (NFR-3)

**Given** user enters invalid credentials
**When** `signInWithPassword()` fails
**Then** an error message is displayed ("Invalid email or password")
**And** user stays on login page

**Given** a non-invited email is used
**When** login is attempted
**Then** login fails with clear error message ("Account not found. Contact your admin.")

**Given** `.env.example` (frontend)
**When** updated
**Then** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are documented

### Story 2.2: Google OAuth Login & Callback

As a **dashboard user with a Google account**,
I want **to log in with one click using Google**,
So that **I have a fast, convenient login option (FR-2)**.

**Acceptance Criteria:**

**Given** login page
**When** rendered
**Then** a "Sign in with Google" button is displayed below the email+password form

**Given** user clicks "Sign in with Google"
**When** `supabase.auth.signInWithOAuth({ provider: 'google' })` is called
**Then** user is redirected to Google consent screen
**And** redirect URL points to `auth/callback`

**Given** `auth/callback/route.ts` is created
**When** Google redirects back with authorization code
**Then** `exchangeCodeForSession(code)` is called to create a Supabase session
**And** user is redirected to dashboard

**Given** Google OAuth callback
**When** code exchange succeeds
**Then** session is stored in httpOnly cookie
**And** user sees the dashboard

**Given** Google OAuth callback
**When** code exchange fails (invalid code, non-invited user)
**Then** user is redirected to `/login?error=auth_error`
**And** login page displays appropriate error message

**Given** login page URL
**When** `?error=auth_error` query param is present
**Then** an error message is shown ("Login failed. Please try again or contact your admin.")

### Story 2.3: Password Reset Flow

As a **dashboard user who forgot their password**,
I want **to reset my password via email**,
So that **I can regain access to the dashboard without admin intervention**.

**Acceptance Criteria:**

**Given** login page
**When** user clicks "Forgot password?" link
**Then** user is navigated to `/reset-password`

**Given** `/reset-password` page
**When** user enters their email and clicks "Send Reset Link"
**Then** `supabase.auth.resetPasswordForEmail(email)` is called
**And** success message is shown ("Check your email for a reset link")

**Given** reset password email
**When** user clicks the reset link
**Then** user is navigated to `/update-password` page with valid token

**Given** `/update-password` page
**When** user enters new password and confirms it
**Then** `supabase.auth.updateUser({ password })` is called
**And** on success, user is redirected to `/login` with message "Password updated. Please log in."

**Given** `/update-password` page
**When** new password and confirm password don't match
**Then** error message is shown ("Passwords do not match")
**And** form is not submitted

**Given** `/update-password` page
**When** password is too short (< 8 characters)
**Then** error message is shown ("Password must be at least 8 characters")

**Given** `/reset-password` page
**When** non-existent email is entered
**Then** same success message is shown (prevent email enumeration attack)

### Story 2.4: Frontend Auth Middleware & Session Management

As a **dashboard user**,
I want **my session to auto-refresh and sync across tabs**,
So that **I don't have to log in repeatedly and logout works everywhere (FR-6, FR-7)**.

**Acceptance Criteria:**

**Given** `middleware.ts` (Next.js middleware, renamed from `proxy.ts`)
**When** unauthenticated user accesses any dashboard route
**Then** user is redirected to `/login`

**Given** `middleware.ts`
**When** authenticated user accesses dashboard routes
**Then** Supabase session is refreshed via `@supabase/ssr`
**And** request proceeds normally

**Given** `middleware.ts`
**When** user accesses `/login` while already authenticated
**Then** user is redirected to dashboard (prevent double login)

**Given** `providers.tsx` is rewritten
**When** app loads
**Then** Supabase `onAuthStateChange` listener is registered
**And** `SessionProvider` from NextAuth is removed

**Given** `onAuthStateChange` listener
**When** `SIGNED_OUT` event fires in any tab
**Then** all tabs redirect to `/login` (FR-7: multi-tab sync)

**Given** `onAuthStateChange` listener
**When** `TOKEN_REFRESHED` event fires
**Then** session continues seamlessly without user action (FR-6: auto-refresh)

**Given** `hooks/use-session-sync.ts`
**When** updated to use Supabase
**Then** `BroadcastChannel` logic is replaced with `onAuthStateChange`

**Given** `components/layout/user-nav.tsx`
**When** user clicks "Sign Out"
**Then** `supabase.auth.signOut()` is called
**And** user is redirected to `/login`

**Given** `(dashboard)/layout.tsx`
**When** auth check is updated
**Then** `getServerSession()` is replaced with `supabase.auth.getUser()`
**And** user info (name, email, role) is passed to layout components

**Given** `components/shared/session-warning.tsx`
**When** simplified
**Then** complex token refresh logic is removed (Supabase handles auto-refresh)

### Story 2.5: Frontend Auth Smoke Test

As a **developer**,
I want **all authentication flows verified end-to-end**,
So that **users can reliably log in, log out, and manage their sessions**.

**Acceptance Criteria:**

**Given** Email+Password login
**When** valid credentials entered
**Then** user sees dashboard with correct name and role displayed

**Given** Google OAuth login
**When** Google sign-in completed
**Then** user sees dashboard with Google account info

**Given** password reset
**When** full flow completed (request → email → update)
**Then** user can log in with new password

**Given** authenticated user
**When** opening a second browser tab
**Then** second tab is also authenticated (session shared via cookie)

**Given** user clicks logout in one tab
**When** second tab is open
**Then** second tab redirects to login page (multi-tab sync)

**Given** unauthenticated user
**When** directly navigating to `/dashboard` or any protected route
**Then** redirected to `/login`

**Given** authenticated user
**When** navigating to `/login`
**Then** redirected to dashboard

**Given** session has been active for extended time
**When** token approaches expiry
**Then** session auto-refreshes without user action

**Given** all frontend tests
**When** test suite runs
**Then** all auth-related tests pass 100%

---

## Epic 3: Dashboard Data Access (Proxy Migration)

ผู้ใช้ที่ login แล้วสามารถดูข้อมูล Leads, Sales, Campaigns ได้ครบทุกหน้า

### Story 3.1: Create Shared Auth Helper

As a **frontend developer**,
I want **a shared auth helper function for API proxy routes**,
So that **all 16 routes use the same Supabase session extraction logic without duplication**.

**Acceptance Criteria:**

**Given** `lib/supabase/auth-helpers.ts` is created
**When** `getSessionOrUnauthorized()` is called
**Then** it creates a Supabase server client, calls `supabase.auth.getSession()`
**And** returns `{ session, response }` if authenticated
**And** returns `401 Unauthorized` NextResponse if no session

**Given** `getSessionOrUnauthorized()` returns a valid session
**When** `session.access_token` is extracted
**Then** it can be forwarded as `Authorization: Bearer ${session.access_token}` to Backend

**Given** `getSessionOrUnauthorized()` is called with expired session
**When** `@supabase/ssr` attempts auto-refresh
**Then** if refresh succeeds, session is returned normally
**And** if refresh fails, `401 Unauthorized` is returned

**Given** `auth-helpers.ts` has tests
**When** `supabase-auth-helpers.test.ts` runs
**Then** test cases cover: valid session, no session (401), expired + refresh success, expired + refresh fail

### Story 3.2: Migrate All API Proxy Routes

As a **dashboard user**,
I want **all dashboard pages to load data correctly after the auth migration**,
So that **I can view Leads, Sales Performance, Campaigns, and all other data as before (NFR-5)**.

**Acceptance Criteria:**

**Given** each of the 16 API proxy routes under `app/api/admin/`
**When** token extraction is updated
**Then** `getToken({ req, secret })` (NextAuth) is replaced with `getSessionOrUnauthorized()` (Supabase)
**And** `session.access_token` is forwarded as `Authorization: Bearer` header to Backend

**Given** all 16 proxy routes migrated
**When** authenticated user requests any dashboard page
**Then** Backend receives valid Supabase JWT
**And** returns data with same response format as before (NFR-5: backward compatible)

**Given** all 16 proxy routes migrated
**When** unauthenticated user calls any proxy route directly
**Then** `401 Unauthorized` is returned (no Backend call made)

**Given** proxy route error handling
**When** Backend returns an error (4xx, 5xx)
**Then** error is forwarded to frontend unchanged (existing behavior preserved)

**Given** all proxy route test files (`api/admin/*.test.ts`)
**When** mocks are updated
**Then** NextAuth `getToken` mock is replaced with Supabase `getSession` mock
**And** all existing test cases pass with new mock pattern

**Given** all frontend tests
**When** `npm test` runs
**Then** all tests pass 100% (no regression)

### Story 3.3: Proxy Migration Smoke Test

As a **developer**,
I want **every proxy route verified end-to-end after migration**,
So that **no dashboard page is broken by the token source change**.

**Acceptance Criteria:**

**Given** authenticated user session
**When** Dashboard page loads (`/api/admin/dashboard`)
**Then** KPI data, trend, top sales, recent activity, alerts are returned correctly

**Given** authenticated user session
**When** Sales Performance page loads (`/api/admin/sales-performance`)
**Then** team performance data is returned correctly

**Given** authenticated user session
**When** Leads page loads (`/api/admin/leads`)
**Then** paginated lead data is returned correctly

**Given** authenticated user session
**When** Campaigns page loads (`/api/admin/campaigns`)
**Then** campaign stats are returned correctly

**Given** authenticated user session
**When** all remaining proxy routes are called
**Then** each returns expected data format without errors

**Given** viewer role user
**When** accessing admin-only endpoints
**Then** `403 Forbidden` is returned (RBAC still enforced through Backend)

**Given** no auth token
**When** any proxy route is called directly (e.g., via curl)
**Then** `401 Unauthorized` is returned

---

## Epic 4: Admin User Management

Admin สามารถ invite user ใหม่, assign role (admin/viewer), disable user ได้

### Story 4.1: Admin Invite User Flow

As an **admin user**,
I want **to invite new users to the dashboard by email**,
So that **only authorized people can access the system (FR-3, FR-5)**.

**Acceptance Criteria:**

**Given** admin navigates to user management page
**When** clicking "Invite User"
**Then** a form is displayed with: email, name, role (admin/viewer)

**Given** admin fills in invite form and submits
**When** invite is processed
**Then** `sales_team` record is created FIRST (email, name, role, status: active)
**And** THEN `supabase.auth.admin.inviteUserByEmail(email, { data: { role } })` is called
**And** role is stored in `app_metadata` (NFR-7)

**Given** invite is successful
**When** user receives invitation email
**Then** email contains a link to set their password
**And** admin sees success confirmation with the invited email

**Given** `sales_team` record is created but Supabase invite fails
**When** error occurs during invite
**Then** admin sees error message
**And** `sales_team` record remains (can retry invite later)

**Given** admin tries to invite an email that already exists in `sales_team`
**When** form is submitted
**Then** error message is shown ("User already exists")
**And** no duplicate record is created

**Given** invited user clicks the email link
**When** they set their password and log in
**Then** `auth_user_id` is auto-linked to their `sales_team` record (via Epic 1 Story 1.3)
**And** user can access dashboard with assigned role

**Given** Backend invite endpoint
**When** called by non-admin user (viewer role)
**Then** `403 Forbidden` is returned (admin-only operation)

### Story 4.2: Role Assignment & User Disable

As an **admin user**,
I want **to change user roles and disable accounts**,
So that **I can control access levels and revoke access when needed (FR-4, FR-5)**.

**Acceptance Criteria:**

**Given** `config/roles.ts` is updated
**When** role list is checked
**Then** only `admin` and `viewer` roles exist (`manager` is removed)

**Given** admin views user management page
**When** user list loads
**Then** each user shows: name, email, current role, status (active/inactive)

**Given** admin changes a user's role
**When** new role is selected and saved
**Then** `sales_team.role` is updated in database
**And** `app_metadata.role` is updated via `supabase.auth.admin.updateUserById()`
**And** change takes effect on user's next request (JWT still has old role until refresh)

**Given** admin disables a user
**When** "Disable" action is confirmed
**Then** `sales_team.status` is set to `inactive`
**And** disabled user's next request returns `403 Forbidden` (NFR-8: sales_team double-check)

**Given** admin re-enables a previously disabled user
**When** "Enable" action is confirmed
**Then** `sales_team.status` is set back to `active`
**And** user can log in again

**Given** admin tries to disable their own account
**When** action is attempted
**Then** it is blocked with message "Cannot disable your own account"

**Given** role assignment and disable tests
**When** test suite runs
**Then** test cases cover: role change success, disable success, re-enable, self-disable prevention, non-admin rejection

### Story 4.3: User Management Smoke Test

As a **developer**,
I want **the full user management lifecycle verified**,
So that **admin operations work correctly in the production environment**.

**Acceptance Criteria:**

**Given** admin user logged in
**When** inviting a new user with email
**Then** `sales_team` record is created AND invitation email is sent

**Given** invited user
**When** clicking email link and setting password
**Then** user can log in with new credentials
**And** `auth_user_id` is automatically linked

**Given** admin user
**When** changing another user's role from viewer to admin
**Then** role change is reflected in user management page
**And** user gains admin-level access on next login

**Given** admin user
**When** disabling a user account
**Then** disabled user receives `403 Forbidden` on next request
**And** disabled user is shown as inactive in user management page

**Given** admin user
**When** re-enabling a disabled user
**Then** user can log in again successfully

**Given** viewer role user
**When** attempting to access user management features
**Then** invite, role change, and disable actions are hidden or return `403`

---

## Epic 5: Cleanup & Production Verification

ระบบสะอาด ไม่มี legacy auth code, documentation up-to-date, end-to-end verified

### Story 5.1: Remove Legacy Auth Packages & Files

As a **developer**,
I want **all legacy Google OAuth and NextAuth code removed**,
So that **the codebase is clean with no dead code or unused dependencies**.

**Acceptance Criteria:**

**Given** Frontend `package.json`
**When** legacy packages are removed
**Then** `next-auth`, `@types/next-auth`, and `google-auth-library` are no longer listed

**Given** Frontend source code
**When** legacy auth files are deleted
**Then** `lib/auth.ts` (NextAuth config) is deleted
**And** `app/api/auth/[...nextauth]/route.ts` is deleted
**And** `types/next-auth.d.ts` is deleted

**Given** Frontend source code
**When** searching for legacy imports
**Then** no file imports from `next-auth`, `@next-auth/*`, or `google-auth-library`
**And** no references to `getServerSession`, `getToken`, `SessionProvider` from NextAuth

**Given** `next.config.mjs`
**When** updated
**Then** `googleusercontent.com` remote image pattern is removed (no longer needed)

**Given** Backend `package.json`
**When** legacy package is verified removed
**Then** `google-auth-library` is not listed (already removed in Epic 1 Story 1.5)

**Given** both projects
**When** `npm install` runs after cleanup
**Then** no errors, no missing dependencies
**And** `npm audit` shows no new vulnerabilities from remaining packages

### Story 5.2: Update Documentation & Configuration

As a **developer**,
I want **all documentation and configuration updated to reflect Supabase Auth**,
So that **future developers understand the current auth system without confusion**.

**Acceptance Criteria:**

**Given** `project-context.md`
**When** auth-related rules are updated
**Then** all references to Google OAuth, NextAuth, `google-auth-library` are replaced with Supabase Auth equivalents
**And** new patterns documented: `jsonwebtoken` verify, `@supabase/ssr`, `auth-helpers.ts`, `app_metadata` role

**Given** Frontend `.env.example`
**When** updated
**Then** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are removed
**And** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` are documented with descriptions

**Given** Backend `.env.example`
**When** updated
**Then** `SUPABASE_JWT_SECRET` is documented
**And** `GOOGLE_OAUTH_CLIENT_ID` is removed

**Given** `CLAUDE.md` or architecture docs
**When** auth sections are reviewed
**Then** references to Google OAuth flow are updated or marked as superseded by `supabase-auth-architecture.md`

**Given** CSP headers in `next.config.mjs`
**When** reviewed
**Then** Supabase URL is added to allowed domains if needed for auth redirects

### Story 5.3: Full End-to-End Production Verification

As a **project stakeholder**,
I want **the complete auth migration verified end-to-end**,
So that **the system is confirmed working before announcing to users (NFR-4)**.

**Acceptance Criteria:**

**Given** Email+Password login
**When** user logs in with valid credentials
**Then** dashboard loads with correct user info and data

**Given** Google OAuth login
**When** user completes Google sign-in
**Then** dashboard loads with Google account info

**Given** new user invite
**When** admin invites a user → user receives email → sets password
**Then** new user can log in and see dashboard

**Given** non-invited email
**When** login is attempted
**Then** login is rejected with clear error

**Given** inactive user
**When** login is attempted
**Then** `403 Forbidden` is returned

**Given** admin route access by viewer
**When** viewer tries admin-only action (e.g., invite user)
**Then** action is rejected with `403`

**Given** multi-tab session
**When** user logs out in one tab
**Then** all other tabs redirect to login

**Given** active session
**When** token approaches expiry
**Then** session auto-refreshes without user intervention

**Given** all 16 API proxy routes
**When** called by authenticated user
**Then** all return correct data

**Given** all test suites (Backend + Frontend)
**When** `npm test` runs in both projects
**Then** all tests pass 100% with no regression
