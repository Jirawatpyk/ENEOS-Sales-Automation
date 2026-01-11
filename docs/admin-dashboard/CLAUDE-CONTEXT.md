# Admin Dashboard - Claude Context

> Quick Reference สำหรับ Claude Dev
> ไฟล์นี้รวมข้อมูลสำคัญที่ต้องใช้บ่อยขณะ dev

---

## Current Phase/Status

| Item | Status |
|------|--------|
| **Current Phase** | Phase 0: Backend API (Prerequisite) |
| **Phase Status** | ✅ **DONE** - Completed on 2026-01-12 |
| **Next Phase** | Phase 1: MVP (Authentication + Dashboard + Leads) |
| **Overall Progress** | 1/8 Epics Complete (12.5%) |
| **Backend API Status** | 4/9 Endpoints Ready (Must Have endpoints complete) |
| **Test Status** | 423 tests passing, 0 TypeScript errors, 75%+ coverage |

### Recently Completed (2026-01-12)
- ✅ EPIC-00: Backend API (Prerequisite)
  - Created admin auth middleware with Google OAuth validation
  - Implemented 4 core API endpoints (dashboard, leads, lead detail, sales performance)
  - Added 122 comprehensive unit tests
  - All Must Have features for Phase 0 complete

### Next Steps
1. **Start EPIC-01: Authentication** (4 days)
   - Setup NextAuth.js with Google OAuth
   - Implement domain restriction (@eneos.co.th)
   - Create login page and middleware
   - Test authentication flow

2. **Prepare for EPIC-02: Dashboard Overview** (5 days)
   - Review dashboard endpoint response structure
   - Plan component breakdown
   - Setup Next.js project structure

---

## 1. Project Overview

| Item | Value |
|------|-------|
| **Project Name** | ENEOS Admin Dashboard |
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **UI Library** | shadcn/ui + Tremor |
| **Styling** | Tailwind CSS |
| **Auth** | NextAuth.js + Google OAuth |
| **Data Fetching** | TanStack Query v5 |
| **Tables** | TanStack Table v8 |
| **Testing** | Vitest + Playwright |
| **Package Manager** | npm |
| **Port** | 3001 (Backend: 3000) |

### Related Files (ในโฟลเดอร์นี้)

| ไฟล์ | คำอธิบาย | ใช้เมื่อไหร่ |
|------|---------|-------------|
| `env.example` | ตัวอย่าง environment variables | Copy ไป `.env.local` ตอน setup |
| `README-TEMPLATE.md` | Template สำหรับ README.md | Copy ไป root ตอนสร้าง project |
| `architecture.md` | System design & diagrams | ต้องการเข้าใจภาพรวม |
| `technical-design.md` | Implementation details & code | ต้องการ code examples |
| `ux-ui.md` | Design system & wireframes | ต้องการ UI specs |
| `api-specification.md` | API endpoints & responses | ต้องการ API details |
| `security.md` | Security guidelines | ต้องการ security checklist |
| `testing-strategy.md` | Testing approach & examples | ต้องการ test patterns |
| `epics.md` | Requirements & user stories | ต้องการ business context |

### Backend Files Created (EPIC-00) ✅

| ไฟล์ | Path | คำอธิบาย |
|------|------|---------|
| `admin.routes.ts` | `eneos-sales-automation/src/routes/` | Admin API route definitions |
| `admin.controller.ts` | `eneos-sales-automation/src/controllers/` | Admin request handlers |
| `admin-auth.ts` | `eneos-sales-automation/src/middleware/` | Google OAuth middleware |
| `admin.types.ts` | `eneos-sales-automation/src/types/` | TypeScript interfaces |
| `admin.constants.ts` | `eneos-sales-automation/src/constants/` | Constants & configurations |
| `admin.validators.ts` | `eneos-sales-automation/src/validators/` | Zod validation schemas |
| Test files | `eneos-sales-automation/src/__tests__/` | 122 unit tests (27+54+28+13) |

---

## 2. Status Values (Lead Status)

