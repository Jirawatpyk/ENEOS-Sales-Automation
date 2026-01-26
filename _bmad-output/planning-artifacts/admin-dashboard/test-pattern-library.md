# Test Pattern Library

> Reusable test patterns extracted from Epic 3: Sales Team Performance
> Created: 2026-01-17 | Author: TEA (Master Test Architect)
> For use in: Epic 4 (Lead Management) and future epics

## Overview

This document captures proven test patterns from Epic 3's 8 stories (966 total tests).
Risk-based prioritization: Unit > Integration > E2E.

---

## 1. Component Test Patterns

### 1.1 Basic Component Test Structure

```typescript
/**
 * [Component] Tests
 * Story X.X: [Story Name]
 *
 * AC#1: [Description]
 * AC#2: [Description]
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '@/components/path/component-name';

// Mock data - always define OUTSIDE describe blocks
const mockData = { /* ... */ };

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Group by AC for traceability
  describe('AC#1: [Description]', () => {
    it('renders expected elements', () => { /* ... */ });
  });
});
```

### 1.2 Provider Wrapper Pattern (TanStack Query)

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

// Usage
renderWithProviders(<MyComponent />);
```

### 1.3 Callback Handler Testing

```typescript
const onFilterNeedsImprovement = vi.fn();
const onHighlightBestPerformer = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

it('calls onHighlightBestPerformer when card clicked', () => {
  render(
    <Component
      onHighlightBestPerformer={onHighlightBestPerformer}
      onFilterNeedsImprovement={onFilterNeedsImprovement}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: /highlight/i }));
  expect(onHighlightBestPerformer).toHaveBeenCalledWith('user1');
});
```

---

## 2. Mock Patterns

### 2.1 next/navigation Mock

```typescript
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/test-path',
}));

// In beforeEach - reset URL params
beforeEach(() => {
  mockSearchParams.delete('period');
  mockSearchParams.delete('from');
  mockSearchParams.delete('to');
});

// Test URL param behavior
it('reads period from URL params', () => {
  mockSearchParams.set('period', 'quarter');
  // ... test
});
```

### 2.2 Recharts Mock (For Chart Components)

```typescript
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div style={{ width: 800, height: 400 }}>{children}</div>
  ),
  BarChart: ({ children, data, onClick }: Props) => (
    <div
      data-testid="recharts-bar-chart"
      onClick={() => onClick?.({ activePayload: [{ payload: data[0] }] })}
    >
      {(data as { name: string }[]).map((d, i) => (
        <span key={i} data-testid={`y-axis-label-${i}`}>{d.name}</span>
      ))}
      {children}
    </div>
  ),
  Bar: ({ name }: { name: string }) => (
    <div data-testid={`bar-${name?.toLowerCase()}`}>{name}</div>
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="recharts-pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  Legend: () => <div data-testid="legend" />,
}));
```

### 2.3 Custom Hook Mock

```typescript
const mockExportToExcel = vi.fn();
const mockExportToPDF = vi.fn();

vi.mock('@/hooks/use-export-individual', () => ({
  useExportIndividual: () => ({
    exportToExcel: mockExportToExcel,
    exportToPDF: mockExportToPDF,
    isExporting: false,
  }),
}));

// For stateful mocks (changing isExporting)
let mockIsExporting = false;

vi.mock('@/hooks/use-export-individual', () => ({
  useExportIndividual: () => ({
    exportToExcel: mockExportToExcel,
    exportToPDF: mockExportToPDF,
    get isExporting() { return mockIsExporting; },
  }),
}));

// In test
mockIsExporting = true;
rerender(<Component />);
```

### 2.4 Toast Mock

```typescript
const mockToast = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Assert toast called
expect(mockToast).toHaveBeenCalledWith({
  title: 'Export Complete',
  description: expect.stringContaining('downloaded'),
});
```

### 2.5 External Library Mock (xlsx)

```typescript
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));
```

---

## 3. Hook Test Patterns

### 3.1 Basic Hook Test

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';

describe('useMyHook', () => {
  it('returns expected initial state', () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.value).toBe(initialValue);
    expect(result.current.setValue).toBeDefined();
  });

  it('updates state when action called', async () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

### 3.2 Async Hook Test

```typescript
it('handles async operation', async () => {
  const { result } = renderHook(() => useAsyncHook());

  act(() => {
    result.current.fetchData();
  });

  // Wait for async completion
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toEqual(expectedData);
});
```

### 3.3 Time-Based Hook Test (Fake Timers)

```typescript
const TEST_DATE = new Date('2026-01-15T10:00:00Z');

