"use client";

import { useMemo, useState } from "react";
import type { ReelClip } from "@/config/demo-reel";
import { ReelCard } from "./ReelCard";
import { Button } from "@/components/ui/button";

interface ReelGridProps {
  clips: ReelClip[];
  onSelect: (clip: ReelClip) => void;
}

const ALL = "All";

/**
 * Every audience named by at least one clip, in the order the suite names them.
 *
 * Derived rather than listed, so a clip written for a new audience appears in
 * the filter the moment the manifest is regenerated.
 */
export function audiencesOf(clips: ReelClip[]): string[] {
  const seen: string[] = [];
  for (const clip of clips) {
    for (const audience of clip.audiences) {
      if (!seen.includes(audience)) seen.push(audience);
    }
  }
  return seen;
}

export function filterByAudience(clips: ReelClip[], audience: string): ReelClip[] {
  if (audience === ALL) return clips;
  return clips.filter((clip) => clip.audiences.includes(audience));
}

/**
 * The library, filtered by who is watching.
 *
 * Thirteen clips is too many to scan and far too many to watch, and the suite
 * is deliberately written for different rooms — a CISO and a developer want
 * different four. So the filter is the page's organising idea rather than a
 * refinement bolted on top of a list.
 */
export function ReelGrid({ clips, onSelect }: ReelGridProps) {
  const [audience, setAudience] = useState<string>(ALL);
  const audiences = useMemo(() => audiencesOf(clips), [clips]);
  const shown = useMemo(() => filterByAudience(clips, audience), [clips, audience]);

  return (
    <div className="w-full">
      <div
        className="mb-6 flex flex-wrap justify-center gap-2"
        role="group"
        aria-label="Filter clips by audience"
      >
        {[ALL, ...audiences].map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={option === audience ? "default" : "outline"}
            aria-pressed={option === audience}
            data-testid={`reel-filter-${option.toLowerCase()}`}
            onClick={() => setAudience(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm" data-testid="reel-empty">
          No clips for this audience yet.
        </p>
      ) : (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          data-testid="reel-grid"
        >
          {shown.map((clip) => (
            <ReelCard key={clip.slug} clip={clip} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
