/**
 * ENEOS Sales Automation - Admin Authentication Middleware
 * Supabase JWT verification for Admin Dashboard API endpoints
 * Story 10-1: Rewritten from Google OAuth to Supabase Auth
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../types/index.js';
import { getUserByEmail, autoLinkAuthUser } from '../services/sales-team.service.js';

// ===========================================
// Types
// ===========================================

export interface AdminUser {
  email: string;
  role: UserRole;
  authUserId: string;
  memberId: string;
}

export type UserRole = 'admin' | 'viewer';

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  app_metadata?: {
    role?: string;
    provider?: string;
  };
  aud?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AdminUser;
    }
  }
}

// ===========================================
// Admin Authentication Middleware
// ===========================================

/**
 * Middleware ตรวจสอบ Supabase JWT จาก Authorization header
 *
 * Flow:
 * 1. ดึง Bearer token จาก Authorization header
 * 2. Verify JWT locally with jsonwebtoken + SUPABASE_JWT_SECRET (~0.1ms)
 * 3. Extract email, authUserId (sub), app_metadata.role from JWT
 * 4. Query sales_team by email — require status: 'active' (defense in depth)
 * 5. Auto-link auth_user_id on first login (fire-and-forget)
 * 6. Attach req.user = { email, role, authUserId, memberId }
 */
export async function adminAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(
        'Missing authorization header',
        401,
        'UNAUTHORIZED'
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Invalid authorization format. Expected "Bearer <token>"',
        401,
        'UNAUTHORIZED'
      );
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new AppError(
        'Missing authentication token',
        401,
        'UNAUTHORIZED'
      );
    }

    // 2. Verify JWT locally with SUPABASE_JWT_SECRET
    let decoded: SupabaseJwtPayload;
    try {
      decoded = jwt.verify(token, config.supabase.jwtSecret) as SupabaseJwtPayload;
    } catch (_error) {
      throw new AppError(
        'Invalid or expired token',
        401,
        'INVALID_TOKEN'
      );
    }

    const email = decoded.email;
    const authUserId = decoded.sub;

    if (!email) {
      throw new AppError(
        'Email not found in token',
        401,
        'INVALID_TOKEN'
      );
    }

    // 3. Defense-in-depth: lookup user in sales_team
    const member = await getUserByEmail(email);

    if (!member) {
      logger.warn('JWT valid but user not found in sales_team', {
        email,
        authUserId,
        requestId: req.requestId,
        path: req.path,
      });
      throw new AppError(
        'Access denied. User not registered in the system.',
        403,
        'FORBIDDEN'
      );
    }

    // 4. Check user status
    if (member.status === 'inactive') {
      logger.warn('Inactive user attempted login', {
        email,
        memberId: member.id,
        action: 'LOGIN_BLOCKED',
      });
      throw new AppError(
        'Your account has been deactivated. Please contact administrator.',
        403,
        'ACCOUNT_INACTIVE'
      );
    }

    // 5. Map role: app_metadata.role from JWT, fallback to sales_team.role
    const role: UserRole = mapRole(decoded.app_metadata?.role, member.role);

    // 6. Auto-link auth_user_id on first login (fire-and-forget)
    if (!member.authUserId && authUserId) {
      autoLinkAuthUser(member.id, authUserId).catch(() => {
        // Intentionally swallowed — autoLinkAuthUser already logs internally
      });
    }

    // 7. Attach user info to request
    req.user = {
      email,
      role,
      authUserId,
      memberId: member.id,
    };

    logger.info('Admin user authenticated', {
      email: req.user.email,
      role: req.user.role,
      requestId: req.requestId,
      path: req.path,
    });

    next();
  } catch (error) {
    next(error);
  }
}

// ===========================================
// Role-Based Access Control (RBAC) Middleware
// ===========================================

/**
 * Middleware ตรวจสอบว่า user มี role ที่อนุญาตหรือไม่
 *
 * @param allowedRoles - Array of roles ที่อนุญาต
 * @returns Express middleware
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error = new AppError(
        'User not authenticated',
        401,
        'NOT_AUTHENTICATED'
      );
      next(error);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        email: req.user.email,
        requiredRole: allowedRoles,
        userRole: req.user.role,
        requestId: req.requestId,
        path: req.path,
      });

      const error = new AppError(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        403,
        'FORBIDDEN_ROLE'
      );
      next(error);
      return;
    }

    next();
  };
}

/**
 * Shortcut middleware: ต้องเป็น admin เท่านั้น
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Shortcut middleware: ทุก role (admin, viewer)
 */
export const requireViewer = requireRole(['admin', 'viewer']);

// ===========================================
// Helper Functions
// ===========================================

/**
 * Map role from JWT app_metadata to UserRole (AC-4: app_metadata.role only)
 * When jwtRole is defined → use it exclusively (prevents privilege persistence after demotion)
 * When jwtRole is undefined → fallback to sales_team.role (for initial invite before app_metadata is set)
 */
function mapRole(jwtRole: string | undefined, dbRole: string): UserRole {
  if (jwtRole !== undefined) {
    return jwtRole.toLowerCase() === 'admin' ? 'admin' : 'viewer';
  }
  return dbRole?.toLowerCase() === 'admin' ? 'admin' : 'viewer';
}

// ===========================================
// Export for Testing
// ===========================================

export const _testOnly = {
  mapRole,
};