```typescript
// ค่า Status ทั้งหมดที่ใช้ในระบบ
export type LeadStatus =
  | 'new'         // Lead ใหม่ ยังไม่มีคนรับ
  | 'claimed'     // มีเซลล์รับแล้ว
  | 'contacted'   // ติดต่อลูกค้าแล้ว
  | 'closed'      // ปิดการขายสำเร็จ
  | 'lost'        // ปิดการขายไม่สำเร็จ
  | 'unreachable' // ติดต่อไม่ได้

// สี/ลักษณะแสดงผลของแต่ละ Status
export const STATUS_CONFIG = {
  new: {
    label: 'New',
    labelTh: 'ใหม่',
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800',
  },
  claimed: {
    label: 'Claimed',
    labelTh: 'รับแล้ว',
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
  },
  contacted: {
    label: 'Contacted',
    labelTh: 'ติดต่อแล้ว',
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
  },
  closed: {
    label: 'Closed',
    labelTh: 'ปิดสำเร็จ',
    color: 'green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
  },
  lost: {
    label: 'Lost',
    labelTh: 'ปิดไม่สำเร็จ',
    color: 'red',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
  },
  unreachable: {
    label: 'Unreachable',
    labelTh: 'ติดต่อไม่ได้',
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
  },
} as const;
```

---

## 3. Alert Thresholds (Business Rules)

```typescript
// Alert Definitions
export const ALERT_THRESHOLDS = {
  // Lead ไม่มีคนรับ (new status) เกินกี่ชั่วโมง
  UNCLAIMED_HOURS: 24,

  // Lead contacted แต่ไม่มี update เกินกี่วัน
  STALE_DAYS: 7,

  // Alert severity
  UNCLAIMED_SEVERITY: 'warning' as const,
  STALE_SEVERITY: 'info' as const,
};
```

---

## 4. Time Units (API Response)

```typescript
// ระบุหน่วยเวลาที่ใช้ใน API Response

// avgResponseTime: นาที (minutes)
// เวลาเฉลี่ยที่เซลล์ใช้ในการรับ lead (claimed - new)
// ตัวอย่าง: avgResponseTime: 15 หมายถึง 15 นาที

// avgClosingTime: นาที (minutes)
// เวลาเฉลี่ยที่ใช้ในการปิดการขาย (closed - claimed)
// ตัวอย่าง: avgClosingTime: 7200 หมายถึง 5 วัน (7200 นาที)

// metrics.age: นาที (minutes)
// อายุของ lead ตั้งแต่สร้าง
// ตัวอย่าง: age: 12960 หมายถึง 9 วัน (12960 นาที)

// Format function
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} ชั่วโมง`;
  return `${Math.round(minutes / 1440)} วัน`;
}
```

---

## 5. Date/Number Formatting

```typescript
// Date Formats ที่ใช้
export const DATE_FORMATS = {
  // แสดงในตาราง
  TABLE_DATE: 'MMM d, yyyy',        // "Jan 15, 2024"

  // แสดงใน tooltip หรือ detail
  FULL_DATE: 'MMMM d, yyyy',        // "January 15, 2024"

  // แสดงพร้อมเวลา
  DATETIME: 'MMM d, yyyy HH:mm',    // "Jan 15, 2024 10:30"

  // แสดงเฉพาะเวลา
  TIME: 'HH:mm',                    // "10:30"

  // API format (ISO 8601)
  API: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
};

// Number Formats ที่ใช้
export const NUMBER_FORMATS = {
  // ตัวเลขทั่วไป (มี comma)
  // 1234567 → "1,234,567"

  // เปอร์เซ็นต์ (ทศนิยม 1 ตำแหน่ง)
  // 25.5 → "25.5%"

  // เงิน (บาท)
  // 1000000 → "฿1,000,000"

  // Phone (Thai format)
  // "0812345678" → "081-234-5678"
};
```

---

## 6. Icon Library

```typescript
// ใช้ Lucide React สำหรับ Icons
// https://lucide.dev/icons/

