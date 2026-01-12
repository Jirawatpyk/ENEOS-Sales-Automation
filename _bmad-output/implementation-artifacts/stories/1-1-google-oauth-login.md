# Story 1.1: Google OAuth Login

Status: done

## Story

As an **ENEOS administrator**,
I want **to log in to the Admin Dashboard using my Google account**,
so that **I can securely access the sales analytics system with my existing corporate credentials**.

## Acceptance Criteria

1. **AC1: Login Page Display**
   - Given I am not authenticated
   - When I navigate to `/login` or any protected route
   - Then I see a centered login card with ENEOS logo, "Sales Dashboard" title, and "Sign in with Google" button
   - And I see a message indicating only @eneos.co.th accounts are allowed

2. **AC2: Google OAuth Flow**
   - Given I am on the login page
   - When I click "Sign in with Google"
   - Then I am redirected to Google's OAuth consent screen
   - And Google requests authorization for my email and profile

3. **AC3: Domain Restriction**
   - Given I complete Google OAuth with an email NOT ending in @eneos.co.th
   - When the callback is processed
   - Then I am redirected back to the login page with an error message: "Access denied. Only @eneos.co.th accounts are allowed."
   - And I am NOT authenticated

4. **AC4: Successful Authentication**
   - Given I complete Google OAuth with an @eneos.co.th email
   - When the callback is processed
   - Then I am redirected to `/dashboard`
   - And my session is created with a 24-hour expiry
   - And my name, email, and profile picture are available in the session

5. **AC5: Protected Routes**
   - Given I am NOT authenticated
   - When I try to access any route under `/(dashboard)/`
   - Then I am redirected to `/login`

6. **AC6: Session Persistence**
   - Given I am authenticated
   - When I close and reopen the browser (within 24 hours)
   - Then my session remains active
   - And I can access protected routes without re-authenticating

7. **AC7: Loading State**
   - Given I am on the login page
   - When I click "Sign in with Google"
   - Then I see a loading indicator on the button
   - And the button is disabled to prevent double-clicks

## Tasks / Subtasks

- [x] **Task 1: Project Setup** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 1.1 Initialize Next.js 14 project with TypeScript and App Router
  - [x] 1.2 Install core dependencies: next-auth, @auth/core, tailwindcss
  - [x] 1.3 Configure Tailwind CSS with ENEOS brand colors
  - [x] 1.4 Create `src/styles/globals.css` with Tailwind directives
  - [x] 1.5 Set up TypeScript strict mode configuration
  - [x] 1.6 Create environment variables template (.env.example)

