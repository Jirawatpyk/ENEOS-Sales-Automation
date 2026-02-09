/**
 * ENEOS Sales Automation - Admin Authentication Middleware
 * Google OAuth token validation for Admin Dashboard API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger.js';
import { AppError } from '../types/index.js';
import { salesTeamService } from '../services/sales-team.service.js';

// ===========================================
// Types
// ===========================================

export interface AdminUser {
  email: string;
  name: string;
  role: UserRole;
  googleId: string;
}

export type UserRole = 'admin' | 'viewer';

// Admin emails ที่ได้รับสิทธิ์ admin โดยอัตโนมัติ (fallback)
const ADMIN_EMAILS = [
  'admin@eneos.co.th',
  // เพิ่ม email อื่นๆ ตามต้องการ
];

declare global {
  namespace Express {
    interface Request {
      user?: AdminUser;
    }
  }
}

// ===========================================
// Google OAuth Client (Singleton with lazy init)
// ===========================================

let oauthClient: OAuth2Client | undefined;
let oauthClientInitialized = false;

function getOAuthClient(): OAuth2Client {
  // Return cached client if already initialized
  if (oauthClient && oauthClientInitialized) {
    return oauthClient;
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;

  if (!clientId) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID is not configured');
  }

  // Create new client
  oauthClient = new OAuth2Client(clientId);
  oauthClientInitialized = true;

  // Log without sensitive data
  logger.info('Google OAuth client initialized');

  return oauthClient;
}

// ===========================================
// Admin Authentication Middleware
// ===========================================

/**
 * Middleware ตรวจสอบ Google OAuth token จาก Authorization header
 *
 * Flow:
 * 1. ดึง Bearer token จาก Authorization header
 * 2. Verify token กับ Google OAuth API
 * 3. ตรวจสอบว่า email domain เป็น @eneos.co.th
 * 4. Attach user info (email, name, role) เข้า req.user
 * 5. หาก role ไม่มีในระบบ ให้ default เป็น 'viewer'
 */
export async function adminAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract Bearer token from Authorization header
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
        'INVALID_AUTH_FORMAT'
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      throw new AppError(
        'Missing authentication token',
        401,
        'MISSING_TOKEN'
      );
    }

    // Verify token with Google OAuth
    const client = getOAuthClient();

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
    } catch (error) {
      logger.warn('Google OAuth token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });

      throw new AppError(
        'Invalid or expired token',
        401,
        'INVALID_TOKEN'
      );
    }

    const payload = ticket.getPayload();

    if (!payload) {
      throw new AppError(
        'Unable to extract token payload',
        401,
        'INVALID_TOKEN_PAYLOAD'
      );
    }

    const { email, name, sub: googleId } = payload;

    if (!email) {
      throw new AppError(
        'Email not found in token',
        401,
        'EMAIL_NOT_FOUND'
      );
    }

    // Check email domain is allowed
    // Parse allowed domains from env (default: eneos.co.th)
    const allowedDomains = (process.env.ALLOWED_DOMAINS || 'eneos.co.th')
      .split(',')
      .map(d => d.trim().toLowerCase());

    const emailDomain = email.split('@')[1]?.toLowerCase();

    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      logger.warn('Unauthorized domain access attempt', {
        email,
        emailDomain,
        allowedDomains,
        requestId: req.requestId,
        path: req.path,
      });

      throw new AppError(
        `Access denied. Only ${allowedDomains.join(', ')} domains are allowed`,
        403,
        'FORBIDDEN_DOMAIN'
      );
    }

    // Lookup user role from Supabase sales_team table
    const role: UserRole = await getUserRole(email);

    // Attach user info to request
    req.user = {
      email,
      name: name || email.split('@')[0], // Fallback to email prefix if name not available
      role,
      googleId,
    };

    logger.info('Admin user authenticated', {
      email: req.user.email,
      role: req.user.role,
      requestId: req.requestId,
      path: req.path,
    });

    next();
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
}

// ===========================================
// Role-Based Access Control (RBAC) Middleware
// ===========================================

