# Automation Summary - Story 5-6: Campaign Performance Chart

**Date:** 2026-01-31
**Story:** 5-6 Campaign Performance Chart
**Mode:** BMad-Integrated
**Coverage Target:** critical-paths + regression guardrails

## Tests Created

### Component Tests (campaign-chart-guardrails.test.tsx)

**32 tests, 750 lines**

| Priority | Test | AC |
|----------|------|----|
| P0 | should call hook with default desktop limit 10 on initial render | #8 (H-2 fix) |
| P0 | should pass truncateLength on first render (not undefined) | #8 (H-2 fix) |
| P0 | should render aria-busy as boolean true attribute | #5 (L-1 fix) |
| P1 | should handle unknown dataKey gracefully (fallback to raw key) | #3 |
| P1 | should format percentage with exactly one decimal place | #3 |
| P1 | should render nothing when payload is undefined | #3 |
| P1 | should format large delivered counts with locale separators | #3 |
| P1 | should display both Open Rate and Click Rate entries | #3 |
| P1 | should display zero values correctly | #3 |
| P1 | should render the limit selector with data-testid | #4 |
| P1 | should display current limit value in selector | #4 |
| P1 | should pass refetch to CampaignsError for retry | #7 |
| P1 | should handle error with no message property | #7 |
| P1 | should use RATE_BENCHMARKS.openRate.good (15) for Good line | #9 |
| P1 | should use RATE_BENCHMARKS.openRate.excellent (25) for Excellent line | #9 |
| P1 | should use CHART_COLORS.warning for Good benchmark line | #9 |
| P1 | should use CHART_COLORS.success for Excellent benchmark line | #9 |
| P1 | should use dashed stroke for both benchmark lines | #9 |
| P1 | should use CHART_COLORS.info for Open Rate bar | #1 |
| P1 | should use CHART_COLORS.secondary for Click Rate bar | #1 |
| P1 | should handle single character name | #2 |
| P1 | should handle name exactly at boundary (25 chars) | #2 |
| P1 | should handle name 1 char over boundary | #2 |
| P1 | should handle unicode characters | #2 |
| P1 | should handle whitespace-only names | #2 |
| P1 | should display descriptive empty state text | #6 |
| P1 | should NOT show selector in empty state | #6 |
| P1 | should have data-testid on empty state container | #6 |
| P1 | should pass truncateLength to useCampaignChart | #8 |
| P1 | should render Y-axis with fontSize from responsive config | #8 |
| P1 | should use aria-label describing chart content | #8 |
| P2 | should calculate height as max(300, data.length * 50) | #8 |
| P2 | should enforce minimum height of 300 for small datasets | #8 |

### Hook Tests (campaign-chart-guardrails-hook.test.tsx)

**11 tests, 290 lines**

| Priority | Test | AC |
|----------|------|----|
| P0 | should use limit-independent queryKey - only 1 API call | #2 (H-1 fix) |
| P0 | should apply slicing via select (different limits, same cache) | #2 (H-1 fix) |
| P0 | should apply truncation via select (not queryFn) | #8 (H-1 fix) |
| P1 | should wrap TypeError in CampaignApiError | #7 |
| P1 | should return a callable refetch function | #7 |
| P1 | should return only ChartDataItem fields (no leaking) | #2 |
| P1 | should pass sortBy Open_Rate and sortOrder desc to API | #2 |
| P1 | should always fetch limit=100 regardless of requested limit | #2 |
| P1 | should not fetch when enabled is false | #2 |
| P1 | should fetch when enabled is true (default) | #2 |

## Coverage Analysis

### By Priority

| Priority | Count | Purpose |
|----------|-------|---------|
| **P0** | 6 | Regression guardrails (H-1, H-2, L-1 review fixes) |
| **P1** | 35 | Edge cases, data contracts, state transitions |
| **P2** | 2 | Dynamic height calculation |
| **Total** | **43** | |

### By Acceptance Criteria