// วิธี import
import {
  Users,           // สำหรับ Total Leads
  UserCheck,       // สำหรับ Claimed
  PhoneCall,       // สำหรับ Contacted
  CheckCircle,     // สำหรับ Closed
  XCircle,         // สำหรับ Lost
  AlertTriangle,   // สำหรับ Warning/Alert
  TrendingUp,      // สำหรับ Positive Change
  TrendingDown,    // สำหรับ Negative Change
  Download,        // สำหรับ Export
  Search,          // สำหรับ Search
  Filter,          // สำหรับ Filter
  Calendar,        // สำหรับ Date Picker
  Settings,        // สำหรับ Settings
  LogOut,          // สำหรับ Logout
} from 'lucide-react';

// ขนาดมาตรฐาน
// sm: className="h-4 w-4"
// md: className="h-5 w-5"
// lg: className="h-6 w-6"
```

---

## 7. Color Palette (Quick Reference)

```typescript
// Primary (ENEOS Red)
const primary = {
  DEFAULT: '#E60012',  // Main red
  foreground: '#FFFFFF',
};

// Status Colors (Tailwind classes)
const statusColors = {
  new: 'gray',
  claimed: 'blue',
  contacted: 'amber',
  closed: 'green',
  lost: 'red',
  unreachable: 'gray',
};

// Chart Colors (Tremor)
const chartColors = [
  'red',      // Primary
  'blue',     // Secondary
  'green',    // Tertiary
  'amber',    // Quaternary
  'gray',     // Quinary
];
```

---

## 8. Navigation Items

```typescript
// Main Navigation
export const NAVIGATION_ITEMS = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: 'Users',
  },
  {
    name: 'Sales Performance',
    href: '/sales',
    icon: 'TrendingUp',
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: 'Megaphone',
  },
  {
    name: 'Export',
    href: '/export',
    icon: 'Download',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: 'Settings',
  },
] as const;
```

---

## 9. Folder Structure (Exact Paths)

```
admin-dashboard/                 # Root directory
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── leads/
│   │   │   │   └── page.tsx
│   │   │   ├── sales/
│   │   │   │   └── page.tsx
│   │   │   ├── campaigns/
│   │   │   │   └── page.tsx
│   │   │   ├── export/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx       # Dashboard layout with sidebar
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   └── admin/           # Proxy to backend API
│   │   │       ├── dashboard/
│   │   │       │   └── route.ts
│   │   │       ├── leads/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── sales-performance/
│   │   │       │   └── route.ts
│   │   │       ├── campaigns/
│   │   │       │   └── route.ts
│   │   │       └── export/
│   │   │           └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx           # Root layout
│   │   └── providers.tsx        # Context providers
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── dashboard/
│   │   │   ├── kpi-card.tsx
│   │   │   ├── trend-chart.tsx
│   │   │   ├── status-chart.tsx
│   │   │   ├── top-sales.tsx
│   │   │   ├── recent-activity.tsx
│   │   │   └── alerts-panel.tsx
│   │   ├── leads/
│   │   │   ├── leads-table.tsx
│   │   │   ├── leads-filters.tsx
│   │   │   ├── lead-detail-modal.tsx
│   │   │   └── status-badge.tsx
│   │   ├── sales/
│   │   │   ├── sales-table.tsx
│   │   │   └── performance-chart.tsx
│   │   ├── campaigns/
│   │   │   ├── campaign-table.tsx
│   │   │   └── campaign-chart.tsx
│   │   ├── export/
│   │   │   └── export-form.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── user-menu.tsx
│   │   └── shared/
│   │       ├── loading-skeleton.tsx
│   │       ├── error-boundary.tsx
│   │       ├── empty-state.tsx
│   │       └── period-selector.tsx
│   │
│   ├── hooks/
│   │   ├── use-dashboard.ts
│   │   ├── use-leads.ts
│   │   ├── use-sales.ts
│   │   ├── use-campaigns.ts
│   │   └── use-debounce.ts
│   │
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   ├── auth.ts              # NextAuth config
│   │   ├── utils.ts             # cn() and utilities
│   │   ├── format.ts            # Date/Number formatters
│   │   ├── export.ts            # Excel/PDF export
│   │   └── validations.ts       # Zod schemas
│   │
│   ├── types/
│   │   ├── api.ts               # API response types
│   │   ├── auth.ts              # Auth types
│   │   └── index.ts             # Re-exports
│   │
│   ├── constants/
│   │   ├── navigation.ts
│   │   ├── status.ts
│   │   └── alerts.ts
│   │
│   ├── __tests__/               # Unit & Integration tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── components/
│   │
│   ├── __mocks__/               # MSW mocks
│   │   ├── handlers.ts
│   │   ├── data.ts
│   │   └── server.ts
│   │
│   └── e2e/                     # Playwright E2E tests
│       ├── auth.spec.ts
│       ├── dashboard.spec.ts
│       └── leads.spec.ts
│
├── public/
│   └── logo.svg
│
├── .env.local                   # Environment variables
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── components.json              # shadcn/ui config
└── package.json
```

---

## 10. Backend API Endpoints Status

> Admin Dashboard API endpoints จาก Backend

| Endpoint | Method | Description | Status | Completion Date |
|----------|--------|-------------|--------|-----------------|
| `/api/admin/dashboard` | GET | Dashboard summary | ✅ **Ready** | 2026-01-12 |
| `/api/admin/leads` | GET | List leads (paginated) | ✅ **Ready** | 2026-01-12 |
| `/api/admin/leads/:id` | GET | Lead detail | ✅ **Ready** | 2026-01-12 |
| `/api/admin/leads/stats` | GET | Leads statistics | ⏳ Not Started | - |
| `/api/admin/sales-performance` | GET | Sales team performance | ✅ **Ready** | 2026-01-12 |
| `/api/admin/sales-performance/:userId` | GET | Individual performance | ⏳ Not Started | - |
| `/api/admin/campaigns` | GET | Campaign analytics | ⏳ Not Started | - |
| `/api/admin/campaigns/:id` | GET | Campaign detail | ⏳ Not Started | - |
| `/api/admin/export` | GET | Export data | ⏳ Not Started | - |

### Admin Auth Middleware ✅
Backend middleware พร้อมใช้งานแล้ว:
- ✅ Google OAuth token validation
- ✅ Domain restriction (@eneos.co.th)
- ✅ Rate limiting for admin endpoints

### API Response Format ✅
ทุก endpoint ใช้ format มาตรฐาน:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; };
  pagination?: { page: number; limit: number; total: number; totalPages: number; };
}
```