/**
 * Middleware ตรวจสอบว่า user มี role ที่อนุญาตหรือไม่
 *
 * Role hierarchy: admin > viewer
 * - admin: full access (export, settings)
 * - viewer: read-only (mapped from 'sales' role in Sales_Team sheet)
 *
 * @param allowedRoles - Array of roles ที่อนุญาต
 * @returns Express middleware
 *
 * @example
 * ```typescript
 * router.get('/admin/leads',
 *   adminAuthMiddleware,
 *   requireRole(['admin']),
 *   getLeads
 * );
 * ```
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // This should never happen if adminAuthMiddleware runs first
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

    // User has required role
    next();
  };
}

/**
 * Shortcut middleware: ต้องเป็น admin เท่านั้น
 * ใช้สำหรับ: export, settings, user management
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Shortcut middleware: ทุก role (admin, viewer)
 * ใช้สำหรับ: ดู dashboard, leads, reports (read-only)
 */
export const requireViewer = requireRole(['admin', 'viewer']);

// ===========================================
// Helper Functions
// ===========================================

/**
 * ดึง role ของ user จาก Supabase sales_team table
 * ถ้าไม่พบจะใช้ ADMIN_EMAILS เป็น fallback
 *
 * Role mapping:
 * - 'admin' → 'admin' (full access)
 * - 'sales' → 'viewer' (read-only)
 * - other/null → 'viewer' (default)
 *
 * Status check:
 * - 'active' → allow login
 * - 'inactive' → reject with 403 ACCOUNT_INACTIVE
 *
 * @param email - Email ของ user
 * @returns User role (default: 'viewer')
 * @throws AppError if user is inactive
 */
async function getUserRole(email: string): Promise<UserRole> {
  try {
    // ลองดึงจาก Supabase ก่อน
    const user = await salesTeamService.getUserByEmail(email);

    if (user) {
      // Check if user is inactive - reject login
      // Security: This check runs BEFORE ADMIN_EMAILS fallback, so inactive users in sheet are always blocked
      if (user.status === 'inactive') {
        logger.warn('Inactive user attempted login - access denied', {
          email,
          status: user.status,
          lineUserId: user.lineUserId,
          action: 'LOGIN_BLOCKED',
        });
        throw new AppError(
          'Your account has been deactivated. Please contact administrator.',
          403,
          'ACCOUNT_INACTIVE'
        );
      }

      if (user.role) {
        const sheetRole = user.role.toLowerCase();

        // Map sheet role to dashboard role
        if (sheetRole === 'admin') {
          logger.debug('User role: admin', { email, sheetRole });
          return 'admin';
        }

        // 'sales' or any other role → viewer
        logger.debug('User role: viewer', { email, sheetRole });
        return 'viewer';
      }
    }

    // Fallback: ตรวจสอบ ADMIN_EMAILS
    // NOTE: ADMIN_EMAILS users who are NOT in Sales_Team sheet cannot be deactivated via sheet.
    // To deactivate an ADMIN_EMAILS user: add them to Sales_Team sheet with status='inactive'
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      logger.info('ADMIN_EMAILS fallback used (user not in Sales_Team sheet)', { email });
      return 'admin';
    }

    // Default to viewer
    logger.debug('Using default viewer role', { email });
    return 'viewer';
  } catch (error) {
    // Re-throw AppError (like ACCOUNT_INACTIVE)
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Failed to fetch user role from Supabase', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Fallback: ตรวจสอบ ADMIN_EMAILS แม้ Supabase error
    // NOTE: If Supabase fails and user is in ADMIN_EMAILS, they can login without status check.
    // This is intentional for emergency access when Supabase is down.
    // AppError (ACCOUNT_INACTIVE) is re-thrown above, so known inactive users are still blocked.
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      logger.info('ADMIN_EMAILS emergency fallback used (Supabase error)', { email });
      return 'admin';
    }

    // Default to viewer on error (fail-safe)
    return 'viewer';
  }
}

// ===========================================
// Export for Testing
// ===========================================

export const _testOnly = {
  getUserRole,
  getOAuthClient,
  resetOAuthClient: () => {
    oauthClient = undefined;
    oauthClientInitialized = false;
  },
};
