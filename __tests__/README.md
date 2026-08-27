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
