/**
 * Where the demo-reel masters and caption sidecars are served from.
 *
 * The manifest (`config/demo-reel.ts`) stores only relative paths, because the
 * clips are large, re-rendered often, and therefore never committed: they live
 * wherever we are hosting them this month. Everything that knows a URL knows it
 * through here, so moving the reel from a local dev tree to a CDN is a change
 * to one environment variable and nothing else.
 *
 * Unset means `/reel-media`, which is the gitignored tree a developer fills
 * with `pnpm reel:assets --media` in the demo-reels working tree.
 */
export const REEL_MEDIA_BASE = (
  process.env.NEXT_PUBLIC_REEL_BASE_URL ?? "/reel-media"
).replace(/\/+$/, "");

/** Posters are small and stable enough to ship with the app. */
const POSTER_BASE = "/reel";

export function reelMediaUrl(path: string): string {
  return `${REEL_MEDIA_BASE}/${path.replace(/^\/+/, "")}`;
}

export function reelPosterUrl(poster: string): string {
  return `${POSTER_BASE}/${poster.replace(/^\/+/, "")}`;
}

/**
 * Whether the reel is served from somewhere other than the app's own origin.
 *
 * This decides one attribute, and getting it wrong is the kind of bug that
 * only shows up in production: a `<track>` fetched cross-origin without
 * `crossorigin` on the `<video>` fails silently, so the picture plays
 * perfectly and the captions simply never appear. A relative base is
 * same-origin by definition; anything absolute we have to compare.
 */
export function reelIsCrossOrigin(base: string = REEL_MEDIA_BASE): boolean {
  if (!/^https?:\/\//i.test(base)) return false;
  if (typeof window === "undefined") return true;
  try {
    return new URL(base).origin !== window.location.origin;
  } catch {
    return true;
  }
}

/** `mm:ss`, which is all these clips need — the longest is under three minutes. */
export function formatRuntime(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
