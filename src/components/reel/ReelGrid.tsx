"use client";

import { useMemo, useState } from "react";
import type { ReelClip, ReelCutId } from "@/config/demo-reel";
import { ReelCard } from "./ReelCard";
import { Button } from "@/components/ui/button";
import { publicAudiences } from "@/lib/reel-audiences";

interface ReelGridProps {
  clips: ReelClip[];
  onSelect: (clip: ReelClip, cut?: ReelCutId) => void;
}

const ALL = "All";

/**
 * The audiences this page offers as filters.
 *
 * Every audience a clip carries is shown on its card, because the tags say who
 * the clip was written for. Only some of them are worth a chip: the people who
 * actually arrive at this page come to it as a builder, a risk owner or someone
 * integrating, and a chip per room turns the one control that matters into a
 * row of seven. Investor and Board stay off for that reason — both are rooms we
 * walk someone into, not ones they browse from.
 *
 * Nothing becomes unreachable. Every clip tagged Investor or Board is also
 * tagged CTO or CISO, and `unreachableClips` is asserted against the manifest
 * so that stays true as clips are added.
 */
const FILTER_AUDIENCES = ["CTO", "CISO", "Partners", "Developers"];

/**
 * The filterable audiences named by at least one clip, in suite order.
 *
 * Still derived from the clips rather than listed outright, so a filter never
 * appears for an audience no clip actually carries.
 */
export function audiencesOf(clips: ReelClip[]): string[] {
  const seen: string[] = [];
  for (const clip of clips) {
    for (const audience of publicAudiences(clip.audiences)) {
      if (FILTER_AUDIENCES.includes(audience) && !seen.includes(audience)) seen.push(audience);
    }
  }
  return seen;
}

/** Whether every clip can still be reached from the filters on offer. */
export function unreachableClips(clips: ReelClip[]): ReelClip[] {
  const offered = audiencesOf(clips);
  return clips.filter((clip) => !clip.audiences.some((a) => offered.includes(a)));
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
