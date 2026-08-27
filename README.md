# Covia frontend

Next.js web UI for connecting to Covia venues, browsing assets and operations,
running jobs, managing agents, and exploring workspace data.

## Development

Requirements:

- Node.js 20+
- pnpm 10
- A reachable Covia venue (local development defaults to
  `http://127.0.0.1:8080`)

```bash
pnpm install
pnpm dev
```

The app runs at <http://localhost:3000>.

Set `NEXT_PUBLIC_IS_ENV_PROD=false` to include development and local venues in
the default venue list. Production mode connects only to the released Covia
venues.

## Authentication

Authentication belongs to each venue rather than to the Next.js application:

- Device-key sign-in generates or imports an Ed25519 key in the browser.
- OAuth providers are discovered from the selected venue's job-free `/login`
  page, so only providers configured by that venue are shown. OAuth redirects
  through `/auth/{provider}` and returns a venue bearer token to
  `/auth/callback`, which sends the user back to the page where sign-in began.

Both modes are stored per venue in browser local storage under `venue-auth`.
No NextAuth secret or Google/GitHub credentials are required by this project.

## Checks

```bash
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
```

Reads used for rendering and polling must remain job-free. Use the SDK read
surfaces (`workspace`, assets, jobs, status), native `/mcp`, or `/.well-known`
endpoints. Reserve operation invocation for explicit user actions.
