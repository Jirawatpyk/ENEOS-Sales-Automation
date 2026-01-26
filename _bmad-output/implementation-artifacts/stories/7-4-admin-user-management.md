# Story 7.4: Admin User Management (Sales Team Management)

Status: done

## Story

As an **ENEOS dashboard admin**,
I want **to view and manage the Sales Team members from the dashboard**,
so that **I can assign emails, change roles, and control who can access the dashboard**.

## Acceptance Criteria

1. **AC1: Sales Team List Page**
   - Given I am logged in as admin
   - When I navigate to `/settings/team` (or Settings > Team tab)
   - Then I see a table of all Sales Team members
   - And the table shows: Name, LINE ID (masked), Email, Role, Status, Created At

2. **AC2: Filter by Status**
   - Given I am viewing the Sales Team list
   - When I select a status filter
   - Then I can filter by: Active / Inactive / All
   - And the default filter is "Active"

3. **AC3: Filter by Role**
   - Given I am viewing the Sales Team list
   - When I select a role filter
   - Then I can filter by: Admin / Sales / All
   - And the default filter is "All"

4. **AC4: Edit Sales Member**
   - Given I click "Edit" on a sales member row
   - When the edit modal/drawer opens
   - Then I can edit:
     - Email (text input, validates @eneos.co.th domain)
     - Phone (text input, Thai phone format)
     - Role (dropdown: Admin / Sales)
   - And I see a "Save" and "Cancel" button

5. **AC5: Save Changes**
   - Given I modify a sales member's details
   - When I click "Save"
   - Then the changes are saved to Google Sheets
   - And I see a success toast: "Sales member updated"
   - And the table refreshes to show updated data

6. **AC6: Deactivate Sales Member**
   - Given I click "Deactivate" on a sales member
   - When I confirm the action
   - Then the member's status changes to "inactive"
   - And they disappear from the Active filter view
   - And they can no longer login to the dashboard

7. **AC7: Reactivate Sales Member**
   - Given I view an inactive member (from "Inactive" or "All" filter)
   - When I click "Activate"
   - Then the member's status changes to "active"
   - And they can login to the dashboard again

8. **AC8: Email Validation**
   - Given I enter an email for a sales member
   - When the email doesn't end with @eneos.co.th
   - Then I see a validation error: "Must be @eneos.co.th email"
   - And the Save button is disabled

9. **AC9: Role Change Warning**
   - Given I change a member's role from Sales to Admin
   - When I click Save
   - Then I see a confirmation dialog: "This will grant full admin access. Continue?"
   - And I must confirm before the change is saved

10. **AC10: Viewer Access Restriction**
    - Given I am logged in with "viewer" role
    - When I try to access the Team management page
    - Then I am redirected to dashboard
    - And I see a toast: "Admin access required"

## Tasks / Subtasks

### Part A: Backend API

