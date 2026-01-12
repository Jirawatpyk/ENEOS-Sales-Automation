# Story 1.4: Logout

Status: ready-for-dev

## Story

As an **ENEOS administrator**,
I want **to securely log out of the Admin Dashboard**,
so that **I can end my session and prevent unauthorized access when I'm done working**.

## Acceptance Criteria

1. **AC1: Logout Button Visibility**
   - Given I am authenticated
   - When I view any dashboard page
   - Then I see a logout option in the user menu (top-right corner)
   - And the logout option is clearly labeled "Sign Out" or "Logout"

2. **AC2: Logout Action**
   - Given I click the "Sign Out" menu item
   - When the logout action is triggered (no confirmation dialog needed)
   - Then I see a loading state ("Signing out..." with spinner)
   - And the logout process completes within 2 seconds

3. **AC3: Session Termination**
   - Given the logout is processing
   - When the logout is processed
   - Then my session is completely terminated (JWT invalidated)
   - And all session cookies are cleared
   - And I am redirected to `/login`

4. **AC4: Post-Logout Access Prevention**
   - Given I have logged out
   - When I try to access any protected route directly (e.g., `/dashboard`)
   - Then I am redirected to `/login`
   - And I cannot access any protected data without re-authenticating

5. **AC5: Multi-Tab Logout Sync**
   - Given I am logged in with multiple browser tabs open
   - When I log out in one tab
   - Then all other tabs detect the logout
   - And they redirect to `/login` or show a "Session ended" message

6. **AC6: Logout Success Message**
   - Given I have successfully logged out
   - When I arrive at the login page
   - Then I see a message: "You have been signed out successfully."
   - And the message disappears after 5 seconds or on user interaction

7. **AC7: Keyboard Accessibility**
   - Given I am using keyboard navigation
   - When I navigate to the logout option
   - Then I can activate logout using Enter or Space key
   - And focus states are clearly visible

## Tasks / Subtasks

