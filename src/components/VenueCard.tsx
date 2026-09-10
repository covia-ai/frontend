"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import type { VenueDescriptor } from "@/hooks/use-venues";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { RemoveVenueModal } from "./RemoveVenueModal";
import { VenueTrustPill } from "./VenueTrustPill";
import { VenueMark } from "./VenueMark";
import { ArrowUpRight, Copy, Database, PlayCircle } from "lucide-react";
import { cn, copyDataToClipBoard } from "@/lib/utils";
import { venueDisplayName } from "@/lib/venue-display";
import { getVenueStatus } from "@/lib/venue-registry";

interface VenueCardProps {
  venue: VenueDescriptor;
  compact: boolean;
}

export function VenueCard({ venue: venueProp, compact }: VenueCardProps) {
  const router = useRouter();
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const selectedVenueId = useVenues((s) => s.selectedVenueId);

  const venue = getVenueFor(venueProp, getAuthForVenue(venueProp.venueId));
  const host = (() => {
    try {
      return new URL(venue.baseUrl).host;
    } catch {
      return venue.baseUrl;
    }
  })();
  const isDefault = selectedVenueId === venue.venueId;

  // Same job-free /api/v1/status read as today (and as the detail page) — kept
  // to a single read per card; "–" never a false 0.
  const [stats, setStats] = useState<{ assets?: number; ops?: number } | null>(null);
  useEffect(() => {
    let ignore = false;
    getVenueStatus(venue)
      .then((status) => {
        if (!ignore) setStats(status?.stats ?? {});
      })
      .catch(() => {
        /* leave stats unset */
      });
    return () => {
      ignore = true;
    };
  }, [venue]);

  const go = () => router.push("/venues/" + encodeURIComponent(venue.venueId));
  const statValue = (n?: number) => n ?? "–";
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card
      onClick={go}
      className={cn(
        "group flex h-full cursor-pointer flex-col gap-0 overflow-hidden rounded-xl border bg-card p-0 shadow-sm transition-all hover:border-accent hover:shadow-md",
        isDefault && "border-primary ring-1 ring-primary",
      )}
    >
      {/* Header band: identity mark + name + host + remove */}
      <div className="flex items-start gap-2.5 border-b bg-card-banner px-3.5 py-3">
        <VenueMark venueId={venue.venueId} className="size-9" />
        <div className="min-w-0 flex-1">
          <div
            data-testid="venue-name"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
          >
            <span className="truncate">{venueDisplayName(venue)}</span>
            {isDefault && (
              <span
                className="shrink-0 rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary"
                title="Your default venue"
              >
                Default
              </span>
            )}
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{host}</div>
        </div>
        <span onClick={stop} className="shrink-0">
          <RemoveVenueModal venueId={venue.venueId} />
        </span>
      </div>

      {/* Body: trust pill + description + stats */}
      <div className="flex flex-1 flex-col gap-2.5 px-3.5 py-3">
        <VenueTrustPill baseUrl={venue.baseUrl} venueId={venue.venueId} />
        <div
          data-testid="venue-desc"
          className={cn("text-xs leading-snug text-card-foreground", compact ? "line-clamp-1" : "line-clamp-2")}
        >
          {venue.metadata.description || "A Covia venue for managing assets and operations"}
        </div>
        <div className="mt-auto flex items-center gap-4 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Assets">
            <Database size={12} className="shrink-0 text-primary" />
            {statValue(stats?.assets)}
          </span>
          <span className="flex items-center gap-1" title="Operations">
            <PlayCircle size={12} className="shrink-0 text-primary" />
            {statValue(stats?.ops)}
          </span>
        </div>
      </div>

      {/* Footer: copy URL + open */}
      <div className="flex items-center justify-between gap-2 border-t bg-card-banner px-3.5 py-2">
        <button
          type="button"
          aria-label="Copy venue URL"
          onClick={(e) => {
            stop(e);
            copyDataToClipBoard(venue.baseUrl, "Venue URL copied to clipboard");
          }}
          className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Copy size={11} className="shrink-0" />
          <span className="truncate">{venue.baseUrl}</span>
        </button>
        <button
          type="button"
          aria-label="Open venue"
          onClick={(e) => {
            stop(e);
            go();
          }}
          className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
        >
          Open <ArrowUpRight size={12} />
        </button>
      </div>
    </Card>
  );
}
