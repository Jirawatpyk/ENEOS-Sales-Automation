/**
 * ENEOS Sales Automation - Sales Team Service (Supabase)
 * All sales team CRUD operations via Supabase query builder
 * Story 9-3: Extracted from sheets.service.ts
 */

import { supabase } from '../lib/supabase.js';
import { createModuleLogger } from '../utils/logger.js';
import {
  AppError,
} from '../types/index.js';
import type {
  SalesTeamMember,
  SalesTeamMemberFull,
  SalesTeamFilter,
  SalesTeamMemberUpdate,
} from '../types/index.js';

export type InviteRole = 'admin' | 'viewer';

const logger = createModuleLogger('sales-team');

// ===========================================
// Mapper: Supabase row → SalesTeamMemberFull
// ===========================================

function mapToSalesTeamMemberFull(row: Record<string, unknown>): SalesTeamMemberFull {
  return {
    lineUserId: (row.line_user_id as string) || null,
    name: row.name as string,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    role: row.role as 'admin' | 'sales' | 'viewer',
    createdAt: row.created_at as string,
    status: row.status as 'active' | 'inactive',
  };
}

// ===========================================
// Sales Team CRUD Operations
// ===========================================

/**
 * Ensure a LINE user exists in sales_team (auto-create if not found)
 * Called after claimLead — creates an "unlinked" entry so Admin can link later.
 * Fire-and-forget: catches all errors internally, never throws.
 *
 * Uses upsert with only (line_user_id, name) so that:
 * - INSERT: other columns use DB defaults (role='sales', status='active', email/phone=NULL)
 * - ON CONFLICT: only `name` is updated (keeps Admin-set email/phone/role/status intact)
 */
export async function ensureSalesTeamMember(lineUserId: string, displayName: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('sales_team')
      .upsert(
        { line_user_id: lineUserId, name: displayName },
        { onConflict: 'line_user_id' },
      );

    if (error) {
      logger.warn('Failed to ensure sales team member', { lineUserId, error: error.message });
    }
  } catch (err) {
    // Fire-and-forget — never block the claim flow
    logger.warn('ensureSalesTeamMember failed (non-fatal)', {
      lineUserId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

/**
 * Get sales team member by LINE User ID (AC #1)
 * SELECT line_user_id, name, email, phone FROM sales_team WHERE line_user_id = $1
 */
export async function getSalesTeamMember(lineUserId: string): Promise<SalesTeamMember | null> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('line_user_id, name, email, phone')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (error) {throw error;}
  if (!data) {return null;}

  return {
    lineUserId: data.line_user_id,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
  };
}

/**
 * Get user by email — for admin auth middleware (AC #2)
 * SELECT * FROM sales_team WHERE email = $1
 * Returns role + status + id + authUserId for login control and auto-link
 */
export async function getUserByEmail(
  email: string
): Promise<(SalesTeamMember & { id: string; role: string; status: 'active' | 'inactive'; authUserId: string | null }) | null> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) {throw error;}
  if (!data) {return null;}

  return {
    id: data.id,
    lineUserId: data.line_user_id || '',
    name: data.name,
    email: data.email,
    phone: data.phone || undefined,
    role: data.role,
    createdAt: data.created_at,
    status: data.status as 'active' | 'inactive',
    authUserId: data.auth_user_id || null,
  };
}

/**
 * Get all sales team members (LINE-linked only, legacy)
 * SELECT * FROM sales_team WHERE line_user_id IS NOT NULL
 */
export async function getSalesTeamAll(): Promise<SalesTeamMember[]> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('line_user_id, name, email, phone')
    .not('line_user_id', 'is', null);

  if (error) {throw error;}

  return (data || []).map(row => ({
    lineUserId: row.line_user_id as string,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
  }));
}

/**
 * Get all sales team members with filters (AC #1)
 * SELECT * FROM sales_team with optional status/role filter
 */
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

  if (error) {throw error;}
  return (data || []).map(mapToSalesTeamMemberFull);
}

/**
 * Get single sales team member by LINE User ID (full details)
 * SELECT * FROM sales_team WHERE line_user_id = $1
 */
export async function getSalesTeamMemberById(lineUserId: string): Promise<SalesTeamMemberFull | null> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('*')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (error) {throw error;}
  if (!data) {return null;}

  return mapToSalesTeamMemberFull(data);
}

/**
 * Update sales team member by LINE User ID
 * UPDATE sales_team SET ... WHERE line_user_id = $1
 */
