# Pre-Code-Review Checklist

> **Purpose:** Catch common issues BEFORE code review to reduce review cycles.
> **Created:** Epic 4 Retrospective Action Item #2
> **Updated:** Epic 5 Retrospective Action Items #1, #2, #3
> **Owner:** Bob (SM Agent)
> **Last Updated:** 2026-01-31

---

## How to Use

Before requesting code review, run through this checklist. Check off each item or mark N/A if not applicable.

---

## 0. File Size & Structure (Epic 5 Action Item #1)

> **Why:** Story 5-7 reached 451 lines, requiring rework during code review. Check BEFORE requesting review.

### Component Files
- [ ] **File size < 300 lines** - No single component file exceeds 300 lines
- [ ] **Split if > 200 lines** - Files 200+ lines should be split into sub-components
- [ ] **Extract hooks** - Complex state logic extracted to `use-*.ts` custom hooks
- [ ] **Extract sub-components** - Reusable UI sections in separate files

### Quick Check Command
```bash
# Find files > 200 lines in components (run from admin-dashboard root)
find src/components -name "*.tsx" -exec awk 'END{if(NR>200)print NR" "FILENAME}' {} \;
```

### Split Pattern (from Story 5-7)
```
# BEFORE: CampaignDetailSheet.tsx (451 lines)
# AFTER:
CampaignDetailSheet.tsx (225 lines)  # Main orchestrator
├── CampaignEventTable.tsx           # Extracted sub-component
├── CampaignMetricsSummary.tsx       # Extracted sub-component
└── hooks/useCampaignDetail.ts       # Extracted hook
```

---

## 0b. SSR/Hydration Safety (Epic 5 Action Item #2)

> **Why:** Stories 5-4, 5-6, 5-8 all had SSR hydration mismatches. This was the #1 recurring code review issue in Epic 5.

### Client Directive Check
- [ ] **`'use client'` added** - Components using these MUST have `'use client'` as first line:
  - `useState`, `useEffect`, `useRef`, `useReducer`
  - `useRouter()`, `usePathname()`, `useSearchParams()`
  - `onClick`, `onChange`, `onSubmit` handlers
  - Browser APIs (`window`, `document`, `localStorage`)
  - Third-party hooks (TanStack Query, TanStack Table)

### Hydration Mismatch Prevention
- [ ] **No Date in initial render** - Use `useEffect` for `new Date()` / `Date.now()`
- [ ] **No `Math.random()`** - Don't generate random values during render
- [ ] **No `window` checks** - Use `typeof window !== 'undefined'` in `useEffect` only
- [ ] **Suspense boundary** - Components using `useSearchParams()` wrapped in `<Suspense>`

### Quick Pattern
```typescript
// WRONG - Causes hydration mismatch
export function TimeDisplay() {
  return <span>{new Date().toLocaleString()}</span>
}

// CORRECT - Client-side only
'use client'
export function TimeDisplay() {
  const [time, setTime] = useState('')
  useEffect(() => setTime(new Date().toLocaleString()), [])
  return <span>{time}</span>
}
```

---

## 1. Edge Cases

### Data Handling
- [ ] **Null values** - Does the code handle `null` gracefully?
- [ ] **Undefined values** - Does the code handle `undefined` gracefully?
- [ ] **Empty strings** - Does `""` display correctly or get hidden?
- [ ] **Whitespace-only strings** - Does `"   "` get trimmed/hidden?
- [ ] **Empty arrays** - Does `[]` show empty state?
- [ ] **Large numbers** - Do numbers overflow or display correctly?
- [ ] **Long strings** - Do long text values truncate or wrap properly?

### Date/Time
- [ ] **Invalid dates** - Does the code handle invalid date strings?
- [ ] **NaN from dates** - Is `new Date('invalid').getTime()` handled (returns NaN)?
- [ ] **Timezone** - Are dates displayed in correct timezone?
- [ ] **Date formatting** - Is format consistent (e.g., "DD MMM YYYY")?

### Numbers
- [ ] **Division by zero** - Is percentage calculation safe when denominator is 0?
- [ ] **Negative numbers** - Are negative values handled/displayed correctly?
- [ ] **Decimal precision** - Are decimals rounded appropriately?

---

## 2. Accessibility (WCAG)

### Keyboard Navigation
- [ ] **Tab order** - Can all interactive elements be reached via Tab?
- [ ] **Enter/Space** - Do buttons/links respond to Enter and Space?
- [ ] **Escape** - Do modals/dialogs close on Escape?
- [ ] **Focus visible** - Is focus indicator visible (`focus-visible:ring-2`)?

### Screen Readers
- [ ] **aria-label** - Do icons/buttons have descriptive labels?
- [ ] **aria-busy** - Is loading state announced?
- [ ] **aria-sort** - Do sortable columns indicate sort direction?
- [ ] **aria-hidden** - Are decorative icons hidden from screen readers?
- [ ] **role attributes** - Are custom components properly identified?

### Touch Targets
- [ ] **Minimum size** - Are touch targets at least 44x44px?
- [ ] **Padding** - Is there enough spacing between clickable elements?

---

## 3. UI/UX

### Loading States
- [ ] **Skeleton** - Does loading show appropriate skeleton?
- [ ] **Spinner** - Is there feedback during async operations?
- [ ] **Disabled state** - Are buttons disabled during loading?

### Empty States
- [ ] **Empty message** - Is there a helpful message when no data?
- [ ] **Action suggestion** - Does empty state suggest what to do?