- [ ] **Task 1: User Menu Component** (AC: #1, #7)
  - [ ] 1.1 Create `src/components/layout/user-nav.tsx`
  - [ ] 1.2 Display user avatar (from session.user.image) or initials fallback
  - [ ] 1.3 Display user name and email in dropdown
  - [ ] 1.4 Add "Sign Out" menu item with icon (LogOut from lucide-react)
  - [ ] 1.5 Implement keyboard navigation (Enter/Space to trigger)
  - [ ] 1.6 Add proper ARIA labels for accessibility

- [ ] **Task 2: Logout Handler** (AC: #2, #3)
  - [ ] 2.1 Create logout handler function using next-auth `signOut()`
  - [ ] 2.2 Configure signOut with `{ callbackUrl: '/login?signedOut=true' }`
  - [ ] 2.3 Add loading state with useState (isLoading)
  - [ ] 2.4 Show "Signing out..." text with Loader2 spinner icon
  - [ ] 2.5 Disable menu item during logout
  - [ ] 2.6 Handle logout errors gracefully

- [ ] **Task 3: Header Integration** (AC: #1)
  - [ ] 3.1 Update `src/components/layout/header.tsx` to include UserNav
  - [ ] 3.2 Position user menu in top-right corner
  - [ ] 3.3 Ensure responsive behavior (mobile-friendly)

- [ ] **Task 4: Login Page Enhancement** (AC: #6)
  - [ ] 4.1 Update login page to check for `?signedOut=true` param
  - [ ] 4.2 Display success toast: "You have been signed out successfully."
  - [ ] 4.3 Auto-dismiss toast after 5 seconds
  - [ ] 4.4 Clear the URL param after displaying message

- [ ] **Task 5: Multi-Tab Sync** (AC: #5)
  - [ ] 5.1 Leverage SessionProvider's refetchOnWindowFocus (from Story 1-3)
  - [ ] 5.2 Add event listener for storage/session changes
  - [ ] 5.3 Redirect other tabs when session becomes null
  - [ ] 5.4 Optionally show "Session ended" toast in other tabs

- [ ] **Task 6: Protected Route Verification** (AC: #4)
  - [ ] 6.1 Verify middleware redirects after logout
  - [ ] 6.2 Test direct URL access to protected routes post-logout
  - [ ] 6.3 Ensure no cached data is accessible

- [ ] **Task 7: Styling & UX** (AC: #1, #2, #7)
  - [ ] 7.1 Style dropdown menu using shadcn/ui DropdownMenu
  - [ ] 7.2 Add hover and focus states
  - [ ] 7.3 Add logout icon animation (optional)
  - [ ] 7.4 Ensure consistent styling with design system

- [ ] **Task 8: Testing** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] 8.1 Test logout button is visible when authenticated
  - [ ] 8.2 Test loading state shows "Signing out..." with spinner
  - [ ] 8.3 Test logout clears session and redirects
  - [ ] 8.4 Test protected routes inaccessible after logout
  - [ ] 8.5 Test multi-tab logout sync
  - [ ] 8.6 Test success message on login page
  - [ ] 8.7 Test keyboard accessibility

## Dev Notes

### Architecture Compliance

This story completes the authentication flow started in Story 1-1:
- **Logout Method**: NextAuth.js `signOut()` function
- **Session Clearing**: Automatic cookie clearing by NextAuth
- **Redirect**: To login page with success indicator

### Critical Implementation Details

**User Navigation Component:**
```typescript
// src/components/layout/user-nav.tsx
'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function UserNav() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  if (!session?.user) return null;

  const initials = session.user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({ callbackUrl: '/login?signedOut=true' });
    } catch (error) {
      setIsLoading(false);
      console.error('Sign out error:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isLoading}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Login Page Success Message:**
```typescript
// src/app/(auth)/login/page.tsx (partial)
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Handle signed out message
    if (searchParams.get('signedOut') === 'true') {
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.',
        duration: 5000,
      });
      // Clean URL
      router.replace('/login', { scroll: false });
    }

    // Handle session expired message (from Story 1-3)
    if (searchParams.get('error') === 'SessionExpired') {
      toast({
        title: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
        variant: 'destructive',
        duration: 5000,
      });
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router]);

  // ... rest of login page
}
```

**Multi-Tab Sync Enhancement:**
```typescript
// Add to providers.tsx or a dedicated hook
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    // NextAuth uses cookies, but we can use localStorage for signaling
    if (e.key === 'nextauth.message') {
      const message = JSON.parse(e.newValue || '{}');
      if (message.event === 'signout') {
        window.location.href = '/login?signedOut=true';
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);

// In signOut handler, broadcast to other tabs
const handleSignOut = () => {
  // Signal other tabs
  localStorage.setItem('nextauth.message', JSON.stringify({
    event: 'signout',
    timestamp: Date.now()
  }));
  localStorage.removeItem('nextauth.message');

  // Then sign out
  signOut({ callbackUrl: '/login?signedOut=true' });
};
```

### File Structure

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/user-nav.tsx` | Create | User dropdown with logout |
| `src/components/layout/header.tsx` | Modify | Add UserNav component |
| `src/app/(auth)/login/page.tsx` | Modify | Handle signedOut param |
| `src/app/providers.tsx` | Modify | Add multi-tab sync (optional) |

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
```

### UX Flow

```
Dashboard (Authenticated)
         │
         │ Click Avatar
         ▼
    ┌─────────────┐
    │  User Menu  │
    │ ──────────  │
    │  John Doe   │
    │  j@eneos... │
    │ ──────────  │
    │  🚪 Sign Out│ ◄── Click
    └─────────────┘
         │
         │ signOut()
         ▼
    ┌─────────────┐
    │   Signing   │
    │    out...   │  (brief loading)
    └─────────────┘
         │
         │ Redirect
         ▼
    ┌─────────────┐
    │  Login Page │
    │ ──────────  │
    │  ✓ Signed   │
    │    out!     │  (toast)
    └─────────────┘
```

### Security Considerations

1. **Cookie Clearing**: NextAuth automatically clears session cookies on signOut
2. **No Client-Side Token Storage**: JWT is in httpOnly cookie, cannot be accessed by JS
3. **Redirect Safety**: callbackUrl is validated by NextAuth to prevent open redirects
4. **CSRF Protection**: signOut uses POST under the hood with CSRF token

### Dependencies

- Story 1-1-google-oauth-login must be complete (authentication foundation)
- Story 1-3-session-management recommended (for multi-tab sync)
- shadcn/ui dropdown-menu and avatar components
- lucide-react (for LogOut, Loader2 icons) - typically included with Next.js/shadcn setup

### References

- [Source: docs/admin-dashboard/architecture.md#4-component-architecture] - UserNav in header
- [Source: docs/admin-dashboard/technical-design.md#7-authentication-implementation] - NextAuth patterns
- [Source: docs/admin-dashboard/epics.md#F-01.4] - Logout feature
- [Source: docs/admin-dashboard/ux-ui.md] - User menu design

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