### Completed Endpoints Details

#### GET /api/admin/dashboard
- Returns: KPIs (total leads, claimed, contacted, closed), trends (30 days), alerts
- Features: Lead status distribution, top sales ranking, recent activity

#### GET /api/admin/leads
- Returns: Paginated lead list
- Filters: status, owner, dateFrom, dateTo, search (company/email/name)
- Pagination: page, limit (default 20, max 100)

#### GET /api/admin/leads/:id
- Returns: Single lead detail by row number
- Includes: All lead fields + AI analysis + sales owner info

#### GET /api/admin/sales-performance
- Returns: Team performance metrics
- Metrics: claimed, contacted, closed, conversion rate, avg response time, avg closing time

---

## 11. Role Storage (RBAC)

```typescript
// Role เก็บใน Google Sheets - Sales_Team sheet
// เพิ่ม column "Role" ใน Sales_Team sheet

// Google Sheets Structure:
// | LINE_User_ID | Name | Email | Phone | Role |
// | U123...      | สมชาย | somchai@eneos.co.th | 081... | admin |
// | U456...      | สมหญิง | somying@eneos.co.th | 082... | manager |

// Default role ถ้าไม่มีใน sheet: 'viewer'

// ใน NextAuth callback
async function jwt({ token, user }) {
  if (user) {
    // Lookup role from backend
    const userRole = await fetchUserRole(user.email);
    token.role = userRole || 'viewer';
  }
  return token;
}
```

---

## 12. Environment Variables

```bash
# .env.local - Admin Dashboard

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_EXPORT=true
```

---

## 13. Quick Start Commands

```bash
# Create new project
npx create-next-app@latest admin-dashboard --typescript --tailwind --eslint --app --src-dir

# Install dependencies
npm install @tanstack/react-query @tanstack/react-table next-auth tremor @tremor/react lucide-react xlsx jspdf date-fns zod

# Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input select skeleton table

# Install dev dependencies
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom msw @playwright/test jest-axe

# Run development
npm run dev

# Run tests
npm test
npm run test:e2e
```

