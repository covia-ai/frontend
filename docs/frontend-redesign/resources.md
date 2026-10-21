# Resources (/learning), Reimagined — design & build spec

**Status:** built on `feat/learning-reel`, rebased onto current `develop`, clips wired to YouTube. Direction approved.
**Series:** Jobs ✓ · Agents ✓ · Operations ✓ · Connections ✓ · Home ✓ · **Resources** → Venues · Workspace/Files

One shared design system, on the app's own theme, every redesign a **strict superset** of what the page shows today (no detail lost).

> **Rebased.** This work was first written against a `develop` that predated `4e4f934`, "5A: reimagine the Resources / Learning page", which had already brought this page onto the design system. That branch duplicated some of it worse and contradicted it in one place, so its page scaffolding was dropped and the reel re-integrated on top of what landed. What this doc now describes is the reel *added to* the current Resources page, not a second redesign of it.

## 1. What Resources is (as `develop` has it)

`app/(demo)/learning/page.tsx` — a centred column inside `ContentLayout` + `TopBar`:

- **`VideoThumbnails`** — a reflowing grid driven by the `RESOURCE_VIDEOS` registry in `lib/resources.ts`, each video a real anchor to YouTube with a hover play affordance.
- **Two link cards** — *Covia Labs Discord* and *Covia Documentation*, also real anchors, with brand-tinted `TypeTile`s.
- A `PageHeading` ("Learn & build") and small-caps section headings ("Watch", "Read & connect").

No venue calls and no auth dependency.

## 2. What Resources becomes

The reel becomes a new "Demo reel" section above "Watch", titled in the page's own small-caps style. Everything already on the page stays exactly as it is.

- **The demo reel** — thirteen clips recorded against a live venue, each proving one claim. Audience chips (*All · CTO · CISO · Partners · Developers*) filter the grid; a card carries a poster, its own runtime, the clip's claim, its audiences, and a marker where a second cut exists.

Every audience a clip carries is shown on its card, because the tags say who the clip was written for. Only some are worth a chip: Investor and Board stay off, being rooms we walk someone into rather than ones they browse from, and a chip per room turns the one control that matters into a row of seven. Nothing becomes unreachable, and a test asserts that, so a future clip tagged only for investors fails the suite rather than hiding behind *All*. Clicking opens a player dialog.
- **The existing bands** — "Watch" and "Read & connect", untouched apart from one addition: the videos gain audience tags in the same vocabulary as the reel, carried on the registry as an optional `audiences` and rendered through `publicAudiences`, so every video on the page is tagged rather than only the ones that arrive with a manifest.

### The cut switcher

Eight of the thirteen clips carry a governance register: the same picture, narrated for whoever owns the risk rather than whoever owns the system. Both cuts of a clip are **the same length to the millisecond**, so the switcher swaps the source **in place**, restoring the playhead and resuming if it was playing. You can hear the same moment in both registers back to back. The five clips without a governance register show no control at all, rather than a disabled one.

This is why the YouTube branch drives the IFrame player API rather than setting an `<iframe src>`: a bare frame cannot be asked where it is, so switching voice would restart the clip. Measured live, the handoff lands on the same frame at **0.000s drift**.

That length parity is load-bearing. The manifest generator refuses to emit a pair whose rendered durations disagree, and the manifest cannot express a per-cut runtime, so the assumption is enforced where it is made rather than discovered in the player.

### Captions

Never burned in: captions stay viewer-togglable, OS-styled and selectable, and burning them would mean a second-generation encode at roughly three-quarters the video bitrate — worst on screen-capture footage, which is exactly where text legibility fails first.

Each branch carries them its own way. On YouTube the embed sets `cc_load_policy=1` with `cc_lang_pref=en`, so the track we wrote and uploaded is the one a viewer gets without opening a menu. On the self-hosted branch they are real `<track>` elements over WebVTT sidecars, switched on once the source loads rather than left to `default`, since swapping `src` tears the text track down and a browser remembering a viewer's preference would otherwise reinstate it.

One caveat belongs to YouTube rather than to this page: it generates an automatic English track for every video that cannot be deleted or disabled, and it mishears "Covia" as "Kovia". A viewer who picks it from the menu gets that. Serving the files ourselves is the only way to remove it as an option — which the source union below keeps as a data change.

## 3. Architecture

- **`config/demo-reel.ts`** — a generated manifest: slug, title, claim, synopsis, audiences, runtime, poster and a `cuts` map. Written by `pnpm reel:manifest` in the demo-reels working tree, which reads each clip's script and its rendered master, so the four fields the card shows cannot drift from the clip that actually ships. Not edited by hand.
- **`config/demo-reel-youtube.ts`** — a second generated file: which YouTube video each cut was uploaded as, its visibility, and the player parameters every embed carries. Written by `node scripts/gen-reel-youtube.mjs <path to youtube-ids.json>` from the suite's own upload record, so no video id is ever retyped — two of them differ only in characters that render identically in most fonts, and a mistyped id is a silently broken embed rather than an error anyone notices. Hosting lives here precisely because the clip manifest is generated by a different tool and knows nothing about it.
- **`lib/reel-sources.ts`** — where those two meet, and the only place that decides what a player is handed. Every source is tagged `{ kind, src }`: `youtube` where an upload exists, `mp4` otherwise. **Moving the reel onto files we serve ourselves is therefore a change to the data** — regenerate the upload record without the cuts that have moved — and not a change to any component.
- **`lib/reel-media.ts`** — turns a manifest path into a URL for the `mp4` branch, against `NEXT_PUBLIC_REEL_BASE_URL` (default `/reel-media`). It also decides `crossOrigin`, because a cross-origin `<track>` without it fails silently while the picture plays perfectly.
- **`components/reel/`** — `ReelSection` (state), `ReelGrid` (filter + layout), `ReelCard`, `ReelPlayer` (dialog + playhead preservation, branching on source kind), `YouTubeEmbed` (IFrame API player), `CutSwitcher`. All presentational below `ReelSection`.
- **Zero venue calls**, no job, no polling. The manifest is a module, posters are static, and a master is fetched only once someone presses play.

