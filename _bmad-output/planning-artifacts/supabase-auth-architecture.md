---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/admin-dashboard/security.md'
  - '_bmad-output/planning-artifacts/ADR-002-supabase-migration.md'
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/admin-dashboard/PRD_admin-dashboard-plan.md'
  - '_bmad-output/planning-artifacts/admin-dashboard/architecture.md'
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-11'
project_name: 'eneos-sales-automation'
user_name: 'Jiraw'
date: '2026-02-11'
---

# Supabase Auth Migration - Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Migration Trigger

Client ไม่ได้ใช้ Google email → Google OAuth ใช้ไม่ได้ → เข้า Admin Dashboard ไม่ได้เลย เป็น **production blocker** ที่ต้องแก้

### Requirements Overview

**Functional Requirements:**

| # | Requirement |
|---|------------|
| FR-1 | ผู้ใช้ต้อง login ด้วย Email+Password ได้ (primary method) |
| FR-2 | ผู้ใช้ที่มี Google email ต้อง login ด้วย Google OAuth ได้ (secondary method) |
| FR-3 | Admin สร้าง account ให้เท่านั้น (invite-only, disable self-signup) |
| FR-4 | RBAC คงเดิม — admin (full access), viewer (read-only) |
| FR-5 | Admin จัดการ user ได้ (create, assign role, disable) |
| FR-6 | Session auto-refresh ไม่ต้องให้ user login ซ้ำบ่อย |
| FR-7 | Multi-tab sync — logout tab หนึ่ง logout ทุก tab |

**Non-Functional Requirements:**

| # | Requirement |
|---|------------|
| NFR-1 | Token verification ต้องเร็ว (ไม่ควรเรียก external API ทุก request) |
| NFR-2 | Session timeout ≤ 24 ชั่วโมง |
| NFR-3 | Tokens ต้องอยู่ใน httpOnly cookie เท่านั้น (ไม่เก็บใน localStorage) |
| NFR-4 | Zero downtime migration — ระบบต้องไม่ล่มระหว่าง switch |
| NFR-5 | Backward compatible API — Dashboard endpoint behavior เหมือนเดิม |
| NFR-6 | ไม่เพิ่ม vendor ใหม่ — ใช้ Supabase ที่มีอยู่แล้ว |
| NFR-7 | Role ต้องเก็บใน `app_metadata` เท่านั้น (ห้าม `user_metadata` — user แก้ได้เอง = privilege escalation) |
| NFR-8 | Double-check user ใน `sales_team` table แม้ JWT valid (defense in depth) |

**Scale & Complexity:**

- Primary domain: Full-stack (Backend API + Frontend Dashboard)
- Complexity level: Medium
- Estimated architectural components: 4 (Supabase Auth config, Backend middleware, Frontend auth, User management)

### Technical Constraints & Dependencies

| Constraint | Detail |
|-----------|--------|
| **Supabase มีอยู่แล้ว** | DB migrated (ADR-002), service_role key ใช้อยู่ |
| **Dashboard สร้างเสร็จแล้ว** | NextAuth v4 + Google OAuth ต้อง replace ไม่ใช่แค่วางแผน |
| **Webhook ไม่กระทบ** | LINE/Brevo ใช้ signature verification ไม่เกี่ยวกับ user auth |
| **sales_team table มี role อยู่แล้ว** | `role: admin/sales`, `email: UNIQUE`, `status: active/inactive` |
| **Backend verify Google token ทุก request** | `admin-auth.ts` เรียก Google API ทุกครั้ง (ช้า) |
| **Project Context มี 210 rules** | ต้อง update rules ที่เกี่ยวกับ auth หลัง migration |
| **Frontend มี 10+ API proxy routes** | ทุกไฟล์ใช้ `getToken()` จาก NextAuth → ต้องเปลี่ยนทุกไฟล์ |

### Cross-Cutting Concerns Identified

