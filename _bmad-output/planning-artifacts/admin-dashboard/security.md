# Admin Dashboard - Security Guidelines

> Security specifications และ best practices สำหรับ ENEOS Admin Dashboard
> Version: 1.0.0 | Last Updated: 2024-01

## Table of Contents

1. [Security Overview](#1-security-overview)
2. [Authentication Security](#2-authentication-security)
3. [Authorization](#3-authorization)
4. [Data Protection](#4-data-protection)
5. [API Security](#5-api-security)
6. [Frontend Security](#6-frontend-security)
7. [Infrastructure Security](#7-infrastructure-security)
8. [Security Headers](#8-security-headers)
9. [Audit & Logging](#9-audit--logging)
10. [Incident Response](#10-incident-response)
11. [Security Checklist](#11-security-checklist)

---

## 1. Security Overview

### 1.1 Security Principles

| Principle | Description |
|-----------|-------------|
| **Defense in Depth** | หลาย layers ของ security |
| **Least Privilege** | ให้สิทธิ์เท่าที่จำเป็น |
| **Secure by Default** | ค่า default ต้องปลอดภัย |
| **Fail Securely** | เมื่อ error ต้อง fail แบบปลอดภัย |
| **Zero Trust** | ไม่ trust ใครโดยอัตโนมัติ |

### 1.2 Threat Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Threat Model                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  External Threats                                                       │
│  ├── Unauthorized access (non-ENEOS users)                              │
│  ├── Session hijacking                                                  │
│  ├── XSS attacks                                                        │
│  ├── CSRF attacks                                                       │
│  ├── Data exfiltration                                                  │
│  └── DDoS attacks                                                       │
│                                                                          │
│  Internal Threats                                                       │
│  ├── Unauthorized data access (wrong role)                              │
│  ├── Data manipulation                                                  │
│  └── Audit log tampering                                                │
│                                                                          │
│  Technical Threats                                                      │
│  ├── Dependency vulnerabilities                                         │
│  ├── Misconfiguration                                                   │
│  └── Data leakage via logs                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Security Layers                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: Network                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • HTTPS/TLS 1.3 only                                            │   │
│  │  • DDoS protection (Vercel/Cloudflare)                           │   │
│  │  • WAF rules                                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  Layer 2: Authentication                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Google OAuth 2.0                                              │   │
│  │  • Domain restriction (@eneos.co.th)                             │   │
│  │  • JWT session tokens                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  Layer 3: Authorization                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Route protection (middleware)                                 │   │
│  │  • API endpoint guards                                           │   │
│  │  • Role-based access (future)                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  Layer 4: Application                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Input validation (Zod)                                        │   │
│  │  • Output encoding                                               │   │
│  │  • CSRF protection                                               │   │
│  │  • Security headers                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  Layer 5: Data                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Encrypted at rest (Google Sheets)                             │   │
│  │  • Encrypted in transit (TLS)                                    │   │
│  │  • No sensitive data in logs                                     │   │
│  │  • No sensitive data in localStorage                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Security

### 2.1 Google OAuth Configuration

```typescript
// lib/auth.ts - Secure configuration
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          // CRITICAL: Restrict to ENEOS domain
          hd: 'eneos.co.th',
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Double-check domain restriction
      const email = user.email?.toLowerCase();

      if (!email) {
        console.warn('Sign-in attempt without email');
        return false;
      }

      if (!email.endsWith('@eneos.co.th')) {
        console.warn(`Sign-in attempt from non-ENEOS email: ${email}`);
        return false;
      }

      // Log successful sign-in
      console.info(`User signed in: ${email}`);
      return true;
    },
  },

  // Security settings
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  // Use secure secret
  secret: process.env.NEXTAUTH_SECRET,

  // Custom pages
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
```

### 2.2 Session Security

```typescript
// Session token configuration
const sessionConfig = {
  // JWT settings
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },

  // Cookie settings (handled by NextAuth)
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true, // HTTPS only
      },
    },
  },
};
```

### 2.3 Token Validation

```typescript
// middleware.ts - Token validation
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  // Check if token exists
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Check token expiration
  const now = Math.floor(Date.now() / 1000);
  if (token.exp && token.exp < now) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Verify email domain (additional check)
  const email = token.email as string;
  if (!email?.endsWith('@eneos.co.th')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}
```

---

## 3. Authorization

### 3.1 Role-Based Access Control (RBAC)

```typescript
// types/auth.ts
export enum Role {
  ADMIN = 'admin',      // Full access
  MANAGER = 'manager',  // View all, export
  VIEWER = 'viewer',    // View own department only
}

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'export')[];
}

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    { resource: 'dashboard', actions: ['read'] },
    { resource: 'leads', actions: ['read', 'export'] },
    { resource: 'sales', actions: ['read', 'export'] },
    { resource: 'campaigns', actions: ['read', 'export'] },
    { resource: 'settings', actions: ['read', 'write'] },
  ],
  [Role.MANAGER]: [
    { resource: 'dashboard', actions: ['read'] },
    { resource: 'leads', actions: ['read', 'export'] },
    { resource: 'sales', actions: ['read'] },
    { resource: 'campaigns', actions: ['read'] },
  ],
  [Role.VIEWER]: [
    { resource: 'dashboard', actions: ['read'] },
    { resource: 'leads', actions: ['read'] },
  ],
};
```

### 3.2 Permission Check Utility

```typescript
// lib/permissions.ts
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { rolePermissions, Role } from '@/types/auth';

export async function checkPermission(
  resource: string,
  action: 'read' | 'write' | 'delete' | 'export'
): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return false;
  }

  // Get user role (from database or session)
  const userRole = (session.user as any).role as Role || Role.VIEWER;

  const permissions = rolePermissions[userRole];
  const resourcePermission = permissions.find(p => p.resource === resource);

  return resourcePermission?.actions.includes(action) ?? false;
}

// Usage in API route
export async function GET(req: Request) {
  const canExport = await checkPermission('leads', 'export');

  if (!canExport) {
    return Response.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // ... proceed with export
}
```

### 3.3 Route Protection

```typescript
// components/auth/protected-route.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

export function ProtectedRoute({
  children,
  requiredRole
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (requiredRole) {
      const userRole = (session.user as any).role;
      if (!hasRequiredRole(userRole, requiredRole)) {
        router.push('/unauthorized');
      }
    }
  }, [session, status, router, requiredRole]);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
```

---

## 4. Data Protection

### 4.1 Sensitive Data Classification

| Data Type | Classification | Handling |
|-----------|---------------|----------|
| Customer Email | PII | Mask in logs, no export without permission |
| Customer Phone | PII | Mask in logs, no export without permission |
| Sales Performance | Internal | Restricted to managers |
| Revenue Data | Confidential | Restricted to admin |
| AI Analysis | Internal | Normal handling |

### 4.2 Data Masking

```typescript
// lib/data-masking.ts
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  // 081-234-5678 → 081-XXX-5678
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}-XXX-${digits.slice(-4)}`;
}

// Usage in API response
function sanitizeLeadForResponse(lead: Lead, userRole: Role): Lead {
  if (userRole !== Role.ADMIN) {
    return {
      ...lead,
      email: maskEmail(lead.email),
      phone: maskPhone(lead.phone),
    };
  }
  return lead;
}
```

### 4.3 Data Export Security

```typescript
// Export security checks
async function validateExportRequest(
  userId: string,
  exportType: string,
  dateRange: { start: Date; end: Date }
): Promise<{ valid: boolean; error?: string }> {
  // Check permission
  const canExport = await checkPermission('leads', 'export');
  if (!canExport) {
    return { valid: false, error: 'Export permission required' };
  }

  // Check date range (max 1 year)
  const daysDiff = differenceInDays(dateRange.end, dateRange.start);
  if (daysDiff > 365) {
    return { valid: false, error: 'Maximum export range is 1 year' };
  }

  // Log export request
  await logAuditEvent({
    userId,
    action: 'export_request',
    resource: exportType,
    metadata: { dateRange },
  });

  return { valid: true };
}
```

### 4.4 No Sensitive Data in Client Storage

```typescript
// ❌ DON'T store sensitive data
localStorage.setItem('userData', JSON.stringify({
  email: 'user@eneos.co.th',
  accessToken: 'abc123',  // NEVER store tokens
  customerData: [...]     // NEVER store PII
}));

// ✅ DO use session only for non-sensitive data
// Sensitive data should be in httpOnly cookies (handled by NextAuth)
// or fetched fresh from API when needed
```

---

## 5. API Security

### 5.1 Input Validation

```typescript
// lib/validations.ts
import { z } from 'zod';

// Strict input validation
export const leadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['new', 'claimed', 'contacted', 'closed', 'lost', 'unreachable']).optional(),
  search: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Validate in API route
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  // Validate input
  const result = leadsQuerySchema.safeParse(params);

  if (!result.success) {
    return Response.json(
      {
        error: 'Validation error',
        details: result.error.flatten()
      },
      { status: 400 }
    );
  }

  const validated = result.data;
  // ... proceed with validated data
}
```

### 5.2 Rate Limiting

```typescript
// middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
});

export async function rateLimit(identifier: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const result = await ratelimit.limit(identifier);
  return result;
}

// Usage in API route
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const identifier = session?.user?.email || 'anonymous';

  const { success, limit, remaining, reset } = await rateLimit(identifier);

  if (!success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // ... proceed
}
```

### 5.3 SQL/NoSQL Injection Prevention

```typescript
// Since we use Google Sheets, injection is less of a concern
// But still validate and sanitize all inputs

// ❌ DON'T use raw input in queries
const search = req.query.search;
const range = `Leads!A:W`;
// sheets.spreadsheets.values.get({ range: `${range}:${search}` });

// ✅ DO validate and sanitize
const searchSchema = z.string().max(100).regex(/^[a-zA-Z0-9\s@.]+$/);
const validatedSearch = searchSchema.parse(req.query.search);
// Then filter results in application code
```

---

## 6. Frontend Security

### 6.1 XSS Prevention

```typescript
// React automatically escapes output, but be careful with:

// ❌ DON'T use dangerouslySetInnerHTML with user input
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ DO let React escape content
<div>{userInput}</div>

// ✅ If HTML is needed, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

### 6.2 CSRF Protection

```typescript
// NextAuth handles CSRF automatically
// For custom forms, use CSRF tokens

// In server component
import { getCsrfToken } from 'next-auth/react';

export default async function FormPage() {
  const csrfToken = await getCsrfToken();

  return (
    <form method="post" action="/api/custom-action">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      {/* ... form fields */}
    </form>
  );
}
```

### 6.3 Secure External Links

```typescript
// Always use rel="noopener noreferrer" for external links
<a
  href={externalUrl}
  target="_blank"
  rel="noopener noreferrer"
>
  External Link
</a>

// Or use Next.js Link with external URL handling
import Link from 'next/link';

function ExternalLink({ href, children }) {
  const isExternal = href.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return <Link href={href}>{children}</Link>;
}
```

### 6.4 Content Security Policy

```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  frame-src https://accounts.google.com;
  connect-src 'self' https://api.eneos-sales.com https://accounts.google.com;
`;

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};
```

---

## 7. Infrastructure Security

### 7.1 Environment Variables

```bash
# .env.local - NEVER commit this file

# ✅ Required secrets (must be kept secure)
NEXTAUTH_SECRET=<generated-secure-random-string>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

# ✅ Public variables (can be in code)
NEXT_PUBLIC_API_URL=https://api.eneos-sales.com
```

```typescript
// Validate required env vars at startup
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

// Validate on app start
export const env = envSchema.parse(process.env);
```

### 7.2 Vercel Security Settings

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### 7.3 HTTPS Configuration

```typescript
// Enforce HTTPS
// middleware.ts
export function middleware(req: NextRequest) {
  // Redirect HTTP to HTTPS in production
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.get('x-forwarded-proto') !== 'https'
  ) {
    return NextResponse.redirect(
      `https://${req.headers.get('host')}${req.nextUrl.pathname}`,
      301
    );
  }

  return NextResponse.next();
}
```

---

## 8. Security Headers

### 8.1 Complete Headers Configuration

```typescript
// next.config.js
const securityHeaders = [
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // XSS protection (legacy browsers)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // DNS prefetch control
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // HSTS (HTTP Strict Transport Security)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Permissions Policy (Feature Policy)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 9. Audit & Logging

### 9.1 Audit Events

```typescript
// lib/audit.ts
export interface AuditEvent {
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export async function logAuditEvent(event: Omit<AuditEvent, 'timestamp'>) {
  const auditEvent: AuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Log to console (for development)
  console.log('[AUDIT]', JSON.stringify(auditEvent));

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to backend or logging service
    await fetch('/api/audit', {
      method: 'POST',
      body: JSON.stringify(auditEvent),
    });
  }
}

// Usage
await logAuditEvent({
  userId: session.user.id,
  userEmail: session.user.email,
  action: 'export',
  resource: 'leads',
  metadata: { format: 'xlsx', recordCount: 156 },
  success: true,
});
```

### 9.2 Sensitive Data Logging Rules

```typescript
// ❌ DON'T log sensitive data
console.log('User login:', { email, password, accessToken });
console.log('Lead data:', lead);

// ✅ DO log safely
console.log('User login:', { email: maskEmail(email), success: true });
console.log('Lead accessed:', { row: lead.row, company: lead.company });
```

### 9.3 Error Logging (without sensitive data)

```typescript
// lib/error-logger.ts
export function logError(error: Error, context?: Record<string, unknown>) {
  const sanitizedContext = context ? sanitizeForLogging(context) : {};

  console.error('[ERROR]', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    context: sanitizedContext,
    timestamp: new Date().toISOString(),
  });
}

function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'email', 'phone'];
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
```

---

## 10. Incident Response

### 10.1 Security Incident Types

| Level | Type | Example | Response Time |
|-------|------|---------|---------------|
| Critical | Data breach | Customer data exposed | Immediate |
| High | Auth bypass | Unauthorized access | 1 hour |
| Medium | Rate limit abuse | Excessive API calls | 4 hours |
| Low | Failed login attempts | Brute force attempt | 24 hours |

### 10.2 Incident Response Steps

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Incident Response Process                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Detection                                                           │
│     ├── Automated alerts                                                │
│     ├── User reports                                                    │
│     └── Log analysis                                                    │
│              │                                                           │
│              ▼                                                           │
│  2. Containment                                                         │
│     ├── Isolate affected systems                                        │
│     ├── Revoke compromised credentials                                  │
│     └── Block malicious IPs                                             │
│              │                                                           │
│              ▼                                                           │
│  3. Investigation                                                       │
│     ├── Review audit logs                                               │
│     ├── Identify scope                                                  │
│     └── Determine root cause                                            │
│              │                                                           │
│              ▼                                                           │
│  4. Remediation                                                         │
│     ├── Fix vulnerability                                               │
│     ├── Restore from backup if needed                                   │
│     └── Update security measures                                        │
│              │                                                           │
│              ▼                                                           │
│  5. Recovery                                                            │
│     ├── Restore normal operations                                       │
│     ├── Monitor for recurrence                                          │
│     └── Notify affected parties                                         │
│              │                                                           │
│              ▼                                                           │
│  6. Post-Incident                                                       │
│     ├── Document lessons learned                                        │
│     ├── Update procedures                                               │
│     └── Train team                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Contact Information

| Role | Contact |
|------|---------|
| IT Security Lead | security@eneos.co.th |
| System Admin | admin@eneos.co.th |
| Management | manager@eneos.co.th |

---

## 11. Security Checklist

### 11.1 Pre-Deployment Checklist

```
Authentication & Authorization
☐ Google OAuth configured with domain restriction
☐ NEXTAUTH_SECRET is secure random string (32+ chars)
☐ Session timeout configured (24 hours max)
☐ All protected routes have authentication check

Data Security
☐ No sensitive data in localStorage
☐ No secrets in client-side code
☐ API responses don't include unnecessary data
☐ Export feature has permission check

API Security
☐ All inputs validated with Zod
☐ Rate limiting configured
☐ CORS configured correctly
☐ Error messages don't expose internals

Frontend Security
☐ No dangerouslySetInnerHTML with user input
☐ External links have rel="noopener noreferrer"
☐ CSP headers configured
☐ HTTPS enforced

Infrastructure
☐ All secrets in environment variables
☐ Environment variables validated at startup
☐ Security headers configured
☐ Dependencies updated (npm audit)

Monitoring
☐ Audit logging enabled
☐ Error logging (without sensitive data)
☐ Alert system configured
```

### 11.2 Regular Security Tasks

| Task | Frequency |
|------|-----------|
| Dependency audit (`npm audit`) | Weekly |
| Access review (who has access) | Monthly |
| Log review | Weekly |
| Security update review | Monthly |
| Penetration testing | Annually |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01 | Claude | Initial document |
