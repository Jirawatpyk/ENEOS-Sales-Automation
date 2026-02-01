# Admin Authentication Middleware

เอกสารสำหรับการใช้งาน Admin Authentication Middleware ที่ใช้ Google OAuth token validation

## ไฟล์ที่เกี่ยวข้อง

- **Middleware**: `src/middleware/admin-auth.ts`
- **Tests**: `src/__tests__/middleware/admin-auth.test.ts`

## Overview

Middleware นี้ใช้สำหรับ:
1. ตรวจสอบ Google OAuth token จาก Authorization header
2. ตรวจสอบว่า email domain เป็น `@eneos.co.th` เท่านั้น
3. Attach user information (email, name, role) เข้า `req.user`
4. ทำ Role-Based Access Control (RBAC) สำหรับ admin endpoints

## Environment Variables

ต้องเพิ่มใน `.env`:

```bash
# Google OAuth Client ID สำหรับ Admin Dashboard
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Note**: ใช้ `GOOGLE_OAUTH_CLIENT_ID` ไม่ใช่ `GOOGLE_CLIENT_ID` (ที่ใช้สำหรับ Service Account)

## Role Hierarchy

```
admin > viewer
```

- **admin**: สิทธิ์สูงสุด สามารถทำทุกอย่างได้ (export, team management, settings)
- **viewer**: สิทธิ์ดูอย่างเดียว อ่านข้อมูลได้แต่แก้ไขไม่ได้ (mapped from 'sales' role in Sales_Team sheet)

**Role Mapping from Sales_Team Sheet:**
| Sheet Role | Dashboard Role | Access |
|------------|----------------|--------|
| `admin` | admin | Full access |
| `sales` | viewer | Read-only |
| (not found) | viewer | Default |

## การใช้งานพื้นฐาน

### 1. Import Middleware

```typescript
import {
  adminAuthMiddleware,
  requireRole,
  requireAdmin,
  requireViewer,
} from './middleware/admin-auth.js';
```

### 2. ใช้กับ Express Routes

```typescript
import { Router } from 'express';

const router = Router();

// ทุก route ใน /api/admin ต้อง authenticate ก่อน
router.use(adminAuthMiddleware);

// ตัวอย่าง: endpoint สำหรับ viewer ขึ้นไป (ทุก role)
router.get('/api/admin/dashboard',
  requireViewer,  // หรือไม่ใส่ก็ได้เพราะมี adminAuthMiddleware แล้ว
  getDashboard
);

// ตัวอย่าง: endpoint สำหรับ admin เท่านั้น
router.post('/api/admin/export',
  requireAdmin,
  exportData
);

// ตัวอย่าง: endpoint สำหรับ admin เท่านั้น (team management)
router.post('/api/admin/sales-team',
  requireAdmin,
  createSalesTeamMember
);
```

### 3. เข้าถึง User Info ใน Controller

```typescript
import { Request, Response } from 'express';