export async function updateSalesTeamMember(
  lineUserId: string,
  updates: SalesTeamMemberUpdate
): Promise<SalesTeamMemberFull | null> {
  const updateData: Record<string, unknown> = {};
  if (updates.email !== undefined) {updateData.email = updates.email?.toLowerCase() || null;}
  if (updates.phone !== undefined) {updateData.phone = updates.phone || null;}
  if (updates.role !== undefined) {updateData.role = updates.role;}
  if (updates.status !== undefined) {updateData.status = updates.status;}

  // Guard: no fields to update → return existing member without hitting DB
  if (Object.keys(updateData).length === 0) {
    return getSalesTeamMemberById(lineUserId);
  }

  const { data, error } = await supabase
    .from('sales_team')
    .update(updateData)
    .eq('line_user_id', lineUserId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const err = new AppError('Email already exists', 409, 'DUPLICATE_EMAIL');
      err.name = 'DUPLICATE_EMAIL';
      throw err;
    }
    if (error.code === 'PGRST116') {return null;} // No rows matched
    throw error;
  }

  return mapToSalesTeamMemberFull(data);
}

/**
 * Create new sales team member
 * INSERT INTO sales_team with duplicate email check (23505)
 */
export async function createSalesTeamMember(
  data: { name: string; email: string; phone?: string; role: 'admin' | 'sales' | 'viewer' }
): Promise<SalesTeamMemberFull> {
  const { data: member, error } = await supabase
    .from('sales_team')
    .insert({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      role: data.role,
      line_user_id: null, // Manual member — no LINE account yet
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const err = new AppError('Email already exists', 409, 'DUPLICATE_EMAIL');
      err.name = 'DUPLICATE_EMAIL';
      throw err;
    }
    throw error;
  }

  return mapToSalesTeamMemberFull(member);
}

/**
 * Get unlinked LINE accounts (has LINE but no email)
 * SELECT * FROM sales_team WHERE line_user_id IS NOT NULL AND email IS NULL
 */
export async function getUnlinkedLINEAccounts(): Promise<Array<{ lineUserId: string; name: string; createdAt: string }>> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('line_user_id, name, created_at')
    .not('line_user_id', 'is', null)
    .is('email', null);

  if (error) {throw error;}

  return (data || []).map(row => ({
    lineUserId: row.line_user_id as string,
    name: row.name,
    createdAt: row.created_at,
  }));
}

/**
 * Link a LINE account to a Dashboard member (AC #3)
 * Race-safe: UPDATE ... WHERE line_user_id IS NULL
 */
export async function linkLINEAccount(
  dashboardMemberEmail: string,
  targetLineUserId: string
): Promise<SalesTeamMemberFull | null> {
  // 1. Verify target LINE account exists and is not already linked
  const { data: lineAccount, error: lookupError } = await supabase
    .from('sales_team')
    .select('*')
    .eq('line_user_id', targetLineUserId)
    .maybeSingle();

  if (lookupError) {throw lookupError;}
  if (!lineAccount) {return null;} // LINE account not found
  if (lineAccount.email) {
    const err = new AppError('LINE account already linked to another member', 409, 'ALREADY_LINKED');
    err.name = 'ALREADY_LINKED';
    throw err;
  }

  // 2. Update dashboard member to set line_user_id (atomic: WHERE line_user_id IS NULL)
  const { data: updated, error } = await supabase
    .from('sales_team')
    .update({ line_user_id: targetLineUserId })
    .eq('email', dashboardMemberEmail.toLowerCase())
    .is('line_user_id', null) // Race-safe: only if still unlinked
    .select()
    .single();

  if (error || !updated) {
    const err = new AppError('Member not found or already linked', 409, 'LINK_FAILED');
    err.name = 'LINK_FAILED';
    throw err;
  }

  // 3. Delete the LINE-only row (it's now merged into the dashboard member)
  // Wrapped in try-catch: the link (step 2) already succeeded — delete is cleanup
  try {
    await supabase
      .from('sales_team')
      .delete()
      .eq('id', lineAccount.id);
  } catch (deleteError) {
    logger.error('Failed to delete LINE-only row after linking (non-fatal)', {
      lineAccountId: lineAccount.id,
      email: dashboardMemberEmail,
      error: deleteError instanceof Error ? deleteError.message : String(deleteError),
    });
  }

  logger.info('LINE account linked', {
    email: dashboardMemberEmail,
    lineUserId: targetLineUserId,
  });

  return mapToSalesTeamMemberFull(updated);
}