---

## 14. Responsive Design Breakpoints

```typescript
// Tailwind CSS Breakpoints
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
};

// Usage patterns
// Mobile-first approach: base styles → sm: → md: → lg:

// Example: KPI Grid
// Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Example: Sidebar
// Mobile: hidden (use hamburger menu)
// Desktop: fixed sidebar 256px
<aside className="hidden lg:block lg:w-64 lg:fixed">

// Example: Table
// Mobile: horizontal scroll
// Desktop: full width
<div className="overflow-x-auto">
  <table className="min-w-full">

// Example: Charts
// Mobile: full width, stacked
// Desktop: side by side
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

**Mobile-specific considerations:**
- Sidebar → Hamburger menu with Sheet/Drawer
- Data tables → Horizontal scroll or card view
- KPI cards → Stack vertically
- Charts → Full width, reduce data points
- Modals → Full screen on mobile
- Touch targets → Minimum 44x44px

---

## 15. Common Gotchas

1. **shadcn/ui className merging**
   - ต้องมี `lib/utils.ts` ที่มี `cn()` function
   - ใช้ `clsx` + `tailwind-merge`

2. **Next.js App Router**
   - Server Components เป็น default
   - ใส่ `'use client'` เมื่อใช้ hooks, useState, useEffect
   - Layout.tsx ต้อง export `metadata` object

3. **NextAuth.js**
   - ต้องมี `NEXTAUTH_SECRET` ใน production
   - Google OAuth ต้อง set `hd: 'eneos.co.th'` ใน authorization params

4. **TanStack Query**
   - Wrap app ด้วย `QueryClientProvider`
   - ใช้ `useQuery` สำหรับ GET, `useMutation` สำหรับ POST/PUT/DELETE

5. **Tremor Charts**
   - Import จาก `@tremor/react`
   - Colors ใช้ชื่อ Tailwind เช่น 'red', 'blue'

6. **Port**
   - Backend ใช้ port 3000
   - Admin Dashboard ใช้ port 3001 (set ใน package.json: `"dev": "next dev -p 3001"`)

---

## 16. Development Checklist for Claude

> Checklist สำหรับ Claude dev ใช้ track progress

### Phase 0: Backend API (Prerequisite) ✅ **DONE**
```
[x] Create admin.routes.ts with route definitions
[x] Create admin.controller.ts with request handlers
[x] Create admin-auth.ts middleware (Google OAuth + domain validation)
[x] Create admin.types.ts with TypeScript interfaces
[x] Create admin.constants.ts (pagination, time units, status)
[x] Create admin.validators.ts (Zod schemas)
[x] Implement GET /api/admin/dashboard endpoint
[x] Implement GET /api/admin/leads endpoint (with pagination & filters)
[x] Implement GET /api/admin/leads/:id endpoint
[x] Implement GET /api/admin/sales-performance endpoint
[x] Write unit tests for constants (27 tests)
[x] Write unit tests for validators (54 tests)
[x] Write unit tests for controllers (28 tests)
[x] Write unit tests for middleware (13 tests)
[x] Verify TypeScript strict mode compliance (0 errors)
[x] Verify test coverage maintained (75%+)
[x] 423 total tests passing
```

### Phase 1: Project Setup
```
[ ] Create Next.js 14 project
    npx create-next-app@latest admin-dashboard --typescript --tailwind --eslint --app --src-dir

[ ] Install dependencies
    npm install @tanstack/react-query @tanstack/react-table next-auth @tremor/react lucide-react xlsx jspdf date-fns zod

[ ] Setup shadcn/ui
    npx shadcn@latest init
    npx shadcn@latest add button card dialog dropdown-menu input select skeleton table badge

[ ] Configure files
    - tailwind.config.ts (add ENEOS colors, extend theme)
    - next.config.js (add security headers)
    - tsconfig.json (verify path aliases)

[ ] Create folder structure
    - src/components/ui/
    - src/components/dashboard/
    - src/components/leads/
    - src/components/layout/
    - src/hooks/
    - src/lib/
    - src/types/
    - src/constants/

