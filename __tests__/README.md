# Test organization

Tests are grouped by product feature so component, hook, and utility coverage for
the same behavior stays together:

- `agents`, `assets`, `auth`, `hitl`, `jobs`, `operations`, `venues`, `workspace`
  cover their corresponding product areas.
- `demos` covers interactive examples and their fixtures.
- `shared/ui` covers reusable UI and navigation behavior.
- `shared/platform` covers cross-cutting utilities, notifications, persistence,
  pagination, and tracking.

Add new tests to the narrowest existing feature directory. Introduce a new
top-level directory only when a product area has enough tests to form a useful
group; do not add test files directly to `__tests__`.

## Job and account isolation regressions

- `operations/use-execution-lifecycle.test.ts` delays message sends while
  changing jobs or venues. Drafts and busy state belong to their original
  target; a late completion must neither refresh the new target nor erase
  text entered after sending. Overlapping sends finish independently.
- `agents/TaskTypedResult.test.tsx` switches authenticated SDK clients on the
  same venue DID, including while a read is in flight. Completed results are
  cached by client identity and job, so another account must perform its own
  authorised read. Job links retain the venue that supplied the result.
