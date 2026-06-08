---
name: test
description: Run frontend lint, type-check, and Jest tests. Reports a summary of all results.
---

# Test

Run the full frontend quality check: lint, type-check, and unit tests.

## Steps

Run these sequentially — stop on first failure:

1. **Lint:**
```bash
cd frontend && pnpm lint
```

2. **Type-check (via build):**
```bash
pnpm build
```

3. **Unit tests:**
```bash
pnpm test
```

## Notes

- Tests are in `__tests__/` at the project root
- Tests use Jest 30 + jsdom + @testing-library/react
- Test files follow the pattern `ComponentName.test.tsx` or `hook-name.test.ts`
- To run a single test: `pnpm test -- --testPathPattern=ComponentName`
- To clear cache if tests behave strangely: `pnpm jest:clear`

## Summary Format

Report results as:

```
Frontend Quality Check
======================
Lint:       PASS / FAIL (error count)
Type-check: PASS / FAIL (error summary)
Tests:      X passed, Y failed, Z total
```
