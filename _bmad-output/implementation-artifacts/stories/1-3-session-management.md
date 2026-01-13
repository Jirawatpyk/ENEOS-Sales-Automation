# Story 1.3: Session Management

Status: done

## Story

As an **ENEOS administrator**,
I want **my session to be managed securely with automatic timeout and refresh**,
so that **I can work efficiently without re-logging frequently while maintaining security**.

## Acceptance Criteria

1. **AC1: Session Duration**
   - Given I am authenticated
   - When my session is created
   - Then it has a maximum age of 24 hours
   - And the session expiry time is tracked in the JWT token

2. **AC2: Session Refresh**
   - Given I am authenticated and actively using the dashboard
   - When I make API requests
   - Then my session is automatically refreshed if it's within the refresh window (last 6 hours of 24-hour session)
   - And I don't need to re-authenticate

3. **AC3: Session Expiry Warning**
   - Given I am authenticated
   - When my session has 5 minutes remaining
   - Then I see a non-intrusive toast notification warning me
   - And the notification includes an "Extend Session" button that refreshes the page to renew the session

4. **AC4: Session Expired Handling**
   - Given my session has expired
   - When I try to access any protected route or make an API request
   - Then I am redirected to `/login`
   - And I see a message: "Your session has expired. Please log in again."

5. **AC5: Session Data Access**
   - Given I am authenticated
   - When I access any dashboard page
   - Then I can access my session data (name, email, image) via useSession hook
   - And the session is available on both client and server components

6. **AC6: Multiple Tabs Sync**
   - Given I am logged in with multiple browser tabs open
   - When my session expires or I log out in one tab
   - Then all other tabs detect the session change
   - And they redirect to login or refresh accordingly

7. **AC7: Session Storage Security**
   - Given I am authenticated
   - When I inspect browser storage
   - Then no sensitive tokens are stored in localStorage
   - And session cookies are httpOnly and secure (in production)

## Tasks / Subtasks

