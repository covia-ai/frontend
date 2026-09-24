---
name: test
description: Run frontend lint, type-check, and Jest tests. Reports a summary of all results.
---

# Test

Run the full frontend quality check: lint, type-check, and unit tests.

## Steps

Run from this repo root — stop on first failure:

1. **Lint:**
```bash
pnpm lint
```

2. **Type-check:**
```bash
pnpm typecheck
```

   Covers `__tests__/`, which `next build` does not. It does *not* cover App
   Router page/layout/route signatures: those live in `.next/types/`, which is
   gitignored, so on a fresh checkout that part of `tsconfig.json`'s `include`
   matches nothing. CI's `build` job (`pnpm build`) is what validates them —
   don't run `pnpm build` here to close the gap, it corrupts the `.next` cache
   of a dev server already running on port 3000.

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