[ ] Setup utilities
    - lib/utils.ts (cn function)
    - lib/format.ts (date/number formatters)
    - lib/api.ts (API client)
    - lib/validations.ts (Zod schemas)

[ ] Setup constants
    - constants/status.ts (STATUS_CONFIG)
    - constants/navigation.ts (NAVIGATION_ITEMS)
    - constants/alerts.ts (ALERT_THRESHOLDS)
```

### Phase 2: Authentication
```
[ ] Configure NextAuth
    - lib/auth.ts (Google OAuth + domain restriction)
    - app/api/auth/[...nextauth]/route.ts

[ ] Create auth pages
    - app/(auth)/login/page.tsx

[ ] Setup middleware
    - middleware.ts (route protection)

[ ] Test authentication flow
    - Login with @eneos.co.th email
    - Verify domain restriction works
    - Test session persistence
```

### Phase 3: Layout Components
```
[ ] Create layout components
    - components/layout/sidebar.tsx
    - components/layout/header.tsx
    - components/layout/user-menu.tsx
    - components/layout/mobile-nav.tsx (hamburger menu)

[ ] Create dashboard layout
    - app/(dashboard)/layout.tsx

[ ] Implement responsive sidebar
    - Desktop: fixed 256px sidebar
    - Mobile: hamburger menu with Sheet

[ ] Add navigation
    - Active state styling
    - Icons from lucide-react
```

### Phase 4: Shared Components
```
[ ] Create shared components
    - components/shared/loading-skeleton.tsx
    - components/shared/error-boundary.tsx
    - components/shared/empty-state.tsx
    - components/shared/period-selector.tsx

[ ] Create status components
    - components/leads/status-badge.tsx
```

### Phase 5: Dashboard Page
```
[ ] Create hooks
    - hooks/use-dashboard.ts (TanStack Query)

[ ] Create dashboard components
    - components/dashboard/kpi-card.tsx
    - components/dashboard/trend-chart.tsx
    - components/dashboard/status-chart.tsx
    - components/dashboard/top-sales.tsx
    - components/dashboard/recent-activity.tsx
    - components/dashboard/alerts-panel.tsx

[ ] Create dashboard page
    - app/(dashboard)/dashboard/page.tsx

[ ] Implement responsive grid
    - KPI cards: 1 col mobile → 4 cols desktop
    - Charts: stacked mobile → side-by-side desktop
```

### Phase 6: Leads Page
```
[ ] Create hooks
    - hooks/use-leads.ts (with pagination, filtering)

[ ] Create leads components
    - components/leads/leads-table.tsx (TanStack Table)
    - components/leads/leads-filters.tsx
    - components/leads/lead-detail-modal.tsx

[ ] Create leads page
    - app/(dashboard)/leads/page.tsx

[ ] Implement features
    - Search with debounce
    - Status filter
    - Date range filter
    - Pagination
    - Row click → detail modal
    - Responsive: table → card view on mobile
```

### Phase 7: Sales Performance Page
```
[ ] Create hooks
    - hooks/use-sales.ts

[ ] Create sales components
    - components/sales/sales-table.tsx
    - components/sales/performance-chart.tsx

[ ] Create sales page
    - app/(dashboard)/sales/page.tsx
```

### Phase 8: Campaigns Page
```
[ ] Create hooks
    - hooks/use-campaigns.ts

[ ] Create campaigns components
    - components/campaigns/campaign-table.tsx
    - components/campaigns/campaign-chart.tsx

[ ] Create campaigns page
    - app/(dashboard)/campaigns/page.tsx
```

### Phase 9: Export Page
```
[ ] Create export utilities
    - lib/export.ts (Excel/PDF generation)

[ ] Create export components
    - components/export/export-form.tsx

[ ] Create export page
    - app/(dashboard)/export/page.tsx

[ ] Implement export formats
    - Excel (.xlsx) using xlsx library
    - PDF using jspdf library
```

### Phase 10: API Routes (Proxy)
```
[ ] Create API proxy routes
    - app/api/admin/dashboard/route.ts
    - app/api/admin/leads/route.ts
    - app/api/admin/leads/[id]/route.ts
    - app/api/admin/sales-performance/route.ts
    - app/api/admin/campaigns/route.ts
    - app/api/admin/export/route.ts

