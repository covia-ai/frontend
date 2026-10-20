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
 */
export function ReelSection({ clips = DEMO_REEL }: ReelSectionProps) {
  const [playing, setPlaying] = useState<{ clip: ReelClip; cut: ReelCutId } | null>(null);

  if (clips.length === 0) return null;

  return (
    <section className="w-full max-w-6xl" aria-labelledby="demo-reel-heading">
      <div className="mb-6 text-center">
        <h2 id="demo-reel-heading" className="text-foreground text-2xl font-semibold tracking-tight">
          Watch the grid work
        </h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-2xl text-sm">
          Short clips, each proving one thing, recorded against a live venue. Eight of them can also
          be heard in a cut written for whoever owns the risk.
        </p>
      </div>

      <ReelGrid
        clips={clips}
        onSelect={(clip, cut = "narrated") => setPlaying({ clip, cut })}
      />
      <ReelPlayer
        clip={playing?.clip ?? null}
        initialCut={playing?.cut}
        onOpenChange={(open) => !open && setPlaying(null)}
      />
    </section>
  );
}
