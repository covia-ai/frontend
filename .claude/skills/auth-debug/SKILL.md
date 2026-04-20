---
name: auth-debug
description: Debug frontend auth state — inspect localStorage, decode JWTs, check token expiry, show current auth type and DID.
---

# Auth Debug

Inspect and diagnose the frontend authentication state.

## What to Check

### 1. Auth Store State

The auth state is persisted in localStorage under key `"venue-auth"`. Read and display:

- `deviceKeyHex` — The Ed25519 private key hex (present if device key was ever generated). This persists across logouts.
- `activeVenueId` — Currently active venue
- `authMap` — Per-venue auth entries:
  - `type: "keypair"` → Device key auth (has `privateKeyHex` and `did`)
  - `type: "bearer"` → OAuth auth (has `token` and `did`)

### 2. Token Analysis

For **bearer** auth entries:
- Decode the JWT (base64url decode header + payload)
- Show `sub` (user DID), `iss` (venue DID), `iat`, `exp`
- Calculate time until expiry (venue JWTs default to 24h)
- Warn if expired

For **keypair** auth entries:
- Show the DID (`did:key:z6Mk...`)
- Note that JWTs are minted fresh per-request (5-min lifetime), so there's no stored token to decode

### 3. Summary Format

```
Auth Debug
==========
Active Venue:  <venueId>
Auth Type:     Device Key / OAuth (<provider>)
DID:           did:key:z6Mk... / did:web:venue:u:...
Token Status:  Fresh per-request / Expires in Xh Ym / EXPIRED

Device Key:    Present / Not generated
Venues:        <count> configured
```

## Key Files

- Auth store: `src/hooks/use-auth.ts`
- Auth provider bridge: `src/lib/auth-provider.ts`
- Sign-in flow: `src/components/sign-in-button.tsx`
- OAuth callback: `src/app/auth/callback/page.tsx`
- Venue auth integration: `src/hooks/use-authenticated-venue.ts`
