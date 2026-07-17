# Covia Frontend Design System

Source of truth for how the frontend looks and why. Token values live in
`src/app/globals.css`; this document explains what they mean and how to use
them. If this file and the code disagree, the code wins — update this doc in
the same PR that changes a token.

## 1. Principles

- **The signature is the Grid, not a gradient.** Covia's distinctive visual
  surface is the operation graph (`DiagramViewer.tsx`, React Flow nodes/edges)
  — an actual DAG of the thing the product does. Spend design effort there
  before reaching for decorative color effects on headlines or chrome.
- **Status has one meaning, everywhere.** Job and agent lifecycle states map
  to five tones (`active / success / attention / failure / neutral`) defined
  once in `src/lib/status.ts`. Never hand-roll a new status→color switch in a
  component — import `StatusBadge`.
- **Data gets a data face.** IDs, DIDs, hashes, adapter strings, and JSON are
  set in monospace (`font-mono`, Geist Mono). Prose is set in the display/body
  face. Size alone is not hierarchy — typeface choice is.
- **Badges encode a role, not just a color.** A badge showing a system fact
  (adapter type, resource id) reads differently from a badge showing user
  content (a keyword tag) or an interactive chip (a suggestion the user can
  click). See §5.2.

## 2. Typography

| Role | Font | Where it's set |
|---|---|---|
| Display / body (default) | **AetherFont** (`public/fonts/aether.woff2`) | Applied globally via `className` on `<body>` in `src/app/layout.tsx`; also forced onto React Flow nodes (`.react-flow__node` in `globals.css`) |
| Data / mono | **Geist Mono** | Wired as `--font-mono` in `globals.css`; applied ad hoc via the `font-mono` utility — used for IDs, DIDs/hashes (`IdAndLink`), adapter names (`AssetCard`), job/agent ids, JSON/code blocks |
| Sans (secondary) | **Geist Sans** | Wired as `--font-sans`; not currently used deliberately anywhere — before using it, confirm it's actually adding a distinct role rather than duplicating AetherFont |

**Headline pattern — `PageHeading`** (`src/components/PageHeading.tsx`):
hierarchy comes from weight (`font-semibold`) and tracking (`tracking-tight`),
plus a solid `text-primary` treatment on the emphasized phrase with a thin
accent-color underline. This replaced a `bg-gradient-to-b … bg-clip-text`
treatment that had been copy-pasted across six files — do not reintroduce a
gradient-text headline; use `<PageHeading text="..." highlight="..." />`
instead so every page's headline stays visually consistent.

**Scale in use** (Tailwind defaults, no custom `--text-*` scale is defined):
`text-4xl` (`PageHeading size="lg"`, primary page hero), `text-2xl`
(`PageHeading size="sm"`, section/page titles), `text-lg` / `text-md` /
`text-sm` / `text-xs` / `text-[10px]` for card titles, body, captions, and
chip labels respectively. There is no intermediate `text-xl` or `text-3xl` in
current use — introduce one only if an existing step is provably too large.

## 3. Color

Colors are OKLCH, defined as CSS custom properties in `globals.css` under
`:root` (light) and `.dark`, then re-exposed as Tailwind tokens via
`@theme inline`. Always reference the **Tailwind token** (`bg-primary`,
`text-muted-foreground`) — never a raw OKLCH/hex value in a component — so
theme switching keeps working.

| Token | Light | Dark | Use for |
|---|---|---|---|
| `background` / `foreground` | white / near-black text | near-black / near-white text | Page canvas and default text |
| `primary` | `#6B46C1` violet | lighter violet (same hue, raised lightness) | Brand actions, `PageHeading` highlight, primary buttons |
| `secondary` | `#4A90E2` blue | desaturated blue (same hue) | Secondary actions, links (e.g. job id links) |
| `accent` | warm amber/gold | warm amber/gold (same hue) | The `PageHeading` underline; sparing highlight accents |
| `destructive` | red | brighter red (dark-mode tuned) | Destructive actions, `failure` status tone |
| `muted` / `muted-foreground` | light gray / navy-gray text | dark gray / light gray text | Backgrounds and text that should recede |
| `card`, `card-banner`, `card-foreground`, `popover` | — | — | Surface hierarchy (card body vs. card header banner vs. floating popover) |
| `chart-1` … `chart-5` | five distinct hues | five distinct hues (independently tuned, not the same hues as light) | Data visualization series only — not for UI chrome |
| `sidebar*`, `input-color`, `output-color`, `io-foreground` | — | — | Narrow, single-purpose tokens (sidebar theme, I/O node coloring in the operation diagram) |