- [x] **Task 1: Backend Sales Team API** (AC: #1, #5, #6, #7)
  - [x] 1.1 Create `GET /api/admin/sales-team/list` endpoint (list all members with filters)
  - [x] 1.2 Create `GET /api/admin/sales-team/:lineUserId` endpoint (get single)
  - [x] 1.3 Create `PATCH /api/admin/sales-team/:lineUserId` endpoint (update)
  - [x] 1.4 Add query params: `status`, `role` for filtering
  - [x] 1.5 Add admin role check middleware (requireAdmin)

- [x] **Task 2: Sheets Service Enhancement** (AC: #5, #6, #7)
  - [x] 2.1 Create `updateSalesTeamMember()` in sheets.service.ts
  - [x] 2.2 Support updating: email, phone, role, status
  - [x] 2.3 Add `getAllSalesTeamMembers()` with filters
  - [x] 2.4 Add `getSalesTeamMemberById()` for single member lookup

### Part B: Frontend UI

- [x] **Task 3: Team Management Page** (AC: #1, #10)
  - [x] 3.1 Create `/settings/team` route (admin only)
  - [x] 3.2 Add "Team" tab/link in Settings navigation
  - [x] 3.3 Create page layout with title and description
  - [x] 3.4 Add role check - show forbidden for viewers

- [x] **Task 4: Sales Team Table** (AC: #1)
  - [x] 4.1 Create `src/components/settings/team-member-table.tsx`
  - [x] 4.2 Use shadcn/ui Table component
  - [x] 4.3 Columns: LINE ID (masked), Name, Email, Phone, Role, Status, Edit
  - [x] 4.4 Add loading state with skeleton
  - [x] 4.5 Add empty state when no members

- [x] **Task 5: Filter Controls** (AC: #2, #3)
  - [x] 5.1 Create status filter dropdown (Active/Inactive/All)
  - [x] 5.2 Create role filter dropdown (Admin/Sales/All)
  - [x] 5.3 Apply filters to API query
  - [x] 5.4 Reset button to restore default filter

- [x] **Task 6: Edit Member Modal** (AC: #4, #8)
  - [x] 6.1 Create `src/components/settings/team-member-edit-modal.tsx`
  - [x] 6.2 Email input with @eneos.co.th validation
  - [x] 6.3 Phone input
  - [x] 6.4 Role select (Admin/Sales)
  - [x] 6.5 Status select (Active/Inactive)

- [x] **Task 7: Save & Update Logic** (AC: #5, #9)
  - [x] 7.1 Implement save mutation with React Query
  - [x] 7.2 Only update changed fields
  - [x] 7.3 Show success/error toast
  - [x] 7.4 Refetch table data on success

- [x] **Task 8: Activate/Deactivate Actions** (AC: #6, #7)
  - [x] 8.1 Status dropdown in edit modal allows deactivate
  - [x] 8.2 Status dropdown allows reactivate inactive members
  - [x] 8.3 Changes reflected in table after save

- [x] **Task 9: Testing** (AC: All)
  - [x] 9.1 Backend: Test sales-team API endpoints (16 tests)
  - [x] 9.2 Backend: Test sheets.service team management (20 tests)
  - [x] 9.3 Frontend: Test table renders correctly
  - [x] 9.4 Frontend: Test filters work
  - [x] 9.5 Frontend: Test edit modal validation
  - [x] 9.6 Frontend: Test page access control

## Dev Notes

### Architecture Compliance

This story has **both backend and frontend** components:
- **Backend**: New API endpoints in `src/routes/admin.routes.ts`
- **Frontend**: New Settings sub-page for team management
- **Data**: Uses existing Google Sheets `Sales_Team` tab

### API Design

```typescript
// GET /api/admin/sales-team?status=active&role=all
interface SalesTeamListResponse {
  success: boolean;
  data: SalesTeamMember[];
  total: number;
}

// GET /api/admin/sales-team/:lineUserId
interface SalesTeamMemberResponse {
  success: boolean;
  data: SalesTeamMember;
}

// PATCH /api/admin/sales-team/:lineUserId
interface UpdateSalesTeamRequest {
  email?: string;
  phone?: string;
  role?: 'admin' | 'sales';
  status?: 'active' | 'inactive';
}

interface SalesTeamMember {
  lineUserId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'sales';
  status: 'active' | 'inactive';
  createdAt: string;
}
```

### Backend Implementation

**Note:** The `requireAdmin` middleware is from Story 1-5 (Role-based Access). It checks `req.user.role === 'admin'` and returns 403 if not admin.

```typescript
// src/routes/admin.routes.ts (add to existing)
import { getSalesTeam, updateSalesTeamMember } from '../controllers/admin/sales.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js'; // From Story 1-5

// Sales Team Management (Admin only)
router.get('/sales-team', requireAdmin, getSalesTeam);
router.get('/sales-team/:lineUserId', requireAdmin, getSalesTeamMemberById);
router.patch('/sales-team/:lineUserId', requireAdmin, updateSalesTeamMember);
```

```typescript
// src/controllers/admin/sales.controller.ts (new or extend)
import { Request, Response, NextFunction } from 'express';
import { sheetsService } from '../../services/sheets.service.js';
import { z } from 'zod';

const UpdateSalesTeamSchema = z.object({
  email: z.string().email().endsWith('@eneos.co.th').optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.enum(['admin', 'sales']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function getSalesTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, role } = req.query;
    const members = await sheetsService.getAllSalesTeamMembers({
      status: status as string,
      role: role as string,
    });

    res.json({
      success: true,
      data: members,
      total: members.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSalesTeamMemberById(req: Request, res: Response, next: NextFunction) {
  try {
    const { lineUserId } = req.params;
    const members = await sheetsService.getAllSalesTeamMembers();
    const member = members.find(m => m.lineUserId === lineUserId);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Sales team member not found',
      });
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSalesTeamMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { lineUserId } = req.params;
    const data = UpdateSalesTeamSchema.parse(req.body);

    const updated = await sheetsService.updateSalesTeamMember(lineUserId, data);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
```

### Sheets Service Enhancement

```typescript
// src/services/sheets.service.ts (add methods)

interface SalesTeamFilter {
  status?: string;
  role?: string;
}

async getAllSalesTeamMembers(filter?: SalesTeamFilter): Promise<SalesTeamMember[]> {
  logger.debug('Getting all sales team members', { filter });

  return circuitBreaker.execute(async () => {
    return withRetry(async () => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.google.sheetId,
        range: 'Sales_Team!A2:G',  // All columns
      });

      const rows = response.data.values || [];
      let members = rows.map((row) => ({
        lineUserId: row[0] || '',
        name: row[1] || '',
        email: row[2] || null,
        phone: row[3] || null,
        role: (row[4] || 'sales') as 'admin' | 'sales',
        createdAt: row[5] || '',
        status: (row[6] || 'active') as 'active' | 'inactive',
      }));

      // Apply filters
      if (filter?.status && filter.status !== 'all') {
        members = members.filter(m => m.status === filter.status);
      }
      if (filter?.role && filter.role !== 'all') {
        members = members.filter(m => m.role === filter.role);
      }

      return members;
    });
  });
}

async updateSalesTeamMember(
  lineUserId: string,
  updates: Partial<SalesTeamMember>
): Promise<SalesTeamMember | null> {
  logger.info('Updating sales team member', { lineUserId, updates });

  return circuitBreaker.execute(async () => {
    return withRetry(async () => {
      // First, find the row
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.google.sheetId,
        range: 'Sales_Team!A2:G',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === lineUserId);

      if (rowIndex === -1) {
        throw new Error(`Sales team member not found: ${lineUserId}`);
      }

      const currentRow = rows[rowIndex];
      const updatedRow = [
        currentRow[0],  // lineUserId (immutable)
        currentRow[1],  // name (immutable from LINE)
        updates.email !== undefined ? updates.email : currentRow[2],
        updates.phone !== undefined ? updates.phone : currentRow[3],
        updates.role || currentRow[4],
        currentRow[5],  // createdAt (immutable)
        updates.status || currentRow[6],
      ];

      // Update the row (A + rowIndex + 2 because header is row 1, data starts at 2)
      const actualRow = rowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.google.sheetId,
        range: `Sales_Team!A${actualRow}:G${actualRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedRow],
        },
      });

      return {
        lineUserId: updatedRow[0],
        name: updatedRow[1],
        email: updatedRow[2] || null,
        phone: updatedRow[3] || null,
        role: updatedRow[4] as 'admin' | 'sales',
        createdAt: updatedRow[5],
        status: updatedRow[6] as 'active' | 'inactive',
      };
    });
  });
}
```

### Frontend Component Structure

```
src/
├── app/(dashboard)/settings/
│   ├── layout.tsx                      # Settings layout with tabs (new)
│   ├── page.tsx                        # Settings main page (7-1)
│   └── team/
│       └── page.tsx                    # Team management page (new)
├── components/settings/
│   ├── sales-team-table.tsx            # DataTable for sales team
│   ├── sales-team-table-skeleton.tsx   # Loading skeleton (new)
│   ├── sales-team-columns.tsx          # Column definitions
│   ├── edit-member-modal.tsx           # Edit form modal
│   ├── status-filter.tsx               # Status filter dropdown
│   ├── role-filter.tsx                 # Role filter dropdown
│   └── index.ts                        # Barrel export
├── hooks/
│   └── use-sales-team.ts               # React Query hooks
└── lib/
    └── api-client.ts                   # Fetch wrapper (new)
