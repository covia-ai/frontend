"use client";

import { Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useVenues } from "@/hooks/use-venues";
import { useVenueAccess } from "@/hooks/use-venue-access";

export type VenueAccessBadgeContent = {
  icon: typeof Globe;
  label: string;
};

// Whether the active venue's access state is worth stating, and how to say it.
//
// Only asserts "Public" once a real anonymous read has confirmed it — a private
// venue that hasn't finished being probed yet shows neither badge rather than
// briefly claiming public access it doesn't have. Signed in there is nothing to
// say, so this is null and every caller renders nothing.
//
// Shared because the state has two homes: inline beside Sign In from sm up, and
// a row in the topbar's overflow menu below that, where the ~90px badge has no
// line to sit on. useVenueAccess is a pure selector over two stores, so the
// second caller is another subscription, not another request.
export function useVenueAccessBadge(venueId?: string): VenueAccessBadgeContent | null {
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const activeVenueId = venueId ?? selectedVenueId;
  const activeBaseUrl = useVenues((state) =>
    activeVenueId ? state.venues.find((v) => v.venueId === activeVenueId)?.baseUrl : undefined,
  );
  const access = useVenueAccess(activeBaseUrl, activeVenueId ?? undefined);

  if (access.state === "public") return { icon: Globe, label: "Public" };
  if (access.state === "signed-out") return { icon: Lock, label: "Sign-in required" };
  return null;
}

// The inline form, carried next to the Sign In button from sm up.
export function VenueAccessBadge({ venueId }: { venueId?: string }) {
  const badge = useVenueAccessBadge(venueId);
  if (!badge) return null;

  return (
    <Badge
      variant="outline"
      data-testid="venue-access-badge"
      className="h-9 px-3 gap-1.5 text-sm bg-muted text-muted-foreground hidden sm:flex items-center font-normal"
    >
      <badge.icon size={14} />
      {badge.label}
    </Badge>
  );
}
