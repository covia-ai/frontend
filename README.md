# Covia frontend

Next.js web UI for connecting to Covia venues, browsing assets and operations,
running jobs, managing agents, and exploring workspace data.

## Development

Requirements:

- Node.js 22, as CI uses (Next.js itself needs 20.9 or later, and Node 20
  is past end of life)
- pnpm 10
- A reachable Covia venue (local development defaults to
  `http://127.0.0.1:8080`)

```bash
pnpm install
pnpm dev
```

The app runs at <http://localhost:3000>.

Production mode (the default, app.covia.ai) connects only to the stable
venues venue-1 and venue-2, which run released builds. Set
`NEXT_PUBLIC_IS_ENV_PROD=false` (preview.covia.ai and local development) to
connect to the dev venue venue-test, the QA venues venue-3 and venue-4, and a
local venue at `http://127.0.0.1:8080` instead.

## Analytics

GA4 and PostHog, both gated on the analytics cookie-consent category and both
inert during local development. See [docs/analytics.md](docs/analytics.md) for
the configuration, the event taxonomy, and the two decisions that deviate from
the D070 spec (identity is a hashed DID, and session replay stays off).

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | unset | PostHog project key. PostHog does not load while unset. |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | PostHog ingestion host. |
| `NEXT_PUBLIC_POSTHOG_SESSION_RECORDING` | unset | Session replay. Leave unset — needs a privacy policy update first. |
| `NEXT_PUBLIC_ANALYTICS_DEBUG` | unset | Let a non-production host send to the real GA4 property. |

## Authentication

Authentication belongs to each venue rather than to the Next.js application:

- Device-key sign-in generates or imports an Ed25519 key in the browser. The
  key is kept per venue in local storage under `venue-auth` and survives
  sign-out.
- OAuth providers are discovered from the selected venue's job-free `/login`
  page, so only providers configured by that venue are shown. Sign-in goes to
  the venue's `/auth/{provider}` with a per-tab state and an S256 PKCE
  challenge; the venue returns a one-use code to `/auth/callback`, which
  exchanges it at the venue's `/auth/exchange` for a bearer token and sends the
  user back to the page where sign-in began. The bearer stays in memory only,
  so it is gone after sign-out or a reload.

A venue that offers OAuth must accept this app's callback,
`<frontend origin>/auth/callback`, as an exact redirect URI: covia's
`auth.loginRedirectUris`, HTTPS except on loopback. The code exchange needs a
venue at covia 0.10.0 or later.

No NextAuth secret or Google/GitHub credentials are required by this project.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

### End-to-end tests (Playwright)

Browser tests in `e2e/` run the app in Chromium against a mocked venue, so no
Java venue is needed. They reuse a running `pnpm dev` on port 3000, or start
one.

```bash
pnpm exec playwright install chromium   # once, after pnpm install
pnpm test:e2e                           # run all, headless
pnpm test:e2e:ui                        # interactive runner
pnpm test:e2e --headed -g "catalog"     # watch matching tests in a visible browser
pnpm exec playwright show-report        # HTML report of the last run
```

How to write tests with the mock venue fixture: [e2e/README.md](e2e/README.md).

Reads used for rendering and polling must remain job-free. Use the SDK read
surfaces (`workspace`, assets, jobs, status), native `/mcp`, or `/.well-known`
endpoints. Reserve operation invocation for explicit user actions.

Upcoming venue changes and transitional response handling are tracked in
[Covia 0.12 compatibility](docs/covia-012-compatibility.md).
