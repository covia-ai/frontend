"use client";

import Image from "next/image";
import { Play, ShieldCheck } from "lucide-react";
import type { ReelClip } from "@/config/demo-reel";
import { formatRuntime, reelPosterUrl } from "@/lib/reel-media";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReelCardProps {
  clip: ReelClip;
  onSelect: (clip: ReelClip) => void;
}

/**
 * One clip in the library.
 *
 * A button rather than a div with a click handler: these are the primary
 * controls on the page and they have to be reachable and operable from the
 * keyboard, which is exactly what the three YouTube cards below them have
 * never been.
 */
export function ReelCard({ clip, onSelect }: ReelCardProps) {
  const hasCiso = Boolean(clip.cuts.ciso);

  return (
    <button
      type="button"
      data-testid={`reel-card-${clip.slug}`}
      onClick={() => onSelect(clip)}
      className={cn(
        "group bg-card text-card-foreground flex h-full flex-col overflow-hidden rounded-lg border text-left",
        "transition-shadow duration-200 hover:shadow-lg",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="bg-primary flex size-14 items-center justify-center rounded-full shadow-xl">
            <Play size={24} className="ml-0.5 fill-white text-white" />
          </span>
        </div>
        <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-xs text-white tabular-nums">
          {formatRuntime(clip.runtimeSec)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-foreground font-semibold tracking-tight">{clip.title}</h3>
          {hasCiso && (
            <span
              className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs"
              title="Also available in a cut written for a governance audience"
            >
              <ShieldCheck size={14} aria-hidden="true" />
              CISO cut
            </span>
          )}
        </div>

        <p className="text-muted-foreground line-clamp-3 flex-1 text-sm">{clip.claim}</p>

        <div className="flex flex-wrap gap-1 pt-1">
          {clip.audiences.map((audience) => (
            <Badge key={audience} variant="outline" className="text-xs font-normal">
              {audience}
            </Badge>
          ))}
        </div>
      </div>
    </button>
  );
}
