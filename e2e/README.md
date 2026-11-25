# Browser end-to-end tests (Playwright)

These specs drive the real app in Chromium against a **mocked venue**, so no
Java venue is needed. Jest (`__tests__/`) covers units and components; this
covers what only a real browser shows: routing, hydration, the SDK's real
requests, and whole user flows.

```bash
pnpm test:e2e                 # headless; reuses a running `pnpm dev` on :3000
pnpm test:e2e:ui              # interactive runner: watch, time-travel, pick locators
pnpm test:e2e -g "catalog"    # tests whose title matches
pnpm exec playwright show-trace test-results/<test>/trace.zip   # after a CI retry
```

If no dev server is running, Playwright starts one. CI builds and serves
production instead (`playwright.config.ts`). Don't run `pnpm build` while
`pnpm dev` is up.

## Writing a test

Import `test` and `expect` from the fixture, not from `@playwright/test`:

```ts
import { expect, operationMeta, problem, test } from "./fixtures/mock-venue";

test("lists the venue's operations", async ({ page, venue }) => {
  venue.setValues({ "v/ops": { json: { assoc: operationMeta("JSON Assoc", "json:assoc") } } });
  await page.goto("/operations");
  await expect(page.getByText("v/ops/json/assoc")).toBeVisible();
  expect(venue.invocations()).toEqual([]);   // page loads must not create jobs
});
```

The `venue` fixture:

| Call | Does |
|---|---|
| `venue.setValues({ "v/ops": {...} })` | Lattice served by the values API (catalogs, workspace) |
| `venue.signIn()` | Start signed in with a fixed test device key (call before `goto`) |
| `venue.onInvoke((op, input) => ({ status, output }))` | How an invoked job finishes; jobs are then readable and streamed |
| `venue.on("GET", "/api/v1/…", handler)` | Mock or override any route; return JSON, `problem(status, detail)`, or `sse(...events)` |
| `venue.onMcp("tools/list", () => ({ tools }))` | Answer an MCP JSON-RPC method |
| `venue.requests` / `venue.invocations()` | What the app sent, for asserting request bodies |

**A venue request with no handler fails the test**, listing what was missed.
That is deliberate: add a handler to the fixture (if every page needs it) or
to the test, using the shape the venue really returns (covia `CoviaAPI`,
`ApiErrors`, and the SDK's types). Use `venue.allowUnhandled(path)` only for
requests that are truly irrelevant to the test.

Every other origin (the hosted venues, analytics) is refused as unreachable,
so tests never touch the network.

## Conventions

- Locate by role and accessible name (`getByRole("button", { name: "invoke operation" })`),
  else by visible data; add a `data-testid` where neither works. Avoid CSS classes.
- Assert through `expect(...)` (it retries); never `waitForTimeout`.
- Seed data with unique, obvious strings (`"mock-output-7f3a"`) so a match can't be accidental.
- One behaviour per test. Tests run in parallel, each with its own browser context.
- `pnpm exec playwright codegen localhost:3000` records clicks into a draft spec; tidy it after.