```

### Settings Navigation with Team Tab

```typescript
// src/app/(dashboard)/settings/layout.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ROLES } from '@/config/roles';

const settingsNavItems = [
  { href: '/settings', label: 'Profile', adminOnly: false },
  { href: '/settings/team', label: 'Team', adminOnly: true },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === ROLES.ADMIN;

  const visibleItems = settingsNavItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex space-x-4 border-b">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              pathname === item.href
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      {children}
    </div>
  );
}
```

```typescript
// src/app/(dashboard)/settings/team/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ROLES } from '@/config/roles';
import { SalesTeamTable } from '@/components/settings/sales-team-table';
import { SalesTeamTableSkeleton } from '@/components/settings/sales-team-table-skeleton';
import { useSalesTeam } from '@/hooks/use-sales-team';

export default function TeamManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === ROLES.ADMIN;

  // Redirect non-admin users
  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      toast.error('Admin access required');
      router.push('/dashboard');
    }
  }, [status, isAdmin, router]);

  if (status === 'loading') {
    return <SalesTeamTableSkeleton />;
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Sales Team Management</h2>
        <p className="text-sm text-muted-foreground">
          View and manage sales team members, roles, and access.
        </p>
      </div>

      <SalesTeamTable />
    </div>
  );
}
```

### API Client

```typescript
// src/lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<{ data: T }> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message || 'Request failed');
    }

    const data = await response.json();
    return { data };
  }

  async patch<T>(endpoint: string, body: unknown): Promise<{ data: T }> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message || 'Request failed');
    }

    const data = await response.json();
    return { data };
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