- [x] **Task 2: NextAuth.js Configuration** (AC: #2, #3, #4, #6)
  - [x] 2.1 Create `src/lib/auth.ts` with NextAuth options
  - [x] 2.2 Configure Google OAuth provider with domain restriction (`hd: 'eneos.co.th'`)
  - [x] 2.3 Implement `signIn` callback to verify @eneos.co.th domain
  - [x] 2.4 Implement `jwt` callback to persist access token
  - [x] 2.5 Implement `session` callback to expose user data to client
  - [x] 2.6 Configure session strategy as JWT with 24-hour maxAge
  - [x] 2.7 Create `src/app/api/auth/[...nextauth]/route.ts` API route

- [x] **Task 3: TypeScript Type Extensions** (AC: #4)
  - [x] 3.1 Create `src/types/next-auth.d.ts` to extend Session interface
  - [x] 3.2 Add accessToken and user.id to Session type
  - [x] 3.3 Add JWT token type extensions

- [x] **Task 4: Auth Middleware** (AC: #5)
  - [x] 4.1 Create `src/middleware.ts` using next-auth/middleware
  - [x] 4.2 Configure matcher to protect all routes except `/login` and `/api/auth/*`
  - [x] 4.3 Set up redirect to `/login` for unauthenticated requests

- [x] **Task 5: Login Page UI** (AC: #1, #3, #7)
  - [x] 5.1 Create `src/app/(auth)/login/page.tsx`
  - [x] 5.2 Create `src/app/(auth)/layout.tsx` (minimal auth layout)
  - [x] 5.3 Implement centered card design with Tailwind CSS
  - [x] 5.4 Add ENEOS logo (placeholder or actual asset)
  - [x] 5.5 Add "Sales Dashboard" title
  - [x] 5.6 Implement "Sign in with Google" button with Google icon
  - [x] 5.7 Add domain restriction message: "Only @eneos.co.th accounts"
  - [x] 5.8 Add footer with dynamic year: "(c) {currentYear} ENEOS Thailand"
  - [x] 5.9 Handle error states (display error message from URL params)
  - [x] 5.10 Implement loading state with spinner and disabled button during OAuth redirect

- [x] **Task 6: Providers Setup** (AC: #4, #6)
  - [x] 6.1 Create `src/app/providers.tsx` with SessionProvider
  - [x] 6.2 Wrap root layout with Providers component
  - [x] 6.3 Create `src/app/layout.tsx` root layout

- [x] **Task 7: Dashboard Route Placeholder** (AC: #4, #5)
  - [x] 7.1 Create `src/app/(dashboard)/layout.tsx` (protected layout)
  - [x] 7.2 Create `src/app/(dashboard)/page.tsx` (redirects to dashboard or displays welcome)
  - [x] 7.3 Verify session access in dashboard layout

- [x] **Task 8: Root Route Redirect** (AC: #4)
  - [x] 8.1 Create `src/app/page.tsx` that redirects to `/dashboard`
  - [x] 8.2 Implement redirect logic (middleware handles auth)

- [x] **Task 9: Testing** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 9.1 Test login page renders correctly
  - [x] 9.2 Test Google OAuth button triggers signIn
  - [x] 9.3 Test domain restriction rejects non-ENEOS emails with correct error message
  - [x] 9.4 Test successful login redirects to dashboard
  - [x] 9.5 Test middleware protects routes
  - [x] 9.6 Test session persistence
  - [x] 9.7 Test loading state shows spinner and disables button

## Dev Notes

### Architecture Compliance

This story implements the foundation for the Admin Dashboard frontend using:
- **Framework**: Next.js 14 with App Router (NOT Pages Router)
- **Auth**: NextAuth.js v4 with Google OAuth provider
- **Styling**: Tailwind CSS with shadcn/ui pattern
- **State**: Session managed by NextAuth.js JWT strategy

### Critical Implementation Details

**NextAuth Configuration Pattern:**
```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: 'eneos.co.th', // CRITICAL: Domain restriction at OAuth level
        },
      },
    }),
  ],
  callbacks: {
    signIn: async ({ user }) => {
      // DOUBLE CHECK: Verify domain even if hd param is bypassed
      if (!user.email?.endsWith('@eneos.co.th')) {
        return false;
      }
      return true;
    },
    // ... jwt and session callbacks
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect errors to login page
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
};
```

**Middleware Pattern:**
```typescript
// src/middleware.ts
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

### File Structure to Create

```
eneos-admin-dashboard/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx        # Login page
│   │   │   └── layout.tsx          # Auth layout (minimal)
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx            # Dashboard placeholder
│   │   │   └── layout.tsx          # Dashboard layout
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts    # NextAuth API route
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Root redirect
│   │   └── providers.tsx           # Session provider wrapper
│   ├── lib/
│   │   └── auth.ts                 # NextAuth configuration
│   ├── styles/
│   │   └── globals.css             # Global styles + Tailwind directives
│   ├── types/
│   │   └── next-auth.d.ts          # Type extensions
│   └── middleware.ts               # Auth middleware
├── .env.example
├── .env.local                      # Local env (not committed)
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

### Environment Variables Required

```env
# .env.local
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Google Cloud Console Setup

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/callback/google`
   - Production: `https://admin.eneos-sales.com/api/auth/callback/google`
4. Copy Client ID and Client Secret to env variables

### UI Design Requirements

From UX document:
- **Layout**: Centered card on full-height page
- **Logo**: ENEOS logo at top of card
- **Title**: "Sales Dashboard" below logo
- **Button**: "Sign in with Google" with Google icon (blue theme)
- **Loading State**: Spinner inside button + disabled state during OAuth redirect
- **Message**: "Only @eneos.co.th accounts" in muted text
- **Error Message**: "Access denied. Only @eneos.co.th accounts are allowed." (red text)
- **Footer**: "(c) {currentYear} ENEOS Thailand" at bottom (dynamic year)
- **Colors**: ENEOS Red (#E60012) for accents, neutral background

### Testing Strategy

**Manual Testing:**
1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3001`
3. Verify redirect to login page
4. Click "Sign in with Google"
5. Test with @eneos.co.th account - should succeed
6. Test with non-ENEOS account - should fail with error

**Unit Tests (if configured):**
- Mock NextAuth session
- Test middleware behavior
- Test login page rendering

### Security Considerations

1. **Double Domain Check**: Verify @eneos.co.th both in OAuth `hd` param AND in `signIn` callback
2. **HTTPS Only**: In production, NEXTAUTH_URL must use HTTPS
3. **Secret Management**: NEXTAUTH_SECRET must be strong (32+ chars) and never exposed
4. **Session Security**: JWT strategy with 24-hour expiry balances security and UX

### Project Structure Notes

- **Route Groups**: Using `(auth)` and `(dashboard)` for layout separation
- **Path Aliases**: Using `@/*` for imports from `src/`
- **Client Components**: Use `'use client'` directive for interactive components

### References

- [Source: docs/admin-dashboard/architecture.md#7-authentication-implementation] - Security architecture
- [Source: docs/admin-dashboard/technical-design.md#7-authentication-implementation] - NextAuth config patterns
- [Source: docs/admin-dashboard/ux-ui.md#4.1-login-page] - Login page wireframe
- [Source: docs/admin-dashboard/epics.md#epic-01] - Authentication requirements

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

No debug issues encountered.

### Completion Notes List

1. **Project Initialization**: Created new Next.js 14 project at `../eneos-admin-dashboard/` with TypeScript, Tailwind CSS, App Router, and ESLint
2. **NextAuth.js v4 Configuration**: Implemented complete auth flow with Google OAuth, domain restriction (`@eneos.co.th`), JWT session strategy (24h expiry), and custom callbacks
3. **Type Extensions**: Extended NextAuth Session and JWT types to include `accessToken` and `user.id`
4. **Auth Middleware**: Protected all routes except `/login`, `/api/auth/*`, and static assets
5. **Login Page UI**: Implemented centered card design with ENEOS branding, Google OAuth button, loading state, error handling, and dynamic footer
6. **Session Provider**: Wrapped app with NextAuth SessionProvider for client-side session access
7. **Dashboard Layout**: Created protected dashboard layout with header, user profile display, and server-side session verification
8. **Testing**: 36 tests passing covering login UI, auth callbacks, domain restriction, and middleware behavior
9. **Build Verification**: Production build successful with optimized output
10. **Code Review Fixes**: Added env validation, logout button, improved error handling, enhanced middleware tests

### File List

**New Project: `../eneos-admin-dashboard/`**

- `package.json` - Project configuration with dependencies
- `tsconfig.json` - TypeScript configuration (strict mode enabled)
- `tailwind.config.ts` - Tailwind CSS with ENEOS brand colors
- `next.config.mjs` - Next.js config with Google image domains
- `vitest.config.ts` - Vitest testing configuration
- `.env.example` - Environment variables template
- `.gitignore` - Updated with Claude temp files pattern
- `src/lib/auth.ts` - NextAuth configuration with Google OAuth and env validation
- `src/middleware.ts` - Auth middleware for route protection
- `src/types/next-auth.d.ts` - TypeScript type extensions
- `src/components/user-menu.tsx` - Client component with logout functionality
- `src/app/layout.tsx` - Root layout with Providers
- `src/app/page.tsx` - Root redirect to /dashboard
- `src/app/providers.tsx` - SessionProvider wrapper
- `src/app/globals.css` - Global styles (Tailwind)
- `src/app/(auth)/layout.tsx` - Auth layout (minimal)
- `src/app/(auth)/login/page.tsx` - Login page with Google OAuth and error logging
- `src/app/(dashboard)/layout.tsx` - Protected dashboard layout with UserMenu
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard placeholder
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route
- `src/__tests__/setup.ts` - Vitest test setup
- `src/__tests__/login.test.tsx` - Login page tests (11 tests)
- `src/__tests__/auth.test.ts` - Auth configuration tests (12 tests)
- `src/__tests__/middleware.test.ts` - Middleware tests (13 tests)

## Senior Developer Review (AI)

**Review Date:** 2026-01-12
**Outcome:** Approved (with fixes applied)
**Total Issues Found:** 9 (1 High, 5 Medium, 3 Low)
**Issues Fixed:** 8/9

### Action Items

- [x] [HIGH] Added env validation for NEXTAUTH_SECRET and OAuth credentials at runtime
- [x] [MEDIUM] Added logout button with UserMenu client component
- [x] [MEDIUM] Added error logging to catch block in login page
- [x] [MEDIUM] Improved middleware test to use actual regex validation
- [x] [MEDIUM] Added defense-in-depth comment explaining double auth check
- [x] [MEDIUM] Added callback URL verification test
- [x] [LOW] Added error logging in sign out handler
- [x] [LOW] Added Claude temp files pattern to .gitignore
- [ ] [LOW] ENEOS logo is placeholder (acceptable per story spec)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Initial implementation of Google OAuth Login story - 31 tests passing, build verified | Dev Agent (Claude Opus 4.5) |
| 2026-01-12 | Code review fixes - env validation, logout button, improved tests - 36 tests passing | Code Review (Claude Opus 4.5) |
