/**
 * ENEOS Sales Automation - Admin Authentication Middleware
 * Supabase JWT verification for Admin Dashboard API endpoints
 * Story 10-1: Rewritten from Google OAuth to Supabase Auth
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../types/index.js';
import { getUserByEmail, autoLinkAuthUser } from '../services/sales-team.service.js';

// ===========================================
// JWKS Cache for ES256 verification
// ===========================================

let cachedJwksKey: string | null = null;
let jwksFetchedAt = 0;
let jwksErrorAt = 0;
const JWKS_CACHE_TTL_MS = 3600_000; // 1 hour
const JWKS_ERROR_COOLDOWN_MS = 30_000; // 30 seconds — prevent thundering herd on failure
const JWKS_FETCH_TIMEOUT_MS = 5_000; // 5 seconds

/**
 * Fetch JWKS public key from Supabase and convert to PEM for jwt.verify()
 * Cached for 1 hour to avoid repeated network calls.
 * On failure: cools down for 30s to prevent thundering herd.
 */
async function getJwksPublicKey(): Promise<string> {
  const now = Date.now();
  if (cachedJwksKey && now - jwksFetchedAt < JWKS_CACHE_TTL_MS) {
    return cachedJwksKey;
  }

  // Prevent thundering herd: if last fetch failed recently, throw immediately
  if (jwksErrorAt && now - jwksErrorAt < JWKS_ERROR_COOLDOWN_MS) {
    throw new Error('JWKS fetch in cooldown after recent failure');
  }

  const jwksUrl = `${config.supabase.url}/auth/v1/.well-known/jwks.json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JWKS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(jwksUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status}`);
    }

    const jwks = await response.json() as { keys: Array<Record<string, unknown>> };
    if (!jwks.keys?.length) {
      throw new Error('JWKS response contains no keys');
    }

    const publicKey = createPublicKey({ key: jwks.keys[0], format: 'jwk' });
    cachedJwksKey = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    jwksFetchedAt = now;
    jwksErrorAt = 0; // Clear error state on success

    logger.info('JWKS public key fetched and cached', { url: jwksUrl });
    return cachedJwksKey;
  } catch (error) {
    jwksErrorAt = now; // Set cooldown
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Reset JWKS cache (for testing) */
function resetJwksCache(): void {
  cachedJwksKey = null;
  jwksFetchedAt = 0;
  jwksErrorAt = 0;
}

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
 * 2. Verify JWT locally — auto-detects HS256 (symmetric) or ES256 (JWKS)
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

    // 2. Verify JWT — auto-detect algorithm (HS256 or ES256)
    let decoded: SupabaseJwtPayload;
    try {
      const header = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64url').toString()
      ) as { alg?: string };

      if (header.alg === 'ES256') {
        const publicKey = await getJwksPublicKey();
        decoded = jwt.verify(token, publicKey, { algorithms: ['ES256'] }) as SupabaseJwtPayload;
      } else {
        decoded = jwt.verify(token, config.supabase.jwtSecret, { algorithms: ['HS256'] }) as SupabaseJwtPayload;
      }
    } catch (_error) {
      const errMsg = _error instanceof Error ? _error.message : String(_error);
      logger.error('JWT verify failed', { error: errMsg });
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
  resetJwksCache,
};
