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
admin > manager > viewer
```

- **admin**: สิทธิ์สูงสุด สามารถทำทุกอย่างได้
- **manager**: สิทธิ์รองลงมา สามารถดูและจัดการข้อมูลได้
- **viewer**: สิทธิ์ดูอย่างเดียว อ่านข้อมูลได้แต่แก้ไขไม่ได้

## การใช้งานพื้นฐาน

### 1. Import Middleware

```typescript
import {
  adminAuthMiddleware,
  requireRole,
  requireAdmin,
  requireManager,
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

// ตัวอย่าง: endpoint สำหรับ manager และ admin เท่านั้น
router.get('/api/admin/leads',
  requireManager,
  getLeads
);

// ตัวอย่าง: endpoint สำหรับ admin เท่านั้น
router.post('/api/admin/settings',
  requireAdmin,
  updateSettings
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
3. ตรวจสอบว่า email domain เป็น `@eneos.co.th`
4. Query role จาก Google Sheets (TODO: ยังไม่ได้ implement)
5. Attach `req.user` object

**req.user Type:**
```typescript
interface AdminUser {
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
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

### `requireManager`

Shortcut middleware: อนุญาต admin และ manager

เทียบเท่ากับ `requireRole(['admin', 'manager'])`

**Example:**
```typescript
router.put('/api/admin/leads/:id',
  adminAuthMiddleware,
  requireManager,
  updateLead
);
```

---

### `requireViewer`

Shortcut middleware: อนุญาตทุก role (admin, manager, viewer)

เทียบเท่ากับ `requireRole(['admin', 'manager', 'viewer'])`

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

## TODO

### 1. Role Lookup from Google Sheets

ปัจจุบัน role ถูก hardcode เป็น `'viewer'` ต้อง implement การ query จาก Google Sheets:

```typescript
// ใน admin-auth.ts
async function getUserRole(email: string): Promise<UserRole> {
  // TODO: Query from Sales_Team sheet
  // Structure: | LINE_User_ID | Name | Email | Phone | Role |

  const sheetsService = getSheetsService();
  const rows = await sheetsService.getValues({
    range: 'Sales_Team!A:E',
  });

  const userRow = rows.find(row => row[2] === email);

  if (userRow && userRow[4]) {
    const role = userRow[4].toLowerCase();
    if (['admin', 'manager', 'viewer'].includes(role)) {
      return role as UserRole;
    }
  }

  return 'viewer'; // Default role
}
```

### 2. Role Caching

เพิ่ม cache สำหรับ role lookup เพื่อลด Google Sheets API calls:

```typescript
import { RedisService } from '../services/redis.service.js';

const ROLE_CACHE_TTL = 300; // 5 minutes

async function getUserRole(email: string): Promise<UserRole> {
  const cacheKey = `user:role:${email}`;

  // Check cache first
  const cached = await RedisService.get(cacheKey);
  if (cached) {
    return cached as UserRole;
  }

  // Query from Sheets
  const role = await queryRoleFromSheets(email);

  // Cache result
  await RedisService.set(cacheKey, role, ROLE_CACHE_TTL);

  return role;
}
```

### 3. Admin Endpoints

สร้าง API endpoints สำหรับ Admin Dashboard (ตามที่ระบุใน `docs/admin-dashboard/CLAUDE-CONTEXT.md`):

- `GET /api/admin/dashboard` - Dashboard summary
- `GET /api/admin/leads` - List leads (paginated)
- `GET /api/admin/leads/:id` - Lead detail
- `GET /api/admin/leads/stats` - Leads statistics
- `GET /api/admin/sales-performance` - Sales team performance
- `GET /api/admin/sales-performance/:userId` - Individual performance
- `GET /api/admin/campaigns` - Campaign analytics
- `GET /api/admin/campaigns/:id` - Campaign detail
- `GET /api/admin/export` - Export data

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

**Last Updated:** 2026-01-11
**Version:** 1.0.0
**Maintainer:** ENEOS Thailand Development Team