## 4. What changes on the page (additive only)

| On `develop` | After this branch |
|---|---|
| `PageHeading` "Learn & build" + subtitle | Unchanged |
| "Watch" — registry-driven video grid, real anchors | Unchanged, plus an audience tag row per video |
| "Read & connect" — Discord + Documentation cards | Unchanged |
| `RESOURCE_VIDEOS` entries | Gain an optional `audiences` |
| *(nothing)* | **added:** a "Demo reel" section — 13 clips, audience filter, player dialog, Developer/CTO · CISO tabs, real captions |
| *(nothing)* | **added:** audience tags on the three videos |

## 5. Testing

`demo-reel-manifest.test` (shape, the eight clips with a second cut, media paths, runtime formatting, cross-origin detection), `ReelGrid.test` (filtering, the chips offered, audiences kept on cards, order, per-clip runtimes, keyboard selection), `resource-video-audiences.test` (the tags only, so it cannot fight a later change to the rest of the card: each video tagged from the registry, Investor kept in the registry and off the page, and a video with no audiences left untagged rather than empty-framed).

The player has a suite per branch. `ReelPlayer.test` covers the `mp4` branch — switcher gating, source **and** track swap, playhead restored, resume only if it was playing, clamped to the new duration, captions enabled — using fixture slugs that deliberately appear in no upload record, since an uploaded clip would never reach a `<video>` element. That makes it the self-hosted path's coverage rather than dead weight. `ReelPlayerYouTube.test` covers the other branch against a stubbed IFrame API: the right video per cut, the caption parameters, the privacy-enhanced host, one player across a switch, the playhead carried over, cue-not-play when it was paused, and the embedding-refused message. `reel-sources.test` holds the contract between manifest and upload record — every cut uploaded, ids well formed and unique, narrated public and governance unlisted, and the fallback to rendered files for a clip that was never uploaded.

`next build` clean and `eslint` clean on the rebased branch; every reel suite green. Live-verified on `:3020`, signed out and signed in against a local venue, at 1440 / 768 / 375 — the reel grid reflows 3→2→1, nothing overflows at any width, the dialog and its tabs fit a 375px viewport — and the cut switch measured at **0.000s drift** when paused and seamless while playing.

## 6. Dependencies & blast radius

- **New:** `components/reel/*`, `config/demo-reel.ts`, `config/demo-reel-youtube.ts`, `lib/reel-media.ts`, `lib/reel-sources.ts`, `scripts/gen-reel-youtube.mjs`, `public/reel/*.webp`, `__tests__/reel/*`.
- **Modify:** `learning/page.tsx` (one section added above "Watch"), `lib/resources.ts` (optional `audiences`), `VideoThumbnails.tsx` (renders the tag row), `.gitignore` (the media tree).
- **Reuse, unchanged:** `PageHeading`, `Card`, `Badge`, `Dialog`, `Separator`, `Button`, `ContentLayout`, `TopBar`.
- **No new npm dependencies.** The YouTube branch loads YouTube's own IFrame API from the page at runtime, once per document, and only on a page that has a reel; the self-hosted branch is a native `<video>` with `<track>`.
- No SDK, backend or shared-code changes.

## 7. Impact & risk

- **The clips are hosted on YouTube.** The thirteen narrated cuts are public; the eight governance cuts are **unlisted, which is not private** — they do not appear in search, on the channel or in recommendations, but anyone with the link, or any page embedding them, can watch. Treat them as published material.
- **Masters are never committed.** They are large and re-rendered often, so `public/reel-media/` is gitignored. Posters are ~25 KB each and do ship, and are used for the cards on both branches.
- **Nothing loads until play** — a card is a static poster; no embed is created and no master fetched until someone opens a clip, so the page costs thirteen small stills.
- **A re-render means new video ids.** Regenerate `demo-reel-youtube.ts` from the upload record rather than editing an id; a test asserts every cut in the manifest has one.
- **Cross-origin captions** fail quietly if CORS is wrong; `reelIsCrossOrigin` sets the attribute and a test covers it.
- **The suite moves.** It was re-rendered end to end, and a voice variant was dropped, while this page was being designed. The generated manifest is the defence: regenerate, review the diff, done.
- **Rollback:** delete the "Demo reel" heading and the `<ReelSection/>` line from `page.tsx`, and the tag row from `VideoThumbnails`. The page returns to exactly what `develop` has; nothing else was restructured.

## 8. Rollout

Worktree `learning-reel` · branch `feat/learning-reel`, rebased onto `origin/develop` and zero commits behind · dev server `:3020`. Local until approved for `develop`.
