/**
 * ENEOS Sales Automation - Admin Auth Middleware Tests (Simplified)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { AdminUser } from '../../middleware/admin-auth.js';

// Setup environment
process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

// Mock sheetsService ก่อน import middleware เพื่อป้องกัน Google Sheets connection
vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    getUserByEmail: vi.fn().mockResolvedValue({ role: 'viewer' }),
  },
}));

// Mock helpers
const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  headers: {},
  requestId: 'test-request-id',
  path: '/api/admin/test',
  ...overrides,
} as Request);

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe('admin-auth middleware - Basic Tests', () => {
  it('should export adminAuthMiddleware function', async () => {
    const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
    expect(adminAuthMiddleware).toBeDefined();
    expect(typeof adminAuthMiddleware).toBe('function');
  });

  it('should export requireRole function', async () => {
    const { requireRole } = await import('../../middleware/admin-auth.js');
    expect(requireRole).toBeDefined();
    expect(typeof requireRole).toBe('function');
  });

  it('should export shortcut middleware functions', async () => {
    const { requireAdmin, requireManager, requireViewer } = await import('../../middleware/admin-auth.js');
    expect(requireAdmin).toBeDefined();
    expect(requireManager).toBeDefined();
    expect(requireViewer).toBeDefined();
  });

  it('should have correct UserRole type', async () => {
    const { _testOnly } = await import('../../middleware/admin-auth.js');
    const role = await _testOnly.getUserRole('test@eneos.co.th');
    expect(['admin', 'manager', 'viewer']).toContain(role);
  });
});

describe('requireRole middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it('should call next with error if user is not authenticated', async () => {
    const { requireRole } = await import('../../middleware/admin-auth.js');
    const middleware = requireRole(['admin']);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(401);
  });

  it('should call next with error if user role is insufficient', async () => {
    const { requireRole } = await import('../../middleware/admin-auth.js');

    req.user = {
      email: 'viewer@eneos.co.th',
      name: 'Viewer',
      role: 'viewer',
      googleId: 'google-id-123',
    };

    const middleware = requireRole(['admin', 'manager']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(403);
  });

  it('should call next without error if user has required role', async () => {
    const { requireRole } = await import('../../middleware/admin-auth.js');

    req.user = {
      email: 'admin@eneos.co.th',
      name: 'Admin',
      role: 'admin',
      googleId: 'google-id-123',
    };

    const middleware = requireRole(['admin']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(); // No error
  });

  it('should accept user with any of the allowed roles', async () => {
    const { requireRole } = await import('../../middleware/admin-auth.js');

    req.user = {
      email: 'manager@eneos.co.th',
      name: 'Manager',
      role: 'manager',
      googleId: 'google-id-456',
    };

    const middleware = requireRole(['admin', 'manager']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(); // No error
  });
});

describe('requireAdmin shortcut', () => {
  it('should only allow admin role', async () => {
    const { requireAdmin } = await import('../../middleware/admin-auth.js');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    req.user = {
      email: 'admin@eneos.co.th',
      name: 'Admin',
      role: 'admin',
      googleId: 'google-id-123',
    };

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(); // No error
  });

  it('should reject manager role', async () => {
    const { requireAdmin } = await import('../../middleware/admin-auth.js');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    req.user = {
      email: 'manager@eneos.co.th',
      name: 'Manager',
      role: 'manager',
      googleId: 'google-id-456',
    };

    requireAdmin(req, res, next);

    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error.statusCode).toBe(403);
  });
});

describe('requireManager shortcut', () => {
  it('should allow admin and manager roles', async () => {
    const { requireManager } = await import('../../middleware/admin-auth.js');

    const roles: Array<{ role: 'admin' | 'manager'; email: string }> = [
      { role: 'admin', email: 'admin@eneos.co.th' },
      { role: 'manager', email: 'manager@eneos.co.th' },
    ];

    for (const { role, email } of roles) {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      req.user = {
        email,
        name: role.charAt(0).toUpperCase() + role.slice(1),
        role,
        googleId: `google-id-${role}`,
      };

      requireManager(req, res, next);
      expect(next).toHaveBeenCalledWith(); // No error
    }
  });

  it('should reject viewer role', async () => {
    const { requireManager } = await import('../../middleware/admin-auth.js');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    req.user = {
      email: 'viewer@eneos.co.th',
      name: 'Viewer',
      role: 'viewer',
      googleId: 'google-id-viewer',
    };

    requireManager(req, res, next);

    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error.statusCode).toBe(403);
  });
});

describe('requireViewer shortcut', () => {
  it('should allow all roles', async () => {
    const { requireViewer } = await import('../../middleware/admin-auth.js');

    const roles: Array<{ role: 'admin' | 'manager' | 'viewer'; email: string }> = [
      { role: 'admin', email: 'admin@eneos.co.th' },
      { role: 'manager', email: 'manager@eneos.co.th' },
      { role: 'viewer', email: 'viewer@eneos.co.th' },
    ];

    for (const { role, email } of roles) {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      req.user = {
        email,
        name: role.charAt(0).toUpperCase() + role.slice(1),
        role,
        googleId: `google-id-${role}`,
      };

      requireViewer(req, res, next);
      expect(next).toHaveBeenCalledWith(); // No error
    }
  });
});