1. **Token Format Change** — Google ID Token → Supabase JWT ทั้ง Backend + Frontend ต้องเปลี่ยน
2. **Role Storage** — ใช้ `app_metadata` ใน Supabase Auth (ห้าม `user_metadata`)
3. **User Identity Link** — Supabase Auth `auth.users` ต้องเชื่อมกับ `sales_team` table
4. **API Proxy Pattern** — Frontend Next.js API routes ต้องเปลี่ยน token extraction ทุกไฟล์
5. **CSP Headers** — ต้องเพิ่ม Supabase URL ใน Content-Security-Policy
6. **E2E Test Bypass** — ต้องเปลี่ยน mock mechanism จาก NextAuth → Supabase ทั้ง Backend + Frontend
7. **JWT Secret Management** — Backend ต้องเก็บ `SUPABASE_JWT_SECRET` เป็น secret ใน Railway

### Party Mode Review Notes

| Agent | Finding |
|-------|---------|
| 🔍 Rex | `app_metadata` only for role, double-check `sales_team` table, JWT secret management |
| 💻 Amelia | Frontend งานเยอะกว่า Backend (10+ proxy routes vs 1 middleware file), ลบ dependency ได้: `next-auth`, `google-auth-library` |
| 🧪 Murat | High risk: `admin-auth.ts` ต้อง test ทุก path, Medium risk: API proxy routes, ลบ Google Auth mocks ได้ |

---

## Technology Stack for Auth Migration

### Existing Stack (No Change)

- Backend: Express.js 4.21 + TypeScript 5.6 (ES Modules)
- Frontend: Next.js (App Router) + Tailwind + shadcn/ui
- Database: Supabase PostgreSQL (`@supabase/supabase-js` ^2.95)
- Deploy: Vercel (Frontend) + Railway (Backend)

### Auth Stack Change

| Component | Before | After |
|-----------|--------|-------|
| **Frontend Auth** | `next-auth` v4.24 | `@supabase/ssr` + `@supabase/supabase-js` |
| **Frontend OAuth** | `google-auth-library` | Supabase Google OAuth provider |
| **Backend JWT Verify** | `google-auth-library` (network call to Google) | `jsonwebtoken` (local verify, ~0.1ms) |
| **Session** | NextAuth JWT cookie | Supabase cookie via `@supabase/ssr` |
| **Token Refresh** | Custom 240-line logic | Built-in Supabase auto-refresh |

### Dependencies to Remove

| Package | Project | Reason |
|---------|---------|--------|
| `next-auth` | Frontend | Replaced by Supabase Auth |
| `@types/next-auth` | Frontend | No longer needed |
| `google-auth-library` | Frontend | Replaced by Supabase client |
| `google-auth-library` | Backend | Replaced by `jsonwebtoken` local verify |

### Dependencies to Add

| Package | Project | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | Frontend | Supabase client |
| `@supabase/ssr` (≥0.5.0) | Frontend | Server-side auth for Next.js (cookie-based sessions) — ≥0.5.0 required for App Router `createServerClient` API |
| `jsonwebtoken` | Backend | Local JWT verification (fast, offline-capable) |

### Architecture Decisions (Party Mode)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Backend JWT verify method** | `jsonwebtoken` local verify | เร็ว (~0.1ms), offline-capable, ไม่ depend on Supabase availability |
| **Backend user validation** | JWT verify → query `sales_team` | Double-check active status (เผื่อ admin disable user แล้ว token ยังไม่ expire) |
| **Frontend auth library** | `@supabase/ssr` | Built-in cookie handling, auto-refresh, Next.js App Router compatible |
| **Role storage** | `app_metadata` in Supabase Auth | `user_metadata` user แก้ได้เอง → privilege escalation risk |
| **Test mocks** | Shared `supabase-auth.mock.ts` | ง่ายกว่า NextAuth mocks มาก — แค่ mock `getUser()` return value |

---

## Core Architectural Decisions

