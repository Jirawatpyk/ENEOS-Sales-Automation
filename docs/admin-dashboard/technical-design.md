# Admin Dashboard - Technical Design Document (TDD)

> Technical implementation details สำหรับ ENEOS Admin Dashboard
> Version: 1.0.0 | Last Updated: 2024-01

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack Details](#2-technology-stack-details)
3. [Project Structure](#3-project-structure)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Backend Integration](#5-backend-integration)
6. [State Management](#6-state-management)
7. [Authentication Implementation](#7-authentication-implementation)
8. [Data Fetching Patterns](#8-data-fetching-patterns)
9. [Component Implementation](#9-component-implementation)
10. [Error Handling](#10-error-handling)
11. [Performance Optimization](#11-performance-optimization)
12. [Build & Deployment](#12-build--deployment)

---

## 1. Overview

### 1.1 Document Purpose
เอกสารนี้อธิบายรายละเอียดทางเทคนิคสำหรับการ implement Admin Dashboard รวมถึง code patterns, configurations, และ best practices

### 1.2 Technical Requirements

| Requirement | Specification |
|-------------|---------------|
| Node.js | >= 18.17.0 |
| Package Manager | npm >= 9.x or pnpm >= 8.x |
| Browser Support | Chrome 90+, Firefox 90+, Safari 14+, Edge 90+ |
| Screen Resolution | 1280px minimum, 1920px recommended |

---

## 2. Technology Stack Details

### 2.1 Core Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
```

### 2.2 UI & Styling

```json
{
  "dependencies": {
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "lucide-react": "^0.312.0"
  }
}
```

### 2.3 Charts & Data Visualization

```json
{
  "dependencies": {
    "@tremor/react": "^3.13.0",
    "recharts": "^2.10.0"
  }
}
```

### 2.4 Data Fetching & State

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.17.0",
    "@tanstack/react-table": "^8.11.0",
    "axios": "^1.6.0",
    "next-auth": "^4.24.0"
  }
}
```

### 2.5 Utilities

```json
{
  "dependencies": {
    "date-fns": "^3.2.0",
    "xlsx": "^0.18.5",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.0",
    "zod": "^3.22.0"
  }
}
```

### 2.6 Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

---

## 3. Project Structure

### 3.1 Directory Layout

```
eneos-admin-dashboard/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth group (no layout)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/              # Dashboard group (with layout)
│   │   │   ├── page.tsx              # /dashboard (main)
│   │   │   ├── sales/
│   │   │   │   └── page.tsx          # /dashboard/sales
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx          # /dashboard/leads
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # /dashboard/leads/[id]
│   │   │   ├── campaigns/
│   │   │   │   └── page.tsx          # /dashboard/campaigns
│   │   │   ├── export/
│   │   │   │   └── page.tsx          # /dashboard/export
│   │   │   └── layout.tsx            # Dashboard layout
│   │   │
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts      # NextAuth API routes
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # / (redirect to dashboard)
│   │   ├── loading.tsx               # Global loading
│   │   ├── error.tsx                 # Global error
│   │   └── not-found.tsx             # 404 page
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   └── toaster.tsx
│   │   │
│   │   ├── charts/                   # Chart components
│   │   │   ├── area-chart.tsx
│   │   │   ├── bar-chart.tsx
│   │   │   ├── donut-chart.tsx
│   │   │   ├── line-chart.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/                # Dashboard-specific components
│   │   │   ├── kpi-card.tsx
│   │   │   ├── kpi-cards.tsx
│   │   │   ├── top-sales-table.tsx
│   │   │   ├── recent-activity.tsx
│   │   │   ├── alerts-panel.tsx
│   │   │   ├── trend-chart.tsx
│   │   │   └── status-distribution.tsx
│   │   │
│   │   ├── leads/                    # Leads-specific components
│   │   │   ├── leads-table.tsx
│   │   │   ├── leads-filters.tsx
│   │   │   ├── lead-detail-modal.tsx
│   │   │   └── status-badge.tsx
│   │   │
│   │   ├── sales/                    # Sales-specific components
│   │   │   ├── performance-table.tsx
│   │   │   ├── performance-chart.tsx
│   │   │   └── response-time-card.tsx
│   │   │
│   │   ├── campaigns/                # Campaign-specific components
│   │   │   ├── campaign-table.tsx
│   │   │   ├── campaign-summary.tsx
│   │   │   └── campaign-charts.tsx
│   │   │
│   │   ├── export/                   # Export-specific components
│   │   │   ├── quick-reports.tsx
│   │   │   ├── custom-export.tsx
│   │   │   └── export-history.tsx
│   │   │
│   │   ├── layout/                   # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── sidebar-nav.tsx
│   │   │   ├── user-nav.tsx
│   │   │   └── mobile-nav.tsx
│   │   │
│   │   └── shared/                   # Shared components
│   │       ├── loading-spinner.tsx
│   │       ├── error-boundary.tsx
│   │       ├── empty-state.tsx
│   │       ├── page-header.tsx
│   │       ├── date-range-picker.tsx
│   │       └── confirm-dialog.tsx
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── api.ts                    # API client (axios)
│   │   ├── auth.ts                   # NextAuth configuration
│   │   ├── utils.ts                  # General utilities
│   │   ├── format.ts                 # Formatters (date, number, currency)
│   │   ├── export.ts                 # Export utilities (Excel, PDF)
│   │   └── validations.ts            # Zod schemas
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-dashboard.ts
│   │   ├── use-sales-performance.ts
│   │   ├── use-leads.ts
│   │   ├── use-campaigns.ts
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   └── use-toast.ts
│   │
│   ├── types/                        # TypeScript types
│   │   ├── api.ts                    # API response types
│   │   ├── dashboard.ts              # Dashboard types
│   │   ├── leads.ts                  # Lead types
│   │   ├── sales.ts                  # Sales types
│   │   ├── campaigns.ts              # Campaign types
│   │   └── next-auth.d.ts            # NextAuth type extensions
│   │
│   ├── constants/                    # Constants
│   │   ├── navigation.ts             # Navigation items
│   │   ├── status.ts                 # Status mappings
│   │   └── config.ts                 # App configuration
│   │
│   └── styles/
│       └── globals.css               # Global styles + Tailwind
│
├── public/
│   ├── logo.svg                      # ENEOS logo
│   └── favicon.ico
│
├── .env.local                        # Local environment variables
├── .env.example                      # Environment template
├── .eslintrc.json                    # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
├── components.json                   # shadcn/ui configuration
└── package.json
```

### 3.2 File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `kpi-card.tsx` |
| Hooks | camelCase with `use-` prefix | `use-dashboard.ts` |
| Types | PascalCase | `Dashboard.ts` |
| Utils | camelCase | `format.ts` |
| Constants | camelCase | `navigation.ts` |
| Pages | `page.tsx` (Next.js convention) | `page.tsx` |

---

## 4. Frontend Implementation

### 4.1 Next.js Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com'], // Google profile images
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

### 4.2 Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ENEOS Brand Colors
        eneos: {
          red: '#E60012',
          'red-dark': '#CC0010',
          'red-light': '#FEE2E2',
        },
        // shadcn/ui colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 4.3 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 5. Backend Integration

### 5.1 API Client Setup

```typescript
// src/lib/api.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { getSession } from 'next-auth/react';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get session on client side
    if (typeof window !== 'undefined') {
      const session = await getSession();
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Redirect to login on 401
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  // Dashboard
  getDashboard: (params?: { period?: string }) =>
    apiClient.get('/api/admin/dashboard', { params }),

  // Sales Performance
  getSalesPerformance: (params?: { period?: string }) =>
    apiClient.get('/api/admin/sales-performance', { params }),

  // Leads
  getLeads: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    owner?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => apiClient.get('/api/admin/leads', { params }),

  getLeadById: (id: string) =>
    apiClient.get(`/api/admin/leads/${id}`),

  // Campaigns
  getCampaigns: (params?: { period?: string }) =>
    apiClient.get('/api/admin/campaigns', { params }),

  // Export
  exportData: (params: {
    type: 'leads' | 'sales' | 'campaigns';
    format: 'xlsx' | 'csv' | 'pdf';
    startDate?: string;
    endDate?: string;
  }) => apiClient.get('/api/admin/export', { params, responseType: 'blob' }),
};

export default apiClient;
```

### 5.2 Type Definitions

```typescript
// src/types/api.ts

// Base response type
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard types
export interface DashboardSummary {
  totalLeads: number;
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
  conversionRate: number;
}

export interface DashboardTrend {
  date: string;
  leads: number;
  closed: number;
}

export interface TopSales {
  id: string;
  name: string;
  claimed: number;
  contacted: number;
  closed: number;
  conversionRate: number;
}

export interface RecentActivity {
  id: string;
  action: 'claimed' | 'contacted' | 'closed' | 'lost';
  salesName: string;
  company: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: 'unclaimed' | 'stale' | 'campaign';
  message: string;
  count?: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  trend: DashboardTrend[];
  topSales: TopSales[];
  recentActivity: RecentActivity[];
  alerts: Alert[];
}

// Lead types
export type LeadStatus = 'new' | 'claimed' | 'contacted' | 'closed' | 'lost' | 'unreachable';

export interface Lead {
  row: number;
  date: string;
  customerName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  website?: string;
  capital?: string;
  status: LeadStatus;
  owner?: {
    id: string;
    name: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
  talkingPoint?: string;
  source: string;
  clickedAt: string;
  closedAt?: string;
  lostAt?: string;
  unreachableAt?: string;
}

// Sales types
export interface SalesPerformance {
  id: string;
  name: string;
  email: string;
  stats: {
    claimed: number;
    contacted: number;
    closed: number;
    lost: number;
    unreachable: number;
    conversionRate: number;
    avgResponseTime: number; // in minutes
  };
}

export interface SalesPerformanceData {
  period: string;
  team: SalesPerformance[];
  totals: {
    claimed: number;
    contacted: number;
    closed: number;
    conversionRate: number;
  };
}

// Campaign types
export interface Campaign {
  id: string;
  name: string;
  stats: {
    leads: number;
    claimed: number;
    contacted: number;
    closed: number;
    conversionRate: number;
    estimatedRevenue?: number;
  };
}

export interface CampaignData {
  campaigns: Campaign[];
  totals: {
    campaigns: number;
    leads: number;
    closed: number;
    revenue: number;
  };
}
```

### 5.3 Utility Functions

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 * Required for shadcn/ui components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```typescript
// src/lib/format.ts
import { format, parseISO, isValid } from 'date-fns';
import { th } from 'date-fns/locale';

// Date Formatting
export function formatDate(dateString: string, formatStr = 'MMM d, yyyy'): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, formatStr);
  } catch {
    return 'Invalid Date';
  }
}

export function formatDateTime(dateString: string): string {
  return formatDate(dateString, 'MMM d, yyyy HH:mm');
}

export function formatDateThai(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, 'd MMMM yyyy', { locale: th });
  } catch {
    return 'Invalid Date';
  }
}

// Number Formatting
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Duration Formatting (input in minutes)
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} ชั่วโมง`;
  return `${Math.round(minutes / 1440)} วัน`;
}

// Phone Formatting
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
```

```typescript
// src/lib/export.ts
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatNumber } from './format';

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}

// Export to Excel
export function exportToExcel({ headers, rows, filename }: ExportData): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Auto-size columns
  const colWidths = headers.map((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...rows.map(row => String(row[i] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export to CSV
export function exportToCSV({ headers, rows, filename }: ExportData): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

// Export to PDF
export function exportToPDF({ headers, rows, filename }: ExportData): void {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text('ENEOS Sales Report', 14, 15);

  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 22);

  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [230, 0, 18] }, // ENEOS Red
  });

  doc.save(`${filename}.pdf`);
}

// Helper to prepare leads for export
export function prepareLeadsForExport(leads: any[]): ExportData {
  const headers = [
    'Date',
    'Company',
    'Customer Name',
    'Email',
    'Phone',
    'Industry',
    'Status',
    'Sales Owner',
    'Campaign',
  ];

  const rows = leads.map(lead => [
    formatDate(lead.date),
    lead.company,
    lead.customerName,
    lead.email,
    lead.phone,
    lead.industry || '-',
    lead.status,
    lead.owner?.name || '-',
    lead.campaign?.name || '-',
  ]);

  return {
    headers,
    rows,
    filename: `leads_${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}`,
  };
}
```

### 5.4 Constants

```typescript
// src/constants/status.ts
export type LeadStatus =
  | 'new'
  | 'claimed'
  | 'contacted'
  | 'closed'
  | 'lost'
  | 'unreachable';

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

```typescript
// src/constants/navigation.ts
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Megaphone,
  Download,
  Settings,
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Users,
  },
  {
    name: 'Sales Performance',
    href: '/sales',
    icon: TrendingUp,
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: Megaphone,
  },
  {
    name: 'Export',
    href: '/export',
    icon: Download,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
] as const;
```

```typescript
// src/constants/alerts.ts
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

### 5.5 Global CSS

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 0 100% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 0 100% 45%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 0 100% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 0 100% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Thai Font Support */
@layer base {
  html {
    font-family: 'Inter', 'Noto Sans Thai', system-ui, sans-serif;
  }
}

/* Custom scrollbar */
@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: theme('colors.gray.300') transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: theme('colors.gray.300');
    border-radius: 3px;
  }
}
```

---

## 6. State Management

### 6.1 TanStack Query Configuration

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### 6.2 Query Provider Setup

```typescript
// src/app/providers.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { queryClient } from '@/lib/query-client';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

### 6.3 Custom Hooks Implementation

```typescript
// src/hooks/use-dashboard.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardData } from '@/types/api';

interface UseDashboardOptions {
  period?: string;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', options.period],
    queryFn: async () => {
      const response = await api.getDashboard({ period: options.period });
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// src/hooks/use-leads.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Lead, PaginatedResponse } from '@/types/api';

interface UseLeadsOptions {
  page?: number;
  limit?: number;
  status?: string;
  owner?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export function useLeads(options: UseLeadsOptions = {}) {
  return useQuery<PaginatedResponse<Lead>>({
    queryKey: ['leads', options],
    queryFn: async () => {
      const response = await api.getLeads(options);
      return response.data;
    },
    placeholderData: keepPreviousData, // Keep previous data while fetching
  });
}

// src/hooks/use-sales-performance.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SalesPerformanceData } from '@/types/api';

interface UseSalesPerformanceOptions {
  period?: string;
}

export function useSalesPerformance(options: UseSalesPerformanceOptions = {}) {
  return useQuery<SalesPerformanceData>({
    queryKey: ['sales-performance', options.period],
    queryFn: async () => {
      const response = await api.getSalesPerformance({ period: options.period });
      return response.data;
    },
  });
}

// src/hooks/use-campaigns.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CampaignData } from '@/types/api';

interface UseCampaignsOptions {
  period?: string;
}

export function useCampaigns(options: UseCampaignsOptions = {}) {
  return useQuery<CampaignData>({
    queryKey: ['campaigns', options.period],
    queryFn: async () => {
      const response = await api.getCampaigns({ period: options.period });
      return response.data;
    },
  });
}
```

---

## 7. Authentication Implementation

### 7.1 NextAuth Configuration

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

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
          hd: 'eneos.co.th', // Restrict to ENEOS domain
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Verify email domain
      if (!user.email?.endsWith('@eneos.co.th')) {
        return false;
      }
      return true;
    },

    async jwt({ token, account, user }) {
      // Persist the OAuth access_token to the token
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // Return previous token if not expired
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Token has expired, try to refresh
      // (implement refresh logic if needed)
      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.user.id = token.sub as string;
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,
};
```

### 7.2 Type Extensions

```typescript
// src/types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
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
  }
}
```

### 7.3 Auth Middleware

```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Custom middleware logic if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    // Protect all routes except login and api/auth
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 7.4 Auth API Route

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

---

## 8. Data Fetching Patterns

### 8.1 Server Components Data Fetching

```typescript
// src/app/(dashboard)/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Initial data can be fetched on server
  // But for real-time data, we use client-side fetching

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <DashboardClient />
    </div>
  );
}
```

### 8.2 Client Components Data Fetching

```typescript
// src/components/dashboard/dashboard-client.tsx
'use client';

import { useDashboard } from '@/hooks/use-dashboard';
import { KPICards } from './kpi-cards';
import { TrendChart } from './trend-chart';
import { TopSalesTable } from './top-sales-table';
import { RecentActivity } from './recent-activity';
import { AlertsPanel } from './alerts-panel';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardClient() {
  const { data, isLoading, error, refetch } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load dashboard</p>
        <button onClick={() => refetch()} className="mt-2 text-blue-500">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards summary={data.summary} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart data={data.trend} />
        <StatusDistribution summary={data.summary} />
      </div>

      {/* Top Sales */}
      <TopSalesTable data={data.topSales} />

      {/* Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity data={data.recentActivity} />
        <AlertsPanel alerts={data.alerts} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
```

---

## 9. Component Implementation

### 9.1 KPI Card Component

```typescript
// src/components/dashboard/kpi-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  change?: {
    value: number;
    type: 'positive' | 'negative' | 'neutral';
  };
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  change,
  className,
}: KPICardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {(subtitle || change) && (
          <p className="text-xs text-muted-foreground mt-1">
            {change && (
              <span
                className={cn(
                  'mr-1',
                  change.type === 'positive' && 'text-green-600',
                  change.type === 'negative' && 'text-red-600'
                )}
              >
                {change.type === 'positive' ? '↑' : '↓'} {change.value}%
              </span>
            )}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 9.2 Status Badge Component

```typescript
// src/components/leads/status-badge.tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/types/api';

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: {
    label: 'New',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
  claimed: {
    label: 'Claimed',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  closed: {
    label: 'Closed',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  lost: {
    label: 'Lost',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  unreachable: {
    label: 'Unreachable',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  },
};

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
```

### 9.3 Data Table Component

```typescript
// src/components/leads/leads-table.tsx
'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './status-badge';
import type { Lead } from '@/types/api';
import { format } from 'date-fns';

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.getValue('date')), 'MMM dd'),
  },
  {
    accessorKey: 'company',
    header: 'Company',
  },
  {
    accessorKey: 'customerName',
    header: 'Contact',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'owner',
    header: 'Owner',
    cell: ({ row }) => row.original.owner?.name || '-',
  },
];

interface LeadsTableProps {
  data: Lead[];
  loading?: boolean;
  onRowClick?: (lead: Lead) => void;
}

export function LeadsTable({ data, loading, onRowClick }: LeadsTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return <LeadsTableSkeleton />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No leads found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function LeadsTableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
```

---

## 10. Error Handling

### 10.1 Error Boundary

```typescript
// src/components/shared/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-500 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### 10.2 API Error Handling

```typescript
// src/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new ApiError(500, error.message);
  }

  throw new ApiError(500, 'An unexpected error occurred');
}
```

---

## 11. Performance Optimization

### 11.1 Dynamic Imports

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

// Charts (Tremor is heavy)
export const TrendChart = dynamic(
  () => import('@/components/dashboard/trend-chart').then(mod => mod.TrendChart),
  {
    loading: () => <Skeleton className="h-80 w-full" />,
    ssr: false,
  }
);

// Export functionality
export const ExportDialog = dynamic(
  () => import('@/components/export/export-dialog').then(mod => mod.ExportDialog),
  { ssr: false }
);
```

### 11.2 Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

export function UserAvatar({ src, name }: { src?: string; name: string }) {
  return src ? (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      className="rounded-full"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
      {name.charAt(0)}
    </div>
  );
}
```

### 11.3 Memoization

```typescript
// Memoize expensive computations
import { useMemo } from 'react';

export function useProcessedData(rawData: Lead[]) {
  const processed = useMemo(() => {
    return rawData.map(lead => ({
      ...lead,
      displayDate: format(new Date(lead.date), 'MMM dd, yyyy'),
      isStale: isLeadStale(lead),
    }));
  }, [rawData]);

  return processed;
}
```

---

## 12. Build & Deployment

### 12.1 Build Scripts

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 12.2 Environment Variables

```env
# .env.example

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 12.3 Vercel Deployment

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXTAUTH_URL": "@nextauth-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "GOOGLE_CLIENT_ID": "@google-client-id",
    "GOOGLE_CLIENT_SECRET": "@google-client-secret"
  }
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01 | Claude | Initial document |
