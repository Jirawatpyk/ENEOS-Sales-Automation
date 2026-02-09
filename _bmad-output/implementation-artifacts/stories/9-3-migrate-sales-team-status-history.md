# Story 9.3: Migrate Sales_Team + Status_History

Status: done

## Story

As a **developer**,
I want **sales team and status history services extracted from sheets.service.ts and migrated to Supabase**,
So that **team management and audit logs use proper database with FK relationships, indexed queries, and no Google Sheets dependency**.

## Acceptance Criteria

1. **AC1:** `getSalesTeamMember(lineUserId)` returns team member by LINE User ID from `sales_team` table via Supabase query.
2. **AC2:** `getUserByEmail(email)` returns team member with `role` and `status` for admin auth middleware — inactive status blocks login (403).
3. **AC3:** `linkLINEAccount(dashboardMemberEmail, targetLineUserId)` updates existing member's `line_user_id` via Supabase — includes race condition mitigation using `UPDATE ... WHERE line_user_id IS NULL`.
4. **AC4:** `addStatusHistory()` is fire-and-forget — errors logged but not thrown, does not block main operations.
5. **AC5:** `status_history.lead_id` is FK to `leads.id` — CASCADE DELETE works (when lead deleted, history entries removed).
6. **AC6:** All team management + status history tests rewritten for Supabase mock — zero `googleapis` mocking in new service test files.

## Tasks / Subtasks