### Decision Summary

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Auth provider | Supabase Auth | DB เป็น Supabase อยู่แล้ว, ไม่เพิ่ม vendor |
| D2 | Login methods | Email+Password + Google OAuth | Client ไม่มี Google email, ต้องมีทางเลือก |
| D3 | User management | Admin invite-only | Enterprise security, disable self-signup |
| D4 | Backend JWT verify | `jsonwebtoken` local verify | เร็ว ~0.1ms, offline-capable |
| D4b | RBAC simplification | `admin \| viewer` only (ลบ `manager`) | DB `sales` → `viewer`, Frontend ลบ `manager` จาก `config/roles.ts` |
| D5 | Role storage | `app_metadata` | ป้องกัน privilege escalation |
| D6 | Frontend auth | `@supabase/ssr` | Built-in cookie handling, auto-refresh |
| D7 | Identity link | `auth_user_id` FK ใน `sales_team` | แข็งแกร่ง, link ตอน login ครั้งแรก |
| D8 | API pattern | Keep Next.js proxy routes | ซ่อน Backend URL, security |
| D9 | RLS strategy | คงเดิม (service_role bypass) | เพิ่ม user-aware RLS ทีหลังได้ |
| D10 | Migration strategy | Big bang | ไม่มี active users, เปลี่ยนทีเดียว |
| D11 | Password reset | Supabase built-in | ง่าย, ไม่ต้องเขียน code |

### D7: Identity Link — Schema Migration

เพิ่มคอลัมน์ `auth_user_id` ใน `sales_team`:

```sql
-- Migration: 003_add_auth_user_id.sql
ALTER TABLE sales_team
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);

CREATE INDEX idx_sales_team_auth_user ON sales_team(auth_user_id)
  WHERE auth_user_id IS NOT NULL;
```

**Auto-Link Flow (login ครั้งแรก) — Race-Safe:**

1. User login → Supabase Auth ให้ JWT พร้อม `user.id` + `email`
2. Backend verify JWT → ดึง `email` + `auth_user_id` จาก claims
3. Query `sales_team WHERE email = ?`
4. ถ้า `auth_user_id` ยังเป็น NULL → atomic update:
   ```sql
   UPDATE sales_team SET auth_user_id = $1
   WHERE email = $2 AND auth_user_id IS NULL
   ```
   ใช้ `.is('auth_user_id', null)` เหมือน pattern `linkLINEAccount` (race-safe)
5. ครั้งถัดไป `auth_user_id` มีอยู่แล้ว → skip link

**Admin Invite Flow:**

```
Admin → สร้าง sales_team record (email, name, role)
     → supabase.auth.admin.inviteUserByEmail(email)
     → User ได้รับ email → ตั้ง password
     → Login → auto-link auth_user_id
```

> สร้าง `sales_team` ก่อน Supabase Auth user เสมอ — ป้องกัน user login ได้แต่ไม่มี record ใน sales_team

### D8: API Proxy — Token Source Change

Frontend proxy pattern คงเดิม แต่เปลี่ยน token source:

```typescript
// Before (NextAuth)
const token = await getToken({ req, secret })
headers: { 'Authorization': `Bearer ${token.idToken}` }

// After (Supabase)
const supabase = createServerClient(cookies())
const { data: { session } } = await supabase.auth.getSession()
headers: { 'Authorization': `Bearer ${session.access_token}` }
```

Backend ยังรับ `Bearer token` เหมือนเดิม — เปลี่ยนแค่ verify logic

### D10: Big Bang Migration Sequence

```
1. Supabase Auth Config (Dashboard)
   ├── Enable email auth
   ├── Enable Google OAuth provider
   ├── Disable self-signup
   └── Configure email templates
        │
2. Schema Migration (003_add_auth_user_id.sql)
        │
3. Backend: เปลี่ยน admin-auth.ts
   └── jsonwebtoken verify + sales_team lookup + auto-link
        │
4. Frontend: เปลี่ยน auth ทั้งหมด
   ├── ลบ NextAuth, เพิ่ม @supabase/ssr
   ├── Login page (email+password + Google)
   ├── Middleware (Supabase session check)
   ├── API proxy routes (token source)
   └── User management page (admin)
        │
5. Deploy Backend + Frontend
        │
6. Admin สร้าง user accounts
        │
7. แจ้ง client → เข้าใช้ได้
```

### Cross-Component Dependencies

```
Supabase Auth Config ──→ Schema Migration ──→ Backend middleware
                                                    │
                              Frontend auth ────────┘
                                   │
                              User management page
```

### Party Mode Refinements Applied

