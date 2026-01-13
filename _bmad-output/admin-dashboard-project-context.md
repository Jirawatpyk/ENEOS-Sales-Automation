---
project_name: 'eneos-admin-dashboard'
user_name: 'Jiraw'
date: '2026-01-13'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'critical_rules']
status: 'complete'
rule_count: 95
optimized_for_llm: true
---

# Project Context for AI Agents - ENEOS Admin Dashboard

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Runtime & Language:**
- Node.js >=18.17.0
- TypeScript ^5.3.0 (strict mode enabled)

**Core Framework:**
- Next.js ^14.0.0 (App Router - NOT Pages Router)
- React ^18.2.0

**UI & Styling:**
- Tailwind CSS ^3.4.0
- shadcn/ui (Radix UI-based, copy components)
- recharts ^3.6.0 (Dashboard charts - React 19 compatible)
- lucide-react ^0.312.0 (Icons)
- clsx + tailwind-merge (cn() utility)

**Data Fetching & State:**
- @tanstack/react-query ^5.17.0 (v5 object syntax!)
- @tanstack/react-table ^8.11.0
- axios ^1.6.0

**Authentication:**
- next-auth ^4.24.0 (NOT v5/Auth.js - still beta)
- Google OAuth only (@eneos.co.th domain restriction)

**Utilities:**
- date-fns ^3.2.0
- zod ^3.22.0
- xlsx ^0.18.5, jspdf ^2.5.1

**Testing:**
- Vitest (Unit/Integration)
- Playwright (E2E - NOT Cypress)
- MSW v2 (API mocking - setupServer pattern)

