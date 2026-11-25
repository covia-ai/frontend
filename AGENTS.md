# Frontend — Agent instructions

Canonical instructions for Cursor, Claude Code, Codex, and other agents working
in this repo. Skills live under `.claude/skills/` (`add-component`, `add-page`,
`auth-debug`, `dev`, `test`); Cursor file-scoped rules under `.cursor/rules/`.

Next.js web UI for Covia venues via `@covia/covia-sdk` (from npm, pinned in
`package.json`): assets, operations, jobs, agents, workspace. App Router,
React, TypeScript, Zustand (`persist`), Tailwind with shadcn/ui primitives in
`src/components/ui/`, pnpm, Jest with jsdom and Testing Library. Design system:
`docs/design-system.md`.

## Commands

```bash
pnpm install
pnpm dev              # localhost:3000; non-production builds also list a local venue at 127.0.0.1:8080
pnpm lint
pnpm typecheck        # tsc --noEmit; covers __tests__/, which build does not
pnpm build            # also type-checks the app graph
pnpm test             # Jest without coverage
pnpm test:coverage    # what CI runs; coverage is reported, never gated
pnpm test:e2e         # Playwright, against a mocked venue (e2e/README.md)
pnpm test:e2e:venue   # Playwright, against a real venue on :8080 (start it first)
```

Never run `pnpm build` while `pnpm dev` is running: both write `.next/` and the
dev server breaks (`Cannot find module './NNN.js'`, 500s). Stop dev first; if
it happens, stop dev, delete `.next`, restart.

## Layout

`src/app/` App Router pages; `src/components/` feature components (`ui/` is
shadcn, don't edit by hand); `src/hooks/` hooks and Zustand stores;
`src/lib/` helpers; `src/config/` app configuration; `__tests__/` Jest suites
(`ComponentName.test.tsx`, `hook-name.test.ts`; shared doubles in
`__tests__/support/`, imported as `@test/...`).

## Key patterns

**Auth.** Device keys (Ed25519, `Ed25519Auth`) persist in the `venue-auth`
store; OAuth bearer tokens (`BearerAuth`, S256 PKCE) stay in memory in the
current tab and are never persisted. Files: `hooks/use-auth.ts`,
`lib/auth-provider.ts`, `components/sign-in-button.tsx`.

**Venue access.** Use `useAuthenticatedVenue()` or `getVenueFor(venue, auth)`:
one cached `Venue` per (venue, auth), validated in the background. Never
`new Venue({...})` in a component.

**Reads must not create jobs.** Every `invoke`/`operations.run` persists a job.
Invoke only for user-driven actions (run an operation, call a tool, message an
agent, write/delete). Page loads, polls and display read job-free: REST GETs
(`/api/v1/assets|jobs|operations|secrets|status`), `GET /api/v1/values/*`,
`/mcp` JSON-RPC, `/.well-known/*`. Catalogs use
`listAssets({ expand: "metadata" })`, one GET, no per-asset hydration. DLFS
reads go through `venue.dlfs`, never `dlfs:*` operations.

**Venue reads and derived state.** Venue-scoped reads use `useVenueRead`;
reads keyed on more than the venue use `useLatestQuery`, storing the result
with its key and comparing during render. Never reset state in an effect when
an input changes: derive it, remount with `key`, or read browser-held values
with `useStoredValue`. Effects needing latest props use `useEffectEvent`. The
React Hooks lint rules are at error level; don't downgrade or disable them.

**Theme.** Markup must not branch on the theme in JavaScript (hydration
mismatch). Use the `dark:` variant; for the theme as a value use
`useResolvedTheme`; read `useTheme().resolvedTheme` only in event handlers.

**Notifications.** Only through `src/lib/notify.ts`, never bare sonner
`toast()`. `notifyError(title, err, target?)` always gets the caught error;
titles read "Unable to <verb> <object>". Notifications are logged to
localStorage, so never put a secret or token in one.

**Clipboard.** Never `navigator.clipboard`; use `writeTextToClipboard`
(`lib/clipboard.ts`) or `useCopyFeedback` for copy buttons.

**Routes.** Breadcrumb labels and section links come from
`src/lib/breadcrumbs.ts`; add an entry only when title-casing reads wrongly.
Crumbs are `<Link>`s, not `onClick` navigation.

**Persisted stores.** Use `browserStorage` (`lib/persist-storage.ts`). A custom
`merge` must accept `persisted === undefined`. Stores whose loss matters also
call `syncStoreAcrossTabs`.

**Components.** Functional, `"use client"`, Tailwind, icons from `lucide-react`
or `react-icons`. DIDs and public keys render via `DidDisplay`.

## Testing

Assert behaviour and rendered data, not microcopy; give structural markers a
`data-testid`. Coverage instrumentation slows UI-heavy suites, so a test near
2 s locally can hit the 5 s timeout in CI: prefer `user.paste` to `user.type`
for long strings and `userEvent.setup({ delay: null })`.

Browser flows go in `e2e/` (Playwright) using the mock venue fixture in
`e2e/fixtures/mock-venue.ts`; a venue request it has no handler for fails the
test. Flows that need the real stack go in `e2e/venue/` with
`e2e/fixtures/real-venue.ts`. See `e2e/README.md`.

## Git workflow

`develop` is protected: changes land through a PR once lint, build and test
pass. Work on a topic branch (`fix/…`, `feat/…`, `chore/…`). Agents may merge
their own PRs into `develop` (`gh pr merge --squash --delete-branch`) when CI is
green, without asking. Merges into `main`, releases and tags need explicit
approval from a human maintainer.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