[ ] Add authentication check to all routes
[ ] Add error handling
```

### Phase 11: Testing
```
[ ] Setup testing
    - vitest.config.ts
    - playwright.config.ts
    - src/__tests__/setup.ts
    - src/__mocks__/handlers.ts (MSW)

[ ] Write unit tests
    - lib/format.test.ts
    - lib/validations.test.ts
    - hooks tests

[ ] Write component tests
    - KPICard, StatusBadge, LeadsTable

[ ] Write E2E tests
    - auth.spec.ts
    - dashboard.spec.ts
    - leads.spec.ts

[ ] Run coverage report
    npm run test:coverage
```

### Phase 12: Polish & Deploy
```
[ ] Accessibility audit
    - Run axe-core
    - Verify keyboard navigation
    - Check color contrast

[ ] Performance optimization
    - Verify LCP < 2.5s
    - Check bundle size
    - Add loading states

[ ] Security checklist
    - Verify domain restriction
    - Check security headers
    - Review API routes

[ ] Deploy to Vercel
    - Set environment variables
    - Test production build
```

---

## 17. Claude Agents (Sub-agents)

> Agents สำหรับทำงาน parallel และ specialized tasks

### Available Agents

| Agent | สี | หน้าที่ | ใช้เมื่อ |
|-------|-----|--------|---------|
| `eneos-backend-api-dev` | 🟢 green | สร้าง Backend API endpoints | สร้าง /api/admin/* routes |
| `nextjs-code-reviewer` | 🔴 red | Review code | ตรวจสอบ code หลังเขียนเสร็จ |
| `eneos-project-manager` | 🔵 blue | วางแผน/ติดตามงาน | วางแผน phase, track progress |
| `nextjs-component-dev` | 🟣 purple | สร้าง Frontend components | สร้าง React components |

### Agent Files Location

```
.claude/agents/
├── eneos-backend-api-dev.md   # Backend API development
├── nextjs-code-reviewer.md    # Code review
├── eneos-project-manager.md   # Project management
└── nextjs-component-dev.md    # Frontend component development
```

### How to Use Agents

```bash
# Claude จะเรียกใช้ agent อัตโนมัติเมื่อเหมาะสม
# หรือสามารถระบุให้ใช้ agent ได้:

# ตัวอย่าง: ขอให้สร้าง component
"สร้าง KPICard component" → Claude เรียก nextjs-component-dev

# ตัวอย่าง: ขอให้สร้าง API
"สร้าง API endpoint สำหรับ dashboard" → Claude เรียก eneos-backend-api-dev

# ตัวอย่าง: ขอให้ review code
"review code ที่เพิ่งเขียน" → Claude เรียก nextjs-code-reviewer

# ตัวอย่าง: ขอดู project status
"สถานะโปรเจคเป็นอย่างไร" → Claude เรียก eneos-project-manager
```

### Agent Rules (ทุก agent ปฏิบัติตาม)

1. **อ่านเอกสารก่อนทำงาน** - ทุก agent จะอ่าน CLAUDE-CONTEXT.md ก่อน
2. **Lead Status 6 ค่า** - new, claimed, contacted, closed, lost, unreachable
3. **Time Units = นาที** - ทุกค่าเวลาเป็นนาที (minutes)
4. **ตอบภาษาไทย** - อธิบายเป็นภาษาไทย

### Prompts Location

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial document |
| 1.1.0 | 2024-01 | Added Responsive breakpoints (Section 14) |
| 1.2.0 | 2024-01 | Added Development Checklist (Section 16) |
| 1.3.0 | 2024-01 | Added Related Files table, env.example, README-TEMPLATE.md |
| 1.4.0 | 2024-01 | Added Claude Agents section (Section 17) |
| 1.5.0 | 2026-01-12 | **Updated for EPIC-00 Completion** - Added Current Phase/Status section, updated Backend API Endpoints Status (4/9 ready), updated Development Checklist Phase 0 as DONE, added Recently Completed and Next Steps |
