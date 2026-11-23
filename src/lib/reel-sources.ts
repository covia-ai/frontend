/**
 * Where a clip's cut is actually played from.
 *
 * The clip manifest (`config/demo-reel.ts`) records the mp4 and WebVTT paths
 * the suite renders, and nothing about hosting. The upload record
 * (`config/demo-reel-youtube.ts`) records which YouTube video each cut became.
 * This module is the one place those two meet, and the only place in the app
 * that decides which of them a player is handed.
 *
 * Every source is tagged `{ kind, src }`, so the player branches on the kind
 * once and neither branch knows about the other. Moving the reel off YouTube
 * onto files we serve ourselves is then a change to the data — regenerate the
 * upload record without the cuts that have moved — and not a change to any
 * component: a cut with no YouTube entry already resolves to its mp4.
 */
import type { ReelClip, ReelCutId } from "@/config/demo-reel";
import {
  REEL_YOUTUBE,
  REEL_YOUTUBE_PLAYER_PARAMS,
  type ReelYouTubeCut,
} from "@/config/demo-reel-youtube";
import { reelMediaUrl } from "./reel-media";

export type ReelSource =
  | {
      kind: "youtube";
      /** The 11-character video id. */
      src: string;
      visibility: ReelYouTubeCut["visibility"];
    }
  | {
      kind: "mp4";
      /** Absolute or base-relative URL of the master. */
      src: string;
      /** Absolute or base-relative URL of the WebVTT sidecar. */
      captions: string;
    };

/**
 * The source for one cut of one clip, or `null` if the clip has no such cut.
 *
 * YouTube wins where an upload exists, because that is where these files are
 * served from today and the mp4 masters are not committed to this repo. The
 * mp4 branch is not dead code kept for symmetry: it is what a cut falls back
 * to the moment it leaves the upload record, which is how self-hosting would
 * arrive — one clip, or all thirteen, without touching a component.
 */
export function reelSource(clip: ReelClip, cut: ReelCutId): ReelSource | null {
  const uploaded = REEL_YOUTUBE[clip.slug]?.[cut];
  if (uploaded) {
    return { kind: "youtube", src: uploaded.videoId, visibility: uploaded.visibility };
  }

  const file = clip.cuts[cut];
  if (!file) return null;

  return {
    kind: "mp4",
    src: reelMediaUrl(file.media),
    captions: reelMediaUrl(file.captions),
  };
}

/**
 * The host every embed is served from.
 *
 * `youtube-nocookie.com` rather than `youtube.com`: the privacy-enhanced host
 * serves the identical player and honours the identical parameters, but does
 * not write YouTube's tracking cookies until the viewer actually presses play.
 * On a page whose job is to show a visitor what the product does, that is the
 * right default, and it costs nothing.
 *
 * Exported because the IFrame API builds its own iframe and defaults this to
 * `youtube.com` unless it is passed `host` explicitly — so a player created
 * through the API and a URL built here have to be given the same value, or the
 * privacy-enhanced host is what the code says and not what the browser loads.
 */
export const YOUTUBE_EMBED_HOST = "https://www.youtube-nocookie.com";

/**
 * The embed URL for a video id.
 *
 * `enablejsapi` is the one parameter not in the generated record, because it is
 * not an editorial decision about the embed — it is what lets this page read
 * the playhead off one cut and put it back on the other.
 */
export function youtubeEmbedUrl(
  videoId: string,
  options: { autoplay?: boolean; start?: number; origin?: string } = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(REEL_YOUTUBE_PLAYER_PARAMS)) {
    params.set(key, String(value));
  }
  params.set("enablejsapi", "1");
  params.set("playsinline", "1");
  if (options.autoplay) params.set("autoplay", "1");
  if (options.start) params.set("start", String(Math.floor(options.start)));
  // Scoped to our own origin so the player will accept commands from this page
  // and refuse them from anywhere else framing it.
  if (options.origin) params.set("origin", options.origin);

  return `${YOUTUBE_EMBED_HOST}/embed/${encodeURIComponent(videoId)}?${params}`;
}
