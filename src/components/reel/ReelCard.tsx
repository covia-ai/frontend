"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { ReelClip, ReelCutId } from "@/config/demo-reel";
import { formatRuntime, reelPosterUrl } from "@/lib/reel-media";
import { publicAudiences } from "@/lib/reel-audiences";
import { CUT_LABELS } from "./CutSwitcher";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReelCardProps {
  clip: ReelClip;
  onSelect: (clip: ReelClip, cut?: ReelCutId) => void;
}

/**
 * One clip in the library.
 *
 * The card is a container rather than one big button, because the eight clips
 * with a governance register carry two actions, and a button cannot live
 * inside a button. So the poster and text are one control that opens the clip
 * in its default voice, and the footer underneath is a second pair that opens
 * it in a named one. The footer is also the only place a visitor learns the
 * second cut exists without opening anything first, which is why it is on the
 * card and not only in the player.
 */
export function ReelCard({ clip, onSelect }: ReelCardProps) {
  const cuts = Object.keys(clip.cuts) as ReelCutId[];
  const hasBoth = cuts.length > 1;

  return (
    <div
      data-testid={`reel-card-${clip.slug}`}
      className="group bg-card text-card-foreground flex h-full flex-col overflow-hidden rounded-lg border transition-shadow duration-200 hover:shadow-lg"
    >
      <button
        type="button"
        data-testid={`reel-open-${clip.slug}`}
        onClick={() => onSelect(clip)}
        className={cn(
          "flex flex-1 cursor-pointer flex-col text-left",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:-ring-offset-2 focus-visible:outline-hidden",
        )}
      >
        <div className="bg-muted relative aspect-video w-full overflow-hidden">
          <Image
            src={reelPosterUrl(clip.poster)}
            alt=""
            fill
            sizes="(min-width: 1280px) 24rem, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="bg-primary flex size-14 items-center justify-center rounded-full shadow-xl">
              <Play size={24} className="ml-0.5 fill-white text-white" />
            </span>
          </div>
          <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-xs text-white tabular-nums">
            {formatRuntime(clip.runtimeSec)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-foreground font-semibold tracking-tight">{clip.title}</h3>
          <p className="text-muted-foreground line-clamp-3 flex-1 text-sm">{clip.claim}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {publicAudiences(clip.audiences).map((audience) => (
              <Badge key={audience} variant="outline" className="text-xs font-normal">
                {audience}
              </Badge>
            ))}
          </div>
        </div>
      </button>

      {hasBoth && (
        <div className="border-t px-4 py-3" data-testid={`reel-cuts-${clip.slug}`}>
          <p className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
            Watch narrated for
          </p>
          <div className="grid grid-cols-2 gap-2">
            {cuts.map((cut) => {
              const { label, hint, Icon } = CUT_LABELS[cut];
              return (
                <button
                  key={cut}
                  type="button"
                  title={hint}
                  data-testid={`reel-cut-${clip.slug}-${cut}`}
                  onClick={() => onSelect(clip, cut)}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm transition-colors",
                    "hover:border-icon-violet hover:bg-icon-violet/10 hover:text-icon-violet",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden",
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