describe('usePeriodFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TEST_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates quarter boundaries correctly', () => {
    const { result } = renderHook(() => usePeriodFilter());

    expect(result.current.from.getMonth()).toBe(0); // January
    expect(result.current.to.getMonth()).toBe(2);   // March
  });
});
```

---

## 4. Utility Function Test Patterns

### 4.1 Pure Function Tests

```typescript
describe('formatConversionRate', () => {
  it('formats rate as percentage', () => {
    expect(formatConversionRate(20, 50)).toBe('40.0%');
  });

  it('returns N/A when claimed is 0', () => {
    expect(formatConversionRate(0, 0)).toBe('N/A');
  });

  // Edge cases
  it('handles boundary values', () => {
    expect(formatConversionRate(100, 100)).toBe('100.0%');
    expect(formatConversionRate(0, 100)).toBe('0.0%');
  });
});
```

### 4.2 Sanitization Function Tests

```typescript
describe('sanitizeFilename', () => {
  // Valid transformations
  it.each([
    ['file/name', 'file_name'],
    ['file\\name', 'file_name'],
    ['file:name', 'file_name'],
    ['file*name', 'file_name'],
    ['file?name', 'file_name'],
  ])('transforms %s to %s', (input, expected) => {
    expect(sanitizeFilename(input)).toBe(expected);
  });

  // Edge cases
  it('preserves Thai characters', () => {
    expect(sanitizeFilename('สมชาย')).toBe('สมชาย');
  });

  it('truncates to max length', () => {
    const longName = 'a'.repeat(100);
    expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(50);
  });

  it('handles empty string', () => {
    expect(sanitizeFilename('')).toBe('export');
  });
});
```

---

## 5. Test Data Patterns

### 5.1 Standard Mock Data Structure

```typescript
// Always include all required fields
const mockSalesData: SalesPersonMetrics[] = [
  {
    userId: 'user1',
    name: 'Alice',
    email: 'alice@eneos.co.th',
    claimed: 50,
    contacted: 40,
    closed: 20,
    lost: 5,
    unreachable: 5,
    conversionRate: 40,
    avgResponseTime: 45, // ALWAYS in minutes
  },
  // Include varied data for edge cases
  {
    userId: 'user2',
    name: 'Bob',
    email: 'bob@eneos.co.th',
    claimed: 0,  // Edge case: zero claims
    contacted: 0,
    closed: 0,
    lost: 0,
    unreachable: 0,
    conversionRate: 0,
    avgResponseTime: null, // Edge case: null response time
  },
];
```

### 5.2 Summary Data Pattern

```typescript
const mockSummaryData: SalesPerformanceData = {
  teamPerformance: mockSalesData,
  summary: {
    totalClaimed: 180,
    totalContacted: 140,
    totalClosed: 42,
    avgConversionRate: 23.3,
    avgResponseTime: 180,
  },
};
```

---

## 6. Accessibility Test Patterns

### 6.1 ARIA Role Testing

```typescript
it('has correct ARIA roles', () => {
  render(<Component />);

  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  expect(screen.getByRole('combobox')).toBeInTheDocument();
});
```

### 6.2 Keyboard Navigation Testing

```typescript
it('supports keyboard navigation', async () => {
  const user = userEvent.setup();
  render(<Component />);

  const button = screen.getByRole('button');
  await user.tab();
  expect(button).toHaveFocus();

  await user.keyboard('{Enter}');
  expect(screen.getByRole('menu')).toBeInTheDocument();
});
```

---

## 7. State Test Patterns

### 7.1 Loading State

```typescript
it('shows skeleton during loading', () => {
  render(<Component isLoading={true} />);
  expect(screen.getByTestId('skeleton')).toBeInTheDocument();
});
```

### 7.2 Empty State

```typescript
it('shows empty message when no data', () => {
  render(<Component data={[]} isLoading={false} />);
  expect(screen.getByText(/no data/i)).toBeInTheDocument();
});
```

### 7.3 Error State

```typescript
it('shows error message on failure', () => {
  render(<Component error={new Error('Failed to fetch')} />);
  expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
});
```

---

## 8. Epic 4 Application Notes

### For Lead Management (Epic 4), apply these patterns:

| Epic 4 Feature | Recommended Pattern |
|----------------|---------------------|
| Lead List Table | Pattern 1.2 (Provider), 5.1 (Mock Data) |
| Pagination | Pattern 2.1 (URL params), 3.3 (Fake timers for debounce) |
| Search | Pattern 2.1 (URL params), 4.2 (Edge cases) |
| Filter by Status | Pattern 1.3 (Callbacks), 2.1 (URL sync) |
| Lead Detail Modal | Pattern 1.2 (Provider), 6.1 (Accessibility) |
| Bulk Select | Pattern 1.3 (Callbacks), 7.1-7.3 (States) |
| Quick Export | Pattern 2.5 (xlsx mock), 4.2 (Sanitization) |

### Test File Naming Convention

```
src/__tests__/
├── [component-name].test.tsx       # Component tests
├── [component-name]-states.test.tsx # State variations
├── lib/
│   └── [util-name].test.ts         # Utility tests
└── unit/hooks/
    └── use-[hook-name].test.ts     # Hook tests
```

---

## 9. Common Pitfalls to Avoid

1. **Missing beforeEach cleanup** - Always `vi.clearAllMocks()` to prevent test pollution
2. **Hardcoded dates** - Use `vi.useFakeTimers()` + `vi.setSystemTime()` for date tests
3. **Missing async handling** - Use `waitFor` for async operations, not raw `await`
4. **Incomplete mock data** - Include ALL required fields even if not used in test
5. **Testing implementation** - Test behavior, not internal state

---

## Quick Reference

```typescript
// Import everything you need
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Clear mocks
beforeEach(() => vi.clearAllMocks());

// Fake timers
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(TEST_DATE); });
afterEach(() => vi.useRealTimers());

// Assert visibility
expect(screen.getByText('text')).toBeInTheDocument();
expect(screen.queryByText('text')).not.toBeInTheDocument();

// Assert called
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(1);

// Async wait
await waitFor(() => expect(condition).toBe(true));
```

---

*Generated by TEA (Master Test Architect) - 2026-01-17*
