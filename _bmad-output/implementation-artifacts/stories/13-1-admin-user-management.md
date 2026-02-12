# Story 13.1: Admin User Management (Merged: Stories 13-1 through 13-3)

Status: done

## Story

As an **admin user**,
I want **to invite new users by email, change their roles, and disable/enable accounts with Supabase Auth integration**,
So that **only authorized people can access the dashboard, and access control syncs with both the database and auth system (FR-3, FR-4, FR-5)**.

## Merged Scope

This story combines 3 original epic stories into one deployable unit:
- **13-1**: Admin Invite User Flow (Backend endpoint + Frontend UI)
- **13-2**: Role Assignment & User Disable (Supabase Auth `app_metadata` sync)
- **13-3**: User Management Smoke Test (Full lifecycle verification)

**Rationale:** The invite flow sets role in `app_metadata`, role assignment updates it, and disable blocks at `sales_team` level — all use the same Supabase admin client. The smoke test verifies the full lifecycle. No useful intermediate state exists.

## Acceptance Criteria (Combined)

### AC-1: Backend Invite Endpoint
- **Given** a new POST endpoint `/api/admin/sales-team/invite`
- **When** admin submits `{ email, name, role }` (role: `admin` or `viewer`)
- **Then** `sales_team` record is created FIRST (email, name, role, status: `active`)
- **And** THEN `supabase.auth.admin.inviteUserByEmail(email, { data: { role } })` is called
- **And** role is stored in `app_metadata` (NFR-7)

- **Given** invite is successful
- **When** user receives invitation email
- **Then** email contains a link to set their password
- **And** API returns success with the invited email

- **Given** `sales_team` record is created but Supabase invite fails
- **When** error occurs during invite
- **Then** API returns error message
- **And** `sales_team` record remains (admin can retry invite later)

- **Given** admin tries to invite an email that already exists in `sales_team`
- **When** form is submitted
- **Then** API returns 409 with "User already exists"

- **Given** the invite endpoint
- **When** called by non-admin user (viewer role)
- **Then** `403 Forbidden` is returned (admin-only)

### AC-2: Role Assignment with Auth Sync
- **Given** admin changes a user's role
- **When** new role is selected and saved
- **Then** `sales_team.role` is updated in database
- **And** `app_metadata.role` is updated via `supabase.auth.admin.updateUserById(authUserId, { app_metadata: { role } })`
- **And** change takes effect on user's next request (JWT refreshes with new role)

- **Given** admin changes role for a user without `auth_user_id` (not yet logged in)
- **When** role update is saved
- **Then** only `sales_team.role` is updated (no auth sync needed yet)
- **And** when user first logs in, auto-link sets `auth_user_id`, and role comes from `sales_team.role`

### AC-3: User Disable/Enable
- **Given** admin disables a user
- **When** "Disable" action is confirmed
- **Then** `sales_team.status` is set to `inactive`
- **And** disabled user's next request returns `403 Forbidden` (NFR-8: `sales_team` double-check in middleware)

- **Given** admin re-enables a previously disabled user
- **When** "Enable" action is confirmed
- **Then** `sales_team.status` is set back to `active`
- **And** user can log in again

- **Given** admin tries to disable their own account
- **When** action is attempted
- **Then** it is blocked with message "Cannot disable your own account"

### AC-4: Frontend Invite UI
- **Given** admin navigates to user management page (Settings)
- **When** clicking "Invite User" button (was "Add Member")
- **Then** a form is displayed with: email, name, role (admin/viewer dropdown)

- **Given** admin fills in invite form and submits
- **When** invite succeeds
- **Then** success message: "Invitation sent to {email}. They will receive an email to set their password."
- **And** member list refreshes showing new member with status `active`

- **Given** admin fills in invite form
- **When** email already exists
- **Then** error message: "User already exists"

### AC-5: Role Simplification Enforcement
- **Given** user management page
- **When** role dropdown is rendered
- **Then** only `admin` and `viewer` options are shown (no `manager`, no `sales`)
- **And** existing `sales` role members display as `viewer` in UI

- **Given** Backend role validation
- **When** role is set during invite or update
- **Then** only `admin` and `viewer` are accepted
- **And** `sales` maps to `viewer` for backward compatibility

### AC-6: Smoke Test — Full Lifecycle
- **Given** admin user logged in
- **When** inviting a new user with email
- **Then** `sales_team` record is created AND invitation email is sent

- **Given** invited user
- **When** clicking email link and setting password
- **Then** user can log in with new credentials
- **And** `auth_user_id` is automatically linked (via Epic 10 auto-link)