**Status color (not a raw token — a derived system):** job/agent lifecycle
colors are *not* set directly from the palette above. They're defined in
`src/lib/status.ts` as five semantic tones and rendered via `StatusBadge`:

| Tone | Meaning | Color |
|---|---|---|
| `active` | in progress (job PENDING/STARTED/PAUSED, agent RUNNING) | blue |
| `success` | done / healthy (job COMPLETE, agent SLEEPING) | green |
| `attention` | needs the user to act, not a failure (job INPUT_REQUIRED/AUTH_REQUIRED, agent SUSPENDED) | amber |
| `failure` | terminal error (job FAILED/REJECTED/TIMEOUT) | `destructive` token |
| `neutral` | terminal, non-error (job CANCELLED, agent TERMINATED) | muted gray |

Note `attention` and `failure` are deliberately distinct — a job waiting on
an API key is not the same as a job that crashed, and they must never share
a color.

**Accessibility:** every interactive primitive (`button.tsx`, `badge.tsx`)
carries `focus-visible:ring-ring/50 focus-visible:ring-[3px]` — don't strip
this when customizing a variant. Dark-mode color values are independently
tuned (not just an alpha/brightness flip of light mode) specifically for
contrast — when adding a new status/tone color, define the dark variant
explicitly rather than assuming the light value works after a CSS filter.

## 4. Spacing, radius, layout

- **Spacing:** default Tailwind 4px-based scale (`p-1` … `p-10` etc. as seen
  in components); no custom `--spacing-*` scale is defined in `globals.css`.
- **Radius:** one base token, `--radius: 0.625rem`, with `sm`/`md`/`lg`/`xl`
  derived by ±2–4px (`--radius-sm: calc(var(--radius) - 4px)`, etc.). Use the
  Tailwind `rounded-{sm,md,lg,xl}` utilities, not a hardcoded `rounded-[10px]`.
- **Breakpoints:** standard Tailwind breakpoints plus two custom ones defined
  for grid density on large displays — `3xl` (1800px) and `4xl` (2200px).
  These exist because Tailwind's stock `2xl` (1536px) already triggers on
  ordinary 1080p/1440p laptops, so extra grid columns need much wider
  thresholds to only kick in on genuinely large/ultrawide/4K displays.
- **Shadows:** `--shadow-2xs` … `--shadow-2xl` are defined under `.dark` only;
  light mode currently falls back to Tailwind's built-in shadow scale rather
  than an explicit override. Worth deciding deliberately (define light-mode
  shadow tokens to match, or confirm the Tailwind defaults are the intended
  light-mode look) rather than leaving it as an accident of what got themed.
- **Card grids:** the recurring layout for asset/agent/operation collections
  is `grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3` (plus the `3xl`/`4xl`
  breakpoints on some screens) with fixed-height cards (`h-32` compact /
  `h-48` full) — see `AssetCard.tsx` / `AgentList.tsx` for the canonical
  shape (fixed-height header with border-bottom, flexible body, fixed-height
  footer).

## 5. Components

### 5.1 Core primitives (`src/components/ui/`)

shadcn/ui pattern over Radix primitives, styled with `class-variance-authority`.
- **Button** variants: `default` (primary fill), `destructive`, `outline`,
  `secondary`, `ghost`, `link`. Sizes: `sm` / `default` / `lg` / `icon`.
- **Badge** variants: `default` (solid primary fill), `secondary` (soft
  fill), `destructive`, `outline`. These are *color* variants — §5.2 below
  is the *role* convention layered on top; pick both a variant and a role.
- **Card**: `rounded-xl border py-4 shadow-sm` base — the asset/agent/job
  card pattern in feature components (`AssetCard`, `AgentList`) is a
  *different*, denser convention (`rounded-md`, fixed-height header/footer)
  built directly with `Card` + custom classes rather than `CardHeader`/
  `CardContent`. Match whichever convention the surrounding grid already uses.

### 5.2 Badge role convention (not enforced by types — a house rule)

| Role | Example | Treatment |
|---|---|---|
| System/structural fact | adapter type (`AssetCard`), provider key name | `variant="outline"`, `font-mono`, `text-muted-foreground` — quiet, technical |
| User content | keywords/tags | `variant="secondary"` — soft fill, no mono |
| Interactive chip | prompt suggestions (`AIPrompt`), key picker | Must include `cursor-pointer` and a visible hover state that works in **both** themes (never `hover:border-white` — it disappears on a light background) |

### 5.3 App-specific shared components

- **`PageHeading`** — the one approved headline pattern (§2). Props:
  `text`, `highlight`, `size` (`lg`/`sm`), `align` (`center`/`left`). Do not
  add a gradient-text alternative next to it.
