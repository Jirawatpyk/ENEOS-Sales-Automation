# Authentication Flow Diagram

**Project:** ENEOS Sales Automation
**Generated:** 2026-02-01
**Type:** Sequence Diagram

---

## Overview

This diagram shows the complete authentication flow between:
- **User** - End user (ENEOS employee)
- **Dashboard** - Next.js Admin Dashboard (:3001)
- **Google** - Google OAuth 2.0 + OpenID Connect
- **Backend** - Express.js API (:3000)
- **Sheets** - Google Sheets (Sales_Team table)

---

## Main Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant D as Dashboard<br/>(Next.js :3001)
    participant G as Google OAuth
    participant B as Backend API<br/>(Express :3000)
    participant S as Google Sheets<br/>(Sales_Team)

    Note over U,S: === Initial Login Flow ===

    U->>D: Click "Sign in with Google"
    D->>G: Redirect to Google OAuth<br/>(scope: openid email profile)
    G->>U: Show Google login page
    U->>G: Enter credentials
    G->>G: Authenticate user

    alt Domain NOT in ALLOWED_DOMAINS
        G->>D: Callback with user info
        D->>D: signIn callback rejects
        D->>U: Redirect to /login?error=AccessDenied
    else Domain IS allowed (@eneos.co.th)
        G->>D: Callback with OAuth code
        D->>G: Exchange code for tokens
        G->>D: Return access_token + id_token + refresh_token

        Note over D,B: === Role Fetch (Single Source of Truth) ===

        D->>B: GET /api/admin/me<br/>Authorization: Bearer {id_token}
        B->>B: Verify ID token with Google
        B->>B: Check domain in ALLOWED_DOMAINS
        B->>S: Query Sales_Team by email

        alt User found in Sales_Team
            S->>B: Return {role, status}
            alt Status = inactive
                B->>D: 403 ACCOUNT_INACTIVE
                D->>U: "Account deactivated"
            else Status = active
                B->>D: 200 {role: admin|viewer}
            end
        else User NOT in Sales_Team
            B->>B: Check ADMIN_EMAILS fallback
            B->>D: 200 {role: admin|viewer}
        end

        Note over D: === Create Session ===

        D->>D: jwt callback: Store tokens + role
        D->>D: session callback: Expose role to client
        D->>U: Set session cookie (24h)
        D->>U: Redirect to /dashboard
    end
```

---

## Token Refresh Flow

Google ID tokens expire after ~1 hour. This flow refreshes them automatically.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant D as Dashboard
    participant G as Google OAuth
    participant B as Backend API

    Note over U,B: === Token Refresh (Every ~55 minutes) ===

    U->>D: Access protected page
    D->>D: jwt callback triggered
    D->>D: Check idTokenExpiresAt

    alt ID Token expires in < 5 min
        D->>G: POST /token<br/>(grant_type: refresh_token)

        alt Refresh successful
            G->>D: New id_token + access_token
            D->>D: Update JWT with new tokens
            D->>D: Reset idTokenExpiresAt (+1 hour)
            D->>U: Continue with fresh token
        else Refresh failed
            D->>D: Set token.error = RefreshTokenError
            D->>U: Redirect to /login
        end
    else Token still valid
        D->>U: Continue normally
    end
```

---

## Session Sliding Window

Session is 24 hours but extends automatically in the last 6 hours.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant D as Dashboard

    Note over U,D: === Session Extension ===

    U->>D: Access page (session age: 20 hours)
    D->>D: jwt callback triggered
    D->>D: Check expiresAt

    alt Within last 6 hours of session
        D->>D: Extend expiresAt by 24 hours
        D->>D: Update lastRefreshedAt
        Note over D: Session extended!
    else More than 6 hours remaining
        Note over D: No extension needed
    end

    D->>U: Continue with session
```

---

## API Request Authorization

Every protected API call follows this flow.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant D as Dashboard
    participant B as Backend API
    participant S as Google Sheets

    Note over U,S: === Protected API Request ===

    U->>D: Action (view leads, export, etc.)
    D->>D: Get id_token from session
    D->>B: GET /api/admin/leads<br/>Authorization: Bearer {id_token}

    B->>B: adminAuthMiddleware
    B->>B: Extract Bearer token
    B->>B: Verify with Google OAuth2Client

    alt Token invalid/expired
        B->>D: 401 INVALID_TOKEN
        D->>U: Redirect to /login
    else Token valid
        B->>B: Check email domain

        alt Domain not allowed
            B->>D: 403 FORBIDDEN_DOMAIN
        else Domain OK
            B->>S: Query Sales_Team for role
            S->>B: Return role + status

            alt Status = inactive
                B->>D: 403 ACCOUNT_INACTIVE
            else Has required role
                B->>B: Execute request handler
                B->>D: 200 {data: ...}
                D->>U: Display data
            else Missing required role
                B->>D: 403 FORBIDDEN_ROLE
                D->>U: "Access denied"
            end
        end
    end
```

---

## Role-Based Access Control (RBAC)

```mermaid
flowchart TD
    subgraph Roles["User Roles"]
        A[admin] --> |full access| E1[Export]
        A --> |full access| E2[Team Management]
        A --> |full access| E3[Activity Log]
        A --> |read| E4[Dashboard/Leads/Campaigns]

        V[viewer] --> |read only| E4
        V -.-> |blocked| E1
        V -.-> |blocked| E2
        V -.-> |blocked| E3
    end

    subgraph RoleMapping["Role Mapping"]
        S1[Sales_Team.role = 'admin'] --> A
        S2[Sales_Team.role = 'sales'] --> V
        S3[ADMIN_EMAILS fallback] --> A
        S4[Default / Not found] --> V
    end
```

---

## Security Checkpoints

| Checkpoint | Location | Check | Failure |
|------------|----------|-------|---------|
| 1. Domain | Dashboard `signIn` callback | Email domain in ALLOWED_DOMAINS | Reject login |
| 2. Domain | Backend `adminAuthMiddleware` | Email domain in ALLOWED_DOMAINS | 403 FORBIDDEN_DOMAIN |
| 3. Token | Backend `adminAuthMiddleware` | Valid Google ID token | 401 INVALID_TOKEN |
| 4. Status | Backend `getUserRole` | Sales_Team.status = 'active' | 403 ACCOUNT_INACTIVE |
| 5. Role | Backend `requireAdmin/requireViewer` | Has required role | 403 FORBIDDEN_ROLE |

---

## Token Lifecycle

| Token | Issued By | Lifetime | Storage | Refresh |
|-------|-----------|----------|---------|---------|
| **ID Token** | Google | ~1 hour | JWT cookie | Auto (refresh_token) |
| **Access Token** | Google | ~1 hour | JWT cookie | Auto (refresh_token) |
| **Refresh Token** | Google | Long-lived | JWT cookie | On consent |
| **Session** | NextAuth | 24 hours | JWT cookie | Sliding window (last 6h) |

---

## Environment Variables

### Dashboard (.env.local)
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3001
ALLOWED_DOMAINS=eneos.co.th
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Backend (.env)
```bash
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
ALLOWED_DOMAINS=eneos.co.th
```

---

## Key Code References

| File | Purpose |
|------|---------|
| `dashboard/src/lib/auth.ts` | NextAuth configuration, token refresh, role fetch |
| `dashboard/src/middleware.ts` | Route protection |
| `backend/src/middleware/admin-auth.ts` | Token validation, RBAC middleware |
| `backend/src/services/sheets.service.ts` | Sales_Team queries |