| AC | Tests | Coverage |
|----|-------|----------|
| AC#1 (Bar Chart) | 2 | Color contract validation |
| AC#2 (API Data) | 8 | Data shape, sortBy, limit=100, truncation boundary |
| AC#3 (Tooltips) | 6 | Unknown dataKey, decimal formatting, zero values, undefined payload |
| AC#4 (Selector) | 2 | Selector rendering, displayed value |
| AC#5 (Loading) | 1 | aria-busy boolean regression |
| AC#6 (Empty) | 3 | Text, no selector, data-testid |
| AC#7 (Error) | 3 | Retry refetch, no-message error, error wrapping |
| AC#8 (Responsive) | 7 | Function initializer, truncateLength, fontSize, height calc |
| AC#9 (Benchmarks) | 5 | RATE_BENCHMARKS constants, colors, dashed stroke |

### Regression Fix Coverage

| Fix | Description | Tests |
|-----|-------------|-------|
| **H-1** | queryKey must NOT include limit | 3 P0 tests |
| **H-2** | useState function initializer (no useEffect) | 2 P0 tests |
| **L-1** | aria-busy boolean (not string) | 1 P0 test |

## Test Execution

```bash
# Run all Story 5-6 tests (92 total)
npx vitest run src/__tests__/campaign-performance-chart.test.tsx src/__tests__/use-campaign-chart.test.tsx src/__tests__/campaign-chart-skeleton.test.tsx src/__tests__/campaign-chart-guardrails.test.tsx src/__tests__/campaign-chart-guardrails-hook.test.tsx

# Run guardrail tests only (43 tests)
npx vitest run src/__tests__/campaign-chart-guardrails.test.tsx src/__tests__/campaign-chart-guardrails-hook.test.tsx

# Run P0 regression guardrails only
npx vitest run src/__tests__/campaign-chart-guardrails.test.tsx src/__tests__/campaign-chart-guardrails-hook.test.tsx -t "\[P0\]"
```

## Validation Results

- **Total tests**: 43
- **Passing**: 43
- **Failing**: 0
- **Combined with existing**: 92/92 pass (49 original + 43 guardrail)

## Definition of Done

- [x] All tests follow Given-When-Then structure (comments in test body)
- [x] All tests have priority tags ([P0], [P1], [P2])
- [x] All tests use data-testid selectors for stability
- [x] All tests are self-cleaning (isolated QueryClient per test)
- [x] No hard waits or flaky patterns
- [x] Test files under 800 lines
- [x] No duplicate coverage with existing tests
- [x] Regression fixes have dedicated P0 guardrails
- [x] All 92 Story 5-6 tests pass together

## File Structure

```
eneos-admin-dashboard/src/__tests__/
├── campaign-performance-chart.test.tsx     # 28 tests (original - component)
├── use-campaign-chart.test.tsx             # 16 tests (original - hook)
├── campaign-chart-skeleton.test.tsx        # 5 tests (original - skeleton)
├── campaign-chart-guardrails.test.tsx      # 32 tests (NEW - component guardrails)
└── campaign-chart-guardrails-hook.test.tsx # 11 tests (NEW - hook guardrails)
```

## Design Decisions

1. **Two guardrail files** instead of one: `vi.mock('@/hooks/use-campaign-chart')` is required for component tests (to control hook return values), but hook-level tests need the real hook. Vitest's module-level `vi.mock` applies to the entire file, so separating into two files avoids mock conflicts.

2. **No Radix Select interaction tests**: The `@radix-ui/react-select` component uses `hasPointerCapture` which is not available in JSDOM. Testing selector changes via click events causes uncaught exceptions. Selector value display is tested instead.

3. **P0 priority** reserved exclusively for regression guardrails that prevent re-introduction of review fixes (H-1, H-2, L-1). These are the most critical tests to keep passing.

4. **Data shape contract tests** verify that `ChartDataItem` transformation does NOT leak extra fields from `CampaignStatsItem` (e.g., `opened`, `clicked`, `uniqueOpens`). This prevents accidental data exposure.

## Next Steps

1. Run in CI pipeline: `npx vitest run src/__tests__/campaign-chart-guardrails*.test.tsx`
2. Monitor for flaky tests in burn-in loop
3. Integrate with quality gate when ready