| จุด | Refinement | Source |
|-----|-----------|--------|
| D7 race-safe | Auto-link ใช้ `.is('auth_user_id', null)` atomic update | Rex |
| D7 admin flow | สร้าง `sales_team` ก่อน → invite Supabase Auth | Rex |
| D8 token source | Proxy เปลี่ยน `getToken()` → `supabase.auth.getSession()` pattern เดิม | Amelia |
| D7 test paths | 4 paths: first login link, no sales_team reject, repeat login skip, race condition | Murat |

---

## Implementation Patterns

### Pattern 1: Backend JWT Verification

ทุก request จาก Dashboard ต้องผ่าน middleware นี้:

```typescript
// src/middleware/admin-auth.ts
import jwt from 'jsonwebtoken';

export async function verifySupabaseToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    const email = decoded.email;
    const authUserId = decoded.sub;
    const role = decoded.app_metadata?.role || 'viewer';

    // Double-check: user ต้องมีใน sales_team + status active
    const member = await getUserByEmail(email);
    if (!member || member.status !== 'active') {
      return res.status(403).json({ error: 'User not active' });
    }

    // Auto-link auth_user_id (first login)
    if (!member.auth_user_id) {
      await autoLinkAuthUser(member.id, authUserId);
    }

    req.user = { email, role, authUserId, memberId: member.id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**สำคัญ:**
- ใช้ `jwt.verify()` กับ `SUPABASE_JWT_SECRET` (local, ~0.1ms)
- ต้อง double-check `sales_team` table ทุกครั้ง (defense in depth)
- `app_metadata.role` เท่านั้น — ห้าม `user_metadata`

### Pattern 2: Auto-Link auth_user_id (Race-Safe)

เชื่อม Supabase Auth user กับ `sales_team` record ครั้งแรกที่ login:

```typescript
async function autoLinkAuthUser(memberId: string, authUserId: string) {
  const { data, error } = await supabase
    .from('sales_team')
    .update({ auth_user_id: authUserId })
    .eq('id', memberId)
    .is('auth_user_id', null)  // race-safe: ไม่ overwrite ถ้ามีอยู่แล้ว
    .select();

  // ไม่ throw error — ถ้า race condition เกิดขึ้นก็แค่ skip
  return data;
}
```

**เหมือน pattern `linkLINEAccount`** — ใช้ `.is('auth_user_id', null)` เป็น atomic guard

### Pattern 3: Frontend Supabase Client (`@supabase/ssr`)

สร้าง Supabase client สำหรับ Next.js Server Components:

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**สำคัญ:**
- ใช้ `ANON_KEY` ไม่ใช่ `SERVICE_ROLE_KEY` ใน Frontend
- `@supabase/ssr` จัดการ cookie auto-refresh ให้

### Pattern 4: API Proxy Token Forwarding

Frontend proxy routes ส่ง Supabase access_token ไป Backend:

```typescript
// app/api/admin/[...path]/route.ts
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(`${BACKEND_URL}/api/admin/${path}`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  return NextResponse.json(await response.json());
}
```

**เหมือน pattern เดิม** แต่เปลี่ยนจาก `getToken()` → `supabase.auth.getSession()`

### Pattern 5: Admin User Invite Flow

Admin สร้าง user ใหม่ผ่าน 2 ขั้นตอน:

```typescript
// 1. สร้าง sales_team record ก่อนเสมอ
const member = await createSalesTeamMember({
  email, name, role, status: 'active'
});