- [x] **Task 1: NextAuth Session Configuration** (AC: #1, #2)
  - [x] 1.1 Configure JWT maxAge to 24 hours in auth.ts
  - [x] 1.2 Implement jwt callback to track token creation time
  - [x] 1.3 Implement token refresh logic in jwt callback
  - [x] 1.4 Add expiresAt field to token for expiry tracking
  - [x] 1.5 Configure session callback to expose expiry to client

- [x] **Task 2: Session Provider Enhancement** (AC: #5, #6)
  - [x] 2.1 Configure SessionProvider with refetchInterval
  - [x] 2.2 Set refetchOnWindowFocus to true for tab sync
  - [x] 2.3 Set refetchWhenOffline to false
  - [x] 2.4 Configure appropriate refetch interval (e.g., 5 minutes)

- [x] **Task 3: Session Expiry Warning Component** (AC: #3)
  - [x] 3.1 Install shadcn/ui toast component (`npx shadcn-ui@latest add toast`)
  - [x] 3.2 Create `src/components/shared/session-warning.tsx`
  - [x] 3.3 Implement useSession hook to track remaining time
  - [x] 3.4 Show toast when session has < 5 minutes remaining
  - [x] 3.5 Add "Extend Session" button that triggers page refresh to renew session
  - [x] 3.6 Style as non-intrusive toast (bottom-right corner)

- [x] **Task 4: Session Expired Handler** (AC: #4)
  - [x] 4.1 Create error page or modal for expired session
  - [x] 4.2 Update API client to handle 401 responses
  - [x] 4.3 Redirect to login with `?error=SessionExpired` param
  - [x] 4.4 Display session expired message on login page

- [x] **Task 5: API Client Session Integration** (AC: #2, #4)
  - [x] 5.1 Update `src/lib/api.ts` to check session before requests
  - [x] 5.2 Implement automatic token refresh on 401 response
  - [x] 5.3 Add session expiry check before API calls
  - [x] 5.4 Handle network errors gracefully

- [x] **Task 6: Dashboard Layout Session Integration** (AC: #5)
  - [x] 6.1 Update dashboard layout to use useSession
  - [x] 6.2 Display user info (name, email, avatar) in header
  - [x] 6.3 Show loading state while session is being fetched
  - [x] 6.4 Integrate session warning component

- [x] **Task 7: Security Configuration** (AC: #7)
  - [x] 7.1 Verify cookies are httpOnly (NextAuth default)
  - [x] 7.2 Configure secure cookies for production
  - [x] 7.3 Set sameSite cookie attribute appropriately
  - [x] 7.4 Verify no tokens in localStorage

- [x] **Task 8: Testing** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 8.1 Test session creation with correct maxAge
  - [x] 8.2 Test session refresh within refresh window
  - [x] 8.3 Test expiry warning appears at correct time
  - [x] 8.4 Test expired session redirects to login
  - [x] 8.5 Test session data accessible in components
  - [x] 8.6 Test multi-tab session sync
  - [x] 8.7 Test no sensitive data in localStorage

## Dev Notes

### Architecture Compliance

This story builds on 1-1-google-oauth-login and enhances session management:
- **Session Strategy**: JWT (stateless, no server-side session store needed)
- **Token Storage**: httpOnly cookies managed by NextAuth
- **Refresh Pattern**: Silent refresh via SessionProvider refetch

### Critical Implementation Details

**Enhanced JWT Callback:**
```typescript
// src/lib/auth.ts
callbacks: {
  jwt: async ({ token, account }) => {
    // Initial sign in
    if (account) {
      token.accessToken = account.access_token;
      token.refreshToken = account.refresh_token;
      token.expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      token.issuedAt = Math.floor(Date.now() / 1000);
    }

    // Return token if not expired
    const now = Math.floor(Date.now() / 1000);
    if (token.expiresAt && now < token.expiresAt) {
      return token;
    }

    // Token expired - could implement refresh here if needed
    return token;
  },

  session: async ({ session, token }) => {
    session.accessToken = token.accessToken as string;
    session.expiresAt = token.expiresAt as number;
    session.user.id = token.sub as string;
    return session;
  },
}
```

**SessionProvider Configuration:**
```typescript
// src/app/providers.tsx
<SessionProvider
  refetchInterval={5 * 60}  // Check session every 5 minutes
  refetchOnWindowFocus={true}  // Sync across tabs
  refetchWhenOffline={false}
>
  {children}
</SessionProvider>
```

**Session Warning Component Pattern:**
```typescript
// src/components/shared/session-warning.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

export function SessionWarning() {
  const { data: session } = useSession();
  const [warningShown, setWarningShown] = useState(false);

  useEffect(() => {
    if (!session?.expiresAt || warningShown) return;

    const checkExpiry = () => {
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = session.expiresAt - now;
      const fiveMinutes = 5 * 60;

      if (timeLeft > 0 && timeLeft <= fiveMinutes && !warningShown) {
        setWarningShown(true);
        toast({
          title: 'Session Expiring Soon',
          description: `Your session will expire in ${Math.ceil(timeLeft / 60)} minutes.`,
          action: (
            <Button onClick={() => window.location.reload()}>
              Extend Session
            </Button>
          ),
        });
      }
    };

    const interval = setInterval(checkExpiry, 30000); // Check every 30s
    checkExpiry(); // Check immediately

    return () => clearInterval(interval);
  }, [session?.expiresAt, warningShown]);

  return null; // This component only shows toasts
}
```

### Type Extensions

```typescript
// src/types/next-auth.d.ts (extend from 1-1)
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    expiresAt?: number;  // Add this
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    issuedAt?: number;  // Add this
  }
}
```

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/auth.ts` | Modify | Enhance jwt/session callbacks |
| `src/app/providers.tsx` | Modify | Configure SessionProvider options |
| `src/components/shared/session-warning.tsx` | Create | Expiry warning toast |
| `src/types/next-auth.d.ts` | Modify | Add expiresAt, issuedAt |
| `src/lib/api.ts` | Modify | Add 401 handling |
| `src/app/(dashboard)/layout.tsx` | Modify | Add SessionWarning |
| `src/app/(auth)/login/page.tsx` | Modify | Handle SessionExpired param |

### Session Timeline

```
Login                                                   Logout/Expire
  │                                                           │
  ├──────────────────────[24 hours]───────────────────────────┤
  │                                                           │
  │  Active Session (18 hours)               │ Refresh Window │
  │◄────────────────────────────────────────►│◄───6 hours────►│
  │                                                           │
  │                                          │Warning│        │
  │                                          │◄─5min─►│       │
  │                                                           │
  │  Note: Session auto-refreshes if active during last 6 hrs │
```

### Security Checklist

- [ ] JWT stored in httpOnly cookie (NextAuth default)
- [ ] Secure flag set in production
- [ ] SameSite=Lax for CSRF protection
- [ ] No tokens in localStorage or sessionStorage
- [ ] Session expiry enforced server-side

### Dependencies

- Story 1-1-google-oauth-login must be complete
- shadcn/ui toast component (for warnings)

### References

- [Source: docs/admin-dashboard/architecture.md#7-security-architecture] - Session security
- [Source: docs/admin-dashboard/technical-design.md#7-authentication-implementation] - NextAuth patterns
- [Source: docs/admin-dashboard/epics.md#F-01.3] - Session Management feature

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

No critical bugs encountered during implementation.

### Completion Notes List

1. **Task 1 - NextAuth Session Configuration**: Enhanced jwt callback with token creation time tracking (issuedAt), expiry tracking (expiresAt), and automatic token refresh within last 6 hours of session. Extended Session and JWT types.

2. **Task 2 - SessionProvider Enhancement**: Configured refetchInterval (5 minutes), refetchOnWindowFocus (true), refetchWhenOffline (false) for automatic session sync across tabs.

3. **Task 3 - Session Expiry Warning**: Installed shadcn/ui toast and button components. Created SessionWarning component that shows toast notification when session has <5 minutes remaining with "Extend Session" button.

4. **Task 4 - Session Expired Handler**: Added SessionExpired error handling to login page. Created API client (src/lib/api.ts) with fetchWithAuth that redirects to login on 401 responses.

5. **Task 5 - API Client**: Created full API client with fetchWithAuth, apiGet, apiPost, apiPut, apiDelete helpers. Handles 401 with SessionExpiredError.

6. **Task 6 - Dashboard Layout**: Already integrated from Story 1.1. Added SessionWarning component to dashboard layout.

7. **Task 7 - Security**: Verified NextAuth defaults for httpOnly cookies, secure (in production), sameSite=lax. Added security verification tests.

8. **Task 8 - Testing**: 76 tests passing across 7 test files covering all acceptance criteria.

### File List

**New Files:**
- `src/lib/api.ts` - API client with session handling
- `src/lib/utils.ts` - shadcn/ui utilities
- `src/components/shared/session-warning.tsx` - Session expiry warning component
- `src/components/ui/toast.tsx` - shadcn/ui toast component
- `src/components/ui/toaster.tsx` - shadcn/ui toaster component
- `src/components/ui/button.tsx` - shadcn/ui button component
- `src/hooks/use-toast.ts` - shadcn/ui toast hook
- `src/__tests__/session.test.ts` - Session tests (12 tests)
- `src/__tests__/providers.test.tsx` - Providers tests (4 tests)
- `src/__tests__/session-warning.test.tsx` - Session warning tests (9 tests)
- `src/__tests__/api.test.ts` - API client tests (10 tests)
- `components.json` - shadcn/ui configuration

**Modified Files:**
- `src/lib/auth.ts` - Added issuedAt, expiresAt tracking and refresh logic
- `src/types/next-auth.d.ts` - Extended Session and JWT types
- `src/app/providers.tsx` - Configured SessionProvider options
- `src/app/layout.tsx` - Added Toaster component
- `src/app/(dashboard)/layout.tsx` - Added SessionWarning component
- `src/app/(auth)/login/page.tsx` - Added SessionExpired error handling
- `src/__tests__/auth.test.ts` - Added security tests (16 tests total)
- `src/__tests__/login.test.tsx` - Added SessionExpired test (12 tests total)
- `tailwind.config.ts` - Updated by shadcn/ui
- `src/app/globals.css` - Updated by shadcn/ui
- `package.json` - Added shadcn dependencies
- `package-lock.json` - Updated dependencies

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-01-12 | Story implementation complete - All 8 tasks done, 76 tests passing | Claude Opus 4.5 |
| 2025-01-13 | Code Review fixes - 8 issues fixed (2 HIGH, 4 MEDIUM, 2 LOW), 89 tests passing | Claude Opus 4.5 |

