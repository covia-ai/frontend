# Resources (/learning), Reimagined — design & build spec

**Status:** built on `feat/learning-reel`. Direction approved.
**Series:** Jobs ✓ · Agents ✓ · Operations ✓ · Connections ✓ · Home ✓ · **Resources** → Venues · Workspace/Files

One shared design system, on the app's own theme, every redesign a **strict superset** of what the page shows today (no detail lost).

## 1. What Resources was

`app/(demo)/learning/page.tsx` — a centred column inside `ContentLayout` + `TopBar`:

- **`VideoThumbnails`** — three hard-coded YouTube ids, each a card with a thumbnail, a hover play overlay, a caption and a click that opens youtube.com. The middle card is deliberately wider.
- A `Separator`, then **two cards** — *Covia AI Discord* and *Covia Documentation*.

No page heading, no venue calls, no auth dependency. Two defects: the thumbnail row was a non-wrapping `flex-row` that overflowed below ~900px, and the cards were `div`s with click handlers, so unreachable from the keyboard.

## 2. What Resources becomes

Three bands. The demo reel is new and leads; everything that was there survives below it.

- **Heading** — `PageHeading` ("The Covia **Resources library**"). Net new.
- **The demo reel** — thirteen clips recorded against a live venue, each proving one claim. Audience chips (*All · Investor · CTO · CISO · Partners · Board · Developers*) filter the grid; a card carries a poster, its own runtime, the clip's claim, its audiences, and a marker where a second cut exists. Clicking opens a player dialog.
- **The preserved band** — the three YouTube cards and the Discord and Documentation cards, unchanged in content.

### The cut switcher

Eight of the thirteen clips carry a governance register: the same picture, narrated for whoever owns the risk rather than whoever owns the system. Both cuts of a clip are **the same length to the millisecond**, so the switcher swaps the source and the caption track **in place**, restoring the playhead and resuming if it was playing. You can hear the same moment in both registers back to back. The five clips without a governance register show no control at all, rather than a disabled one.

That length parity is load-bearing. The manifest generator refuses to emit a pair whose rendered durations disagree, and the manifest cannot express a per-cut runtime, so the assumption is enforced where it is made rather than discovered in the player.

### Captions

Real `<track>` over WebVTT sidecars, not burned-in captions: viewer-togglable, OS-styled, selectable, and — because burning captions means a second-generation encode at roughly three-quarters the video bitrate — sharper on screen-capture footage, which is exactly the content where text legibility fails first. Captions are turned on once the source loads rather than left to `default`, since swapping `src` tears the text track down and a browser that remembers a viewer's preference would otherwise reinstate it.

## 3. Architecture

- **`config/demo-reel.ts`** — a generated manifest: slug, title, claim, synopsis, audiences, runtime, poster and a `cuts` map. Written by `pnpm reel:manifest` in the demo-reels working tree, which reads each clip's script and its rendered master, so the four fields the card shows cannot drift from the clip that actually ships. Not edited by hand.
- **`lib/reel-media.ts`** — the single place that turns a manifest path into a URL, against `NEXT_PUBLIC_REEL_BASE_URL` (default `/reel-media`). Hosting is therefore one environment variable, not a code change. It also decides `crossOrigin`, because a cross-origin `<track>` without it fails silently while the picture plays perfectly.
- **`components/reel/`** — `ReelSection` (state), `ReelGrid` (filter + layout), `ReelCard`, `ReelPlayer` (dialog + playhead preservation), `CutSwitcher`. All presentational below `ReelSection`.
- **Zero venue calls**, no job, no polling. The manifest is a module, posters are static, and a master is fetched only once someone presses play.

## 4. Parity map (superset — nothing lost)

| Today | In the redesign |
|---|---|
| Three YouTube cards (3 fixed ids) | Same ids, titles, thumbnails, click-through |
| Wider middle card | Preserved |
| Hover play overlay + thumbnail fallback | Preserved |
| Discord card → `discord.gg/fywdrKd8QT` | Unchanged |
| Documentation card → `docs.covia.ai` | Unchanged |
| Centred column, `ContentLayout` + `TopBar`, `Separator` | Unchanged |
| *(nothing)* | **added:** page heading · 13-clip reel · audience filter · player dialog · cut switcher · captions |
| *(defect)* row overflowed below ~900px | **fixed:** wraps |
| *(defect)* cards not keyboard-reachable | **fixed:** real buttons, focus ring |

## 5. Testing

`demo-reel-manifest.test` (shape, the eight clips with a second cut, media paths, runtime formatting, cross-origin detection), `ReelGrid.test` (filtering, order, per-clip runtimes, keyboard selection), `ReelPlayer.test` (switcher gating, source **and** track swap, playhead restored, resume only if it was playing, clamped to the new duration, captions enabled), `VideoThumbnails.test` (the superset guard — the three ids, their targets, the wider middle card, wrapping, focusability).

Full suite **181 suites / 1350 tests** green; `next build` clean; `eslint` clean. Live-verified signed out on `:3020` at 1440 / 768 / 375 — grid reflows 3→2→1, the preserved row wraps, the dialog and its switcher fit a 375px viewport — and the cut switch measured at **0.000s drift** when paused and seamless while playing.

## 6. Dependencies & blast radius

- **New:** `components/reel/*`, `config/demo-reel.ts`, `lib/reel-media.ts`, `public/reel/*.webp`, `__tests__/reel/*`.
- **Modify:** `learning/page.tsx` (heading + `<ReelSection/>`; the JSX below untouched), `VideoThumbnails.tsx` (wrapping and focusability only), `.gitignore` (the media tree).
- **Reuse, unchanged:** `PageHeading`, `Card`, `Badge`, `Dialog`, `Separator`, `Button`, `ContentLayout`, `TopBar`.
- **No new runtime libraries.** Native `<video>` with `<track>`; no player SDK.
- No SDK, backend or shared-code changes.

## 7. Impact & risk

- **Masters are never committed.** They are large and re-rendered often, so `public/reel-media/` is gitignored and served from the reel media base. Posters are ~25 KB each and do ship.
- **Nothing downloads until play** — `preload="metadata"` behind a poster, so the page costs thirteen small stills.
- **Cross-origin captions** fail quietly if CORS is wrong; `reelIsCrossOrigin` sets the attribute and a test covers it.
- **The suite moves.** It was re-rendered end to end, and a voice variant was dropped, while this page was being designed. The generated manifest is the defence: regenerate, review the diff, done.
- **Rollback:** delete the heading and the `<ReelSection/>` line from `page.tsx` and revert two cosmetic lines in `VideoThumbnails`. The page returns to exactly today's behaviour; nothing below the new band was restructured.

## 8. Rollout

Worktree `learning-reel` · branch `feat/learning-reel` · dev server `:3020`. Local until approved for `develop`.
