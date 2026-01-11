# Admin Dashboard - Testing Strategy

> Testing strategy และ guidelines สำหรับ ENEOS Admin Dashboard
> Version: 1.0.0 | Last Updated: 2024-01

## Table of Contents

1. [Testing Overview](#1-testing-overview)
2. [Testing Pyramid](#2-testing-pyramid)
3. [Unit Testing](#3-unit-testing)
4. [Integration Testing](#4-integration-testing)
5. [End-to-End Testing](#5-end-to-end-testing)
6. [Component Testing](#6-component-testing)
7. [API Testing](#7-api-testing)
8. [Performance Testing](#8-performance-testing)
9. [Accessibility Testing](#9-accessibility-testing)
10. [Test Coverage](#10-test-coverage)
11. [CI/CD Integration](#11-cicd-integration)

---

## 1. Testing Overview

### 1.1 Testing Goals

| Goal | Target |
|------|--------|
| Code Coverage | >= 80% |
| Unit Test Pass Rate | 100% |
| E2E Test Pass Rate | 100% |
| Performance Budget | LCP < 2.5s |
| Accessibility | WCAG 2.1 AA |

### 1.2 Testing Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit & Integration testing |
| **React Testing Library** | Component testing |
| **Playwright** | E2E testing |
| **MSW** | API mocking |
| **axe-core** | Accessibility testing |
| **Lighthouse CI** | Performance testing |

### 1.3 Test Directory Structure

```
src/
├── __tests__/
│   ├── unit/                    # Unit tests
│   │   ├── lib/
│   │   │   ├── format.test.ts
│   │   │   ├── utils.test.ts
│   │   │   └── validations.test.ts
│   │   └── hooks/
│   │       ├── use-dashboard.test.ts
│   │       └── use-leads.test.ts
│   │
│   ├── integration/             # Integration tests
│   │   ├── api/
│   │   │   ├── dashboard.test.ts
│   │   │   └── leads.test.ts
│   │   └── auth/
│   │       └── auth-flow.test.ts
│   │
│   └── components/              # Component tests
│       ├── dashboard/
│       │   ├── kpi-card.test.tsx
│       │   └── trend-chart.test.tsx
│       └── leads/
│           ├── leads-table.test.tsx
│           └── status-badge.test.tsx
│
├── e2e/                         # E2E tests (Playwright)
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   ├── leads.spec.ts
│   └── export.spec.ts
│
└── __mocks__/                   # Shared mocks
    ├── api.ts
    ├── next-auth.ts
    └── handlers.ts              # MSW handlers
```

---

## 2. Testing Pyramid

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Testing Pyramid                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                           ╱╲                                            │
│                          ╱  ╲                                           │
│                         ╱ E2E╲         Few, slow, high confidence       │
│                        ╱──────╲                                         │
│                       ╱        ╲                                        │
│                      ╱Integration╲     Some, medium speed               │
│                     ╱────────────╲                                      │
│                    ╱              ╲                                     │
│                   ╱     Unit       ╲   Many, fast, isolated             │
│                  ╱──────────────────╲                                   │
│                                                                          │
│  Distribution:                                                          │
│  • Unit Tests:        70% (~50+ tests)                                  │
│  • Integration Tests: 20% (~15 tests)                                   │
│  • E2E Tests:         10% (~5 tests)                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Unit Testing

### 3.1 Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['src/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3.2 Test Setup

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { server } from './__mocks__/server';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@eneos.co.th',
        name: 'Test User',
      },
    },
    status: 'authenticated',
  }),
  getSession: vi.fn(() =>
    Promise.resolve({
      user: {
        id: 'test-user-id',
        email: 'test@eneos.co.th',
      },
    })
  ),
}));

// MSW server setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 3.3 Unit Test Examples

#### Utility Functions

```typescript
// src/__tests__/unit/lib/format.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatPercentage,
} from '@/lib/format';

describe('Format Utilities', () => {
  describe('formatCurrency', () => {
    it('should format Thai Baht correctly', () => {
      expect(formatCurrency(1000)).toBe('฿1,000');
      expect(formatCurrency(1234567)).toBe('฿1,234,567');
      expect(formatCurrency(0)).toBe('฿0');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-1000)).toBe('-฿1,000');
    });

    it('should handle decimal numbers', () => {
      expect(formatCurrency(1000.5)).toBe('฿1,001');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatDate', () => {
    it('should format ISO date to readable format', () => {
      const date = '2024-01-15T10:30:00.000Z';
      expect(formatDate(date)).toBe('Jan 15, 2024');
    });

    it('should handle invalid date', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with one decimal', () => {
      expect(formatPercentage(25.5)).toBe('25.5%');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle values over 100', () => {
      expect(formatPercentage(150)).toBe('150.0%');
    });
  });
});
```

#### Validation Functions

```typescript
// src/__tests__/unit/lib/validations.test.ts
import { describe, it, expect } from 'vitest';
import { leadsQuerySchema, dateRangeSchema } from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('leadsQuerySchema', () => {
    it('should validate valid query params', () => {
      const result = leadsQuerySchema.safeParse({
        page: '1',
        limit: '10',
        status: 'new',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.status).toBe('new');
      }
    });

    it('should use defaults for missing params', () => {
      const result = leadsQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should reject invalid status', () => {
      const result = leadsQuerySchema.safeParse({
        status: 'invalid',
      });

      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = leadsQuerySchema.safeParse({
        limit: '200',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate valid date range', () => {
      const result = dateRangeSchema.safeParse({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result.success).toBe(true);
    });

    it('should reject end date before start date', () => {
      const result = dateRangeSchema.safeParse({
        startDate: '2024-01-31',
        endDate: '2024-01-01',
      });

      expect(result.success).toBe(false);
    });
  });
});
```

#### Custom Hooks

```typescript
// src/__tests__/unit/hooks/use-debounce.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    // Update value
    rerender({ value: 'updated' });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on new value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'first' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({ value: 'second' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should still be initial (first timeout cancelled)
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Now should be 'second'
    expect(result.current).toBe('second');
  });
});
```

---

## 4. Integration Testing

### 4.1 API Integration Tests

```typescript
// src/__tests__/integration/api/dashboard.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '@/__mocks__/server';
import { http, HttpResponse } from 'msw';
import { api } from '@/lib/api';
import { mockDashboardData } from '@/__mocks__/data';

describe('Dashboard API', () => {
  describe('getDashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      const data = await api.getDashboard();

      expect(data).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.summary.totalLeads).toBeGreaterThanOrEqual(0);
    });

    it('should pass period parameter', async () => {
      let receivedParams: URLSearchParams | null = null;

      server.use(
        http.get('/api/admin/dashboard', ({ request }) => {
          const url = new URL(request.url);
          receivedParams = url.searchParams;
          return HttpResponse.json({ success: true, data: mockDashboardData });
        })
      );

      await api.getDashboard({ period: 'week' });

      expect(receivedParams?.get('period')).toBe('week');
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('/api/admin/dashboard', () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      await expect(api.getDashboard()).rejects.toThrow();
    });
  });
});
```

### 4.2 Auth Flow Integration Tests

```typescript
// src/__tests__/integration/auth/auth-flow.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn, signOut, useSession } from 'next-auth/react';
import { LoginPage } from '@/app/(auth)/login/page';

vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react');
  return {
    ...actual,
    signIn: vi.fn(),
    signOut: vi.fn(),
    useSession: vi.fn(),
  };
});

describe('Auth Flow', () => {
  describe('Login', () => {
    it('should show login button when not authenticated', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    });

    it('should call signIn when login button clicked', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      render(<LoginPage />);

      const loginButton = screen.getByRole('button', { name: /sign in with google/i });
      await userEvent.click(loginButton);

      expect(signIn).toHaveBeenCalledWith('google', expect.any(Object));
    });

    it('should show loading state', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      });

      render(<LoginPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
});
```

---

## 5. End-to-End Testing

### 5.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 E2E Test Examples

```typescript
// src/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: {
            id: 'test-user',
            email: 'test@eneos.co.th',
            name: 'Test User',
          },
        }),
      })
    );

    // Mock dashboard API
    await page.route('**/api/admin/dashboard**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            summary: {
              totalLeads: 156,
              claimed: 89,
              contacted: 42,
              closed: 23,
            },
            trend: [],
            topSales: [],
            recentActivity: [],
            alerts: [],
          },
        }),
      })
    );

    await page.goto('/dashboard');
  });

  test('should display KPI cards', async ({ page }) => {
    // Check KPI cards are visible
    await expect(page.getByText('Total Leads')).toBeVisible();
    await expect(page.getByText('156')).toBeVisible();
    await expect(page.getByText('Claimed')).toBeVisible();
    await expect(page.getByText('89')).toBeVisible();
  });

  test('should navigate to leads page', async ({ page }) => {
    await page.click('text=Leads');
    await expect(page).toHaveURL(/\/leads/);
  });

  test('should show period selector', async ({ page }) => {
    const periodSelector = page.getByRole('combobox', { name: /period/i });
    await expect(periodSelector).toBeVisible();
  });
});

// src/e2e/leads.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Leads Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: { id: 'test', email: 'test@eneos.co.th' },
        }),
      })
    );

    // Mock leads API
    await page.route('**/api/admin/leads**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: [
            {
              row: 1,
              company: 'ABC Corp',
              customerName: 'John Doe',
              status: 'new',
              date: '2024-01-15',
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      })
    );

    await page.goto('/leads');
  });

  test('should display leads table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('ABC Corp')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.getByRole('combobox', { name: /status/i });
    await statusFilter.click();
    await page.getByRole('option', { name: /new/i }).click();

    // Verify URL contains status parameter
    await expect(page).toHaveURL(/status=new/);
  });

  test('should search leads', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('ABC');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Verify search is applied
    await expect(page).toHaveURL(/search=ABC/);
  });

  test('should open lead detail modal', async ({ page }) => {
    await page.getByText('ABC Corp').click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Lead Details')).toBeVisible();
  });
});

// src/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // No auth mock - should redirect
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show Google login button', async ({ page }) => {
    await page.goto('/login');

    const loginButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(loginButton).toBeVisible();
  });

  test('should show domain restriction message', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText(/@eneos\.co\.th/)).toBeVisible();
  });
});
```

---

## 6. Component Testing

### 6.1 Component Test Examples

```typescript
// src/__tests__/components/dashboard/kpi-card.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KPICard } from '@/components/dashboard/kpi-card';

describe('KPICard', () => {
  it('should render title and value', () => {
    render(<KPICard title="Total Leads" value={156} />);

    expect(screen.getByText('Total Leads')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(<KPICard title="Total" value={100} subtitle="vs last month" />);

    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('should render positive change indicator', () => {
    render(
      <KPICard
        title="Total"
        value={100}
        change={{ value: 12.5, type: 'positive' }}
      />
    );

    expect(screen.getByText('↑ 12.5%')).toBeInTheDocument();
    expect(screen.getByText('↑ 12.5%')).toHaveClass('text-green-600');
  });

  it('should render negative change indicator', () => {
    render(
      <KPICard
        title="Total"
        value={100}
        change={{ value: 5.2, type: 'negative' }}
      />
    );

    expect(screen.getByText('↓ 5.2%')).toBeInTheDocument();
    expect(screen.getByText('↓ 5.2%')).toHaveClass('text-red-600');
  });

  it('should render icon when provided', () => {
    render(
      <KPICard
        title="Total"
        value={100}
        icon={<span data-testid="icon">📥</span>}
      />
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

// src/__tests__/components/leads/status-badge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/leads/status-badge';

describe('StatusBadge', () => {
  it.each([
    ['new', 'New', 'bg-gray-100'],
    ['claimed', 'Claimed', 'bg-blue-100'],
    ['contacted', 'Contacted', 'bg-amber-100'],
    ['closed', 'Closed', 'bg-green-100'],
    ['lost', 'Lost', 'bg-red-100'],
    ['unreachable', 'Unreachable', 'bg-gray-100'],
  ])('should render %s status correctly', (status, label, className) => {
    render(<StatusBadge status={status as any} />);

    const badge = screen.getByText(label);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(className);
  });
});

// src/__tests__/components/leads/leads-table.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadsTable } from '@/components/leads/leads-table';

const mockLeads = [
  {
    row: 1,
    date: '2024-01-15T10:00:00.000Z',
    company: 'ABC Corp',
    customerName: 'John Doe',
    status: 'new' as const,
    owner: null,
  },
  {
    row: 2,
    date: '2024-01-14T10:00:00.000Z',
    company: 'XYZ Ltd',
    customerName: 'Jane Smith',
    status: 'closed' as const,
    owner: { id: 'U123', name: 'สมชาย' },
  },
];

describe('LeadsTable', () => {
  it('should render leads data', () => {
    render(<LeadsTable data={mockLeads} />);

    expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    expect(screen.getByText('XYZ Ltd')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('สมชาย')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<LeadsTable data={[]} />);

    expect(screen.getByText('No leads found')).toBeInTheDocument();
  });

  it('should show loading skeleton when loading', () => {
    render(<LeadsTable data={[]} loading />);

    // Check for skeleton elements
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should call onRowClick when row is clicked', async () => {
    const onRowClick = vi.fn();
    render(<LeadsTable data={mockLeads} onRowClick={onRowClick} />);

    await userEvent.click(screen.getByText('ABC Corp'));

    expect(onRowClick).toHaveBeenCalledWith(mockLeads[0]);
  });

  it('should display status badges', () => {
    render(<LeadsTable data={mockLeads} />);

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });
});
```

---

## 7. API Testing

### 7.1 MSW Setup

```typescript
// src/__mocks__/handlers.ts
import { http, HttpResponse } from 'msw';
import { mockDashboardData, mockLeadsData, mockSalesData } from './data';

export const handlers = [
  // Dashboard
  http.get('/api/admin/dashboard', () => {
    return HttpResponse.json({
      success: true,
      data: mockDashboardData,
    });
  }),

  // Leads
  http.get('/api/admin/leads', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 10;

    return HttpResponse.json({
      success: true,
      data: mockLeadsData.slice(0, limit),
      pagination: {
        page,
        limit,
        total: mockLeadsData.length,
        totalPages: Math.ceil(mockLeadsData.length / limit),
      },
    });
  }),

  http.get('/api/admin/leads/:id', ({ params }) => {
    const lead = mockLeadsData.find((l) => l.row === Number(params.id));

    if (!lead) {
      return HttpResponse.json(
        { success: false, error: { message: 'Not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: lead });
  }),

  // Sales Performance
  http.get('/api/admin/sales-performance', () => {
    return HttpResponse.json({
      success: true,
      data: mockSalesData,
    });
  }),

  // Export
  http.get('/api/admin/export', () => {
    return new HttpResponse(new Blob(['mock-file-content']), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="export.xlsx"',
      },
    });
  }),
];

// src/__mocks__/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 7.2 Mock Data

```typescript
// src/__mocks__/data.ts
import type { DashboardData, Lead, SalesPerformanceData } from '@/types/api';

export const mockDashboardData: DashboardData = {
  summary: {
    totalLeads: 156,
    claimed: 89,
    contacted: 42,
    closed: 23,
    lost: 14,
    unreachable: 8,
    conversionRate: 14.74,
  },
  trend: [
    { date: '2024-01-01', leads: 5, closed: 1 },
    { date: '2024-01-02', leads: 8, closed: 2 },
  ],
  topSales: [
    { id: 'U1', name: 'สมชาย', claimed: 25, contacted: 20, closed: 8, conversionRate: 32 },
    { id: 'U2', name: 'สมหญิง', claimed: 22, contacted: 18, closed: 6, conversionRate: 27 },
  ],
  recentActivity: [],
  alerts: [],
};

export const mockLeadsData: Lead[] = [
  {
    row: 1,
    date: '2024-01-15T10:00:00.000Z',
    customerName: 'John Doe',
    email: 'john@abc.com',
    phone: '081-234-5678',
    company: 'ABC Corp',
    industry: 'Manufacturing',
    status: 'new',
    source: 'brevo_click',
    clickedAt: '2024-01-15T10:00:00.000Z',
  },
  // ... more mock leads
];

export const mockSalesData: SalesPerformanceData = {
  period: 'month',
  team: [
    {
      id: 'U1',
      name: 'สมชาย',
      email: 'somchai@eneos.co.th',
      stats: {
        claimed: 25,
        contacted: 20,
        closed: 8,
        lost: 2,
        unreachable: 1,
        conversionRate: 32,
        avgResponseTime: 15,
      },
    },
  ],
  totals: {
    claimed: 92,
    contacted: 68,
    closed: 24,
    conversionRate: 26,
  },
};
```

---

## 8. Performance Testing

### 8.1 Lighthouse CI Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3001/dashboard'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### 8.2 Bundle Size Testing

```typescript
// scripts/check-bundle-size.ts
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const MAX_SIZES = {
  'main-app': 200 * 1024, // 200KB
  'page-dashboard': 100 * 1024, // 100KB
  'page-leads': 80 * 1024, // 80KB
};

function checkBundleSize() {
  execSync('npm run build', { stdio: 'inherit' });

  const buildManifest = JSON.parse(
    readFileSync('.next/build-manifest.json', 'utf-8')
  );

  let hasError = false;

  for (const [name, maxSize] of Object.entries(MAX_SIZES)) {
    const actualSize = getBundleSize(name, buildManifest);

    if (actualSize > maxSize) {
      console.error(
        `❌ ${name}: ${formatSize(actualSize)} exceeds limit of ${formatSize(maxSize)}`
      );
      hasError = true;
    } else {
      console.log(
        `✅ ${name}: ${formatSize(actualSize)} (limit: ${formatSize(maxSize)})`
      );
    }
  }

  if (hasError) {
    process.exit(1);
  }
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

checkBundleSize();
```

---

## 9. Accessibility Testing

### 9.1 axe-core Integration

```typescript
// src/__tests__/a11y/accessibility.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KPICard } from '@/components/dashboard/kpi-card';
import { StatusBadge } from '@/components/leads/status-badge';
import { LeadsTable } from '@/components/leads/leads-table';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('KPICard should have no accessibility violations', async () => {
    const { container } = render(
      <KPICard title="Total Leads" value={156} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('StatusBadge should have no accessibility violations', async () => {
    const { container } = render(<StatusBadge status="new" />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('LeadsTable should have no accessibility violations', async () => {
    const { container } = render(
      <LeadsTable
        data={[
          {
            row: 1,
            date: '2024-01-15',
            company: 'ABC',
            customerName: 'John',
            status: 'new',
          },
        ]}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 9.2 E2E Accessibility Tests

```typescript
// src/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('Dashboard should have no accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Leads page should have no accessibility violations', async ({ page }) => {
    await page.goto('/leads');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Login page should have no accessibility violations', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

---

## 10. Test Coverage

### 10.1 Coverage Requirements

| Category | Target | Critical Areas |
|----------|--------|----------------|
| Statements | >= 80% | lib/, hooks/ |
| Branches | >= 80% | Validation logic |
| Functions | >= 80% | API functions |
| Lines | >= 80% | All |

### 10.2 Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# Output example:
# ---------------------|---------|----------|---------|---------|
# File                 | % Stmts | % Branch | % Funcs | % Lines |
# ---------------------|---------|----------|---------|---------|
# All files            |   85.2  |    82.1  |   88.5  |   85.0  |
#  lib/                |   92.3  |    89.5  |   95.0  |   92.0  |
#   api.ts             |   90.0  |    85.0  |  100.0  |   90.0  |
#   format.ts          |  100.0  |   100.0  |  100.0  |  100.0  |
#   validations.ts     |   95.0  |    92.0  |   90.0  |   95.0  |
#  hooks/              |   88.0  |    85.0  |   90.0  |   88.0  |
#  components/         |   80.0  |    78.0  |   82.0  |   80.0  |
# ---------------------|---------|----------|---------|---------|
```

---

## 11. CI/CD Integration

### 11.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
```

### 11.2 Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:a11y": "vitest run src/__tests__/a11y",
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "lint:fix": "next lint --fix"
  }
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01 | Claude | Initial document |
