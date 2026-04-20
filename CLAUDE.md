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
│   ├── api/                # API routes
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── admin-panel/        # Admin panel components
│   ├── sign-in-button.tsx  # Auth sign-in (OAuth + device key)
│   └── ...                 # Feature components
├── hooks/                  # Custom React hooks
│   ├── use-auth.ts         # Auth state (Zustand store, localStorage)
│   ├── use-authenticated-venue.ts  # Venue instance with auth
│   ├── use-venue.ts        # Current venue state
│   ├── use-venues.ts       # Multi-venue management
│   └── use-polling.ts      # Polling helper
├── lib/                    # Utilities
│   ├── auth-provider.ts    # Converts stored auth → SDK Auth objects
│   └── utils.ts            # General helpers
└── config/                 # App configuration
__tests__/                  # Jest test files (root level)
```

## Key Patterns

### Authentication

Two auth modes, both stored in localStorage under key `"venue-auth"`:

- **Device Key** — Ed25519 keypair generated client-side, stored as hex. Uses `KeyPairAuth` from SDK. Key persists across logouts.
- **OAuth** — Redirects to venue's `/auth/{provider}` endpoint, receives bearer token on callback. Uses `BearerAuth` from SDK.

Key files: `hooks/use-auth.ts` (Zustand store), `lib/auth-provider.ts` (SDK bridge), `components/sign-in-button.tsx` (UI).

### Authenticated API Calls

Use the `useAuthenticatedVenue()` hook to get a `Venue` instance with auth pre-configured:

```typescript
const venue = useAuthenticatedVenue();
// venue.assets.list(), venue.jobs.list(), etc.
```

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

- **@covia/covia-sdk** — Installed from GitHub (`github:covia-ai/covia-sdk`). Provides `Grid`, `Venue`, `KeyPairAuth`, `BearerAuth`, `generateKeyPair`, `privateKeyToHex`.
- **Covia venue server** — Frontend connects to a running venue for all API calls. Default dev venue at `localhost:8080`.
