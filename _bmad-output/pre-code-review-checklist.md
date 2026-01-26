# Pre-Code-Review Checklist

> **Purpose:** Catch common issues BEFORE code review to reduce review cycles.
> **Created:** Epic 4 Retrospective Action Item #2
> **Owner:** Bob (SM Agent)
> **Last Updated:** 2026-01-19

---

## How to Use

Before requesting code review, run through this checklist. Check off each item or mark N/A if not applicable.

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

## Quick Reference: Common Epic 4 Issues

| Issue | How to Avoid |
|-------|--------------|
| API param mismatch | Check `docs/api/api-contract.md` |
| NaN from dates | Use `safeGetTime()` or check `isNaN()` |
| Whitespace not hidden | Check `value.trim() === ''` |
| Touch target too small | Use `min-h-[44px]` and `px-3 py-2` |
| Missing focus state | Add `focus-visible:ring-2` |
| Missing aria-sort | Add to sortable column headers |
| Time in wrong unit | Backend returns MINUTES, not seconds |

---

## Checklist Summary

Before requesting code review, confirm:

```
[ ] Edge cases handled (null, undefined, empty, whitespace, NaN)
[ ] Accessibility complete (keyboard, screen reader, touch)
[ ] UI states covered (loading, empty, error, responsive)
[ ] API integration correct (param names, response handling)
[ ] Code quality verified (TypeScript, React patterns, tests)
[ ] Documentation updated (story file, comments)
```

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-19 | Initial version from Epic 4 Retrospective | Bob (SM Agent) |
