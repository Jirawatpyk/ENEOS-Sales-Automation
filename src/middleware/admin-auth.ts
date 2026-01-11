/**
 * ENEOS Sales Automation - Admin Authentication Middleware
 * Google OAuth token validation for Admin Dashboard API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger.js';
import { AppError } from '../types/index.js';
import { sheetsService } from '../services/sheets.service.js';

// ===========================================
// Types
// ===========================================

export interface AdminUser {
  email: string;
  name: string;
  role: UserRole;
  googleId: string;
}

export type UserRole = 'admin' | 'manager' | 'viewer';

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

    // Check email domain is @eneos.co.th
    if (!email.endsWith('@eneos.co.th')) {
      logger.warn('Unauthorized domain access attempt', {
        email,
        requestId: req.requestId,
        path: req.path,
      });

      throw new AppError(
        'Access denied. Only @eneos.co.th domain is allowed',
        403,
        'FORBIDDEN_DOMAIN'
      );
    }

    // TODO: Lookup user role from Google Sheets (Sales_Team sheet)
    // For now, default to 'viewer'
    // In production, this should query the Sales_Team sheet to get the user's role
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
 * Role hierarchy: admin > manager > viewer
 *
 * @param allowedRoles - Array of roles ที่อนุญาต
 * @returns Express middleware
 *
 * @example
 * ```typescript
 * router.get('/admin/leads',
 *   adminAuthMiddleware,
 *   requireRole(['admin', 'manager']),
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
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Shortcut middleware: admin หรือ manager
 */
export const requireManager = requireRole(['admin', 'manager']);

/**
 * Shortcut middleware: ทุก role (admin, manager, viewer)
 */
export const requireViewer = requireRole(['admin', 'manager', 'viewer']);

// ===========================================
// Helper Functions
// ===========================================

/**
 * ดึง role ของ user จาก Google Sheets (Sales_Team sheet)
 * ถ้าไม่พบใน Sheets จะใช้ ADMIN_EMAILS เป็น fallback
 *
 * @param email - Email ของ user (@eneos.co.th)
 * @returns User role (default: 'viewer')
 */
async function getUserRole(email: string): Promise<UserRole> {
  try {
    // ลองดึงจาก Google Sheets ก่อน
    const user = await sheetsService.getUserByEmail(email);

    if (user && user.role) {
      const role = user.role.toLowerCase();
      if (role === 'admin' || role === 'manager' || role === 'viewer') {
        logger.debug('User role found in Sheets', { email, role });
        return role as UserRole;
      }
    }

    // Fallback: ตรวจสอบ ADMIN_EMAILS
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      logger.debug('User is in ADMIN_EMAILS list', { email });
      return 'admin';
    }

    // Default to viewer
    logger.debug('Using default viewer role', { email });
    return 'viewer';
  } catch (error) {
    logger.error('Failed to fetch user role from Sheets', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Fallback: ตรวจสอบ ADMIN_EMAILS แม้ Sheets error
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
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
