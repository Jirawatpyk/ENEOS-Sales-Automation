# Story 1.5: Role-based Access Control

Status: ready-for-dev

## Story

As an **ENEOS system administrator**,
I want **to assign different access levels (Admin/Viewer) to dashboard users**,
so that **I can control who can view, export, or manage sensitive sales data**.

## Acceptance Criteria

1. **AC1: Role Definition**
   - Given the system has two roles defined
   - When a user is assigned a role
   - Then they have either "admin" or "viewer" role
   - And the default role for new users is "viewer"

2. **AC2: Role Storage**
   - Given a user logs in with @eneos.co.th email
   - When their session is created
   - Then their role is fetched from the roles configuration
   - And the role is included in the session object

3. **AC3: Admin Access**
   - Given I am logged in with "admin" role
   - When I access the dashboard
   - Then I can view all dashboard pages
   - And I can export data (Excel, CSV, PDF)
   - And I can access settings/configuration pages
   - And I see the "Export" button on tables

4. **AC4: Viewer Access**
   - Given I am logged in with "viewer" role
   - When I access the dashboard
   - Then I can view all dashboard pages (read-only)
   - And I cannot see export buttons
   - And I cannot access settings/admin pages
   - And I see a tooltip "Contact admin for export access" when hovering disabled areas

5. **AC5: Role Display**
   - Given I am authenticated
   - When I view the user menu
   - Then I see my role displayed (e.g., "Admin" or "Viewer" badge)

6. **AC6: Unauthorized Access Handling**
   - Given I am a "viewer" trying to access admin-only routes
   - When I navigate directly to `/settings` or `/admin/*`
   - Then I am redirected to `/dashboard`
   - And I see a toast message: "You don't have permission to access this page."

7. **AC7: Role Check in API Calls**
   - Given I am a "viewer" trying to call export API
   - When the API request is made
   - Then the backend returns 403 Forbidden
   - And the frontend shows an appropriate error message

## Tasks / Subtasks