### React Query Hooks

```typescript
// src/hooks/use-sales-team.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';

interface SalesTeamFilter {
  status?: string;
  role?: string;
}

export function useSalesTeam(filter: SalesTeamFilter = {}) {
  return useQuery({
    queryKey: ['sales-team', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.role) params.set('role', filter.role);

      const response = await apiClient.get(`/admin/sales-team?${params}`);
      return response.data;
    },
    retry: (failureCount, error) => {
      // Don't retry on 403 (forbidden) or 404 (not found)
      if (error instanceof ApiError && [403, 404].includes(error.status)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useUpdateSalesTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lineUserId, data }: { lineUserId: string; data: any }) => {
      const response = await apiClient.patch(`/admin/sales-team/${lineUserId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-team'] });
    },
    onError: (error) => {
      // Error is handled in the component with toast
      console.error('Failed to update sales team member:', error);
    },
  });
}

// Hook for getting a single member (with error handling)
export function useSalesTeamMember(lineUserId: string | null) {
  return useQuery({
    queryKey: ['sales-team-member', lineUserId],
    queryFn: async () => {
      if (!lineUserId) throw new Error('No lineUserId provided');
      const response = await apiClient.get(`/admin/sales-team/${lineUserId}`);
      return response.data;
    },
    enabled: !!lineUserId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) {
        return false; // Don't retry on 404
      }
      return failureCount < 2;
    },
  });
}
```

### Edit Member Modal

```typescript
// src/components/settings/edit-member-modal.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUpdateSalesTeamMember } from '@/hooks/use-sales-team';

// Email validation: empty string OR valid @eneos.co.th email
const editMemberSchema = z.object({
  email: z
    .string()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .refine(
      (val) => val === null || (val.includes('@') && val.endsWith('@eneos.co.th')),
      { message: 'Must be @eneos.co.th email' }
    ),
  phone: z.string().nullable(),
  role: z.enum(['admin', 'sales']),
});

type EditMemberForm = z.infer<typeof editMemberSchema>;

interface SalesTeamMember {
  lineUserId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'sales';
  status: 'active' | 'inactive';
  createdAt: string;
}

