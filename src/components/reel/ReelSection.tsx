"use client";

import { useState } from "react";
import { DEMO_REEL, type ReelClip, type ReelCutId } from "@/config/demo-reel";
import { ReelGrid } from "./ReelGrid";
import { ReelPlayer } from "./ReelPlayer";

interface ReelSectionProps {
  /** Injectable so tests and future curation do not have to use the whole suite. */
  clips?: ReelClip[];
}

/**
 * The demo reel on the Resources page.
 *
 * Reads nothing — the manifest is a checked-in module, the posters are static,
 * and the masters are fetched only once someone presses play. So this section
 * adds no venue call, no job, and nothing to the page's time to first paint
 * beyond thirteen posters that are lazy by default.
 *
 * The section heading lives on the page, not here, because the Resources page
 * titles its own sections in one small-caps style and this is one of them.
 */
export function ReelSection({ clips = DEMO_REEL }: ReelSectionProps) {
  const [playing, setPlaying] = useState<{ clip: ReelClip; cut: ReelCutId } | null>(null);

  if (clips.length === 0) return null;

  return (
    <div className="w-full">
      <ReelGrid
        clips={clips}
        onSelect={(clip, cut = "narrated") => setPlaying({ clip, cut })}
      />
      <ReelPlayer
        // One mount per open request, so the player starts in the voice the
        // card asked for without an effect synchronising it afterwards.
        key={playing ? `${playing.clip.slug}:${playing.cut}` : "closed"}
        clip={playing?.clip ?? null}
        initialCut={playing?.cut}
        onOpenChange={(open) => !open && setPlaying(null)}
      />
    </div>
  );
}
