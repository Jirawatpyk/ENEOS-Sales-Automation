# Story 7.1: User Profile

Status: done

## Story

As an **ENEOS dashboard user** (admin or viewer),
I want **to view my profile information on a dedicated settings page**,
so that **I can confirm my account details and understand my access level**.

## Acceptance Criteria

1. **AC1: Settings Page Access**
   - Given I am logged in with "admin" role
   - When I click on "Settings" in the sidebar navigation
   - Then I see the Settings page with User Profile section
   - And the URL is `/settings`

2. **AC2: Profile Information Display**
   - Given I am on the Settings page
   - When the page loads
   - Then I see my profile information including:
     - Profile picture (from Google OAuth)
     - Full name
     - Email address (@eneos.co.th)
     - Role (Admin/Viewer badge)
   - And the information matches my Google account

3. **AC3: Profile Card Layout**
   - Given I am viewing my profile
   - When I see the Profile Card
   - Then it displays:
     - Centered avatar (64x64px) with fallback initials
     - Name below the avatar
     - Email in muted text
     - Role badge (Admin = blue, Viewer = gray)
   - And the card has consistent padding and styling

4. **AC4: Session Information**
   - Given I am viewing my profile
   - When I see the Session section
   - Then I see:
     - Login provider: "Google"
     - Session status: "Active" (green) or "Expired" (red)
     - Session expiry time (from `session.expires`)
   - And a "Sign Out" button that triggers logout

5. **AC5: Viewer Access Restriction**
   - Given I am logged in with "viewer" role
   - When I try to access `/settings` directly
   - Then I am redirected to `/dashboard`
   - And I see a toast: "You don't have permission to access this page."
   - (This behavior already exists from Story 1-5)

6. **AC6: Responsive Design**
   - Given I am viewing the Settings page
   - When I resize the browser window
   - Then the layout adjusts appropriately:
     - Desktop (lg+): Sidebar visible, content centered
     - Tablet (md): Full width content, hamburger menu
     - Mobile (base): Full width, stacked layout

7. **AC7: Loading State**
   - Given I navigate to the Settings page
   - When the session data is loading
   - Then I see a skeleton loader for the profile card
   - And the page doesn't flash or jump

## Tasks / Subtasks