**Critical Constraints:**
- Ports: Backend=3000, Dashboard=3001
- Path alias: @/* -> ./src/*
- TanStack Query v5: Use object syntax {queryKey, queryFn}

---

## Language-Specific Rules

### TypeScript Configuration
- `strict: true` - Mandatory
- `noEmit: true` - Next.js handles compilation
- `moduleResolution: "bundler"` - For Next.js 14
- Path alias: `"@/*": ["./src/*"]`

### Import Patterns
```typescript
// Use path alias
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/hooks/use-dashboard'

// WRONG - Relative paths
import { Button } from '../../../components/ui/button'
```

### Component Directive (CRITICAL)
```typescript
// Server Component (default) - No directive needed
// Client Component - MUST add directive as FIRST LINE
'use client'

import { useState } from 'react'
```

### Type Imports
```typescript
import type { Lead, DashboardData } from '@/types/api'
import { type Lead, useLead } from '@/hooks/use-lead'
```

### Unused Variables
```typescript
// Prefix with underscore
function handler(_req: Request, res: Response) { }
```

---

## Framework-Specific Rules

### Next.js App Router Patterns

**Route Groups:**
```
src/app/
├── (auth)/           # No URL segment
│   └── login/
├── (dashboard)/      # Shares layout
│   ├── dashboard/
│   ├── leads/
│   └── sales/
```

**Special Files:**
- `page.tsx` - Route content
- `layout.tsx` - Wraps children, persists
- `loading.tsx` - Suspense boundary
- `error.tsx` - Error boundary (must be 'use client')

### TanStack Query v5 (CRITICAL)
```typescript
// CORRECT - v5 object syntax
const { data, isLoading } = useQuery({
  queryKey: ['dashboard', period],
  queryFn: () => api.getDashboard({ period }),
  staleTime: 30 * 1000,
})

// WRONG - v4 array syntax
const { data } = useQuery(['dashboard'], fetchDashboard)
```

### Keep Previous Data (v5)
```typescript
import { keepPreviousData } from '@tanstack/react-query'

const { data } = useQuery({
  queryKey: ['leads', filters],
  queryFn: () => api.getLeads(filters),
  placeholderData: keepPreviousData,
})
```

### shadcn/ui - cn() Utility (MANDATORY)
```typescript
// src/lib/utils.ts - MUST exist
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Recharts (Charts)
```typescript
// Use HEX colors from chart-config.ts
import { CHART_COLORS, LEAD_TREND_COLORS } from '@/lib/chart-config';

<Area stroke={LEAD_TREND_COLORS.newLeads} fill="url(#gradient-newLeads)" />
```

### NextAuth.js Session
```typescript
// Server Component
import { getServerSession } from 'next-auth'
const session = await getServerSession(authOptions)

// Client Component
'use client'
import { useSession } from 'next-auth/react'
const { data: session } = useSession()
```

---

## Testing Rules

### Test File Organization
```
src/
├── __tests__/           # Unit & Integration
│   ├── unit/
│   ├── integration/
│   └── setup.ts
├── __mocks__/           # MSW handlers
│   ├── handlers.ts
│   └── server.ts
└── e2e/                 # Playwright E2E
```

### Required Test Utilities
```typescript
// src/__tests__/utils/test-utils.tsx
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  })
}

export function TestProviders({ children }) {
  const queryClient = createTestQueryClient()
  return (
    <SessionProvider session={mockSession}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}
```

### MSW v2 Mock Pattern
```typescript
// src/__mocks__/handlers.ts
import { http, HttpResponse } from 'msw'  // v2 imports!

export const handlers = [
  http.get('/api/admin/dashboard', () => {
    return HttpResponse.json({ success: true, data: mockData })
  }),
]
```

### NextAuth Session Mocking
```typescript
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { email: 'test@eneos.co.th' } },
    status: 'authenticated'
  }),
  SessionProvider: ({ children }) => children
}))
```

### Next.js Navigation Mocking
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams()
}))
```

### Data-testid Convention
```typescript
// Pattern: {type}-{feature}-{identifier}
<div data-testid="kpi-card-total-leads" />
<button data-testid="btn-export-excel" />
```

### Test Coverage Targets
- Unit tests: 70%+ coverage
- Integration: All critical API paths
- E2E: Auth flow + main user journeys

### Testing Anti-Patterns (AVOID)
- Testing implementation details
- Snapshot tests for dynamic data
- Testing third-party libraries
- Flaky selectors (use data-testid)
- Real API calls in tests

---

## Code Quality & Style Rules

### File Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `kpi-card.tsx` |
| Hooks | use- prefix | `use-dashboard.ts` |
| Utils/Lib | kebab-case | `format.ts` |
| Pages | page.tsx | `app/(dashboard)/leads/page.tsx` |

### Barrel Exports
```typescript
// src/components/dashboard/index.ts
export { KPICard } from './kpi-card'
export { TrendChart } from './trend-chart'

// Clean imports
import { KPICard, TrendChart } from '@/components/dashboard'
```

### Import Order
```typescript
// 1. React/Next
// 2. Third-party libraries
// 3. Internal (@/) imports
// 4. Relative imports (same feature)
// 5. Type imports
```

### Component Size Limits
- < 100 lines: Single file OK
- 100-200 lines: Consider splitting
- > 200 lines: MUST split

### Export Patterns
```typescript
// Named exports (preferred)
export function KPICard() { }

// Default exports - ONLY for page.tsx
export default function Page() { }
```

### Hook Return Types (ALWAYS define)
```typescript
interface UseDashboardReturn {
  data: DashboardData | undefined
  isLoading: boolean
  error: Error | null
}

export function useDashboard(): UseDashboardReturn { }
```

### UI Consistency Rules
- Spacing: Use Tailwind scale (gap-4, gap-6, p-4)
- Colors: ENEOS Red (#E60012) for primary actions
- Loading: Always use Skeleton components
- Empty: Every list needs EmptyState

### Status Badge Colors (Project-Specific)
```typescript
const STATUS_COLORS = {
  new: 'bg-gray-100 text-gray-800',
  claimed: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  closed: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  unreachable: 'bg-gray-100 text-gray-500',
}
```

---

## Development Workflow Rules

### Scripts (package.json)
```json
{
  "dev": "next dev -p 3001",
  "build": "next build",
  "lint": "next lint",
  "type-check": "tsc --noEmit",
  "test": "vitest",
  "test:e2e": "playwright test"
}
```

### Pre-Commit Checklist
```bash
npm run type-check    # No TypeScript errors
npm run lint          # No ESLint errors
npm test              # All tests pass
```

### Story Execution Protocol
1. Check sprint-status.yaml for assignment
2. Read story file completely
3. Follow tasks/subtasks in order
4. Update story status as you progress

### Definition of Done
- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] No TypeScript/ESLint errors
- [ ] Responsive tested (mobile + desktop)
- [ ] Story file updated to 'done'

### Branch Naming
```
feature/add-leads-filter
fix/kpi-card-loading-state
refactor/dashboard-hooks
```

### Commit Message Format
```
feat(dashboard): add KPI trend chart
fix(auth): handle expired session redirect
test(leads): add filter integration tests
```

### Hot Reload Notes
```bash
# Requires restart:
- next.config.js
- .env files
- middleware.ts
```

### Quick Alias
```bash
alias precommit='npm run type-check && npm run lint && npm test'
```

---

## Critical Don't-Miss Rules

### Authentication
```typescript
// ALWAYS verify domain
if (!user.email?.endsWith('@eneos.co.th')) { return false }

// NEVER expose tokens to client
// Use API routes as proxy to backend
```

### API Integration
```typescript
// NEVER call backend directly from client
const data = await fetch('/api/admin/dashboard')  // Use proxy

// NEVER hardcode API URL
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/...`)
```

### API Response Handling
```typescript
// Backend returns: { success, data, error, pagination }
if (!response.data.success) {
  throw new Error(response.data.error?.message)
}

// Handle 503 (circuit breaker) gracefully
```

### Lead Status (EXACTLY 6 values)
```typescript
type LeadStatus =
  | 'new'         // ใหม่
  | 'claimed'     // รับแล้ว
  | 'contacted'   // ติดต่อแล้ว
  | 'closed'      // ปิดสำเร็จ
  | 'lost'        // ปิดไม่สำเร็จ
  | 'unreachable' // ติดต่อไม่ได้
```

### Time Units (ALL values in MINUTES)
```typescript
avgResponseTime: number   // minutes
avgClosingTime: number    // minutes

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`
  if (minutes < 1440) return `${Math.round(minutes / 60)} ชั่วโมง`
  return `${Math.round(minutes / 1440)} วัน`
}
```

### Google Sheets as Database
- Row number = Primary Key
- No JOINs, no complex queries
- Lead ID is the row number (lead.row)

### Hydration Safety
```typescript
// Date/time causes mismatch - use useEffect
'use client'
const [time, setTime] = useState<string>('')
useEffect(() => setTime(new Date().toLocaleString()), [])

// useSearchParams needs Suspense wrapper
<Suspense fallback={<Loading />}>
  <LeadsContent />
</Suspense>
```

### Dynamic Imports for Heavy Components
```typescript
const LeadTrendChart = dynamic(
  () => import('@/components/dashboard/lead-trend-chart').then(mod => mod.LeadTrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
```

### Null Safety
```typescript
{lead.owner?.name ?? 'Unassigned'}
{formatDate(lead.date) ?? 'Invalid date'}
```

### Key Props (NEVER use index)
```typescript
{leads.map(lead => <Row key={lead.row} />)}
```

### Responsive Breakpoints (Mobile-First)
```typescript
// Base = mobile, then scale up
<div className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

// Sidebar: hidden on mobile
<aside className="hidden lg:fixed lg:block lg:w-64">
```

### Mobile UX Requirements
- Touch targets: minimum 44x44px
- Focus states: visible ring (not outline-none)
- Tables: card view option on mobile
- Errors: user-friendly messages

### Rate Limit Awareness
```typescript
// Backend: 300 req/min shared quota
// Minimum refetch interval: 60 seconds
refetchInterval: 60 * 1000
```

### Security Headers (next.config.js)
```typescript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]
```

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

---

*Last Updated: 2026-01-13*