// 2. Invite ผ่าน Supabase Auth (ใช้ service_role client)
const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
  email,
  { data: { role } }  // → เก็บใน app_metadata
);
```

**ลำดับสำคัญมาก:**
1. สร้าง `sales_team` ก่อน
2. แล้วค่อย invite Supabase Auth
3. ป้องกันกรณี user login ได้แต่ไม่มี record ใน sales_team

### Anti-Patterns (ห้ามทำ)

| Anti-Pattern | ทำไมถึงห้าม |
|-------------|-------------|
| เก็บ role ใน `user_metadata` | User แก้ได้เอง → privilege escalation |
| ใช้ `supabase.auth.getUser()` ทุก request ใน Backend | ช้า (network call), depend on Supabase availability |
| เก็บ token ใน `localStorage` | XSS attack vector — ต้อง httpOnly cookie เท่านั้น |
| Invite Supabase Auth ก่อนสร้าง `sales_team` | User อาจ login ก่อน record พร้อม → 403 |
| ใช้ `SERVICE_ROLE_KEY` ใน Frontend | หลุด key = full DB access → catastrophic |

---

## Project Structure & Boundaries

### Backend File Change Map (`eneos-sales-automation/`)

```
src/
├── middleware/
│   └── admin-auth.ts              ← 🔴 REWRITE (Google OAuth → jsonwebtoken verify)
│
├── services/
│   └── sales-team.service.ts      ← 🟡 ADD autoLinkAuthUser() function
│
├── lib/
│   └── supabase.ts               ← ⚪ NO CHANGE (service_role client คงเดิม)
│
├── config/
│   └── index.ts                   ← 🟡 MODIFY (เพิ่ม SUPABASE_JWT_SECRET, ลบ GOOGLE_OAUTH_CLIENT_ID + ALLOWED_DOMAINS)
│
├── types/
│   └── index.ts                   ← 🟡 MODIFY (AdminUser: googleId → authUserId)
│
├── routes/
│   └── admin.routes.ts            ← ⚪ NO CHANGE (middleware interface เดิม)
│
└── __tests__/
    └── middleware/
        └── admin-auth.test.ts     ← 🔴 REWRITE (mock: google-auth-library → jsonwebtoken)

supabase/migrations/
└── 003_add_auth_user_id.sql       ← 🟢 NEW