interface EditMemberModalProps {
  member: SalesTeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMemberModal({ member, open, onOpenChange }: EditMemberModalProps) {
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<EditMemberForm | null>(null);
  const updateMember = useUpdateSalesTeamMember();

  const form = useForm<EditMemberForm>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      email: member?.email || '',
      phone: member?.phone || '',
      role: member?.role || 'sales',
    },
  });

  // Reset form when member changes
  useEffect(() => {
    if (member) {
      form.reset({
        email: member.email || '',
        phone: member.phone || '',
        role: member.role,
      });
    }
  }, [member, form]);

  const onSubmit = (data: EditMemberForm) => {
    // Check if role changed to admin
    if (data.role === 'admin' && member?.role === 'sales') {
      setPendingData(data);
      setShowRoleConfirm(true);
      return;
    }

    performUpdate(data);
  };

  const performUpdate = async (data: EditMemberForm) => {
    if (!member) return;

    try {
      await updateMember.mutateAsync({
        lineUserId: member.lineUserId,
        data,
      });
      toast.success('Sales member updated');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update member');
    }
  };

  const handleRoleConfirm = () => {
    if (pendingData) {
      performUpdate(pendingData);
    }
    setShowRoleConfirm(false);
    setPendingData(null);
  };

  if (!member) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {member.name}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@eneos.co.th" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="081-234-5678" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sales">Sales (Viewer)</SelectItem>
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMember.isPending}>
                  {updateMember.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation */}
      <AlertDialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant Admin Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will grant full admin access to {member.name}, including export and settings management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### Table Skeleton Component

```typescript
// src/components/settings/sales-team-table-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SalesTeamTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter Skeletons */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### LINE ID Masking

```typescript
// Utility to mask LINE User ID for display
function maskLineUserId(lineUserId: string): string {
  if (!lineUserId || lineUserId.length < 8) return lineUserId;
  return `${lineUserId.slice(0, 4)}...${lineUserId.slice(-4)}`;
}

// In table column definition:
{
  accessorKey: 'lineUserId',
  header: 'LINE ID',
  cell: ({ row }) => (
    <code className="text-xs bg-muted px-1 py-0.5 rounded">
      {maskLineUserId(row.original.lineUserId)}
    </code>
  ),
}
```

### shadcn/ui Components Required

```bash
# DataTable dependencies
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dropdown-menu

# Form components
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select

# Dialogs
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add alert-dialog

# Already installed: button, badge, card, toast
```

### Sales_Team Sheet Structure

| Column | Index | Header | Example |
|--------|-------|--------|---------|
| A | 0 | LINE_User_ID | Uabcd1234xyz |
| B | 1 | Name | สมชาย ใจดี |
| C | 2 | Email | somchai@eneos.co.th |
| D | 3 | Phone | 0812345678 |
| E | 4 | Role | sales |
| F | 5 | Created_At | 2026-01-15T10:30:00Z |
| G | 6 | Status | active |

### Testing Strategy

**Backend Tests:**
```typescript
// src/__tests__/controllers/admin/sales.controller.test.ts
describe('Sales Team API', () => {
  describe('GET /api/admin/sales-team', () => {
    it('returns all active members by default', async () => {
      const response = await request(app)
        .get('/api/admin/sales-team')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('filters by status', async () => {
      const response = await request(app)
        .get('/api/admin/sales-team?status=inactive')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(member => {
        expect(member.status).toBe('inactive');
      });
    });

    it('rejects viewer access', async () => {
      const response = await request(app)
        .get('/api/admin/sales-team')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/sales-team/:lineUserId', () => {
    it('updates email with valid domain', async () => {
      const response = await request(app)
        .patch('/api/admin/sales-team/Utest123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test@eneos.co.th' });

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('test@eneos.co.th');
    });

    it('rejects invalid email domain', async () => {
      const response = await request(app)
        .patch('/api/admin/sales-team/Utest123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test@gmail.com' });

      expect(response.status).toBe(400);
    });
  });
});
```

**Frontend Tests:**
```typescript
// src/__tests__/settings/sales-team-table.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SalesTeamTable } from '@/components/settings/sales-team-table';

const mockMembers = [
  {
    lineUserId: 'Uabc123xyz',
    name: 'สมชาย ใจดี',
    email: 'somchai@eneos.co.th',
    phone: '0812345678',
    role: 'sales',
    status: 'active',
    createdAt: '2026-01-15T10:30:00Z',
  },
  {
    lineUserId: 'Udef456uvw',
    name: 'สมหญิง รักดี',
    email: 'somying@eneos.co.th',
    phone: '0898765432',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-10T08:00:00Z',
  },
];

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('SalesTeamTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockMembers, total: 2 }),
    });
  });

  it('renders table with member data', async () => {
    render(<SalesTeamTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument();
      expect(screen.getByText('สมหญิง รักดี')).toBeInTheDocument();
    });
  });

  it('masks LINE User ID', async () => {
    render(<SalesTeamTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Uabc...3xyz')).toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    render(<SalesTeamTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument();
    });

    // Click status filter
    const statusFilter = screen.getByRole('combobox', { name: /status/i });
    fireEvent.click(statusFilter);
    fireEvent.click(screen.getByText('Inactive'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=inactive'),
        expect.anything()
      );
    });
  });

  it('opens edit modal on Edit click', async () => {
    render(<SalesTeamTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Edit สมชาย/)).toBeInTheDocument();
    });
  });
});
```

```typescript
// src/__tests__/settings/edit-member-modal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditMemberModal } from '@/components/settings/edit-member-modal';

