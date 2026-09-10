"use client";

import Link from "next/link";
import { Network } from "lucide-react";
import type { VenueDescriptor } from "@/hooks/use-venues";
import { VenueMark } from "./VenueMark";
import { VenueHealthDot } from "./VenueHealthDot";
import { venueDisplayName } from "@/lib/venue-display";
import { cn } from "@/lib/utils";

// The federation as a map: your venues arranged around a central hub, each a
// node you can click through to. A dependency-free radial SVG/HTML layout (no
// graph library) — edges are a thin SVG layer, the nodes are HTML so they reuse
// VenueMark + the tested VenueHealthDot and stay clickable/hoverable. This is
// the optional "C" layer on top of the card grid; dropping the view toggle and
// this file reverts cleanly to the grid.

type Pos = { x: number; y: number };

function VenueMapNode({ venue, pos, isDefault }: { venue: VenueDescriptor; pos: Pos; isDefault: boolean }) {
  return (
    <Link
      href={`/venues/${encodeURIComponent(venue.venueId)}`}
      data-testid="venues-map-node"
      className="group absolute flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-center"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <span className={cn("relative rounded-xl transition-transform group-hover:scale-105", isDefault && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
        <VenueMark venueId={venue.venueId} className="size-12" />
        <span className="absolute -right-1 -top-1 rounded-full bg-background p-0.5">
          <VenueHealthDot baseUrl={venue.baseUrl} venueId={venue.venueId} />
        </span>
      </span>
      <span className="max-w-full truncate text-xs font-medium text-foreground group-hover:text-primary">
        {venueDisplayName(venue)}
      </span>
      {isDefault && (
        <span className="rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
          Default
        </span>
      )}
    </Link>
  );
}

export function VenueNetworkMap({
  venues,
  selectedVenueId,
}: {
  venues: VenueDescriptor[];
  selectedVenueId?: string | null;
}) {
  const n = venues.length;
  // Radial layout: nodes on a circle around the hub, starting at the top.
  const R = 38; // percent of the box
  const positions: Pos[] = venues.map((_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
    return { x: 50 + R * Math.cos(angle), y: 50 + R * Math.sin(angle) };
  });

  return (
    <div data-testid="venues-map" className="relative mx-auto my-4 h-[460px] w-full max-w-3xl">
      {/* Edges — a thin layer behind the nodes. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {positions.map((p, i) => (
          <line
            key={i}
            x1={50}
            y1={50}
            x2={p.x}
            y2={p.y}
            stroke="var(--border)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Hub — you, at the centre of your federation. */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
        <span className="flex size-14 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-primary">
          <Network size={22} />
        </span>
        <span className="text-xs font-medium text-muted-foreground">Your network</span>
      </div>

      {/* Nodes */}
      {venues.map((v, i) => (
        <VenueMapNode key={v.venueId} venue={v} pos={positions[i]} isDefault={v.venueId === selectedVenueId} />
      ))}
    </div>
  );
}