.env.example                        ← 🟡 MODIFY (เพิ่ม SUPABASE_JWT_SECRET, ลบ GOOGLE_OAUTH_CLIENT_ID)
package.json                        ← 🟡 MODIFY (เพิ่ม jsonwebtoken, ลบ google-auth-library)
```

### Frontend File Change Map (`eneos-admin-dashboard/`)

```
src/
├── lib/
│   ├── auth.ts                    ← 🔴 DELETE (NextAuth config ทั้งไฟล์)
│   ├── supabase/                  ← 🟢 NEW DIRECTORY
│   │   ├── server.ts             ← 🟢 NEW (createServerClient for API routes)
│   │   ├── client.ts             ← 🟢 NEW (createBrowserClient for components)
│   │   ├── middleware.ts          ← 🟢 NEW (createServerClient for middleware)
│   │   └── auth-helpers.ts        ← 🟢 NEW (getSessionOrUnauthorized — shared by 16 routes)
│   └── api.ts                     ← ⚪ NO CHANGE
│
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx         ← 🔴 REWRITE (Email+Password + Google OAuth form)
│   │   ├── reset-password/page.tsx ← 🟢 NEW (ส่ง email reset password)
│   │   └── update-password/page.tsx ← 🟢 NEW (ตั้ง password ใหม่จาก email link)
│   ├── (dashboard)/layout.tsx     ← 🟡 MODIFY (getServerSession → supabase.auth.getUser)
│   ├── auth/callback/route.ts     ← 🟢 NEW (Supabase OAuth callback handler)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  ← 🔴 DELETE
│   │   └── admin/ (16 routes)     ← 🟡 MODIFY ALL (getToken → getSessionOrUnauthorized helper)
│   ├── providers.tsx              ← 🔴 REWRITE (SessionProvider → Supabase onAuthStateChange listener)
│   └── layout.tsx                 ← ⚪ NO CHANGE
│
├── proxy.ts (middleware)          ← 🔴 REWRITE (NextAuth withAuth → Supabase session check)
│
├── hooks/
│   └── use-session-sync.ts        ← 🟡 MODIFY (Supabase onAuthStateChange replaces BroadcastChannel)
│
├── components/
│   ├── layout/user-nav.tsx        ← 🟡 MODIFY (signOut → supabase.auth.signOut)
│   └── shared/
│       ├── session-warning.tsx    ← 🟡 SIMPLIFY (Supabase auto-refresh ลด complexity)
│       └── session-sync.tsx       ← 🟡 MODIFY (ใช้ Supabase onAuthStateChange)
│
├── config/
│   └── roles.ts                   ← 🟡 MODIFY (ลบ `manager` → ใช้แค่ `admin | viewer`)
│
├── types/
│   ├── next-auth.d.ts             ← 🔴 DELETE
│   └── supabase.d.ts              ← 🟢 NEW (Supabase session type)
│
└── __tests__/
    ├── lib/supabase-auth-helpers.test.ts  ← 🟢 NEW
    ├── middleware-supabase.test.ts         ← 🟢 NEW (replace middleware.test.ts)
    ├── auth.test.ts               ← 🔴 REWRITE
    └── api/admin/*.test.ts        ← 🟡 MODIFY (mock เปลี่ยน)

.env.example                        ← 🟡 MODIFY (ลบ GOOGLE_*, NEXTAUTH_*, เพิ่ม SUPABASE_*)
next.config.mjs                     ← 🟡 MODIFY (ลบ googleusercontent remote pattern)
package.json                        ← 🟡 MODIFY (ลบ next-auth, เพิ่ม @supabase/ssr + @supabase/supabase-js)
```

### Architectural Boundaries

**API Boundary (ไม่เปลี่ยน):**
```
Frontend (Vercel) ──Bearer token──→ Backend (Railway)
                                       │
                                       ▼
                                  Supabase DB (service_role)
```
- Frontend ส่ง Supabase `access_token` แทน Google `id_token`
- Backend ยังรับ `Bearer token` เหมือนเดิม — เปลี่ยนแค่ verify logic
- Webhook routes (LINE, Brevo) ไม่กระทบ

**Auth Boundary:**
```
Supabase Auth (auth.users)
        │ auth_user_id FK
        ▼
    sales_team (public schema)
        │ role, status
        ▼
   Backend middleware (req.user)
```

**Data Boundary:**
- `auth.users` → จัดการโดย Supabase Auth (ห้าม query ตรง)
- `sales_team` → จัดการโดย Backend service_role client
- Role source of truth: `sales_team.role` (`app_metadata` เป็นแค่ cache ใน JWT)

### Requirements → File Mapping

| Requirement | Backend Files | Frontend Files |
|------------|---------------|----------------|
| FR-1 Email+Password | — | `login/page.tsx`, `lib/supabase/client.ts` |
| FR-2 Google OAuth | — | `login/page.tsx`, `auth/callback/route.ts` |
| FR-3 Admin invite-only | `sales-team.service.ts` | User management page (existing) |
| FR-4 RBAC | `admin-auth.ts`, `admin.routes.ts` | `proxy.ts`, `config/roles.ts` |
| FR-5 User management | `sales-team.service.ts` | Settings/team page (existing) |
| FR-6 Session auto-refresh | — | `@supabase/ssr` built-in |
| FR-7 Multi-tab sync | — | `hooks/use-session-sync.ts` via `onAuthStateChange` |
| NFR-1 Fast token verify | `admin-auth.ts` (jsonwebtoken ~0.1ms) | — |
| NFR-7 app_metadata role | `admin-auth.ts` | — |
| NFR-8 Double-check sales_team | `admin-auth.ts` | — |

### Change Summary

| Category | Count | Risk |
|----------|-------|------|
| 🔴 REWRITE/DELETE/RENAME | 9 files | High |
| 🟡 MODIFY | 26+ files | Medium |
| 🟢 NEW | 11 files | Low |
| ⚪ NO CHANGE | Routes, DB, Webhooks | None |

### Party Mode Refinements Applied

| # | Finding | Action |
|---|---------|--------|
| 1 | ลบ ADMIN_EMAILS fallback จาก `admin-auth.ts` | Simplify security model — `sales_team` lookup เป็น defense in depth แทน |
| 2 | ลบ `GOOGLE_OAUTH_CLIENT_ID` + `ALLOWED_DOMAINS` จาก Zod schema | Breaking change ต้อง clean ไม่งั้น startup fail |
| 3 | ตรวจ middleware entry point (`proxy.ts` naming) | Verify Next.js ยัง recognize middleware |
| 4 | สร้าง `lib/supabase/auth-helpers.ts` | ลด duplication 16 API proxy routes → 1 shared function |
| 5 | Update imports ที่ reference `@/lib/auth` | Search + replace ทุก consumer |
| 6 | `providers.tsx` ใส่ Supabase `onAuthStateChange` listener | Global auth state management |
| 7 | Backend tests — keep case names, change mocks only | ลด rewrite effort: 40+ test cases ยัง valid |
| 8 | เพิ่ม `supabase-auth-helpers.test.ts` | Test coverage สำหรับ shared helper |
| 9 | E2E bypass เปลี่ยนจาก header → mock Supabase session | Security improvement |

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- D1 (Supabase Auth) + D4 (`jsonwebtoken`) + D6 (`@supabase/ssr`) ทำงานร่วมกันได้: Frontend จัดการ session → ส่ง `access_token` → Backend verify ด้วย JWT secret
- D7 (`auth_user_id` FK) + D5 (`app_metadata` role) สอดคล้อง: JWT มี role cache, Backend double-check จาก `sales_team`
- D8 (Keep proxy) + D9 (service_role RLS) ไม่ขัดกัน: Frontend ไม่ access Supabase DB โดยตรง

**Pattern Consistency:**
- Pattern 2 (auto-link) ใช้ `.is('auth_user_id', null)` — ตรงกับ pattern เดิม `linkLINEAccount`
- Pattern 4 (proxy forwarding) ใช้ `auth-helpers.ts` shared function — consistent ทั้ง 16 routes
- Anti-patterns ครอบคลุม 5 ข้อห้ามหลัก

**Structure Alignment:**
- File change map ครบทั้ง Backend (10 files) + Frontend (30+ files)
- Boundaries ชัดเจน: Auth → sales_team → middleware → routes
- Webhook routes (LINE, Brevo) ไม่กระทบ

### Requirements Coverage ✅

| Requirement | Status | Implementation |
|------------|--------|----------------|
| FR-1 Email+Password | ✅ | Supabase Auth email provider + login page |
| FR-2 Google OAuth | ✅ | Supabase Google provider + callback route |
| FR-3 Invite-only | ✅ | `inviteUserByEmail()` + disable self-signup |
| FR-4 RBAC | ✅ | `app_metadata.role` + `sales_team` double-check |
| FR-5 User management | ✅ | Existing settings/team page + Supabase Admin API |
| FR-6 Auto-refresh | ✅ | `@supabase/ssr` built-in |
| FR-7 Multi-tab sync | ✅ | `onAuthStateChange` replaces BroadcastChannel |
| NFR-1 Fast verify | ✅ | `jsonwebtoken` local ~0.1ms |
| NFR-2 Session ≤24h | ✅ | Supabase Dashboard config |
| NFR-3 httpOnly cookie | ✅ | `@supabase/ssr` cookie handler |
| NFR-4 Zero downtime | ✅ | Big bang OK — ไม่มี active users |
| NFR-5 Backward API | ✅ | Backend endpoints ไม่เปลี่ยน |
| NFR-6 No new vendor | ✅ | ใช้ Supabase ที่มีอยู่ |
| NFR-7 app_metadata | ✅ | Pattern 5 set ตอน invite |
| NFR-8 sales_team check | ✅ | Pattern 1 double-check ทุก request |

**Coverage: 15/15 requirements fully supported**

### Implementation Readiness ✅

**Decision Completeness:**
- 11 decisions documented with rationale
- 5 implementation patterns with code examples
- 5 anti-patterns with explanations
- Migration sequence defined (7 steps)

**Structure Completeness:**
- Complete file change map (🔴 🟡 🟢 ⚪ categorized)
- Requirements → file mapping table
- Architectural boundaries diagram

**Pattern Completeness:**
- Race-safe patterns documented (auto-link)
- Token flow patterns (Frontend → Backend)
- Admin invite flow with ordering constraint

### Gap Analysis

**Critical Gaps: None** ✅

**Important Gaps (Resolved via Party Mode):**

1. **Role simplification** — ลบ `manager` role ใช้แค่ `admin | viewer` (เพิ่มทีหลังได้)
2. **`SUPABASE_JWT_SECRET` location** — Supabase Dashboard → Settings → API → JWT Secret
3. **Google OAuth redirect URL** — ต้องตั้งใหม่ใน Google Cloud Console ชี้ไป `https://<project>.supabase.co/auth/v1/callback`
4. **Auth callback route** — `auth/callback/route.ts` ต้อง `exchangeCodeForSession(code)` (critical path)
5. **Pin `@supabase/ssr` ≥ 0.5.0** — API เปลี่ยนระหว่าง versions
6. **Password reset pages** — เพิ่ม `reset-password/page.tsx` + `update-password/page.tsx`

**Medium Gaps:**
- Login page handle error query params (non-invited user UX)
- Password reset test paths (2 test files)
- Post-migration smoke test checklist
- E2E ใช้ real Supabase test user แทน header bypass

### Post-Migration Smoke Test Checklist

- [ ] Email+Password login สำเร็จ
- [ ] Google OAuth login สำเร็จ
- [ ] Invite new user → ได้รับ email
- [ ] Login with non-invited email → rejected
- [ ] Inactive user → 403
- [ ] Admin route access by viewer → rejected
- [ ] Multi-tab logout sync
- [ ] Token refresh after 1 hour
- [ ] All 16 API proxy routes return data

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium)
- [x] Technical constraints identified (7 constraints)
- [x] Cross-cutting concerns mapped (7 concerns)

**✅ Architectural Decisions**
- [x] 11 critical decisions documented with rationale
- [x] Technology stack fully specified (add 3, remove 3 packages)
- [x] Integration patterns defined (proxy, JWT, auto-link)
- [x] Performance considerations addressed (local JWT verify ~0.1ms)

**✅ Implementation Patterns**
- [x] 5 patterns with code examples
- [x] 5 anti-patterns documented
- [x] Race-safe patterns specified
- [x] Admin flow ordering constraint defined

**✅ Project Structure**
- [x] Complete file change map (Backend + Frontend)
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status: ✅ READY FOR IMPLEMENTATION**

**Confidence Level: HIGH**

**Key Strengths:**
- ใช้ Supabase ที่มีอยู่แล้ว — ไม่เพิ่ม vendor
- Backend endpoint interface ไม่เปลี่ยน — backward compatible
- Race-safe patterns reuse จาก existing codebase
- Token verify เร็วขึ้น 100x (network call → local ~0.1ms)
- ลบ 240 lines token refresh logic → built-in

**Areas for Future Enhancement:**
- User-aware RLS policies (ปัจจุบันใช้ service_role bypass)
- `manager` role ถ้ามี use case ในอนาคต
- MFA (Multi-Factor Authentication) via Supabase
- Audit log สำหรับ auth events

### Implementation Handoff

**Recommended Epic Structure:**
1. **Epic: Supabase Auth Config** — Dashboard setup + schema migration
2. **Epic: Backend Auth** — `admin-auth.ts` rewrite + tests
3. **Epic: Frontend Auth** — Login, middleware, providers, callback
4. **Epic: Frontend Proxy** — 16 API routes migration
5. **Epic: User Management** — Invite flow, password reset pages
6. **Epic: Cleanup** — Remove old packages, update docs

**First Priority:** Supabase Dashboard config + `003_add_auth_user_id.sql` migration

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-02-11
**Document Location:** `_bmad-output/planning-artifacts/supabase-auth-architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document:**
- 11 architectural decisions documented with rationale
- 5 implementation patterns with code examples + 5 anti-patterns
- Complete file change map: Backend (10 files) + Frontend (30+ files)
- 15/15 requirements fully supported with mapping
- Validation confirmed coherence and completeness

**Implementation Ready Foundation:**
- 4 architectural components: Supabase Auth config, Backend middleware, Frontend auth, User management
- 3 Party Mode sessions with Rex, Amelia, Murat refinements
- Post-migration smoke test checklist (9 items)
- Recommended 6-epic implementation structure

### AI Agent Implementation Guide

**For AI Agents:**
This architecture document is the single source of truth for the Supabase Auth migration. Follow all decisions, patterns, and structures exactly as documented.

**Development Sequence:**
1. Configure Supabase Auth Dashboard (manual)
2. Run `003_add_auth_user_id.sql` migration
3. Rewrite Backend `admin-auth.ts` with jsonwebtoken
4. Replace Frontend auth (NextAuth → @supabase/ssr)
5. Migrate 16 API proxy routes
6. Add user invite flow + password reset pages
7. Remove old packages + update project-context.md

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Create Epics & Stories using this architecture as guide.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
