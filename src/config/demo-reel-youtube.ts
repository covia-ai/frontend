// GENERATED FILE — do not edit by hand.
//
// Written by `node scripts/gen-reel-youtube.mjs <path to youtube-ids.json>`
// from the demo-reel suite's own record of where each cut was uploaded. A
// re-render means a new upload and a new video id, so regenerate this file
// rather than editing an id: two of them (`tleucvxscz8`, `jxQTdMTz4gU`) are
// indistinguishable by eye in most fonts.
//
// Clip metadata lives in `demo-reel.ts`. This file is only about hosting.

/** One cut of one clip, as uploaded. */
export type ReelYouTubeCut = {
  videoId: string;
  /**
   * `unlisted` does not mean private: the video does not appear in search, on
   * the channel or in recommendations, but anybody holding the link — or any
   * page embedding it, including this one — can watch it.
   */
  visibility: "public" | "unlisted";
  /** State of the caption track we uploaded ourselves. */
  captions: string;
};

/**
 * Query parameters every embed carries.
 *
 * `cc_load_policy` + `cc_lang_pref` are the load-bearing pair. YouTube also
 * generates an automatic English track for every video, which cannot be deleted
 * or switched off and mishears "Covia" as "Kovia"; these two make our own track
 * the one that shows without the viewer choosing it. Self-hosting is the only
 * way to remove the automatic track as an option altogether.
 */
export const REEL_YOUTUBE_PLAYER_PARAMS: Record<string, string | number> = {
  "cc_load_policy": 1,
  "cc_lang_pref": "en",
  "hl": "en-GB",
  "rel": 0,
  "modestbranding": 1,
};

/** Keyed by clip slug, then by the manifest's cut id. */
export const REEL_YOUTUBE: Record<
  string,
  { narrated?: ReelYouTubeCut; ciso?: ReelYouTubeCut }
> = {
  "c0-the-grid": {
    narrated: { videoId: "yQ0cwiG-X0s", visibility: "public", captions: "published" },
    ciso: { videoId: "9Y5jVSD18Oc", visibility: "unlisted", captions: "published" },
  },
  "c1-the-refusal": {
    narrated: { videoId: "GLfRUYNjMu4", visibility: "public", captions: "published" },
    ciso: { videoId: "dWB_R6VFeSs", visibility: "unlisted", captions: "published" },
  },
  "c2-reconstruction": {
    narrated: { videoId: "EHMbCyosbyg", visibility: "public", captions: "published" },
    ciso: { videoId: "FERqlIL-gpU", visibility: "unlisted", captions: "published" },
  },
  "c3-governed-escalation": {
    narrated: { videoId: "jxQTdMTz4gU", visibility: "public", captions: "published" },
    ciso: { videoId: "-yjBlnmtXOY", visibility: "unlisted", captions: "published" },
  },
  "c4-many-clouds": {
    narrated: { videoId: "UOGDAojFPSQ", visibility: "public", captions: "published" },
    ciso: { videoId: "HDPZEw5D9Mc", visibility: "unlisted", captions: "published" },
  },
  "c5-sdk-job": {
    narrated: { videoId: "ZzxpbIrwCH8", visibility: "public", captions: "published" },
  },
  "c6-operations-catalogue": {
    narrated: { videoId: "FOa54fvRAHI", visibility: "public", captions: "published" },
  },
  "c8-mcp-surface": {
    narrated: { videoId: "KRYr8QiZzv8", visibility: "public", captions: "published" },
  },
  "n2-make-it-native": {
    narrated: { videoId: "lYY9GadA6F0", visibility: "public", captions: "published" },
  },
  "n3-fork-provenance": {
    narrated: { videoId: "tleucvxscz8", visibility: "public", captions: "published" },
    ciso: { videoId: "4xcQQ-jhPTA", visibility: "unlisted", captions: "published" },
  },
  "n4-context-memory": {
    narrated: { videoId: "V5pDNHmdL9U", visibility: "public", captions: "published" },
  },
  "n5-connections": {
    narrated: { videoId: "rbuVrEhGw7o", visibility: "public", captions: "published" },
    ciso: { videoId: "ZFx5oWutnPs", visibility: "unlisted", captions: "published" },
  },
  "n6-day-on-the-grid": {
    narrated: { videoId: "nXkbtfqlymE", visibility: "public", captions: "published" },
    ciso: { videoId: "5TjrVEBqpiU", visibility: "unlisted", captions: "published" },
  },
};