- [x] Task 1: Create `src/services/sales-team.service.ts` (AC: #1, #2, #3)
  - [x] 1.1: `getSalesTeamMember(lineUserId)` — `SELECT * FROM sales_team WHERE line_user_id = $1`
  - [x] 1.2: `getUserByEmail(email)` — `SELECT * FROM sales_team WHERE email = $1` with role + status
  - [x] 1.3: `getSalesTeamAll()` — `SELECT * FROM sales_team`
  - [x] 1.4: `getAllSalesTeamMembers(filter?)` — `SELECT * FROM sales_team` with status/role filter
  - [x] 1.5: `getSalesTeamMemberById(lineUserId)` — `SELECT * FROM sales_team WHERE line_user_id = $1` returning `SalesTeamMemberFull`
  - [x] 1.6: `updateSalesTeamMember(lineUserId, updates)` — `UPDATE sales_team SET ... WHERE line_user_id = $1`
  - [x] 1.7: `createSalesTeamMember(data)` — `INSERT INTO sales_team` with duplicate email check
  - [x] 1.8: `getUnlinkedLINEAccounts()` — `SELECT * FROM sales_team WHERE line_user_id IS NOT NULL AND email IS NULL`
  - [x] 1.9: `linkLINEAccount(email, targetLineUserId)` — UPDATE with race-safe WHERE clause
  - [x] 1.10: `getUnlinkedDashboardMembers()` — `SELECT * FROM sales_team WHERE email IS NOT NULL AND line_user_id IS NULL`
  - [x] 1.11: Add compatibility wrapper `export const salesTeamService = { ... }` if needed by consumers

- [x] Task 2: Create `src/services/status-history.service.ts` (AC: #4, #5)
  - [x] 2.1: `addStatusHistory(entry)` — fire-and-forget INSERT with `lead_id` UUID FK
  - [x] 2.2: `getStatusHistory(leadId)` — `SELECT * FROM status_history WHERE lead_id = $1 ORDER BY created_at ASC`
  - [x] 2.3: `getAllStatusHistory(options)` — with pagination, date filter, status filter, changedBy filter, joined with leads

- [x] Task 3: Update consumers — admin-auth middleware (AC: #2)
  - [x] 3.1: Update `src/middleware/admin-auth.ts` — import `getUserByEmail` from `sales-team.service.js` instead of `sheetsService`
  - [x] 3.2: Verify ADMIN_EMAILS fallback + ACCOUNT_INACTIVE throw still works

- [x] Task 4: Update consumers — team-management controller (AC: #1, #3)
  - [x] 4.1: Update `src/controllers/admin/team-management.controller.ts` — import from `sales-team.service.js`
  - [x] 4.2: Replace all `sheetsService.getAllSalesTeamMembers()` → `salesTeamService.getAllSalesTeamMembers()`
  - [x] 4.3: Replace `sheetsService.getSalesTeamMemberById()` → `salesTeamService.getSalesTeamMemberById()`
  - [x] 4.4: Replace `sheetsService.updateSalesTeamMember()` → `salesTeamService.updateSalesTeamMember()`
  - [x] 4.5: Replace `sheetsService.createSalesTeamMember()` → `salesTeamService.createSalesTeamMember()`
  - [x] 4.6: Replace `sheetsService.getUnlinkedLINEAccounts()` → `salesTeamService.getUnlinkedLINEAccounts()`
  - [x] 4.7: Replace `sheetsService.linkLINEAccount()` → `salesTeamService.linkLINEAccount()`
  - [x] 4.8: Replace `sheetsService.getUnlinkedDashboardMembers()` → `salesTeamService.getUnlinkedDashboardMembers()`

- [x] Task 4b: Update consumers — sales.controller.ts (AC: #1)
  - [x] 4b.1: Update `src/controllers/admin/sales.controller.ts` — import `salesTeamService` from `sales-team.service.js`
  - [x] 4b.2: Replace `sheetsService.getSalesTeamMember()` at line 156 (getSalesPerformance) → `salesTeamService.getSalesTeamMember()`
  - [x] 4b.3: Replace `sheetsService.getSalesTeamMember()` at line 401 (getSalesPerformanceTrend) → `salesTeamService.getSalesTeamMember()`

- [x] Task 4c: Update consumers — team.controller.ts (AC: #1)
  - [x] 4c.1: Update `src/controllers/admin/team.controller.ts` — import `salesTeamService` from `sales-team.service.js`
  - [x] 4c.2: Replace `sheetsService.getSalesTeamAll()` at line 24 → `salesTeamService.getSalesTeamAll()`

- [x] Task 5: Update consumers — activity-log controller (AC: #4, #5)
  - [x] 5.1: Update `src/controllers/admin/activity-log.controller.ts` — import `getAllStatusHistory` from `status-history.service.js`
  - [x] 5.2: Replace `sheetsService.getAllStatusHistory()` → `statusHistoryService.getAllStatusHistory()`

- [x] Task 6: Update consumers — leads.controller.ts (AC: #1, #5)
  - [x] 6.1: Update `src/controllers/admin/leads.controller.ts` — import BOTH `salesTeamService` AND `statusHistoryService`
  - [x] 6.2: Replace `sheetsService.getStatusHistory()` at line 202 → `statusHistoryService.getStatusHistory()`
  - [x] 6.3: Replace `sheetsService.getSalesTeamMember()` at line 288 → `salesTeamService.getSalesTeamMember()`
  - [x] 6.4: Change getStatusHistory parameter from `leadUUID` string → `lead.id` UUID (FK-based lookup)

- [x] Task 7: Update consumers — leads.service.ts (AC: #4)
  - [x] 7.1: Replace `sheetsService.addStatusHistory()` calls (3 locations: lines 53, 195, 267) → `statusHistoryService.addStatusHistory()`
  - [x] 7.2: Update import from `sheets.service.js` → `status-history.service.js`
  - [x] 7.3: Verify argument objects unchanged — `{ leadUUID, status, changedById, changedByName, timestamp }` stays as-is (interface preserved)

- [x] Task 8: Create `src/__tests__/services/sales-team.service.test.ts` (AC: #6)
  - [x] 8.1: Supabase mock setup (vi.hoisted chainable pattern)
  - [x] 8.2: Test `getSalesTeamMember()` — found + not found
  - [x] 8.3: Test `getUserByEmail()` — active admin, active sales, inactive (blocks), not found
  - [x] 8.4: Test `getAllSalesTeamMembers()` — with filters (status, role)
  - [x] 8.5: Test `getSalesTeamMemberById()` — found + not found
  - [x] 8.6: Test `updateSalesTeamMember()` — success + not found
  - [x] 8.7: Test `createSalesTeamMember()` — success + duplicate email (23505)
  - [x] 8.8: Test `getUnlinkedLINEAccounts()` — returns correct subset
  - [x] 8.9: Test `linkLINEAccount()` — success, target already linked, member not found
  - [x] 8.10: Test `getUnlinkedDashboardMembers()` — returns correct subset

- [x] Task 9: Create `src/__tests__/services/status-history.service.test.ts` (AC: #6)
  - [x] 9.1: Supabase mock setup
  - [x] 9.2: Test `addStatusHistory()` — success (fire-and-forget)
  - [x] 9.3: Test `addStatusHistory()` — error does NOT throw (logs only)
  - [x] 9.4: Test `getStatusHistory(leadId)` — returns sorted entries + empty result
  - [x] 9.5: Test `getAllStatusHistory()` — pagination, filters, changedByOptions

- [x] Task 10: Update existing test files (AC: #6)
  - [x] 10.1: Update `team-management.controller.test.ts` — mock `sales-team.service.js` instead of `sheets.service`
  - [x] 10.2: Update `activity-log.controller.test.ts` — mock `status-history.service.js` instead of `sheets.service`
  - [x] 10.3: Update `admin-auth.test.ts` — mock `sales-team.service.js` for `getUserByEmail`
  - [x] 10.4: Update `leads.service.test.ts` — mock `status-history.service.js` for `addStatusHistory`
  - [x] 10.5: Update `admin.controller.test.ts` — mock BOTH `sales-team.service.js` (getSalesTeamMember) AND `status-history.service.js` (getStatusHistory)
  - [x] 10.6: Update `admin.controller.trend.test.ts` — mock BOTH `sales-team.service.js` (getSalesTeamMember) AND `status-history.service.js` (getStatusHistory)
  - [x] 10.7: Update `admin.controller.team.test.ts` — mock `sales-team.service.js` for `getSalesTeamAll`
  - [x] 10.8: Update `admin.routes.trend.test.ts` — mock `sales-team.service.js` for `getSalesTeamMember` (5 locations)
  - [x] 10.9: Update `app.test.ts` — mock `sales-team.service.js` for `getSalesTeamMember` (line 142)
  - [x] 10.10: Update `campaign.routes.test.ts` — mock `sales-team.service.js` for `getSalesTeamMember` (line 64)
  - [x] 10.11: Run full test suite — zero failures

## Dev Notes

### Source Documents
- **[Source: ADR-002-supabase-migration.md#Story 9-3]** — Schema, AC definitions
- **[Source: epic-09-supabase-migration.md#Story 9-3]** — Story description and dependencies
- **[Source: stories/9-2-migrate-campaign-services.md]** — Previous story patterns + compatibility wrapper approach
- **[Source: project-context.md]** — ES Modules, Vitest patterns, config access rules

### Critical Implementation Guide

**1. Two New Service Files (Extracted from sheets.service.ts)**

The ADR-002 Service Migration Map specifies creating two new files:
- `src/services/sales-team.service.ts` — All sales team CRUD operations
- `src/services/status-history.service.ts` — All status history operations

Both follow the **exported functions** pattern (NOT classes) established in 9-1a and 9-2:

```typescript
// src/services/sales-team.service.ts
import { supabase } from '../lib/supabase.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('sales-team');

export async function getSalesTeamMember(lineUserId: string): Promise<SalesTeamMember | null> { ... }
export async function getUserByEmail(email: string): Promise<(SalesTeamMember & { role: string; status: 'active' | 'inactive' }) | null> { ... }
// ... all other functions
```

**2. Supabase Schema Reference**

```sql
-- sales_team table
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

-- status_history table
CREATE TABLE status_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  changed_by_id   TEXT,               -- LINE User ID or 'System'
  changed_by_name TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_lead ON status_history(lead_id);
CREATE INDEX idx_status_history_created ON status_history(created_at DESC);
```

**3. getSalesTeamMember() — Supabase Implementation**

```typescript
export async function getSalesTeamMember(lineUserId: string): Promise<SalesTeamMember | null> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('line_user_id, name, email, phone')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    lineUserId: data.line_user_id,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
  };
}
```

**4. getUserByEmail() — AUTH CRITICAL**

This function is called by `admin-auth.ts` middleware (line 305). The return type must match the existing contract:

```typescript
export async function getUserByEmail(
  email: string
): Promise<(SalesTeamMember & { role: string; status: 'active' | 'inactive' }) | null> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    lineUserId: data.line_user_id || '',
    name: data.name,
    email: data.email,
    phone: data.phone || undefined,
    role: data.role,
    createdAt: data.created_at,
    status: data.status as 'active' | 'inactive',
  };
}
```

> **CRITICAL:** The `admin-auth.ts` middleware checks `user.status === 'inactive'` to block login. This logic MUST be preserved exactly. The Supabase `status` column has a CHECK constraint `('active', 'inactive')`.

**5. getAllSalesTeamMembers(filter?) — Admin Dashboard Team Management**

```typescript
export async function getAllSalesTeamMembers(
  filter?: SalesTeamFilter
): Promise<SalesTeamMemberFull[]> {
  let query = supabase.from('sales_team').select('*');

  if (filter?.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }
  if (filter?.role && filter.role !== 'all') {
    query = query.eq('role', filter.role);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapToSalesTeamMemberFull);
}
```

**6. createSalesTeamMember() — Duplicate Email Detection**

```typescript
export async function createSalesTeamMember(
  data: { name: string; email: string; phone?: string; role: 'admin' | 'sales' }
): Promise<SalesTeamMemberFull> {
  const { data: member, error } = await supabase
    .from('sales_team')
    .insert({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      role: data.role,
      line_user_id: null,  // Manual member — no LINE account yet
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // UNIQUE constraint violation = duplicate email
      throw new AppError('Email already exists', 409, 'DUPLICATE_EMAIL');
    }
    throw error;
  }

  return mapToSalesTeamMemberFull(member);
}
```

**7. linkLINEAccount() — Race-Safe Implementation**

The current Google Sheets implementation has a known race condition risk (concurrent requests can both pass validation). Supabase allows atomic conditional updates:

```typescript
export async function linkLINEAccount(
  dashboardMemberEmail: string,
  targetLineUserId: string
): Promise<SalesTeamMemberFull | null> {
  // 1. Verify target LINE account exists and is not already linked
  const { data: lineAccount } = await supabase
    .from('sales_team')
    .select('*')
    .eq('line_user_id', targetLineUserId)
    .maybeSingle();

  if (!lineAccount) return null;  // LINE account not found
  if (lineAccount.email) {
    throw new AppError('LINE account already linked to another member', 409, 'ALREADY_LINKED');
  }

  // 2. Update dashboard member to set line_user_id (atomic: WHERE line_user_id IS NULL)
  const { data: updated, error } = await supabase
    .from('sales_team')
    .update({ line_user_id: targetLineUserId })
    .eq('email', dashboardMemberEmail.toLowerCase())
    .is('line_user_id', null)  // Race-safe: only if still unlinked
    .select()
    .single();

  if (error || !updated) {
    throw new AppError('Member not found or already linked', 409, 'LINK_FAILED');
  }

  // 3. Delete the LINE-only row (it's now merged into the dashboard member)
  await supabase
    .from('sales_team')
    .delete()
    .eq('id', lineAccount.id);

  return mapToSalesTeamMemberFull(updated);
}
```

> **IMPROVEMENT over Sheets:** The `WHERE line_user_id IS NULL` clause prevents race conditions atomically — no second read needed.

**8. addStatusHistory() — Fire-and-Forget**

```typescript
export async function addStatusHistory(entry: StatusHistoryEntry): Promise<void> {
  try {
    await supabase.from('status_history').insert({
      lead_id: entry.leadUUID,           // Map interface field → DB column
      status: entry.status,
      changed_by_id: entry.changedById,
      changed_by_name: entry.changedByName,
      notes: entry.notes || null,
      // created_at auto-set by DEFAULT now() — entry.timestamp is ignored
    });
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    logger.error('Failed to add status history entry', {
      leadUUID: entry.leadUUID,
      status: entry.status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

> **INTERFACE PRESERVED:** Accepts `StatusHistoryEntry` as-is (uses `leadUUID` and `timestamp` fields). Maps `entry.leadUUID` → `lead_id` column internally. The `entry.timestamp` field is accepted but not written — Supabase `created_at DEFAULT now()` handles it. This means **zero changes needed** to callers in `leads.service.ts` — they keep passing `{ leadUUID, status, changedById, changedByName, timestamp }` exactly as before.

> **CALLER CHANGES:** Only the import changes — `sheetsService.addStatusHistory(...)` → `statusHistoryService.addStatusHistory(...)`. The argument object stays identical.

**9. getStatusHistory(leadId) — FK-Based Lookup**

```typescript
export async function getStatusHistory(leadId: string): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from('status_history')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });  // Oldest first

  if (error) throw error;

  return (data || []).map(row => ({
    leadUUID: row.lead_id,  // Keep interface compatible with admin types
    status: row.status as LeadStatus,
    changedById: row.changed_by_id || '',
    changedByName: row.changed_by_name || '',
    timestamp: row.created_at,
    notes: row.notes || undefined,
  }));
}
```

> **CRITICAL:** The return type is `StatusHistoryEntry[]` which uses `leadUUID` and `timestamp` field names. The mapper preserves this interface for backward compatibility with `leads.controller.ts` (line 201-212) and `admin.controller.test.ts` which expect these field names. The underlying data uses `lead_id` and `created_at` from Supabase.

**10. getAllStatusHistory(options) — Activity Log**

This is the most complex function. The current Sheets implementation (lines 1414-1582) fetches ALL status history + ALL leads, then merges and filters in memory. Supabase replaces this with efficient queries:

```typescript
export async function getAllStatusHistory(options: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  status?: string[];
  changedBy?: string;
}): Promise<{
  entries: Array<StatusHistoryEntry & { lead?: LeadRow }>;
  total: number;
  changedByOptions: Array<{ id: string; name: string }>;
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  // Build query with filters
  let query = supabase
    .from('status_history')
    .select('*', { count: 'exact' });

  if (options.from) query = query.gte('created_at', options.from);
  if (options.to) query = query.lte('created_at', options.to);
  if (options.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }
  if (options.changedBy) query = query.eq('changed_by_id', options.changedBy);

  const { data: entries, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Get lead data for these entries (two-query JOIN pattern from 9-2)
  const leadIds = [...new Set((entries || []).map(e => e.lead_id))];
  let leadsMap = new Map();
  if (leadIds.length > 0) {
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds);
    leadsMap = new Map((leads || []).map(l => [l.id, l]));
  }

  // Get changedByOptions (distinct changed_by_id + name)
  const { data: changedByData } = await supabase
    .from('status_history')
    .select('changed_by_id, changed_by_name')
    .not('changed_by_id', 'is', null);
  // Deduplicate
  const changedByMap = new Map<string, string>();
  (changedByData || []).forEach(row => {
    if (row.changed_by_id && !changedByMap.has(row.changed_by_id)) {
      changedByMap.set(row.changed_by_id, row.changed_by_name || row.changed_by_id);
    }
  });
  const changedByOptions = Array.from(changedByMap.entries()).map(([id, name]) => ({ id, name }));

  // Map results
  const result = (entries || []).map(row => {
    const lead = leadsMap.get(row.lead_id);
    return {
      leadUUID: row.lead_id,
      status: row.status as LeadStatus,
      changedById: row.changed_by_id || '',
      changedByName: row.changed_by_name || '',
      timestamp: row.created_at,
      notes: row.notes || undefined,
      lead: lead ? supabaseLeadToLeadRow(lead) : undefined,
    };
  });

  return {
    entries: result,
    total: count || 0,
    changedByOptions,
  };
}
```

> **NOTE:** Import `supabaseLeadToLeadRow` from `leads.service.js` to convert Supabase lead rows to `LeadRow` format for the activity log response.

> **`ActivityLogEntry.rowNumber` handling:** The `ActivityLogEntry` interface (admin.types.ts:834) has `rowNumber: number` described as "Required for Lead Detail Modal". After Supabase migration, row numbers don't exist. The `activity-log.controller.ts` maps `entry.lead` → `leadRowToLeadItem()` which includes `rowNumber`. Since `supabaseLeadToLeadRow()` already sets `rowNumber: 0` for Supabase leads, this field will be `0`. The Dashboard Lead Detail Modal already uses UUID (`leadUUID`) for navigation after Story 9-1b — `rowNumber` is vestigial and will be cleaned up in Story 9-6 (Frontend Type Updates). For now, pass `0` and don't break the interface.

**11. Mapper Functions**

```typescript
function mapToSalesTeamMemberFull(row: any): SalesTeamMemberFull {
  return {
    lineUserId: row.line_user_id || null,
    name: row.name,
    email: row.email || null,
    phone: row.phone || null,
    role: row.role as 'admin' | 'sales',
    createdAt: row.created_at,
    status: row.status as 'active' | 'inactive',
  };
}
```

**12. updateSalesTeamMember() — Lookup by line_user_id**

The current Sheets implementation updates a member row by finding the row with matching `lineUserId`. In Supabase:

```typescript
export async function updateSalesTeamMember(
  lineUserId: string,
  updates: SalesTeamMemberUpdate
): Promise<SalesTeamMemberFull | null> {
  const updateData: Record<string, unknown> = {};
  if (updates.email !== undefined) updateData.email = updates.email?.toLowerCase() || null;
  if (updates.phone !== undefined) updateData.phone = updates.phone || null;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await supabase
    .from('sales_team')
    .update(updateData)
    .eq('line_user_id', lineUserId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError('Email already exists', 409, 'DUPLICATE_EMAIL');
    if (error.code === 'PGRST116') return null;  // No rows matched
    throw error;
  }

  return mapToSalesTeamMemberFull(data);
}
```

> **CRITICAL:** The team-management controller uses `lineUserId` as the identifier for GET/PATCH routes. The `sales_team` table has `line_user_id` with UNIQUE constraint but CAN BE NULL (for manual members). The controller routes use `:lineUserId` param. For manual members (no LINE account), the admin dashboard may need to use a different identifier — but this is out of scope for Story 9-3 (existing controller pattern is preserved).

**13. getUnlinkedLINEAccounts() — For Linking Modal**

```typescript
export async function getUnlinkedLINEAccounts(): Promise<Array<{ lineUserId: string; name: string; createdAt: string }>> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('line_user_id, name, created_at')
    .not('line_user_id', 'is', null)
    .is('email', null);  // Has LINE but no email → not linked to Dashboard member

  if (error) throw error;

  return (data || []).map(row => ({
    lineUserId: row.line_user_id!,
    name: row.name,
    createdAt: row.created_at,
  }));
}
```

### Consumer Migration Map

| Consumer File | Current Import | New Import | Change Description |
|---|---|---|---|
| `middleware/admin-auth.ts` | `sheetsService.getUserByEmail()` | `salesTeamService.getUserByEmail()` | Auth middleware — CRITICAL |
| `controllers/admin/team-management.controller.ts` | `sheetsService.*` (10 functions) | `salesTeamService.*` | All team CRUD |
| `controllers/admin/sales.controller.ts` | `sheetsService.getSalesTeamMember()` (2 calls: lines 156, 401) | `salesTeamService.getSalesTeamMember()` | Sales performance + trend |
| `controllers/admin/team.controller.ts` | `sheetsService.getSalesTeamAll()` (line 24) | `salesTeamService.getSalesTeamAll()` | Legacy team list endpoint |
| `controllers/admin/activity-log.controller.ts` | `sheetsService.getAllStatusHistory()` | `statusHistoryService.getAllStatusHistory()` | Activity log page |
| `controllers/admin/leads.controller.ts` | `sheetsService.getStatusHistory()` + `sheetsService.getSalesTeamMember()` (lines 202, 288) | `statusHistoryService` + `salesTeamService` | Lead detail: history + sales member |
| `services/leads.service.ts` | `sheetsService.addStatusHistory()` (3 calls: lines 53, 195, 267) | `statusHistoryService.addStatusHistory()` | Fire-and-forget history writes |
| `controllers/admin.controller.ts` | `sheetsService.getSalesTeamMember()` + `sheetsService.getStatusHistory()` | `salesTeamService` + `statusHistoryService` | Legacy admin controller |

### Compatibility Wrapper Strategy

Follow the pattern from Story 9-2 — export a compatibility object to minimize consumer changes:

```typescript
// At bottom of sales-team.service.ts:
export const salesTeamService = {
  getSalesTeamMember,
  getUserByEmail,
  getSalesTeamAll,
  getAllSalesTeamMembers,
  getSalesTeamMemberById,
  updateSalesTeamMember,
  createSalesTeamMember,
  getUnlinkedLINEAccounts,
  linkLINEAccount,
  getUnlinkedDashboardMembers,
};

// At bottom of status-history.service.ts:
export const statusHistoryService = {
  addStatusHistory,
  getStatusHistory,
  getAllStatusHistory,
};
```

> **Consumer update pattern:** Replace `import { sheetsService } from '../../services/sheets.service.js'` with `import { salesTeamService } from '../../services/sales-team.service.js'` (or `statusHistoryService`). Then `sheetsService.functionName()` → `salesTeamService.functionName()`. Tests update the same way.

### Supabase Mock Pattern (for tests)

Follow the chainable mock pattern established in 9-1a and 9-2:

```typescript
const mockSupabase = vi.hoisted(() => {
  const chainable = () => {
    const chain: Record<string, any> = {};
    const methods = ['from', 'select', 'insert', 'upsert', 'update', 'delete',
      'eq', 'neq', 'in', 'not', 'is', 'order', 'range', 'limit', 'gte', 'lte',
      'maybeSingle', 'single'];
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

> **Test for fire-and-forget:** To verify `addStatusHistory` doesn't throw on error:
```typescript
it('should not throw when insert fails (fire-and-forget)', async () => {
  mockSupabase.insert.mockReturnValueOnce({
    error: { code: '23503', message: 'foreign key violation' },
    data: null,
  });
  // Should NOT throw
  await addStatusHistory({ leadUUID: 'nonexistent-id', status: 'new' as any, changedById: 'System', changedByName: 'System', timestamp: new Date().toISOString() });
  // Verify logger.error was called
  expect(mockLogger.error).toHaveBeenCalled();
});
```

### Anti-Patterns to Avoid

1. **DO NOT keep `CircuitBreaker` or `withRetry` wrappers** — Supabase client has built-in retry
2. **DO NOT keep `googleapis` import** — this is the whole point of migration
3. **DO NOT keep class-based service pattern** — use exported functions
4. **DO NOT change the `StatusHistoryEntry` interface** — keep `leadUUID` and `timestamp` field names for backward compat with admin types and controllers. Map from Supabase `lead_id`/`created_at` in the service layer.
5. **DO NOT change `SalesTeamMember` or `SalesTeamMemberFull` interfaces** — these are used by admin dashboard controllers
6. **DO NOT change the `admin-auth.ts` getUserRole() flow** — only change the data source from Sheets to Supabase
7. **DO NOT forget to update `leads.service.ts`** — it has 3 `sheetsService.addStatusHistory()` calls that need to switch
8. **DO NOT change the `addStatusHistory` fire-and-forget pattern** — errors must be caught and logged, never thrown
9. **DO NOT change the activity log API response format** — `ActivityLogEntry` and `ActivityLogResponse` types in `admin.types.ts` must remain identical

### Scope Boundaries (DO NOT cross)

- **DO NOT** delete `sheets.service.ts` — Story 9-4 (still used for healthCheck)
- **DO NOT** remove Google Sheets config or env vars — Story 9-4
- **DO NOT** change lead detail API response shape — Story 9-5
- **DO NOT** change admin Dashboard TypeScript types — Story 9-6
- **DO NOT** change `leads.service.ts` CRUD operations — already migrated in Story 9-1a (only change `addStatusHistory` import)
- **DO NOT** change LINE webhook or postback — already migrated in Story 9-1b
- **DO NOT** change campaign services — already migrated in Story 9-2

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/sales-team.service.ts` | Sales team CRUD (extracted from sheets.service.ts) |
| `src/services/status-history.service.ts` | Status history read/write (extracted from sheets.service.ts) |
| `src/__tests__/services/sales-team.service.test.ts` | Sales team service tests |
| `src/__tests__/services/status-history.service.test.ts` | Status history service tests |

### Files to Modify

| File | Change | Scope |
|------|--------|-------|
| `src/middleware/admin-auth.ts` | Import `salesTeamService` instead of `sheetsService` for `getUserByEmail` | **CRITICAL** |
| `src/controllers/admin/team-management.controller.ts` | Import `salesTeamService` instead of `sheetsService` for all team functions | **PRIMARY** |
| `src/controllers/admin/sales.controller.ts` | Import `salesTeamService` for `getSalesTeamMember` (2 calls: lines 156, 401) | **PRIMARY** |
| `src/controllers/admin/team.controller.ts` | Import `salesTeamService` for `getSalesTeamAll` (line 24) | **PRIMARY** |
| `src/controllers/admin/activity-log.controller.ts` | Import `statusHistoryService` instead of `sheetsService` for `getAllStatusHistory` | **PRIMARY** |
| `src/controllers/admin/leads.controller.ts` | Import BOTH `salesTeamService` (getSalesTeamMember, line 288) AND `statusHistoryService` (getStatusHistory, line 202) | **PRIMARY** |
| `src/controllers/admin.controller.ts` | Import `salesTeamService` (getSalesTeamMember) + `statusHistoryService` (getStatusHistory) | **SECONDARY** |
| `src/services/leads.service.ts` | Replace 3x `sheetsService.addStatusHistory()` → `statusHistoryService.addStatusHistory()` | **PRIMARY** |
| `src/__tests__/controllers/admin/team-management.controller.test.ts` | Mock `sales-team.service.js` instead of `sheets.service` | **PRIMARY** |
| `src/__tests__/controllers/admin/activity-log.controller.test.ts` | Mock `status-history.service.js` instead of `sheets.service` | **PRIMARY** |
| `src/__tests__/middleware/admin-auth.test.ts` | Mock `sales-team.service.js` for `getUserByEmail` | **PRIMARY** |
| `src/__tests__/services/leads.service.test.ts` | Mock `status-history.service.js` instead of `sheets.service` for `addStatusHistory` | **PRIMARY** |
| `src/__tests__/controllers/admin.controller.test.ts` | Mock BOTH `sales-team.service.js` + `status-history.service.js` | **SECONDARY** |
| `src/__tests__/controllers/admin.controller.trend.test.ts` | Mock BOTH `sales-team.service.js` + `status-history.service.js` | **SECONDARY** |
| `src/__tests__/controllers/admin.controller.team.test.ts` | Mock `sales-team.service.js` for `getSalesTeamAll` | **SECONDARY** |
| `src/__tests__/routes/admin.routes.trend.test.ts` | Mock `sales-team.service.js` for `getSalesTeamMember` | **SECONDARY** |
| `src/__tests__/app.test.ts` | Mock `sales-team.service.js` for `getSalesTeamMember` | **SECONDARY** |
| `src/__tests__/routes/campaign.routes.test.ts` | Mock `sales-team.service.js` for `getSalesTeamMember` | **SECONDARY** |

### Files NOT to Touch

- `src/services/sheets.service.ts` — NOT deleted until Story 9-4 (still used for healthCheck)
- `src/services/leads.service.ts` (CRUD functions) — already migrated in 9-1a
- `src/services/deduplication.service.ts` — already migrated in 9-1a
- `src/services/campaign-stats.service.ts` — already migrated in 9-2
- `src/controllers/line.controller.ts` — already migrated in 9-1b
- `src/controllers/campaign-webhook.controller.ts` — already migrated in 9-2
- `src/types/index.ts` — `SalesTeamMember`, `SalesTeamMemberFull`, `StatusHistoryEntry` interfaces stay unchanged
- `src/types/admin.types.ts` — `ActivityLogEntry`, `ActivityLogResponse`, `StatusHistoryItem` stay unchanged
- `src/config/index.ts` — Google Sheets config stays (removed in 9-4)

### Previous Story Intelligence (Story 9-2)

**Key learnings from 9-2:**
- Compatibility wrapper `export const campaignStatsService = { ... }` avoids touching consumers
- UNIQUE constraint error `23505` for duplicate detection
- Two-query JOIN pattern (fetch primary table, then bulk lookup related data)
- `createModuleLogger` mock needed if test transitively imports a service with logger
- Supabase chainable mock pattern: all methods return the chain object
- Test count: 55 files, 1472 tests — expect similar or slightly more after this story

**Key learnings from 9-1a:**
- `sheetsService.addStatusHistory()` is called from `leads.service.ts` with fire-and-forget `.catch()` pattern
- The `.catch()` pattern in callers is retained — `statusHistoryService.addStatusHistory()` still catches internally AND callers still `.catch()` externally for double safety
- Import pattern: `import { sheetsService } from '../services/sheets.service.js'` → change to `import { statusHistoryService } from '../services/status-history.service.js'`

### Git Intelligence

Recent commits:
```
721367b feat: migrate Campaign Services to Supabase + delete Campaign_Contacts (Story 9-2)
fcadfdd feat: migrate controllers + LINE postback to UUID-only (Story 9-1b)
74d40ff feat: migrate Leads + Dedup data layer to Supabase (Story 9-1a)
178e775 feat: Supabase setup, schema, client + code review fixes (Story 9-0)
```

All 4 previous stories in Epic 9 are done. This story (9-3) is the last service extraction before cleanup (9-4).

### Existing Patterns to Follow

- **ES Modules:** ALL imports MUST include `.js` extension
- **Logger:** Use `createModuleLogger('sales-team')` and `createModuleLogger('status-history')`
- **Config:** Use `config` object, never `process.env` directly
- **Supabase client:** Import `supabase` from `../lib/supabase.js`
- **Error handling:** Custom error classes: `AppError` for expected errors
- **Pagination:** Use `PaginationMeta` type from `admin.types.ts`
- **Type exports:** Export types from `src/types/index.ts` — single source of truth
- **Functions over classes:** Export named functions (not class instances)

### Project Structure Notes

- New files follow existing naming convention: `kebab-case.service.ts` and `kebab-case.service.test.ts`
- Located at same level as `leads.service.ts`, `campaign-stats.service.ts`
- Test files mirror source: `src/__tests__/services/sales-team.service.test.ts`

### References

- [Source: ADR-002-supabase-migration.md#Story 9-3] — AC definitions, schema design
- [Source: ADR-002-supabase-migration.md#Schema Design] — sales_team + status_history schemas
- [Source: epic-09-supabase-migration.md#Story 9-3] — Story description and dependencies
- [Source: stories/9-2-migrate-campaign-services.md] — Compatibility wrapper pattern, Supabase mock pattern
- [Source: stories/9-1a-migrate-leads-dedup-data-layer.md] — leads.service.ts addStatusHistory callers
- [Source: project-context.md#Service Pattern] — Services export functions, not classes
- [Source: project-context.md#Testing Rules] — vi.hoisted pattern, mock strategy

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Test run 1: 5 failures in sales-team.service.test.ts — linkLINEAccount chainable mock broke chain with `mockResolvedValueOnce`. Fixed with `mockImplementation` for multi-call scenarios.
- Test run 2: 1 failure — linkLINEAccount assertion expected wrong lineUserId value. Fixed assertion to match mock data.
- Test run 3: 1 file failure — admin.controller.trend.test.ts missing `createModuleLogger` and `statusHistoryService` mocks (transitive import). Fixed by adding both mocks.
- Test run 4: 57 files, 56 passed, 1 failed (background-processing.integration.test.ts flaky timeout — pre-existing, not related to Story 9-3). 1505 tests pass, 11 skipped.
- Test run 5 (isolated): background-processing.integration.test.ts passes when run alone (11/11 tests pass). Confirmed flaky/unrelated.

### Completion Notes List

- All 6 ACs implemented and verified
- AC1: `getSalesTeamMember(lineUserId)` queries Supabase `sales_team` table
- AC2: `getUserByEmail(email)` returns role+status for admin-auth middleware, inactive blocks login
- AC3: `linkLINEAccount()` uses `WHERE line_user_id IS NULL` for race-safe atomic conditional update
- AC4: `addStatusHistory()` is fire-and-forget — catches all errors, logs but never throws
- AC5: `status_history.lead_id` is FK to `leads.id` — used for lookup in `getStatusHistory(supabaseLead.id)`
- AC6: Zero `googleapis` mocking in new service test files — all tests use Supabase chainable mock
- Compatibility wrappers: `salesTeamService` and `statusHistoryService` exported objects minimize consumer changes
- Two-query JOIN pattern in `getAllStatusHistory()` consistent with Story 9-2
- Total: 57 test files, 1505 tests pass (pre-existing flaky timeout in background-processing excluded)

### File List

**Created (4 files):**
- `src/services/sales-team.service.ts` — 10 exported functions + compatibility wrapper
- `src/services/status-history.service.ts` — 3 exported functions + compatibility wrapper
- `src/__tests__/services/sales-team.service.test.ts` — Comprehensive test suite (all 10 functions)
- `src/__tests__/services/status-history.service.test.ts` — Test suite (3 functions + fire-and-forget)

**Modified — Source (7 files):**
- `src/middleware/admin-auth.ts` — sheetsService → salesTeamService
- `src/controllers/admin/team-management.controller.ts` — sheetsService → salesTeamService (all CRUD)
- `src/controllers/admin/sales.controller.ts` — sheetsService → salesTeamService (2 locations)
- `src/controllers/admin/team.controller.ts` — sheetsService → salesTeamService
- `src/controllers/admin/activity-log.controller.ts` — sheetsService → statusHistoryService
- `src/controllers/admin/leads.controller.ts` — sheetsService → salesTeamService + statusHistoryService
- `src/services/leads.service.ts` — sheetsService.addStatusHistory → statusHistoryService.addStatusHistory (3 locations)

**Modified — Tests (10 files):**
- `src/__tests__/controllers/admin/team-management.controller.test.ts` — mock sales-team.service.js
- `src/__tests__/controllers/admin/activity-log.controller.test.ts` — mock status-history.service.js
- `src/__tests__/middleware/admin-auth.test.ts` — mock sales-team.service.js
- `src/__tests__/services/leads.service.test.ts` — mock status-history.service.js
- `src/__tests__/controllers/admin.controller.test.ts` — mock both services + UUID-based lead IDs
- `src/__tests__/controllers/admin.controller.trend.test.ts` — mock both services + createModuleLogger
- `src/__tests__/controllers/admin.controller.team.test.ts` — mock sales-team.service.js
- `src/__tests__/routes/admin.routes.trend.test.ts` — mock sales-team.service.js
- `src/__tests__/app.test.ts` — add separate service mocks
- `src/__tests__/routes/campaign.routes.test.ts` — split sheetsService mock

## Senior Developer Review (AI)

**Reviewer:** Rex (Code-Reviewer Agent)
**Date:** 2026-02-09
**Model:** Claude Opus 4.6
**Verdict:** APPROVED (after fixes)

### Review Summary

- **ACs Validated:** 6/6 — all implemented and verified in code
- **Tasks Audited:** 10/10 — all [x] confirmed
- **Tests:** 57 files, 1516 tests pass
- **Git vs Story:** No discrepancies (config/infra files excluded)

### Issues Found & Fixed

| # | Severity | Issue | File | Fix Applied |
|---|----------|-------|------|-------------|
| H1 | HIGH | `linkLINEAccount` step 1 swallowed Supabase errors | sales-team.service.ts:240 | Added `lookupError` destructure + throw |
| H2 | HIGH | `linkLINEAccount` step 3 delete had no error handling | sales-team.service.ts:265 | Wrapped in try-catch (non-fatal) |
| H3 | HIGH | `updateSalesTeamMember` sent empty update to DB | sales-team.service.ts:158 | Added empty-object guard |
| M1 | MEDIUM | 8 stale "Google Sheets" comments | admin-auth.ts | Updated to "Supabase" |
| M2 | MEDIUM | Stale "(until Story 9-3)" comment | leads.service.ts:266 | Removed stale suffix |
| M3 | MEDIUM | changedByOptions fetches all rows | status-history.service.ts:132 | Documented perf limitation |
| M4 | MEDIUM | Unused `callCount` variable | sales-team.service.test.ts:469 | Removed |
| L1 | LOW | Inconsistent `.name` on 23505 error | sales-team.service.ts:177 | Added `err.name` for consistency |
| L2 | LOW | Stale "sheets service" comment | team-management.controller.ts:294 | Updated |

### Final Review Issues Found & Fixed

| # | Severity | Issue | File | Fix Applied |
|---|----------|-------|------|-------------|
| H1 | HIGH | `ALREADY_LINKED` AppError missing `.name` override — controller check never matched | sales-team.service.ts:258 | Added `err.name = 'ALREADY_LINKED'` |
| M1 | MEDIUM | Dead `LINE_ACCOUNT_NOT_FOUND` handler in controller (unreachable) | team-management.controller.ts:418 | Removed handler + test |
| L1 | LOW | `LINK_FAILED` AppError missing `.name` override (consistency) | sales-team.service.ts:273 | Added `err.name = 'LINK_FAILED'` |
| L2 | LOW | Stale "sheets service" comment in activity-log controller | activity-log.controller.ts:93 | Updated to "status history service" |
| — | LINT | 2 non-null assertion warnings (`!`) | sales-team.service.ts:104,234 | Changed to `as string` cast |

### Re-Review Issues Found & Fixed (Pass #3)

| # | Severity | Issue | File | Fix Applied |
|---|----------|-------|------|-------------|
| L1 | LOW | Stale JSDoc "sheets.service.ts" reference | admin.types.ts:869 | Updated to "status-history.service.ts" |
| L2 | LOW | Stale "Sheets API error" in test messages (2 occurrences) | team-management.controller.test.ts:158,593 | Changed to "Database error" |
| L3 | LOW | `LINK_FAILED` error not caught by controller (inconsistent response shape) | team-management.controller.ts:414 | Added `LINK_FAILED` to catch condition + new test |

### Change Log

- 2026-02-09: Code review fixes applied (3 High, 4 Medium, 2 Low) — all tests pass
- 2026-02-09: Final review fixes applied (1 High, 1 Medium, 2 Low, 2 lint) + lint clean — 57 files, 1515 tests pass
- 2026-02-09: Re-review pass #3 fixes applied (3 Low) — 57 files, 1516 tests pass