const mockMember = {
  lineUserId: 'Uabc123xyz',
  name: 'สมชาย ใจดี',
  email: 'somchai@eneos.co.th',
  phone: '0812345678',
  role: 'sales' as const,
  status: 'active' as const,
  createdAt: '2026-01-15T10:30:00Z',
};

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('EditMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockMember }),
    });
  });

  it('renders member name in title', () => {
    render(
      <EditMemberModal member={mockMember} open={true} onOpenChange={() => {}} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Edit สมชาย ใจดี')).toBeInTheDocument();
  });

  it('validates email domain', async () => {
    render(
      <EditMemberModal member={mockMember} open={true} onOpenChange={() => {}} />,
      { wrapper: createWrapper() }
    );

    const emailInput = screen.getByPlaceholderText('name@eneos.co.th');
    fireEvent.change(emailInput, { target: { value: 'test@gmail.com' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Must be @eneos.co.th email')).toBeInTheDocument();
    });
  });

  it('shows confirmation when changing role to admin', async () => {
    render(
      <EditMemberModal member={mockMember} open={true} onOpenChange={() => {}} />,
      { wrapper: createWrapper() }
    );

    // Change role to admin
    const roleSelect = screen.getByRole('combobox');
    fireEvent.click(roleSelect);
    fireEvent.click(screen.getByText('Admin (Full Access)'));

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Grant Admin Access?')).toBeInTheDocument();
    });
  });

  it('allows empty email (clears to null)', async () => {
    render(
      <EditMemberModal member={mockMember} open={true} onOpenChange={() => {}} />,
      { wrapper: createWrapper() }
    );

    const emailInput = screen.getByPlaceholderText('name@eneos.co.th');
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/sales-team/'),
        expect.objectContaining({
          body: expect.stringContaining('"email":null'),
        })
      );
    });
  });
});
```

### Project Structure Notes

**Backend:**
- New controller: `src/controllers/admin/sales.controller.ts`
- Extend routes: `src/routes/admin.routes.ts`
- Extend service: `src/services/sheets.service.ts`

**Frontend:**
- New page: `src/app/(dashboard)/settings/team/page.tsx`
- New components in `src/components/settings/`
- New hooks in `src/hooks/use-sales-team.ts`

### Dependencies

- Story 1-5 (Role-based Access) - requireAdmin middleware
- Story 7-1 (User Profile) - Settings page foundation
- Backend: sheets.service.ts (existing Sales_Team methods)
- shadcn/ui DataTable, Form, Dialog components

### Role Mapping Reference

| Sheet Role | Dashboard Role | Access Level |
|------------|----------------|--------------|
| `admin` | `admin` | Full access (export, settings, team) |
| `sales` | `viewer` | Read-only (no export, no settings) |

### Out of Scope

- Auto-register backend logic (separate Story 7-4b or Epic 7 feature)
- Bulk operations (activate/deactivate multiple)
- CSV import/export of team members
- Team member search
- Pagination (assume <100 members)

### Known Considerations

1. **Concurrent Edits**: No locking - last write wins (acceptable for small team)
2. **Email Uniqueness**: Not enforced at DB level, validate in code
3. **Role Escalation**: Only admins can change roles (enforced by middleware)
4. **Inactive Members**: Can still be listed, cannot login

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-07.4] - Feature definition with details
- [Source: _bmad-output/implementation-artifacts/stories/1-5-role-based-access.md] - Role system
- [Source: src/services/sheets.service.ts] - Existing getSalesTeamMember method
- [Source: _bmad-output/project-context.md] - Coding standards

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Backend Implementation** - Created team management API endpoints with admin-only access
2. **Sheets Service** - Added methods for listing, getting, and updating sales team members
3. **Frontend Types** - Created TeamMember, TeamFilter, TeamMemberUpdate types
4. **API Proxy Routes** - Created Next.js API routes to proxy requests to backend
5. **React Query Hooks** - Created useTeamList, useTeamMember, useUpdateTeamMember hooks
6. **UI Components** - Created TeamMemberFilter, TeamMemberTable, TeamMemberEditModal, TeamManagementCard
7. **Pages** - Created /settings/team page with admin-only access, updated Settings page with Team link
8. **Testing** - Backend: 36 tests, Frontend: 95 tests for team management (1865 total tests pass)
9. **Code Review Fixes** (2026-01-20):
   - AC#9: Added role change confirmation dialog when promoting Sales to Admin
   - AC#1: Added "Created At" column to team table, improved LINE ID masking (first 4 + last 4 chars)
   - AC#4: Added Thai phone format validation (0[689]XXXXXXXX)
   - AC#10: Changed from forbidden page to redirect with toast (matches AC exactly)
   - Added tests for phone validation, role confirmation dialog, and redirect behavior
10. **UI Consistency Improvements** (2026-01-26):
   - Removed duplicate Card header/description to match Activity Log pattern (commit 0b2cfb0)
   - Added bg-muted/50 background to table header for visual consistency (commit 931ad0a)
   - Replaced Card wrapper with simple div container for consistent Settings page layout
   - Fixed maskLineUserId edge case: changed length check from `< 10` to `<= 8`
   - Note: Commits 7777e55, ca0857e, 5683e9e modified Sales Performance components (Story 3.x) for cross-cutting UI alignment fixes
11. **UX Enhancement - Phone Column** (2026-01-26):
   - Added Phone column to team member table (commit dcbd631)
   - Improves UX: users can see phone numbers without opening edit modal
   - Column order: LINE ID, Name, Email, Phone, Role, Status, Created At, Edit
   - Original AC#1 only specified Name, LINE ID, Email, Role, Status, Created At
   - Phone was editable but not visible - now consistent with other editable fields

### File List

**Backend (eneos-sales-automation):**
- `src/types/index.ts` - Added SalesTeamMemberFull, SalesTeamFilter, SalesTeamMemberUpdate types
- `src/services/sheets.service.ts` - Added getAllSalesTeamMembers(), getSalesTeamMemberById(), updateSalesTeamMember()
- `src/controllers/admin/team-management.controller.ts` - New controller for team management
- `src/routes/admin.routes.ts` - Added new routes for /sales-team/list, /sales-team/:lineUserId
- `src/__tests__/controllers/admin/team-management.controller.test.ts` - 16 tests
- `src/__tests__/services/sheets-team-management.test.ts` - 20 tests

**Frontend (eneos-admin-dashboard):**
- `src/types/team.ts` - TeamMember, TeamFilter, TeamMemberUpdate types
- `src/app/api/admin/sales-team/list/route.ts` - API proxy for list
- `src/app/api/admin/sales-team/[lineUserId]/route.ts` - API proxy for single member
- `src/hooks/use-team-management.ts` - React Query hooks
- `src/hooks/index.ts` - Updated barrel export
- `src/components/settings/team-member-filter.tsx` - Filter component
- `src/components/settings/team-member-table.tsx` - Table component
- `src/components/settings/team-member-edit-modal.tsx` - Edit modal (Sheet)
- `src/components/settings/team-management-card.tsx` - Main card container
- `src/components/settings/index.ts` - Updated barrel export
- `src/app/(dashboard)/settings/page.tsx` - Added Team Management link
- `src/app/(dashboard)/settings/team/page.tsx` - Team management page
- `src/__tests__/components/settings/team-member-filter.test.tsx` - 14 tests
- `src/__tests__/components/settings/team-member-table.test.tsx` - 11 tests
- `src/__tests__/components/settings/team-member-edit-modal.test.tsx` - 26 tests
- `src/__tests__/components/settings/team-management-card.test.tsx` - 13 tests
- `src/__tests__/pages/team-management.test.tsx` - 10 tests
- `src/__tests__/pages/settings.test.tsx` - 12 tests