/**
 * Get unlinked Dashboard members (has email but no LINE)
 * SELECT * FROM sales_team WHERE email IS NOT NULL AND line_user_id IS NULL
 */
export async function getUnlinkedDashboardMembers(): Promise<SalesTeamMemberFull[]> {
  const { data, error } = await supabase
    .from('sales_team')
    .select('*')
    .not('email', 'is', null)
    .is('line_user_id', null);

  if (error) {throw error;}

  return (data || []).map(mapToSalesTeamMemberFull);
}

/**
 * Auto-link auth_user_id to sales_team member on first login (AC #6)
 * Race-safe: UPDATE ... WHERE auth_user_id IS NULL
 * Fire-and-forget: catches ALL errors internally, never throws
 * Same pattern as linkLINEAccount — atomic conditional update
 */
export async function autoLinkAuthUser(memberId: string, authUserId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('sales_team')
      .update({ auth_user_id: authUserId })
      .eq('id', memberId)
      .is('auth_user_id', null);

    if (error) {
      logger.warn('autoLinkAuthUser: DB update failed (non-fatal)', {
        memberId,
        errorCode: error.code,
        errorMessage: error.message,
      });
    }
  } catch (err) {
    // Fire-and-forget — never throw to caller
    logger.warn('autoLinkAuthUser failed (non-fatal)', {
      memberId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

// ===========================================
// Admin Invite & Role Sync (Story 13-1)
// ===========================================

/**
 * Invite a new sales team member (AC-1)
 * 1. Create sales_team record FIRST (prevents "user can login but no DB record")
 * 2. Then invite via Supabase Auth (sends email)
 * 3. If step 2 fails, sales_team record persists (admin can retry)
 *
 * Re-invite: If email exists in sales_team but has no auth_user_id,
 * skip record creation and retry Supabase invite only (Task 1.5)
 */
export async function inviteSalesTeamMember(
  email: string,
  name: string,
  role: InviteRole
): Promise<{ member: SalesTeamMemberFull; authInviteSent: boolean }> {
  // Normalize role: 'sales' → 'viewer' for backward compat
  const normalizedRole = role === 'admin' ? 'admin' : 'viewer';

  // Check if email already exists in sales_team (Task 1.5: re-invite flow)
  const existing = await getUserByEmail(email);

  let member: SalesTeamMemberFull;

  if (existing) {
    // Email exists — check if this is a re-invite (no auth_user_id)
    if (existing.authUserId) {
      // User already fully registered — throw duplicate
      const err = new AppError('User already exists', 409, 'DUPLICATE_EMAIL');
      err.name = 'DUPLICATE_EMAIL';
      throw err;
    }

    // Re-invite: skip record creation, just retry Supabase invite
    member = mapToSalesTeamMemberFull({
      line_user_id: existing.lineUserId || null,
      name: existing.name,
      email: existing.email,
      phone: existing.phone || null,
      role: existing.role,
      created_at: existing.createdAt || '',
      status: existing.status,
    });
  } else {
    // Step 1: Create sales_team record FIRST
    member = await createSalesTeamMember({
      name,
      email,
      role: normalizedRole as 'admin' | 'sales',
    });
  }

  // Step 2: Invite via Supabase Auth
  let authInviteSent = false;
  try {
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role: normalizedRole },
    });
    if (error) {
      logger.warn('Supabase invite failed, sales_team record kept', { email, error: error.message });
    } else {
      authInviteSent = true;
    }
  } catch (err) {
    logger.warn('Supabase invite error, sales_team record kept', {
      email,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }

  return { member, authInviteSent };
}

/**
 * Sync role to Supabase Auth app_metadata (AC-2)
 * Fire-and-forget — don't block the update response
 * Only syncs when auth_user_id exists (user has logged in at least once)
 */
export async function syncRoleToSupabaseAuth(
  authUserId: string | null,
  role: string
): Promise<void> {
  if (!authUserId) {return;} // User hasn't logged in yet — skip

  try {
    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      app_metadata: { role },
    });
    if (error) {
      logger.warn('Failed to sync role to Supabase Auth', { authUserId, role, error: error.message });
    }
  } catch (err) {
    // Non-fatal — sales_team.role is the source of truth for middleware
    logger.warn('syncRoleToSupabaseAuth failed (non-fatal)', {
      authUserId,
      role,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

