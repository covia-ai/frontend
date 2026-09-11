# Venues, Reimagined — design & build spec

**Status:** building on `feat/venues`, **off develop** (independent of #362 — merges on its own).
**Direction:** **B (Your federated network)** as the base, then **C (federation map)** layered on top as a *revertible* Grid/Map view toggle — keep the map or drop back to B cleanly (chirdeep, 2026-09-11).
**Concept artefact (reimagined view):** `claude.ai/code/artifact/af32da34-0440-4123-9ad9-e1263457fbc4`
**Series:** Jobs ✓ · Agents ✓ · Operations ✓ · Connections ✓ · Home ✓ · **Venues** → Workspace/Files · Secrets/Context/Inbox

Fifth page in the reimagination series: one shared design system, on the app's theme, a strict **superset** of today (no detail lost).

## 1. What Venues is today

- **`/venues`** — search + paginated grid of compact `VenueCard`s. Card = health dot + name (`venue-name`) + remove ✕ + description (`venue-desc`) + assets/ops stats (from `/api/v1/status`) + copy-URL footer. No empty state, no default marker, DID is text-only.
- **`/venues/[slug]`** — header card (hard-coded "Active" + "covia" badges, Open/Connect/Make Default), Venue Information (URL/DID/MCP `CopyField`s), five stat cards (Assets/Operations/Adapters/Users/Jobs → nested routes), `McpConnectSection`. Connect page aggregates MCP/A2A/REST/SDK cards.
- **`VenueSelector`** — the app-wide switcher in `TopBar`.
- **Already job-safe & unpolled** — every on-load read is a REST GET (`/api/v1/status`, `jobs.list`, `adapters.list`), a `.well-known/*` GET, or the `/mcp` `tools/list` discovery POST. A grep for `.run`/`.invoke` across the surface found nothing.

## 2. What Venues becomes (B — Your federated network)

Each venue becomes a **node**: identity (a generated mark), a trust pill from real state, your standing (default), and what it offers.

- **VenueCard** — a `VenueMark` (see §3) + name + host + a **trust pill** (dot + label from `useVenueAccess` state) + a **default ★** on the selected venue + description + assets/ops stats (unchanged single status read) + a compact protocol front-door line (MCP · A2A · REST · SDK, Covia's universal surfaces) + copy-URL/open/remove; whole-card click to the node.
- **List** — a **network KPI header** (venues · reachable · your default — all from free stores, no new fetch) and a real **empty state** ("No venues connected — connect one").
- **Detail** — an **identity hero** (VenueMark + name + DID + host) with **real** status (not the hard-coded "Active"), your standing, the same five stat-card links, and the MCP/A2A/REST/SDK front door elevated. Preserves every current field/`CopyField`/section.

## 3. Identity mark — net-new `VenueMark` (important)

The audit assumed the existing DID identicon; on reading the code, `Identicon`/`identiconGridForDid` render **only for `did:key`** and return `null` otherwise. Venues are **`did:web`**, so that identicon is blank for them. `VenueMark` is therefore net-new: a small, deterministic, symmetric two-tone grid hashed from the `venueId`, in brand tokens — self-contained on develop (no agents-branch dependency, so Venues stays independent of #362). It falls back to the real Convex `Identicon` if a venue ever is a `did:key`.

## 4. C — Federation map (revertible, on top of B)

A **Grid / Map** view toggle on the list. Grid = B's card grid (default). Map = a dependency-free SVG network view: your venues as nodes (VenueMark) in a radial/mesh layout around a "you" centre, edges to each, trust encoded by colour, click a node → its detail. Built in its own commit(s) so it reverts to B (grid-only) by dropping the toggle + `VenueNetworkMap` component. No graph library (keeps deps/perf clean).

## 5. Parity map (superset)

Health dot (`venue-health-dot` + `data-health`) → folded into the trust pill, same dot + vocabulary. Name (`venue-name`), description (`venue-desc`), assets/ops (`–` never a false 0), copy-URL, remove (`remove_btn`), add (`venue-addbtn`, "Connect to a venue") → all kept, same testids/modals. Detail header/URL/DID/MCP `CopyField`s, five stat cards, `McpConnectSection`, Connect page `mcp/a2a/rest/sdk` sections → all kept. Search · pagination · `VenueSelector` → unchanged (selector left as-is — it's app-wide via TopBar). Added: VenueMark · trust pill · default ★ · protocol line · network KPI header · empty state · (C) map view.

## 6. Testing

Keep green (19 venues test files): `VenueCard` (`venue-name`/`venue-desc`/URL/remove/compact), `VenueHealthDot` (full `data-health` vocabulary), `AddNewVenueModal`/`RemoveVenueModal` (`connect-venue-trigger`/`add-title`/`venue-addbtn`/`remove_btn`/`remove-title`/PNA), `ConnectPanel`/`McpConnectSection`/`VenueSelector`/`UsersList`, and the data-logic suites (`use-venues`, `venue-registry`, `venue-display`, `venue-auth-probe`) — untouched. Add: `VenueMark` (deterministic + symmetric), trust-pill label per state, default ★ on selected, network KPI header sums, empty state, and a job-safety assertion (no `run`/`invoke` on load); C adds a map-view toggle test. Full `pnpm test` + `tsc` + `eslint` green; live pass signed-out & signed-in across reachable/public/unreachable venues.

## 7. Dependencies & blast radius

- **Modify (venues-only):** `VenueCard`, `venues/page.tsx`, `venues/[slug]/page.tsx`.
- **New:** `VenueMark`, a network-KPI header bit, empty state, (C) `VenueNetworkMap` + view toggle, a small free-store `use-venue-network` aggregation.
- **Reuse, unchanged:** `VenueHealthDot`, `useVenueAccess`, `useVenues`, `getVenueStatus`/`venue-registry`, `CopyField`, `ContentLayout`/`TopBar`/`ListToolbar`/`PaginationHeader`, `McpConnectSection`/`A2ACard`/`Rest`/`SDK`, `Identicon` (fallback).
- **Care point:** `VenueSelector` is app-wide via `TopBar` — left untouched to avoid a cross-page blast radius. No new external libraries.
- **No unmerged-branch dependency** — builds and merges independently of the agents stack.

## 8. Impact & risk

Job-safety already a PASS — preserve it (reads stay GET/`.well-known`/`tools/list`; 30s status cache; `–` not 0). `data-health` states are a tested contract — the trust pill re-skins the same states, no new machine. Signed-out list renders; public/sign-in/unreachable states preserved; dev-vs-prod discovery (`NEXT_PUBLIC_IS_ENV_PROD`) and the PNA hint untouched. Route-scoped vs global selection stays decoupled (#199/#209); identity-migration reconciliation preserved. Rollback: isolated to venues components (and C reverts to B by dropping the toggle).

## 9. Rollout

Worktree `venues-redesign` · branch `feat/venues` off develop · dev `:3021`. Order: (1) `VenueMark` + `VenueCard`; (2) list KPI header + empty state; (3) detail identity hero + real status + elevated connect; (4) **C** map view toggle (separate commits, revertible). Verify live signed-out & signed-in across venue states; full suite + `tsc` + `eslint`; show before push; PR → develop (independent of #362), commit-by-commit body, assigned Anupama.