- [x] **Task 1: Settings Page Layout** (AC: #1, #6)
  - [x] 1.1 Update `src/app/(dashboard)/settings/page.tsx` (currently placeholder)
  - [x] 1.2 Create page layout with header "Settings" and description
  - [x] 1.3 Add responsive container with max-width constraint
  - [x] 1.4 Implement Tailwind responsive classes (grid system)

- [x] **Task 2: Profile Card Component** (AC: #2, #3)
  - [x] 2.1 Create `src/components/settings/profile-card.tsx`
  - [x] 2.2 Display Avatar using shadcn/ui Avatar component with Google profile picture
  - [x] 2.3 Add avatar fallback with user initials (AvatarFallback)
  - [x] 2.4 Display name, email from session
  - [x] 2.5 Display role badge using existing Badge component
  - [x] 2.6 Style with shadcn/ui Card component

- [x] **Task 3: Session Information Card** (AC: #4)
  - [x] 3.1 Create `src/components/settings/session-card.tsx`
  - [x] 3.2 Display login provider (Google)
  - [x] 3.3 Display session status (Active = green, Expired = red)
  - [x] 3.4 Display session expiry time from `session.expires`
  - [x] 3.5 Add Sign Out button (reuse existing signOut from next-auth/react)

- [x] **Task 4: Loading States** (AC: #7)
  - [x] 4.1 Create `src/components/settings/profile-card-skeleton.tsx`
  - [x] 4.2 Create `src/components/settings/session-card-skeleton.tsx`
  - [x] 4.3 Use shadcn/ui Skeleton component
  - [x] 4.4 Show skeleton while useSession() is loading

- [x] **Task 5: Settings Navigation** (AC: #1)
  - [x] 5.1 Verify Settings link in sidebar (already exists from 1-5)
  - [x] 5.2 Ensure Settings icon (Settings from lucide-react)
  - [x] 5.3 Verify navigation highlighting on active route

- [x] **Task 6: Testing** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 6.1 Test profile card renders user info correctly
  - [x] 6.2 Test avatar fallback when no image
  - [x] 6.3 Test role badge displays correctly (admin/viewer)
  - [x] 6.4 Test sign out button triggers logout
  - [x] 6.5 Test skeleton loading state
  - [x] 6.6 Test responsive layout breakpoints
  - [x] 6.7 Test viewer redirect (handled by existing middleware from Story 1-5)

## Dev Notes

### Architecture Compliance

This story builds on the RBAC foundation from Story 1-5:
- Uses existing `useSession()` from NextAuth.js
- Uses existing role system (`admin`/`viewer`)
- Follows dashboard layout pattern established in EPIC-02

### Component Structure

```
src/
├── app/(dashboard)/settings/
│   └── page.tsx              # Settings page (update existing placeholder)
└── components/settings/
    ├── account-card.tsx      # Combined profile + session card
    ├── account-card-skeleton.tsx
    └── index.ts              # Barrel exports
```

### AccountCard Implementation (Consolidated)

ProfileCard + SessionCard were consolidated into a single AccountCard component.
See actual implementation in `src/components/settings/account-card.tsx`.

### shadcn/ui Components Required

```bash
# Avatar component needed (if not already installed)
npx shadcn-ui@latest add avatar

# Card, Badge, Button, Skeleton should already be installed
# Verify with: ls src/components/ui/
```

### Responsive Design Notes

| Breakpoint | Layout |
|------------|--------|
| Desktop (lg+) | 2-column grid, sidebar visible |
| Tablet (md) | 2-column grid, hamburger menu |
| Mobile (base) | 1-column stacked layout |

Tailwind classes: `grid gap-6 md:grid-cols-2`

### Testing Strategy

```typescript
// src/__tests__/settings/profile-card.test.tsx
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { ProfileCard } from '@/components/settings/profile-card';

// Mock useSession
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        name: 'Test User',
        email: 'test@eneos.co.th',
        image: 'https://example.com/avatar.jpg',
        role: 'admin',
      },
    },
    status: 'authenticated',
  })),
}));

describe('ProfileCard', () => {
  it('displays user name', () => {
    render(<ProfileCard />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays user email', () => {
    render(<ProfileCard />);
    expect(screen.getByText('test@eneos.co.th')).toBeInTheDocument();
  });

  it('displays admin badge for admin role', () => {
    render(<ProfileCard />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows initials when no image', () => {
    // Mock session without image
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@eneos.co.th', role: 'admin', image: null },
      },
      status: 'authenticated',
    } as any);

    render(<ProfileCard />);
    expect(screen.getByText('TU')).toBeInTheDocument(); // Initials
  });
});
```

### Project Structure Notes

**Alignment with unified project structure:**
- Components in `src/components/settings/` following feature-based organization
- Page in `src/app/(dashboard)/settings/` using App Router
- Tests in `src/__tests__/settings/` mirroring source structure

**No conflicts detected** with existing patterns.

### Dependencies

- Story 1-1 (Google OAuth Login) - session data
- Story 1-3 (Session Management) - session hooks
- Story 1-5 (Role-based Access) - role display, Settings route protection
- shadcn/ui Avatar component (may need installation)

### Out of Scope (Future Stories)

- F-07.2: Theme Toggle (Story 7-2)
- F-07.3: Notification Settings (Story 7-3)
- F-07.4: Sales Team Management (Story 7-4)
- Account preferences editing
- Password/security settings (N/A - Google OAuth only)

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#EPIC-07] - Feature F-07.1
- [Source: _bmad-output/planning-artifacts/admin-dashboard/architecture.md#4-component-architecture] - Component hierarchy
- [Source: _bmad-output/implementation-artifacts/stories/1-5-role-based-access.md] - Role badge pattern
- [Source: _bmad-output/project-context.md] - Coding standards

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- ✅ Implemented Settings page with responsive 2-column grid layout (AC#1, AC#6)
- ✅ Created AccountCard component (consolidated Profile + Session) (AC#2, AC#3, AC#4)
- ✅ AccountCard shows avatar with fallback initials, name, email, role badge
- ✅ Role badge supports admin (blue+Shield), viewer (gray+Eye)
- ✅ AccountCard displays provider, status, expiry, sign out button
- ✅ Created skeleton components for loading states (AC#7)
- ✅ Verified Settings navigation already exists in sidebar from Story 1-5 (AC#1)
- ✅ Viewer access restriction handled by existing middleware (AC#5)
- ✅ All tests passing for new components
- ✅ TypeScript type-check passes

### Code Review Fixes (2026-01-19)

- ✅ **M1**: Added loading state for Sign Out button (spinner + disabled state)
- ✅ **M2**: SessionCard returns null when no session data (consistent with ProfileCard)
- ✅ **M3**: Fixed callback URL to `/login?signedOut=true` (with signedOut param)
- ✅ **M4**: Added multi-tab logout sync via BroadcastChannel (consistent with UserNav)
- ✅ **L1**: Added test for Expired status color (red) when unauthenticated

### File List

**New Files (Frontend: eneos-admin-dashboard):**
- src/components/settings/account-card.tsx (consolidated Profile + Session)
- src/components/settings/account-card-skeleton.tsx
- src/components/ui/separator.tsx
- src/__tests__/settings/account-card.test.tsx
- src/__tests__/settings/settings-page.test.tsx

**Modified Files (Frontend: eneos-admin-dashboard):**
- src/app/(dashboard)/settings/page.tsx
- src/components/settings/index.ts
- src/hooks/use-toast.ts
- src/__tests__/pages/settings.test.tsx

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-19 | Story implementation complete - all tasks done | Amelia (Dev Agent) |
| 2026-01-19 | Code review: Fixed M1-M4, L1 issues (loading state, session check, callback URL, multi-tab sync) | Amelia (Dev Agent) |
| 2026-01-20 | Consolidated ProfileCard + SessionCard into AccountCard | Amelia (Dev Agent) |
| 2026-01-20 | Code review: Updated File List, removed manager role references, cleaned up story docs | Amelia (Dev Agent) |