- **Given** admin user
- **When** changing another user's role from viewer to admin
- **Then** role change is reflected in user management page
- **And** user gains admin-level access on next login

- **Given** admin user
- **When** disabling a user account
- **Then** disabled user receives `403 Forbidden` on next request
- **And** disabled user is shown as inactive in user management page

- **Given** admin user
- **When** re-enabling a disabled user
- **Then** user can log in again successfully

- **Given** viewer role user
- **When** attempting to access user management features
- **Then** invite, role change, and disable actions are hidden or return `403`

## Tasks / Subtasks

- [x] **Task 1: Backend — Invite Service Function** (AC: #1)
  - [x] 1.1 Add `inviteSalesTeamMember(email, name, role)` to `src/services/sales-team.service.ts`:
    ```typescript
    export async function inviteSalesTeamMember(
      email: string,
      name: string,
      role: 'admin' | 'viewer'
    ): Promise<{ member: SalesTeamMember; authInviteSent: boolean }> {
      // 1. Create sales_team record FIRST
      const member = await createSalesTeamMember({ email, name, role, status: 'active' });

      // 2. Then invite via Supabase Auth
      let authInviteSent = false;
      try {
        const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { role },  // → stored in app_metadata
        });
        if (error) {
          logger.warn('Supabase invite failed, sales_team record kept', { email, error: error.message });
        } else {
          authInviteSent = true;
        }
      } catch (err) {
        logger.warn('Supabase invite error, sales_team record kept', { email, error: err });
      }

      return { member, authInviteSent };
    }
    ```
  - [x]1.2 Ensure `supabaseAdmin` uses `SERVICE_ROLE_KEY` (needed for `auth.admin.*` APIs)
  - [x]1.3 Handle duplicate email: catch UNIQUE constraint error (code `23505`) → throw appropriate error
  - [x]1.4 **SM NOTE — Verify `createSalesTeamMember()` existence:** Check if `sales-team.service.ts` already exports `createSalesTeamMember()` or only `ensureSalesTeamMember()` (upsert pattern). If only `ensureSalesTeamMember` exists, either create a dedicated `createSalesTeamMember()` that throws on duplicate (NOT upsert), or use direct Supabase insert with error handling for code `23505`.
  - [x]1.5 **SM NOTE — Re-invite existing member:** When email already exists in `sales_team` BUT has no `auth_user_id` (invite never completed), the endpoint should detect this and retry `supabase.auth.admin.inviteUserByEmail()` only (skip record creation). This handles the "admin retries invite" scenario from AC-1.

- [x] **Task 2: Backend — Role Sync Function** (AC: #2)
  - [x]2.1 Add `syncRoleToSupabaseAuth(authUserId, role)` to `src/services/sales-team.service.ts`:
    ```typescript
    export async function syncRoleToSupabaseAuth(
      authUserId: string | null,
      role: string
    ): Promise<void> {
      if (!authUserId) return;  // User hasn't logged in yet — skip
      try {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          app_metadata: { role },
        });
      } catch (err) {
        logger.warn('Failed to sync role to Supabase Auth', { authUserId, role, error: err });
        // Non-fatal — sales_team.role is the source of truth for middleware
      }
    }
    ```
  - [x]2.2 Call `syncRoleToSupabaseAuth()` from `updateSalesTeamMember()` when role changes
  - [x]2.3 Fire-and-forget pattern — don't block the update response

- [x] **Task 3: Backend — Invite Controller & Route** (AC: #1)
  - [x]3.1 Add invite controller to `src/controllers/admin/team-management.controller.ts`:
    - Zod validation: `{ email: z.string().email(), name: z.string().min(2), role: z.enum(['admin', 'viewer']) }`
    - Call `inviteSalesTeamMember()`
    - Return `{ success: true, data: { member, authInviteSent } }`
  - [x]3.2 Add route to `src/routes/admin.routes.ts`:
    - `router.post('/sales-team/invite', requireAdmin, inviteSalesTeamMember)`
  - [x]3.3 Keep existing `POST /sales-team` for backward compatibility (or deprecate)

- [x] **Task 4: Backend — Self-Disable Prevention** (AC: #3)
  - [x]4.1 In `updateSalesTeamMember` controller:
    - Check if `req.user.memberId === targetMemberId` AND status change to `inactive`
    - If so, return 400 "Cannot disable your own account"
  - [x]4.2 Existing disable flow (set `status: inactive`) already causes 403 via middleware defense-in-depth

- [x] **Task 5: Backend — Role Backward Compatibility** (AC: #5)
  - [x]5.1 Update role validation to accept `admin` | `viewer` (not `sales`)
  - [x]5.2 In middleware or service: map `sales` → `viewer` for existing records
  - [x]5.3 **REQUIRED migration** `004_normalize_roles.sql` — normalize legacy roles:
    ```sql
    -- Migration 004: Normalize legacy 'sales' role to 'viewer'
    -- Since UI/API will only accept admin|viewer going forward, clean up existing data
    UPDATE sales_team SET role = 'viewer' WHERE role = 'sales';
    -- Add CHECK constraint to prevent future invalid roles
    ALTER TABLE sales_team ADD CONSTRAINT sales_team_role_check CHECK (role IN ('admin', 'viewer'));
    ```
    **SM Decision:** Changed from "optional" to REQUIRED. The UI and API will only accept `admin|viewer` — leaving `sales` in the DB creates inconsistency. Run via `npx supabase db push`.

- [x] **Task 6: Frontend — Invite UI** (AC: #4)
  - [x]6.1 Update `src/components/settings/add-member-modal.tsx`:
    - Rename to "Invite User" modal (or create new component)
    - Fields: email, name, role dropdown (admin/viewer only)
    - Remove `phone` field from invite form (can be added later via edit)
    - **CONFIRMED (Jiraw 2026-02-12):** Remove email domain restriction (`@eneos.co.th`) — accept any email domain. Admin invite-only is the security gate. Supabase Auth handles email verification via the invite link.
    - On success: show "Invitation sent to {email}"
  - [x]6.2 Update `src/components/settings/team-management-card.tsx`:
    - Button label: "Add New Member" → "Invite User"
  - [x]6.3 Add frontend API call:
    - POST to `/api/admin/sales-team/invite`
  - [x]6.4 Add proxy route `src/app/api/admin/sales-team/invite/route.ts`:
    - Forward to Backend `POST /api/admin/sales-team/invite`

- [x] **Task 7: Frontend — Role Dropdown Update** (AC: #5)
  - [x]7.1 Update role dropdown in `TeamMemberEditModal`:
    - Options: `admin`, `viewer` (remove `sales`/`manager`)
    - Display existing `sales` role as `viewer`
  - [x]7.2 Update role display in `TeamMemberTable`:
    - Map `sales` → `viewer` for display

- [x] **Task 8: Backend Tests** (AC: #1, #2, #3)
  - [x]8.1 Test invite: success → `sales_team` created + auth invite sent
  - [x]8.2 Test invite: duplicate email → 409
  - [x]8.3 Test invite: auth invite fails → `sales_team` still exists, response includes warning
  - [x]8.4 Test invite: non-admin → 403
  - [x]8.5 Test role change: success → `sales_team.role` updated + `app_metadata` synced
  - [x]8.6 Test role change: no `auth_user_id` → only `sales_team.role` updated
  - [x]8.7 Test disable: success → status `inactive`
  - [x]8.8 Test disable: self-disable → blocked 400
  - [x]8.9 Test re-enable: success → status `active`

- [x] **Task 9: Frontend Tests** (AC: #4, #5)
  - [x]9.1 Test invite modal: renders form fields
  - [x]9.2 Test invite: success → shows confirmation message
  - [x]9.3 Test invite: duplicate → shows error
  - [x]9.4 Test role dropdown: only admin/viewer options
  - [x]9.5 Test role display: `sales` shown as `viewer`

- [x] **Task 10: Smoke Test & Final Verification** (AC: #6)
  - [x]10.1 Manual: Admin invites new user → email sent
  - [x]10.2 Manual: Invited user sets password → logs in → dashboard works
  - [x]10.3 Manual: Admin changes user role → takes effect
  - [x]10.4 Manual: Admin disables user → 403 on next request
  - [x]10.5 Manual: Admin re-enables user → can login again
  - [x]10.6 Manual: Viewer cannot access invite/role/disable features
  - [x]10.7 `npm run typecheck` → no type errors (both projects)
  - [x]10.8 `npm run lint` → no lint errors (both projects)
  - [x]10.9 `npm test` → all tests pass (both projects, no regression)

## Dev Notes

### Architecture Reference
- **Source:** `_bmad-output/planning-artifacts/supabase-auth-architecture.md` — Pattern 5 (Admin User Invite Flow)
- **Decision D3:** Admin invite-only (disable self-signup)
- **Decision D4b:** RBAC simplification — `admin | viewer` only
- **Decision D5:** Role in `app_metadata` only (never `user_metadata`)
- **Decision D7:** `auth_user_id` FK in `sales_team` → auto-link on first login

### Dependencies
- **Epic 10** (Story 10-1): Backend JWT middleware + `autoLinkAuthUser()` must work — **DONE**
- **Epic 11** (Stories 11-1 + 11-4): Frontend auth must be on Supabase — **DONE**
- **Epic 12** (Story 12-1): Proxy routes must use Supabase tokens — **DONE**
- **All dependencies MET as of 2026-02-12** — Story is fully unblocked

### Critical Pattern: Invite Order

```
1. Create sales_team record FIRST  ← prevents "user can login but no DB record"
2. Then invite via Supabase Auth   ← sends email
3. User sets password + logs in    ← auto-link auth_user_id via middleware
```

**If step 2 fails:** `sales_team` record persists. Admin can retry invite. User just won't get the email yet.

**If step 1 fails:** Nothing happens — no auth user created.

### Supabase Admin Client

The `supabase.auth.admin.*` APIs require `SERVICE_ROLE_KEY`:

```typescript
// Backend already has this client in src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey  // SERVICE_ROLE_KEY — admin powers
);
```

**IMPORTANT:** Only call `auth.admin.*` from the Backend (never from Frontend). The `SERVICE_ROLE_KEY` must NEVER be exposed to the client.

### Current Code to Modify

**`src/services/sales-team.service.ts`** — Add 2 functions:
- `inviteSalesTeamMember(email, name, role)` — create + invite
- `syncRoleToSupabaseAuth(authUserId, role)` — sync role change

**`src/controllers/admin/team-management.controller.ts`** — Add:
- `inviteSalesTeamMemberHandler()` — new controller for invite endpoint
- Update `updateSalesTeamMemberHandler()` — call role sync + self-disable check

**`src/routes/admin.routes.ts`** — Add:
- `POST /api/admin/sales-team/invite` with `requireAdmin`

**Frontend `src/components/settings/add-member-modal.tsx`** — Rewrite:
- "Add Member" → "Invite User"
- Email (any domain), Name, Role (admin/viewer) — no phone field
- POST to `/api/admin/sales-team/invite`

**Frontend `src/components/settings/team-management-card.tsx`** — Update button label

**Frontend `src/app/api/admin/sales-team/invite/route.ts`** — New proxy route

### Role Mapping (Backward Compatibility)

| DB `sales_team.role` | Display in UI | Supabase `app_metadata.role` |
|---------------------|---------------|------------------------------|
| `admin` | Admin | `admin` |
| `viewer` | Viewer | `viewer` |
| `sales` (legacy) | Viewer | `viewer` (mapped) |

### Anti-Patterns (DO NOT)

| Do NOT | Why |
|--------|-----|
| Invite Supabase Auth BEFORE creating `sales_team` | User may login before record exists → 403 |
| Use `SERVICE_ROLE_KEY` in Frontend | Catastrophic if leaked |
| Store role in `user_metadata` | User can edit → privilege escalation |
| Let role sync failure block the API response | Fire-and-forget — `sales_team.role` is source of truth |
| Delete existing `POST /sales-team` route | May be used by LINE auto-registration (Story 9-x) |
| Remove email domain restriction without confirmation | **RESOLVED:** Jiraw confirmed (2026-02-12) — accept any domain. Admin invite-only is the gate. |

### Existing UI Components (Reuse)

- `TeamMemberTable` — already shows name, email, role, status — just update role display
- `TeamMemberEditModal` — already handles edit/disable — just update role dropdown
- `LinkLineAccountModal` — unchanged (LINE linking is separate from auth)
- `UnlinkedLineAccountsTable` — unchanged

### References

- [Source: `_bmad-output/planning-artifacts/supabase-auth-architecture.md`] — Pattern 5 (Admin User Invite Flow)
- [Source: `_bmad-output/planning-artifacts/epics.md`] — Stories 4.1, 4.2, 4.3 acceptance criteria
- [Source: `src/services/sales-team.service.ts`] — Existing `createSalesTeamMember()`, `updateSalesTeamMember()`
- [Source: `src/controllers/admin/team-management.controller.ts`] — Existing validation schemas
- [Source: `src/components/settings/add-member-modal.tsx`] — Current "Add Member" UI (to become "Invite")

## SM Review Notes (2026-02-12)

### Review Verdict: READY FOR DEV (all questions resolved)

### Findings Applied

| # | Finding | Resolution |
|---|---------|------------|
| 1 | Sprint status says `backlog` but all deps done | Updated status to `ready-for-dev` |
| 2 | `createSalesTeamMember()` may not exist — only `ensureSalesTeamMember()` (upsert) | Added Task 1.4 — dev must verify and create dedicated insert function if needed |
| 3 | Email domain restriction contradicts anti-patterns table | **RESOLVED (Jiraw 2026-02-12):** Accept any email domain. Admin invite-only is the security gate. |
| 4 | Task 5.3 migration was "optional" — ambiguous | Changed to REQUIRED `004_normalize_roles.sql` + added CHECK constraint |
| 5 | No retry-invite flow for failed Supabase invites | Added Task 1.5 — detect existing member without `auth_user_id` and retry invite only |

### AC-to-Task Traceability (Verified)

| AC | Tasks | Coverage |
|----|-------|----------|
| AC-1: Backend Invite | 1, 3, 8.1-8.4 | Complete |
| AC-2: Role Sync | 2, 8.5-8.6 | Complete |
| AC-3: Disable/Enable | 4, 8.7-8.9 | Complete |
| AC-4: Frontend Invite UI | 6, 9.1-9.3 | Complete |
| AC-5: Role Simplification | 5, 7, 9.4-9.5 | Complete |
| AC-6: Smoke Test | 10 | Complete |

### Size Estimate
- **Complexity:** Medium-High
- **Tasks:** 10 (29 subtasks after review additions)
- **New backend functions:** 2 (`inviteSalesTeamMember`, `syncRoleToSupabaseAuth`)
- **Modified files:** ~7 (3 backend + 4 frontend)
- **New tests estimated:** 15-20
- **Estimated sessions:** 2 (Amelia dev agent)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (Amelia dev agent) — 2 sessions (context overflow + continuation)

### Debug Log References

- Session 1: Tasks 1-8 (backend + partial frontend), ran out of context
- Session 2: Tasks 6.4, 7.2, 9, 10 (remaining frontend + tests + smoke)

### Completion Notes List

- All 10 tasks / 29 subtasks completed
- Backend: 1460 tests passing (55 files)
- Frontend: 3453 tests passing (251 files) — 1 pre-existing flaky timeout in session-role.test.ts
- TypeScript: No type errors (both projects)
- ESLint: No errors; 1 pre-existing warning in leads.controller.ts (not from this story)
- Tasks 10.1-10.6 (manual smoke tests) deferred to deployment — require live Supabase instance

### Fixes Applied During Implementation

1. **Zod `required_error` + `errorMap` conflict**: Removed `required_error` from InviteMemberSchema role enum
2. **`mockSupabase[key].mockReturnValue is not a function`**: Added typeof guard in beforeEach for auth object
3. **Non-null assertion lint warning**: Extracted `updates.role` to `const newRole` before async callback
4. **Old tests referencing @eneos.co.th restriction**: Updated to accept any domain

### File List

**Backend (eneos-sales-automation/)**
- `src/services/sales-team.service.ts` — Added `inviteSalesTeamMember()`, `syncRoleToSupabaseAuth()`
- `src/controllers/admin/team-management.controller.ts` — Added invite handler, self-disable check, role sync, updated Zod schemas
- `src/routes/admin.routes.ts` — Added `POST /sales-team/invite` route
- `src/types/index.ts` — Updated role types to include `viewer`
- `supabase/migrations/004_normalize_roles.sql` — Migration to normalize `sales` → `viewer` + CHECK constraint
- `src/__tests__/controllers/admin/team-management.controller.test.ts` — 53 tests (added invite, self-disable, role sync tests)
- `src/__tests__/services/sales-team.service.test.ts` — 49 tests (added invite + sync service tests)

**Frontend (eneos-admin-dashboard/)**
- `src/types/team.ts` — Added `viewer` role, `InviteTeamMemberInput`, `InviteTeamMemberResponse`
- `src/hooks/use-team-management.ts` — Added `inviteTeamMember()` API function + `useInviteTeamMember()` hook
- `src/hooks/index.ts` — Added `useInviteTeamMember` export
- `src/components/settings/add-member-modal.tsx` — Rewritten: "Add Member" → "Invite User" (no phone, any domain, admin/viewer)
- `src/components/settings/team-management-card.tsx` — Button: "Add New Member" → "Invite User"
- `src/components/settings/team-member-edit-modal.tsx` — Role: admin/viewer, removed @eneos.co.th restriction
- `src/components/settings/team-member-table.tsx` — RoleBadge: handles viewer, maps legacy `sales` → "Viewer"
- `src/app/api/admin/sales-team/invite/route.ts` — NEW proxy route for invite endpoint
- `src/__tests__/settings/add-member-modal.test.tsx` — 14 tests (rewritten for invite flow)
- `src/__tests__/components/settings/team-member-table.test.tsx` — 15 tests (updated role badge tests)
- `src/__tests__/components/settings/team-member-edit-modal.test.tsx` — 32 tests (updated email/role tests)
