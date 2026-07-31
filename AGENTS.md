# CLAUDE.md

## Project Overview

Covia frontend — Next.js web UI for interacting with Covia venue servers via `@covia/covia-sdk`. Provides asset browsing, operation execution, job monitoring, agent management, and workspace exploration.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.9+
- **React:** 19
- **State Management:** Zustand 5 (with `persist` middleware for localStorage)
- **Styling:** Tailwind CSS 4, shadcn/ui (Radix primitives under `components/ui/`)
- **Package Manager:** pnpm
- **Testing:** Jest 30, jsdom, @testing-library/react

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build (also serves as type-check)
pnpm lint             # ESLint
pnpm test             # Run Jest tests
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (demo)/             # Demo routes
│   ├── (signup)/signUp/    # Sign-up page
│   ├── auth/callback/      # OAuth callback handler
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── admin-panel/        # Admin panel components
│   ├── sign-in-button.tsx  # Auth sign-in (OAuth + device key)
│   └── ...                 # Feature components
├── hooks/                  # Custom React hooks
│   ├── use-auth.ts         # Auth state (Zustand store, localStorage)
│   ├── use-authenticated-venue.ts  # Shared cached Venue instance per (venue, auth)
│   ├── use-venue.ts        # Current venue state
│   └── use-venues.ts       # Multi-venue management
├── lib/                    # Utilities
│   ├── auth-provider.ts    # Converts stored auth → SDK Auth objects
│   └── utils.ts            # General helpers
└── config/                 # App configuration
__tests__/                  # Jest test files (root level)
```

## Key Patterns

### Authentication

Two auth modes, both stored in localStorage under key `"venue-auth"`:

- **Device Key** — Ed25519 keypair generated client-side, stored as hex. Uses `Ed25519Auth` from SDK. Key persists across logouts.
- **OAuth** — Redirects to venue's `/auth/{provider}` endpoint, receives bearer token on callback. Uses `BearerAuth` from SDK.

Key files: `hooks/use-auth.ts` (Zustand store), `lib/auth-provider.ts` (SDK bridge), `components/sign-in-button.tsx` (UI).

### Authenticated API Calls

Use the `useAuthenticatedVenue()` hook to get a `Venue` instance with auth pre-configured:

```typescript
const venue = useAuthenticatedVenue();
// venue.assets.list(), venue.jobs.list(), etc.
```

Both the hook and the `getVenueFor(venueObj, auth)` helper it wraps return a
**single cached `Venue` instance per (venue, auth)** and validate the connection
with a background `status()`. Never `new Venue({...})` in a component — that
discards the SDK's per-instance state (asset cache, capability detection) and
skips connection validation.

### Reads must not create jobs

Every operation `invoke` persists a job to the venue's lattice. So the UI may
only invoke for **user-driven executions** (running an operation, calling a
tool, messaging an agent, writing/deleting). Page loads, polls, navigation and
data display must read via job-free surfaces: REST GETs (`/api/v1/assets|jobs|
operations|secrets|status`), the values API (`GET /api/v1/values/*`), the native
`/mcp` JSON-RPC endpoint, and `/.well-known/*`. Treat a non-user-driven
`operations.run`/`invoke` as a defect.

### Notifications

All user-facing notifications go through `src/lib/notify.ts` — never bare
sonner `toast()`. `notifyError(title, err, target?)` for failures (always pass
the caught error — it becomes a copyable description, and bare network
failures get the unreachable target named); `notifySuccess` / `notifyWarning`
/ `notifyInfo` for the rest. Failure titles read "Unable to <verb> <object>".
Every notification is recorded to the in-memory session log
(`use-notification-log.ts`), viewable on the Profile page.

### Components

- All components are functional, use `"use client"` directive
- UI primitives from `components/ui/` (shadcn/ui pattern)
- Styling via Tailwind utility classes
- Icons from `lucide-react` and `react-icons`

## Testing

- **Framework:** Jest 30 + ts-jest + jest-environment-jsdom
- **Libraries:** @testing-library/react, @testing-library/user-event
- **Location:** `__tests__/` directory at project root
- **Naming:** `ComponentName.test.tsx` or `hook-name.test.ts`

## Dependencies on Other Repos

- **@covia/covia-sdk** — Installed from npm (`@covia/covia-sdk`, pinned in `package.json`). Provides `Grid`, `Venue`, `Ed25519Auth`, `BearerAuth`, `generateKeyPair`, `privateKeyToHex`.
- **Covia venue server** — Frontend connects to a running venue for all API calls. Default dev venue at `localhost:8080`.