- **`StatusBadge`** — the one approved status renderer (§3). Props:
  `status`, `kind` (`"job"`/`"agent"`), `as` (`"text"`/`"dot"`/`"pill"`). Any
  new surface that shows job or agent status should use this rather than a
  local switch statement.

## 6. Iconography

- **Primary:** `lucide-react` (dominant across the app — ~59 files).
- **Secondary:** `react-icons` (used sparingly, e.g. `react-icons/tb` for one
  icon not in Lucide, `@radix-ui/react-icons` for `MagicWandIcon`). Reach for
  Lucide first; only pull from `react-icons` for a specific icon Lucide
  doesn't have.
- **Sizing:** no fixed icon-size scale — sizes in use range from `12`/`14`
  (inline with text) to `16`/`20` (buttons/controls) to `32`/`48`/`64`
  (empty-state illustrations). Match the size to the surrounding text size
  rather than picking arbitrarily.

## 7. Motion

No animation library is currently installed (`framer-motion` was removed —
it had zero usages in `src/`). If a future feature needs orchestrated motion,
add a library deliberately for that feature rather than installing one
speculatively. A strong candidate for the first real use of motion is the
operation DAG (`DiagramViewer`) reacting to live job state, since that's the
product's signature surface (§1). Avoid scattering hover/enter transitions
across unrelated components "for polish" — that reads as noise, not intent.

## 8. File map

| Concern | Location |
|---|---|
| Color/typography/radius/breakpoint tokens | `src/app/globals.css` |
| Status tone system | `src/lib/status.ts` |
| Status rendering | `src/components/StatusBadge.tsx` |
| Headline pattern | `src/components/PageHeading.tsx` |
| UI primitives (Button, Badge, Card, …) | `src/components/ui/` |
| Feature components (cards, lists, viewers) | `src/components/` |
| Fonts | `public/fonts/aether.woff2`; Geist Sans/Mono via `next/font` in `layout.tsx` |

---

## Appendix: what a frontend design document should generally contain

This file is scoped to *tokens and current conventions*. A fuller design
system document (useful once the product has more than one contributor
touching UI, or before a redesign) typically adds these sections on top:

1. **Brand principles / point of view** — 3–5 sentences on what the product's
   visual identity is *for* and what it should never look like (its
   "anti-brief"). Without this, token tables alone don't stop the next
   contributor from reaching for a generic pattern.
2. **Design tokens** — color, type, spacing, radius, shadow, breakpoints
   (this doc's §2–4). Ideally generated from the same source the code reads
   (e.g. this doc could be auto-extracted from `globals.css` to prevent drift).
3. **Typography scale & pairing rationale** — not just "here are the sizes"
   but *why* this typeface, what role each face plays, and rules for when to
   introduce a new weight/size rather than reusing one.
4. **Color system + accessibility** — token table plus contrast requirements
   (e.g. minimum WCAG ratio for text-on-background pairs), and rules for
   deriving new semantic colors (like the status tones here) without
   inventing a new ad hoc palette each time.
5. **Layout & grid** — breakpoints, container widths, the standard
   card/list/table shapes, and which layout primitive to reach for by default.
6. **Component inventory** — every reusable component, its variants, and
   *when to use which* — the role/variant distinction in §5.2 is the kind of
   guidance that prevents "badge for everything" drift.
7. **Iconography** — which icon library is canonical, size scale, and
   stroke-weight/style consistency rules.
8. **Motion & interaction** — what animates, what doesn't, timing/easing
   values if any are standardized, and reduced-motion handling.
9. **Content/voice guidelines** — tone, terminology (e.g. this product's
   "venue"/"asset"/"job"/"agent" vocabulary must stay consistent with the SDK
   and docs), empty-state and error-message conventions.
10. **Accessibility baseline** — focus states, keyboard nav, color-blind-safe
    status indication (icon + color, not color alone), reduced motion.
11. **Responsive rules** — how components degrade/reflow at each breakpoint,
    not just what the breakpoints are.
12. **Governance** — how a token or component changes: who approves it,
    whether Figma (or another source) or code is the source of truth, and
    how this document stays in sync with the codebase (a stale design doc is
    worse than none — pin it to a review step, e.g. "update in the same PR").
13. **Anti-pattern gallery** — concrete "don't do this" examples specific to
    the product's own history (e.g. this doc's gradient-headline and
    triple-duplicated status-color examples) — these are more useful than
    generic advice because they're things this exact team actually did.

Sections 1, 9, 10, 12, and 13 are the ones most commonly missing from a
first-pass design doc — most teams default to writing the token tables (2–8)
and stop there, which documents *what* the system looks like but not *why*,
so it erodes the first time someone unfamiliar with the intent touches it.