- [ ] **Task 1: Role Configuration** (AC: #1, #2)
  - [ ] 1.1 Create `src/config/roles.ts` with role definitions
  - [ ] 1.2 Define ROLES constant: `{ ADMIN: 'admin', VIEWER: 'viewer' }`
  - [ ] 1.3 Create role-to-email mapping (JSON or environment variable)
  - [ ] 1.4 Default role assignment logic for unmapped users

- [ ] **Task 2: Session Enhancement** (AC: #2)
  - [ ] 2.1 Update `src/lib/auth.ts` jwt callback to include role
  - [ ] 2.2 Update session callback to expose role to client
  - [ ] 2.3 Extend `next-auth.d.ts` types to include role
  - [ ] 2.4 Fetch role based on user email during sign-in

- [ ] **Task 3: Permission Utilities** (AC: #3, #4)
  - [ ] 3.1 Create `src/lib/permissions.ts` with permission checks
  - [ ] 3.2 Implement `canExport(role)` function
  - [ ] 3.3 Implement `canAccessSettings(role)` function
  - [ ] 3.4 Implement `isAdmin(role)` function
  - [ ] 3.5 Create `usePermissions()` hook for components

- [ ] **Task 4: Protected Routes Enhancement** (AC: #6)
  - [ ] 4.1 Update middleware to check role for admin routes
  - [ ] 4.2 Create `/settings` route group with role protection
  - [ ] 4.3 Redirect viewers to dashboard with toast message
  - [ ] 4.4 Add role check to any future admin-only routes

- [ ] **Task 5: UI Conditional Rendering** (AC: #3, #4, #5)
  - [ ] 5.1 Create `<RoleGate>` component for conditional rendering
  - [ ] 5.2 Hide export buttons for viewers
  - [ ] 5.3 Hide settings navigation for viewers
  - [ ] 5.4 Add tooltip for disabled features
  - [ ] 5.5 Display role badge in user menu

- [ ] **Task 6: Backend Role Verification** (AC: #7)
  - [ ] 6.1 Update backend admin-auth middleware to check role
  - [ ] 6.2 Add role to JWT token validation
  - [ ] 6.3 Return 403 for unauthorized export attempts
  - [ ] 6.4 Log unauthorized access attempts

- [ ] **Task 7: Error Handling** (AC: #6, #7)
  - [ ] 7.1 Create permission denied toast component
  - [ ] 7.2 Handle 403 responses in API client
  - [ ] 7.3 Show user-friendly error messages
  - [ ] 7.4 Provide guidance on how to request access

- [ ] **Task 8: Testing** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] 8.1 Test admin can access all features
  - [ ] 8.2 Test viewer cannot export
  - [ ] 8.3 Test viewer cannot access settings
  - [ ] 8.4 Test role is displayed correctly
  - [ ] 8.5 Test direct URL access is blocked for viewers
  - [ ] 8.6 Test API returns 403 for unauthorized requests
  - [ ] 8.7 Test default role assignment

## Dev Notes

### Architecture Compliance

This story implements basic RBAC (Role-Based Access Control):
- **Roles**: Simple two-role system (admin/viewer) stored in configuration
- **Storage**: Role mapping via config file or environment variable (no database needed)
- **Enforcement**: Client-side (UI hiding) + Server-side (API protection)

### Role Configuration Options

**Option A: Environment Variable (Recommended for small team)**
```env
# .env.local
ADMIN_EMAILS=john@eneos.co.th,jane@eneos.co.th,manager@eneos.co.th
```

**Option B: Config File**
```typescript
// src/config/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Admin email list - could also be fetched from Google Sheets
const ADMIN_EMAILS = [
  'john@eneos.co.th',
  'jane@eneos.co.th',
  'manager@eneos.co.th',
];

export function getUserRole(email: string): Role {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    return ROLES.ADMIN;
  }
  return ROLES.VIEWER; // Default role
}
```

### Session with Role

```typescript
// src/lib/auth.ts - Enhanced callbacks
callbacks: {
  jwt: async ({ token, user, account }) => {
    if (account && user) {
      token.accessToken = account.access_token;
      token.role = getUserRole(user.email || '');
    }
    return token;
  },
  session: async ({ session, token }) => {
    session.accessToken = token.accessToken as string;
    session.user.id = token.sub as string;
    session.user.role = token.role as Role;
    return session;
  },
}
```

### Type Extensions

```typescript
// src/types/next-auth.d.ts
import { Role } from '@/config/roles';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    expiresAt?: number;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;  // Add role
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    role?: Role;  // Add role
  }
}
```

### Permission Utilities

```typescript
// src/lib/permissions.ts
import { useSession } from 'next-auth/react';
import { Role, ROLES } from '@/config/roles';

export const permissions = {
  canExport: (role: Role) => role === ROLES.ADMIN,
  canAccessSettings: (role: Role) => role === ROLES.ADMIN,
  canManageUsers: (role: Role) => role === ROLES.ADMIN,
  isAdmin: (role: Role) => role === ROLES.ADMIN,
  isViewer: (role: Role) => role === ROLES.VIEWER,
};

// React Hook
export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role || ROLES.VIEWER;

  return {
    role,
    canExport: permissions.canExport(role),
    canAccessSettings: permissions.canAccessSettings(role),
    isAdmin: permissions.isAdmin(role),
    isViewer: permissions.isViewer(role),
  };
}
```

### RoleGate Component

```typescript
// src/components/shared/role-gate.tsx
'use client';

import { useSession } from 'next-auth/react';
import { Role, ROLES } from '@/config/roles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RoleGateProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showTooltip?: boolean;
  tooltipMessage?: string;
}

export function RoleGate({
  allowedRoles,
  children,
  fallback = null,
  showTooltip = false,
  tooltipMessage = 'Contact admin for export access',  // Matches AC4
}: RoleGateProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role || ROLES.VIEWER;

  if (allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  if (showTooltip && fallback) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-not-allowed opacity-50">{fallback}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <>{fallback}</>;
}

// Usage Example:
// <RoleGate allowedRoles={[ROLES.ADMIN]}>
//   <ExportButton />
// </RoleGate>
```

### User Menu with Role Badge

```typescript
// Update user-nav.tsx
<DropdownMenuLabel className="font-normal">
  <div className="flex flex-col space-y-1">
    <div className="flex items-center gap-2">
      <p className="text-sm font-medium leading-none">{session.user.name}</p>
      <Badge variant={session.user.role === 'admin' ? 'default' : 'secondary'}>
        {session.user.role === 'admin' ? 'Admin' : 'Viewer'}
      </Badge>
    </div>
    <p className="text-xs leading-none text-muted-foreground">
      {session.user.email}
    </p>
  </div>
</DropdownMenuLabel>
```

### Middleware Enhancement

```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith('/settings');

    // Check role for admin routes
    if (isAdminRoute && token?.role !== 'admin') {
      return NextResponse.redirect(
        new URL('/dashboard?error=Unauthorized', req.url)
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);
```

### File Structure

| File | Action | Description |
|------|--------|-------------|
| `src/config/roles.ts` | Create | Role definitions and mapping |
| `src/lib/permissions.ts` | Create | Permission check utilities |
| `src/lib/auth.ts` | Modify | Add role to session |
| `src/types/next-auth.d.ts` | Modify | Add role to types |
| `src/middleware.ts` | Modify | Add role-based route protection |
| `src/components/shared/role-gate.tsx` | Create | Conditional rendering component |
| `src/components/layout/user-nav.tsx` | Modify | Add role badge |
| Backend: `admin-auth.ts` | Modify | Add role verification |

### Permission Matrix

| Feature | Admin | Viewer |
|---------|-------|--------|
| View Dashboard | ✅ | ✅ |
| View Leads | ✅ | ✅ |
| View Sales Performance | ✅ | ✅ |
| View Campaigns | ✅ | ✅ |
| Export to Excel/CSV | ✅ | ❌ |
| Export to PDF | ✅ | ❌ |
| Access Settings | ✅ | ❌ |
| Manage Users (future) | ✅ | ❌ |

### Security Considerations

1. **Defense in Depth**: UI hiding + API protection (never trust client-side only)
2. **Default Deny**: New users get "viewer" role by default
3. **Audit Trail**: Log unauthorized access attempts (integrates with Story 1-6)
4. **No Role Escalation**: Users cannot change their own role

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add tooltip
```

### Dependencies

- Story 1-1, 1-3, 1-4 must be complete (auth foundation)
- shadcn/ui Badge component for role display
- shadcn/ui Tooltip component for disabled features

### Future Enhancements (Out of Scope)

- Role management UI (add/remove admins)
- More granular permissions (per-page, per-action)
- Role storage in Google Sheets or database
- Time-based access (temporary admin access)

### References

- [Source: docs/admin-dashboard/architecture.md#7-security-architecture] - Authorization layer
- [Source: docs/admin-dashboard/epics.md#F-01.5] - Role-based Access feature
- [Source: docs/admin-dashboard/technical-design.md] - NextAuth patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

