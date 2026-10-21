#!/usr/bin/env node
/**
 * Generate `src/config/demo-reel-youtube.ts` from the demo-reel suite's
 * `youtube-ids.json`.
 *
 * Two of the ids in that file — `tleucvxscz8` and `jxQTdMTz4gU` — are made of
 * characters that render identically in most fonts, and a mistyped video id is
 * a silently broken embed rather than an error anyone notices. So no id is ever
 * typed: this script copies them, and a re-upload means re-running it rather
 * than editing the output.
 *
 * The suite lives in its own working tree (`demo-reels`), which this repo does
 * not contain and must not write to, so the path is an argument:
 *
 *     node scripts/gen-reel-youtube.mjs ../demo-reels/youtube-ids.json
 *
 * The clip metadata — titles, claims, audiences, runtimes — is NOT read here.
 * That comes from `src/config/demo-reel.ts`, which the suite's own
 * `pnpm reel:manifest` writes. This file carries only where each cut is hosted,
 * which is a frontend concern and the one thing that changes when hosting does.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** `governance` is the suite's word for the cut; `ciso` is the manifest's. */
const CUT_IDS = { narrated: "narrated", governance: "ciso" };

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/gen-reel-youtube.mjs <path to youtube-ids.json>");
  process.exit(1);
}

const sourcePath = resolve(source);
const ids = JSON.parse(readFileSync(sourcePath, "utf8"));

const problems = [];
const entries = [];

for (const clip of ids.clips) {
  const cuts = [];
  for (const [suiteCut, manifestCut] of Object.entries(CUT_IDS)) {
    const cut = clip.cuts[suiteCut];
    if (!cut) continue;
    if (!/^[A-Za-z0-9_-]{11}$/.test(cut.youtubeId)) {
      problems.push(`${clip.slug}/${suiteCut}: "${cut.youtubeId}" is not an 11-character video id`);
      continue;
    }
    if (cut.visibility !== "public" && cut.visibility !== "unlisted") {
      problems.push(`${clip.slug}/${suiteCut}: visibility "${cut.visibility}" is neither public nor unlisted`);
      continue;
    }
    cuts.push(
      `    ${manifestCut}: { videoId: ${JSON.stringify(cut.youtubeId)}, ` +
        `visibility: ${JSON.stringify(cut.visibility)}, ` +
        `captions: ${JSON.stringify(cut.captions)} },`,
    );
  }
  if (!cuts.length) {
    problems.push(`${clip.slug}: no usable cut`);
    continue;
  }
  entries.push(`  ${JSON.stringify(clip.slug)}: {\n${cuts.join("\n")}\n  },`);
}

if (problems.length) {
  console.error("Refusing to generate — the source file does not check out:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

// The player parameters come from the source file too, because the reason they
// are what they are lives there: cc_load_policy=1 with cc_lang_pref=en loads
// the caption track we wrote and uploaded, instead of leaving the viewer with
// YouTube's automatic one, which transcribes "Covia" by sound as "Kovia".
const params = Object.entries(ids.embedding.playerParams)
  .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join("\n");

const out = `// GENERATED FILE — do not edit by hand.
//
// Written by \`node scripts/gen-reel-youtube.mjs <path to youtube-ids.json>\`
// from the demo-reel suite's own record of where each cut was uploaded. A
// re-render means a new upload and a new video id, so regenerate this file
// rather than editing an id: two of them (\`tleucvxscz8\`, \`jxQTdMTz4gU\`) are
// indistinguishable by eye in most fonts.
//
// Clip metadata lives in \`demo-reel.ts\`. This file is only about hosting.

/** One cut of one clip, as uploaded. */
export type ReelYouTubeCut = {
  videoId: string;
  /**
   * \`unlisted\` does not mean private: the video does not appear in search, on
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
 * \`cc_load_policy\` + \`cc_lang_pref\` are the load-bearing pair. YouTube also
 * generates an automatic English track for every video, which cannot be deleted
 * or switched off and mishears "Covia" as "Kovia"; these two make our own track
 * the one that shows without the viewer choosing it. Self-hosting is the only
 * way to remove the automatic track as an option altogether.
 */
export const REEL_YOUTUBE_PLAYER_PARAMS: Record<string, string | number> = {
${params}
};

/** Keyed by clip slug, then by the manifest's cut id. */
export const REEL_YOUTUBE: Record<
  string,
  { narrated?: ReelYouTubeCut; ciso?: ReelYouTubeCut }
> = {
${entries.join("\n")}
};
`;

const outPath = resolve(import.meta.dirname, "../src/config/demo-reel-youtube.ts");
writeFileSync(outPath, out);

const cutCount = ids.clips.reduce((n, clip) => n + Object.keys(clip.cuts).length, 0);
console.log(`Wrote ${outPath}`);
console.log(`  ${ids.clips.length} clips, ${cutCount} cuts, from ${sourcePath}`);