export async function getDashboard(req: Request, res: Response) {
  // req.user จะมีข้อมูลหลังผ่าน adminAuthMiddleware
  const { email, name, role } = req.user!;

  console.log(`User ${name} (${email}) with role ${role} accessed dashboard`);

  // ดึงข้อมูลและส่งกลับ
  const data = await fetchDashboardData();
  res.json({ success: true, data });
}
```

## API Reference

### `adminAuthMiddleware(req, res, next)`

Middleware หลักสำหรับ authentication

**Flow:**
1. ดึง Bearer token จาก `Authorization` header
2. Verify token กับ Google OAuth API
3. ตรวจสอบว่า email domain อยู่ใน `ALLOWED_DOMAINS` (default: `@eneos.co.th`)
4. Query role จาก Google Sheets (Sales_Team sheet)
5. ตรวจสอบ status (active/inactive) - reject ถ้า inactive
6. Attach `req.user` object

**req.user Type:**
```typescript
interface AdminUser {
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  googleId: string;
}
```

**Error Codes:**
- `401 UNAUTHORIZED` - Missing authorization header
- `401 INVALID_AUTH_FORMAT` - Format ไม่ถูกต้อง (ต้องเป็น "Bearer <token>")
- `401 MISSING_TOKEN` - Token ว่างเปล่า
- `401 INVALID_TOKEN` - Token ไม่ valid หรือ expired
- `401 INVALID_TOKEN_PAYLOAD` - Payload ของ token ไม่สมบูรณ์
- `401 EMAIL_NOT_FOUND` - ไม่มี email ใน token
- `403 FORBIDDEN_DOMAIN` - Email domain ไม่ใช่ @eneos.co.th

---

### `requireRole(allowedRoles: UserRole[])`

Factory function สำหรับสร้าง middleware ที่ตรวจสอบ role

**Parameters:**
- `allowedRoles`: Array of roles ที่อนุญาต เช่น `['admin', 'manager']`

**Returns:** Express middleware function

**Error Codes:**
- `401 NOT_AUTHENTICATED` - ไม่มี `req.user` (ต้องใช้ `adminAuthMiddleware` ก่อน)
- `403 FORBIDDEN_ROLE` - User role ไม่อยู่ใน `allowedRoles`

**Example:**
```typescript
// อนุญาตเฉพาะ admin และ manager
router.get('/api/admin/reports',
  adminAuthMiddleware,
  requireRole(['admin', 'manager']),
  getReports
);
```

---

### `requireAdmin`

Shortcut middleware: อนุญาตเฉพาะ admin เท่านั้น

เทียบเท่ากับ `requireRole(['admin'])`

**Example:**
```typescript
router.delete('/api/admin/users/:id',
  adminAuthMiddleware,
  requireAdmin,
  deleteUser
);
```

---

### `requireViewer`

Shortcut middleware: อนุญาตทุก role (admin, viewer)

เทียบเท่ากับ `requireRole(['admin', 'viewer'])`

**Example:**
```typescript
router.get('/api/admin/stats',
  adminAuthMiddleware,
  requireViewer,  // Optional: เพราะ adminAuthMiddleware อนุญาตทุก role อยู่แล้ว
  getStats
);
```

## Error Response Format

เมื่อ authentication หรือ authorization ล้มเหลว จะ response JSON format นี้:

```json
{
  "success": false,
  "error": {
    "message": "Access denied. Only @eneos.co.th domain is allowed",
    "code": "FORBIDDEN_DOMAIN"
  },
  "requestId": "abc-123-def-456"
}
```

## Testing

### Unit Tests

Test file: `src/__tests__/middleware/admin-auth.test.ts`

รัน tests:
```bash
npm test -- src/__tests__/middleware/admin-auth.test.ts
```

### Integration Testing

เมื่อทดสอบ API endpoints ที่ใช้ admin auth:

```typescript
import request from 'supertest';
import app from '../app.js';

describe('Admin API Integration', () => {
  it('should reject request without token', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject non-@eneos.co.th domain', async () => {
    // Mock Google OAuth to return gmail.com email
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer fake-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN_DOMAIN');
  });

  it('should allow valid @eneos.co.th user', async () => {
    // Mock Google OAuth to return eneos.co.th email
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
  });
});
```

## Frontend Integration (NextAuth.js)

Admin Dashboard (Next.js) ต้อง setup NextAuth.js:

### 1. Install Dependencies

```bash
npm install next-auth
```

### 2. Configure NextAuth.js

`app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: 'eneos.co.th', // Restrict to @eneos.co.th domain
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Verify email domain
      if (profile?.email?.endsWith('@eneos.co.th')) {
        return true;
      }
      return false; // Reject other domains
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.id_token; // Google ID token
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

### 3. API Client (Frontend)

`lib/api.ts`:

```typescript
import { getSession } from 'next-auth/react';

export async function fetchAdminAPI(endpoint: string, options = {}) {
  const session = await getSession();

  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API Error');
  }

  return response.json();
}

// Usage
export async function getDashboard() {
  return fetchAdminAPI('/api/admin/dashboard');
}
```

## Implementation Status

### ✅ Role Lookup from Google Sheets (Implemented)

Role lookup is fully implemented in `admin-auth.ts`:

