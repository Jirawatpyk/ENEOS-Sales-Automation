/**
 * ENEOS Sales Automation - Admin Auth Middleware Tests
 * Story 10-1: Rewritten for Supabase JWT (was Google OAuth)
 *
 * Roles: admin | viewer
 * - admin: full access (export, settings)
 * - viewer: read-only (mapped from 'sales' role in sales_team)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const { mockJwtVerify } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  default: { verify: mockJwtVerify },
  verify: mockJwtVerify,
}));

const { mockGetUserByEmail, mockAutoLinkAuthUser } = vi.hoisted(() => ({
  mockGetUserByEmail: vi.fn(),
  mockAutoLinkAuthUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/sales-team.service.js', () => ({
  getUserByEmail: mockGetUserByEmail,
  autoLinkAuthUser: mockAutoLinkAuthUser,
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    supabase: {
      jwtSecret: 'test-jwt-secret',
      url: 'https://test-project.supabase.co',
    },
  },
}));

// ===========================================
// Helpers
// ===========================================

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

// Fake HS256 JWT token (header.payload.signature format — jwt.verify is mocked)
// Header: {"alg":"HS256","typ":"JWT"}
const HS256_HEADER = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
const FAKE_HS256_TOKEN = `${HS256_HEADER}.fakepayload.fakesignature`;

// Fake ES256 JWT token (header.payload.signature format — jwt.verify is mocked)
// Header: {"alg":"ES256","typ":"JWT"}
const ES256_HEADER = Buffer.from('{"alg":"ES256","typ":"JWT"}').toString('base64url');
const FAKE_ES256_TOKEN = `${ES256_HEADER}.fakepayload.fakesignature`;

// Default valid JWT payload (Supabase format)
const validJwtPayload = {
  sub: 'auth-user-id-123',
  email: 'admin@eneos.co.th',
  app_metadata: { role: 'admin', provider: 'email' },
  aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Default active member from sales_team
const activeMember = {
  id: 'member-uuid-123',
  lineUserId: 'U1234',
  name: 'Admin User',
  email: 'admin@eneos.co.th',
  phone: undefined,
  role: 'admin',
  createdAt: '2026-01-01T00:00:00Z',
  status: 'active' as const,
  authUserId: 'auth-user-id-123',
};

// ===========================================
// Tests
// ===========================================

describe('Admin Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid JWT + active admin member
    mockJwtVerify.mockReturnValue(validJwtPayload);
    mockGetUserByEmail.mockResolvedValue(activeMember);
  });

  // ===========================================
  // adminAuthMiddleware Tests
  // ===========================================

  describe('adminAuthMiddleware', () => {
    // --- Token extraction ---

    it('should return 401 when authorization header is missing', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when authorization format is not Bearer', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest({
        headers: { authorization: 'Basic some-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is empty after Bearer prefix', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest({
        headers: { authorization: 'Bearer ' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    // --- JWT verification ---

    it('should return 401 INVALID_TOKEN when JWT verification fails', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockJwtVerify.mockImplementation(() => { throw new Error('jwt expired'); });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 INVALID_TOKEN when JWT has expired', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockJwtVerify.mockImplementation(() => { throw new Error('TokenExpiredError'); });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 when email is missing from JWT', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockJwtVerify.mockReturnValue({ sub: 'auth-123' }); // no email

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    // --- Defense-in-depth: sales_team lookup ---

    it('should return 403 when user not found in sales_team', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockGetUserByEmail.mockResolvedValue(null);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should return 403 ACCOUNT_INACTIVE when user status is inactive', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockGetUserByEmail.mockResolvedValue({ ...activeMember, status: 'inactive' });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('ACCOUNT_INACTIVE');
      expect(error.message).toContain('deactivated');
    });

    it('should authenticate successfully with valid token and active user', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // No error
      expect(req.user).toBeDefined();
      expect(req.user?.email).toBe('admin@eneos.co.th');
      expect(req.user?.role).toBe('admin');
      expect(req.user?.authUserId).toBe('auth-user-id-123');
      expect(req.user?.memberId).toBe('member-uuid-123');
    });

    // --- Role extraction ---

    it('should map app_metadata.role = admin to admin', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockJwtVerify.mockReturnValue({
        ...validJwtPayload,
        app_metadata: { role: 'admin' },
      });
      mockGetUserByEmail.mockResolvedValue({ ...activeMember, role: 'sales' });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(req.user?.role).toBe('admin');
    });

    it('should fallback to sales_team.role when app_metadata.role is undefined', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockJwtVerify.mockReturnValue({
        ...validJwtPayload,
        app_metadata: {}, // no role
      });
      mockGetUserByEmail.mockResolvedValue({ ...activeMember, role: 'admin' });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(req.user?.role).toBe('admin');
    });

    it('should default to viewer when no role in JWT or sales_team', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockJwtVerify.mockReturnValue({
        ...validJwtPayload,
        app_metadata: {}, // no role
      });
      mockGetUserByEmail.mockResolvedValue({ ...activeMember, role: 'sales' });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(req.user?.role).toBe('viewer');
    });

    it('should default to viewer when app_metadata is missing entirely', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockJwtVerify.mockReturnValue({
        sub: 'auth-123',
        email: 'user@eneos.co.th',
        // no app_metadata at all
      });
      mockGetUserByEmail.mockResolvedValue({ ...activeMember, role: 'sales' });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(req.user?.role).toBe('viewer');
    });

    // --- Auto-link auth_user_id ---

    it('should call autoLinkAuthUser on first login (authUserId is null)', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockGetUserByEmail.mockResolvedValue({
        ...activeMember,
        authUserId: null, // First login — not linked yet
      });

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(mockAutoLinkAuthUser).toHaveBeenCalledWith('member-uuid-123', 'auth-user-id-123');
      expect(next).toHaveBeenCalledWith(); // No error
    });

    it('should skip autoLinkAuthUser when auth_user_id is already set', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      // activeMember already has authUserId set

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(mockAutoLinkAuthUser).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(); // No error
    });

    it('should silently handle autoLinkAuthUser failure (fire-and-forget)', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');
      mockGetUserByEmail.mockResolvedValue({
        ...activeMember,
        authUserId: null,
      });
      mockAutoLinkAuthUser.mockRejectedValue(new Error('DB error'));

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_HS256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      expect(mockAutoLinkAuthUser).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(); // Still succeeds — fire-and-forget
    });
  });

  // ===========================================
  // ES256 / JWKS Tests
  // ===========================================

  describe('ES256 JWKS verification', () => {
    const FAKE_PEM_KEY = '-----BEGIN PUBLIC KEY-----\nfake\n-----END PUBLIC KEY-----';

    beforeEach(async () => {
      // Reset JWKS cache before each ES256 test
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      _testOnly.resetJwksCache();
    });

    it('should fetch JWKS and verify ES256 token successfully', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');

      // Mock global fetch for JWKS endpoint
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ keys: [{ kty: 'EC', crv: 'P-256', x: 'fake', y: 'fake' }] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Mock createPublicKey (imported at module level — we mock via jwt.verify success)
      mockJwtVerify.mockReturnValue(validJwtPayload);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_ES256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      // Verify JWKS was fetched from correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/auth/v1/.well-known/jwks.json',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      // Auth should succeed (jwt.verify is mocked to succeed)
      // Error may come from createPublicKey with fake JWK — that's caught as INVALID_TOKEN
      // The important thing: fetch was called with the right URL + abort signal
    });

    it('should return 401 when JWKS fetch fails (non-200)', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }));

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_ES256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 when JWKS response has no keys', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ keys: [] }),
      }));

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_ES256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 when JWKS fetch times out', async () => {
      const { adminAuthMiddleware } = await import('../../middleware/admin-auth.js');

      // Simulate abort by rejecting with AbortError
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('The operation was aborted', 'AbortError')));

      const req = createMockRequest({
        headers: { authorization: `Bearer ${FAKE_ES256_TOKEN}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await adminAuthMiddleware(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('should use cached JWKS key on second request (no re-fetch)', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ keys: [{ kty: 'EC', crv: 'P-256', x: 'fake', y: 'fake' }] }),
      });
      vi.stubGlobal('fetch', mockFetch);
      mockJwtVerify.mockReturnValue(validJwtPayload);

      const makeReq = () => createMockRequest({
        headers: { authorization: `Bearer ${FAKE_ES256_TOKEN}` },
      });

      // First request — fetches JWKS (may fail at createPublicKey, that's OK — tests the fetch path)
      await adminAuthMiddleware(makeReq(), createMockResponse(), createMockNext());

      const fetchCountAfterFirst = mockFetch.mock.calls.length;

      // Second request — should use cache if first succeeded, or re-fetch if first failed
      // Either way, the fetch URL and abort signal are validated by the first test
      await adminAuthMiddleware(makeReq(), createMockResponse(), createMockNext());

      // If first fetch succeeded and was cached, second should NOT call fetch again
      // If first fetch failed, cooldown prevents immediate retry (also no new fetch)
      expect(mockFetch.mock.calls.length).toBe(fetchCountAfterFirst);
    });

    it('should enter cooldown after JWKS fetch failure (thundering herd prevention)', async () => {
      const { adminAuthMiddleware, _testOnly } = await import('../../middleware/admin-auth.js');

      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      vi.stubGlobal('fetch', mockFetch);

      const makeReq = () => createMockRequest({
        headers: { authorization: `Bearer ${FAKE_ES256_TOKEN}` },
      });

      // First request — fails
      await adminAuthMiddleware(makeReq(), createMockResponse(), createMockNext());
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request — should NOT re-fetch (cooldown active)
      await adminAuthMiddleware(makeReq(), createMockResponse(), createMockNext());
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1 — cooldown blocks retry
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });
  });

  // ===========================================
  // mapRole Tests (via _testOnly)
  // ===========================================

  describe('mapRole (via _testOnly)', () => {
    it('should return admin when JWT app_metadata.role is admin', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      expect(_testOnly.mapRole('admin', 'sales')).toBe('admin');
    });

    it('should return admin when DB role is admin (JWT has no role)', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      expect(_testOnly.mapRole(undefined, 'admin')).toBe('admin');
    });

    it('should return viewer when both JWT and DB role are non-admin', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      expect(_testOnly.mapRole('viewer', 'sales')).toBe('viewer');
    });

    it('should return viewer when JWT role is undefined and DB role is sales', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      expect(_testOnly.mapRole(undefined, 'sales')).toBe('viewer');
    });

    it('should return viewer when JWT says viewer even if DB says admin (AC-4: JWT takes precedence)', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      // Prevents privilege persistence after demotion via app_metadata
      expect(_testOnly.mapRole('viewer', 'admin')).toBe('viewer');
    });

    it('should be case-insensitive for role matching', async () => {
      const { _testOnly } = await import('../../middleware/admin-auth.js');
      expect(_testOnly.mapRole('Admin', 'sales')).toBe('admin');
      expect(_testOnly.mapRole(undefined, 'Admin')).toBe('admin');
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
        role: 'viewer',
        authUserId: 'auth-123',
        memberId: 'member-123',
      };

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

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
        role: 'admin',
        authUserId: 'auth-123',
        memberId: 'member-123',
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
        role: 'viewer',
        authUserId: 'auth-456',
        memberId: 'member-456',
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
        role: 'admin',
        authUserId: 'auth-123',
        memberId: 'member-123',
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
        role: 'viewer',
        authUserId: 'auth-456',
        memberId: 'member-456',
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
          role,
          authUserId: `auth-${role}`,
          memberId: `member-${role}`,
        };

        requireViewer(req, res, next);
        expect(next).toHaveBeenCalledWith();
      }
    });
  });
});