### Error States
- [ ] **Error message** - Is error displayed in user-friendly language?
- [ ] **Retry option** - Can user retry after error?
- [ ] **Error boundary** - Is there a fallback UI for component errors?

### Responsive Design
- [ ] **Mobile** - Does layout work on mobile (<768px)?
- [ ] **Tablet** - Does layout work on tablet (768-1024px)?
- [ ] **Overflow** - Is horizontal scroll handled properly?

---

## 4. API Integration

### Parameter Names
- [ ] **Match backend** - Do parameter names match backend exactly?
  - Use `owner` not `salesOwnerId`
  - Use `sortOrder` not `sortDir`
  - Reference: `docs/api/api-contract.md`

### Response Handling
- [ ] **Success case** - Is successful response handled?
- [ ] **Error case** - Are API errors handled gracefully?
- [ ] **Empty response** - Is empty data array handled?
- [ ] **Pagination** - Is pagination metadata used correctly?

### Data Transformation
- [ ] **Time values** - Are time values in MINUTES (not seconds)?
- [ ] **Row ID** - Is row number used as primary key (starts at 2)?
- [ ] **Date format** - Are dates in ISO 8601 format?

---

## 5. Code Quality

### TypeScript
- [ ] **Type safety** - Are types properly defined (no `any`)?
- [ ] **Null checks** - Are optional fields checked before use?
- [ ] **Type imports** - Are type-only imports using `import type`?

### React Patterns
- [ ] **Key prop** - Do lists have unique `key` props?
- [ ] **useCallback** - Are callbacks memoized to prevent re-renders?
- [ ] **useMemo** - Are expensive calculations memoized?
- [ ] **useEffect deps** - Are effect dependencies complete?

### Testing
- [ ] **Unit tests** - Are new functions tested?
- [ ] **Component tests** - Are new components tested?
- [ ] **Edge case tests** - Are edge cases covered?
- [ ] **All tests pass** - Does `npm test` pass?

---

## 6. Documentation

### Story File
- [ ] **Tasks checked** - Are completed tasks marked `[x]`?
- [ ] **Dev notes** - Are implementation decisions documented?
- [ ] **File list** - Are all changed files listed?

### Code Comments
- [ ] **Complex logic** - Is non-obvious code commented?
- [ ] **Story reference** - Do components reference their story?

---

## Quick Reference: Common Issues

### From Epic 4
| Issue | How to Avoid |
|-------|--------------|
| API param mismatch | Check `docs/api/api-contract.md` |
| NaN from dates | Use `safeGetTime()` or check `isNaN()` |
| Whitespace not hidden | Check `value.trim() === ''` |
| Touch target too small | Use `min-h-[44px]` and `px-3 py-2` |
| Missing focus state | Add `focus-visible:ring-2` |
| Missing aria-sort | Add to sortable column headers |
| Time in wrong unit | Backend returns MINUTES, not seconds |

### From Epic 5
| Issue | How to Avoid |
|-------|--------------|
| Component > 300 lines | Split before code review, extract hooks + sub-components |
| Hydration mismatch | Add `'use client'`, no Date in render, Suspense for searchParams |
| Naming conflict | Check existing component names before creating new ones |
| Missing TEA guardrail | Run TEA after every story approval |

---

## Checklist Summary

Before requesting code review, confirm:

```
[ ] File size checked - No component > 300 lines (Epic 5 Action #1)
[ ] SSR/Hydration safe - 'use client' added where needed (Epic 5 Action #2)
[ ] Edge cases handled (null, undefined, empty, whitespace, NaN)
[ ] Accessibility complete (keyboard, screen reader, touch)
[ ] UI states covered (loading, empty, error, responsive)
[ ] API integration correct (param names, response handling)
[ ] Code quality verified (TypeScript, React patterns, tests)
[ ] Documentation updated (story file, comments)
```

After code review APPROVED, confirm:

```
[ ] TEA Guardrail Automation run (Epic 5 Action #3)
```

---

## 7. Post-Implementation: TEA Guardrail (Epic 5 Action Item #3)

> **Why:** TEA guardrail automation caught 3 production bugs in Epic 5 (isBelow logic, race condition, async error handling). Run after EVERY story.

### When to Run
- After code review is **APPROVED**
- Before marking story as **done**

### How to Run
```
/bmad:bmm:agents:tea
# Select: [TA] TEA Automate (expand test coverage)
```

### Expected Outcome
- TEA analyzes existing tests and source code
- Generates additional guardrail tests for edge cases
- May discover bugs in source code (happened 3 times in Epic 5)
- Typical output: +25-80 new tests per story

### Epic 5 TEA Results (Reference)
| Story | New Tests | Bugs Found |
|-------|-----------|------------|
| 5-1 | +40 | Race condition in unique counting |
| 5-5 | +80 | `isBelow` logic bug |
| 5-7 | +48 | - |
| 5-9 | +25 | - |

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-19 | Initial version from Epic 4 Retrospective | Bob (SM Agent) |
| 2026-01-31 | Added Section 0: File Size & Structure (Epic 5 Action #1) | Amelia (Dev Agent) |
| 2026-01-31 | Added Section 0b: SSR/Hydration Safety (Epic 5 Action #2) | Amelia (Dev Agent) |
| 2026-01-31 | Added Section 7: TEA Guardrail post-implementation step (Epic 5 Action #3) | Amelia (Dev Agent) |
| 2026-01-31 | Added Epic 5 Common Issues to Quick Reference | Amelia (Dev Agent) |