```typescript
// admin-auth.ts:302-373
async function getUserRole(email: string): Promise<UserRole> {
  // Query from Sales_Team sheet
  const user = await sheetsService.getUserByEmail(email);

  if (user) {
    // Check if user is inactive - reject login
    if (user.status === 'inactive') {
      throw new AppError('Account deactivated', 403, 'ACCOUNT_INACTIVE');
    }

    // Map sheet role to dashboard role
    if (user.role.toLowerCase() === 'admin') return 'admin';
    return 'viewer';  // 'sales' or other → viewer
  }

  // Fallback: check ADMIN_EMAILS constant
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    return 'admin';
  }

  return 'viewer'; // Default
}
```

### ✅ Admin Endpoints (Implemented)

All admin endpoints are implemented in `src/routes/admin.routes.ts`:

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/admin/me` | ✅ | Current user info + role |
| `GET /api/admin/dashboard` | ✅ | Dashboard summary |
| `GET /api/admin/leads` | ✅ | List leads (paginated) |
| `GET /api/admin/leads/:id` | ✅ | Lead detail |
| `GET /api/admin/sales-performance` | ✅ | Sales team performance |
| `GET /api/admin/campaigns` | ✅ | Campaign analytics |
| `GET /api/admin/campaigns/stats` | ✅ | Campaign email stats |
| `GET /api/admin/export` | ✅ | Export data (admin only) |
| `GET /api/admin/sales-team` | ✅ | List team members |
| `POST /api/admin/sales-team` | ✅ | Create member (admin only) |
| `PATCH /api/admin/sales-team/:id` | ✅ | Update member (admin only) |
| `GET /api/admin/activity-log` | ✅ | Status history log |

### 🔮 Future Improvements

1. **Role Caching** - Add Redis cache for role lookup to reduce Sheets API calls
2. **Audit Log** - Log all admin actions for compliance

## Security Best Practices

1. **HTTPS Only**: ใช้ HTTPS ใน production เสมอ
2. **Token Expiry**: Google OAuth tokens มีอายุประมาณ 1 ชั่วโมง Frontend ต้อง refresh token
3. **Domain Restriction**: ห้ามปิด domain check `@eneos.co.th` ใน production
4. **Rate Limiting**: ใช้ rate limiting สำหรับ admin endpoints
5. **Logging**: Log ทุก authentication attempt (success/failure) เพื่อ audit

## Troubleshooting

### Error: "GOOGLE_OAUTH_CLIENT_ID is not configured"

**สาเหตุ:** ไม่มี env variable `GOOGLE_OAUTH_CLIENT_ID`

**แก้ไข:** เพิ่มใน `.env`:
```bash
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Error: "Invalid or expired token"

**สาเหตุ:**
- Token expired (อายุ ~1 ชั่วโมง)
- Token ไม่ valid
- Client ID ไม่ตรงกัน

**แก้ไข:**
1. Frontend refresh token ใหม่
2. ตรวจสอบว่า `GOOGLE_OAUTH_CLIENT_ID` ตรงกับที่ใช้ใน Frontend

### Error: "Access denied. Only @eneos.co.th domain is allowed"

**สาเหตุ:** User login ด้วย Google account ที่ไม่ใช่ @eneos.co.th

**แก้ไข:** ใช้ email @eneos.co.th เท่านั้น

### Error: "User not authenticated" (requireRole middleware)

**สาเหตุ:** ลืมใส่ `adminAuthMiddleware` ก่อน `requireRole`

**แก้ไข:**
```typescript
// ❌ Wrong - ลืม adminAuthMiddleware
router.get('/api/admin/leads', requireManager, getLeads);

// ✅ Correct
router.get('/api/admin/leads', adminAuthMiddleware, requireManager, getLeads);

// หรือใส่ที่ router level
router.use('/api/admin', adminAuthMiddleware);
router.get('/api/admin/leads', requireManager, getLeads);
```

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)

---

**Last Updated:** 2026-02-01
**Version:** 1.1.0
**Maintainer:** ENEOS Thailand Development Team
