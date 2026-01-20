/**
 * ENEOS Sales Automation - Admin Auth Middleware Tests
 *
 * Roles: admin | viewer
 * - admin: full access (export, settings)
 * - viewer: read-only (mapped from 'sales' role in Sales_Team sheet)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Store original env
const originalEnv = { ...process.env };

// Setup environment before any imports
process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
process.env.ALLOWED_DOMAINS = 'eneos.co.th,eqho.com';

// Mock google-auth-library
const mockVerifyIdToken = vi.fn();
const mockGetPayload = vi.fn();

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// Mock sheetsService
const mockGetUserByEmail = vi.fn();

vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    getUserByEmail: mockGetUserByEmail,
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper functions
const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    requestId: 'test-request-id',
    path: '/api/admin/test',
    ...overrides,
  }) as Request;

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe('Admin Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.ALLOWED_DOMAINS = 'eneos.co.th,eqho.com';
    mockGetUserByEmail.mockResolvedValue({ role: 'viewer' });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ===========================================
  // adminAuthMiddleware Tests
  // ===========================================

  describe('adminAuthMiddleware', () => {
    it('should throw error when authorization header is missing', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should throw error when authorization format is invalid (not Bearer)', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest({
        headers: { authorization: 'Basic some-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_AUTH_FORMAT');
    });

    it('should throw error when token is empty after Bearer prefix', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest({
        headers: { authorization: 'Bearer ' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('MISSING_TOKEN');
    });

    it('should throw error when token verification fails', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('should throw error when token payload is empty', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN_PAYLOAD');
    });

    it('should throw error when email is not in token payload', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: 'google-id-123', name: 'Test User' }),
      });

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('EMAIL_NOT_FOUND');
    });

    it('should throw error when email domain is not allowed', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'user@forbidden-domain.com',
          name: 'Test User',
          sub: 'google-id-123',
        }),
      });

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN_DOMAIN');
    });

    it('should authenticate successfully with valid token and allowed domain', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'user@eneos.co.th',
          name: 'Test User',
          sub: 'google-id-123',
        }),
      });

      mockGetUserByEmail.mockResolvedValue({ role: 'admin' });

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // No error
      expect(req.user).toBeDefined();
      expect(req.user?.email).toBe('user@eneos.co.th');
      expect(req.user?.name).toBe('Test User');
      expect(req.user?.role).toBe('admin');
      expect(req.user?.googleId).toBe('google-id-123');
    });

    it('should use email prefix as name when name is not in token', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'testuser@eneos.co.th',
          sub: 'google-id-123',
          // name is undefined
        }),
      });

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(req.user?.name).toBe('testuser');
    });

    it('should allow email from alternative allowed domain (eqho.com)', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'user@eqho.com',
          name: 'Eqho User',
          sub: 'google-id-456',
        }),
      });

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user?.email).toBe('user@eqho.com');
    });

    it('should reject inactive user with ACCOUNT_INACTIVE error', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'inactive@eneos.co.th',
          name: 'Inactive User',
          sub: 'google-id-inactive',
        }),
      });

      mockGetUserByEmail.mockResolvedValue({ role: 'admin', status: 'inactive' });

      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('ACCOUNT_INACTIVE');
      expect(error.message).toContain('deactivated');
    });
  });

  // ===========================================
  // getUserRole Tests
  // ===========================================

  describe('getUserRole (via _testOnly)', () => {
    it('should return admin when user has admin role in Sheets', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue({ role: 'admin' });

      const role = await _testOnly.getUserRole('admin@eneos.co.th');
      expect(role).toBe('admin');
    });

    it('should return viewer when user has sales role in Sheets', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue({ role: 'sales' });

      const role = await _testOnly.getUserRole('sales@eneos.co.th');
      expect(role).toBe('viewer');
    });

    it('should return viewer when user has unknown role in Sheets', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue({ role: 'manager' });

      const role = await _testOnly.getUserRole('manager@eneos.co.th');
      expect(role).toBe('viewer');
    });

    it('should return admin when user is in ADMIN_EMAILS list (fallback)', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue(null); // Not found in Sheets

      const role = await _testOnly.getUserRole('admin@eneos.co.th');
      expect(role).toBe('admin');
    });

    it('should return viewer when user not in Sheets and not in ADMIN_EMAILS', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue(null);

      const role = await _testOnly.getUserRole('random@eneos.co.th');
      expect(role).toBe('viewer');
    });

    it('should return admin from ADMIN_EMAILS when Sheets API fails', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockRejectedValue(new Error('Sheets API error'));

      const role = await _testOnly.getUserRole('admin@eneos.co.th');
      expect(role).toBe('admin');
    });

    it('should return viewer when Sheets API fails and not in ADMIN_EMAILS', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockRejectedValue(new Error('Sheets API error'));

      const role = await _testOnly.getUserRole('random@eneos.co.th');
      expect(role).toBe('viewer');
    });

    it('should handle user with empty role from Sheets', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue({ role: '' });

      const role = await _testOnly.getUserRole('user@eneos.co.th');
      expect(role).toBe('viewer');
    });

    it('should throw ACCOUNT_INACTIVE error when user status is inactive', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue({ role: 'admin', status: 'inactive' });

      await expect(_testOnly.getUserRole('inactive@eneos.co.th')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
      });
    });

    it('should allow login when user status is active', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue({ role: 'admin', status: 'active' });

      const role = await _testOnly.getUserRole('active@eneos.co.th');
      expect(role).toBe('admin');
    });

    it('should allow login when user status is not specified (default active)', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      mockGetUserByEmail.mockResolvedValue({ role: 'sales' }); // No status field

      const role = await _testOnly.getUserRole('user@eneos.co.th');
      expect(role).toBe('viewer');
    });

    it('should block inactive user even with empty role', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      // Edge case: user has status=inactive but no role specified
      mockGetUserByEmail.mockResolvedValue({ role: '', status: 'inactive' });

      await expect(_testOnly.getUserRole('inactive-no-role@eneos.co.th')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
      });
    });

    it('should block inactive user even with null role', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      // Edge case: user has status=inactive and role is null
      mockGetUserByEmail.mockResolvedValue({ role: null, status: 'inactive' });

      await expect(_testOnly.getUserRole('inactive-null-role@eneos.co.th')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
      });
    });

    it('should use ADMIN_EMAILS fallback only when user NOT in sheet', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      // User not found in sheet, falls back to ADMIN_EMAILS
      mockGetUserByEmail.mockResolvedValue(null);

      const role = await _testOnly.getUserRole('admin@eneos.co.th');
      expect(role).toBe('admin');
    });

    it('should block inactive admin@eneos.co.th even if in ADMIN_EMAILS', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');

      // User IS in sheet with inactive status - should be blocked before ADMIN_EMAILS check
      mockGetUserByEmail.mockResolvedValue({ role: 'admin', status: 'inactive' });

      await expect(_testOnly.getUserRole('admin@eneos.co.th')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
      });
    });
  });

  // ===========================================
  // getOAuthClient Tests
  // ===========================================

  describe('getOAuthClient (via _testOnly)', () => {
    it('should throw error when GOOGLE_OAUTH_CLIENT_ID is not set', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      delete process.env.GOOGLE_OAUTH_CLIENT_ID;

      expect(() => _testOnly.getOAuthClient()).toThrow('GOOGLE_OAUTH_CLIENT_ID is not configured');
    });

    it('should create OAuth client when client ID is configured', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';

      const client = _testOnly.getOAuthClient();
      expect(client).toBeDefined();
    });

    it('should return cached client on subsequent calls', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetOAuthClient();

      process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';

      const client1 = _testOnly.getOAuthClient();
      const client2 = _testOnly.getOAuthClient();

      expect(client1).toBe(client2); // Same instance
    });
  });

  // ===========================================
  // requireRole Tests
  // ===========================================

  describe('requireRole middleware', () => {
    it('should call next with error if user is not authenticated', async () => {
      const { requireRole } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('NOT_AUTHENTICATED');
    });

    it('should call next with error if user role is insufficient', async () => {
      const { requireRole } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      req.user = {
        email: 'viewer@eneos.co.th',
        name: 'Viewer',
        role: 'viewer',
        googleId: 'google-id-123',
      };

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should call next without error if user has required role', async () => {
      const { requireRole } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      req.user = {
        email: 'admin@eneos.co.th',
        name: 'Admin',
        role: 'admin',
        googleId: 'google-id-123',
      };

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should accept user with any of multiple allowed roles', async () => {
      const { requireRole } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      req.user = {
        email: 'viewer@eneos.co.th',
        name: 'Viewer',
        role: 'viewer',
        googleId: 'google-id-456',
      };

      const middleware = requireRole(['admin', 'viewer']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  // ===========================================
  // Shortcut Middleware Tests
  // ===========================================

  describe('requireAdmin shortcut', () => {
    it('should allow admin role', async () => {
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
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject viewer role', async () => {
      const { requireAdmin } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      req.user = {
        email: 'viewer@eneos.co.th',
        name: 'Viewer',
        role: 'viewer',
        googleId: 'google-id-456',
      };

      requireAdmin(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });

  describe('requireViewer shortcut', () => {
    it('should allow both admin and viewer roles', async () => {
      const { requireViewer } = await import('../../middleware/admin-auth.js');

      const roles: Array<'admin' | 'viewer'> = ['admin', 'viewer'];

      for (const role of roles) {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        req.user = {
          email: `${role}@eneos.co.th`,
          name: role,
          role,
          googleId: `google-id-${role}`,
        };

        requireViewer(req, res, next);
        expect(next).toHaveBeenCalledWith();
      }
    });
  });
});
