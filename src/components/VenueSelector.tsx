"use client";

import { ChevronDown, Check, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useVenues, useVenuesHydrated } from "@/hooks/use-venues";
import { useVenueHealth } from "@/hooks/use-venue-health";
import { ADDRESSLESS_VENUE_DETAIL, isAddresslessVenueId } from "@/hooks/use-venue-for-route";
import type { VenueDescriptor } from "@/hooks/use-venues";
import { venueDisplayName } from "@/lib/venue-display";
import { VenueHealthDot } from "./VenueHealthDot";
import { usePathname, useRouter } from "next/navigation";

export function VenueSelector({ venueId }: { venueId?: string }) {
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const selectVenue = useVenues((state) => state.selectVenue);
  const pathname = usePathname();
  const router = useRouter();
  let routeVenueId = venueId;
  if (routeVenueId) {
    try {
      routeVenueId = decodeURIComponent(routeVenueId);
    } catch {
      // Leave malformed route values untouched; the venue resolver will
      // surface the connection error elsewhere.
    }
  }
  const activeVenueId = routeVenueId ?? selectedVenueId;
  const selectedVenue = venues.find(
    (venue) => venue.venueId === activeVenueId,
  );

  const handleVenueSelect = (venue: VenueDescriptor) => {
    selectVenue(venue.venueId);
    if (!venueId) return;
    const segments = pathname.split("/");
    const routeVenueIndex = segments.findIndex(
      (segment, index) => index > 0 && segments[index - 1] === "venues",
    );
    if (routeVenueIndex >= 0) {
      segments[routeVenueIndex] = encodeURIComponent(venue.venueId);
      router.push(segments.join("/"));
    }
  };
  // A routed venue missing from the list is being resolved by the page
  // (useVenueForRoute), which records a failure in the health store under the
  // id it connected with. Read that rather than resolving again here, which
  // would connect and report twice. Until it fails, it's still resolving (#467).
  const hydrated = useVenuesHydrated();
  const routeHealth = useVenueHealth((state) =>
    routeVenueId && !selectedVenue
      ? state.byUrl[venueId ?? ""] ?? state.byUrl[routeVenueId]
      : undefined,
  );
  const unresolvedDetail =
    !routeVenueId || selectedVenue || !hydrated
      ? undefined
      : routeHealth?.state === "unreachable"
        ? routeHealth.detail
        : isAddresslessVenueId(routeVenueId)
          ? `This venue ${ADDRESSLESS_VENUE_DETAIL}`
          : undefined;
  const selectedVenueLabel = selectedVenue
    ? venueDisplayName(selectedVenue)
    : unresolvedDetail
      ? "Venue unavailable"
      : activeVenueId
        ? "Resolving venue…"
        : "No venues";

  if (venues.length === 0) {
      
     return (
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="venue" variant="outline" title={unresolvedDetail}>
          <Building2 size={14} />
          {selectedVenueLabel}
        </Button>
      </DropdownMenuTrigger>
    </DropdownMenu>
     )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="venue" variant="outline" title={unresolvedDetail} className="px-2 gap-1 sm:px-4 sm:gap-2 hover:bg-primary-vlight hover:text-foreground">
          {selectedVenue && <VenueHealthDot baseUrl={selectedVenue.baseUrl} venueId={selectedVenue.venueId} />}
          <Building2 size={14} />
          <span className="hidden md:block lg:block">
            {selectedVenueLabel}
          </span>
          {/* Chevron is a dropdown affordance — dropped on mobile (tap still opens
              it) so the tight topbar keeps room for the breadcrumb. */}
          <ChevronDown size={14} className="hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 " align="start">
        {venues.map((venue) => (
          <DropdownMenuItem
            key={venue.venueId}
            onClick={() => handleVenueSelect(venue)}
            className="flex items-center justify-between cursor-pointer hover:bg-primary-vlight hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <VenueHealthDot baseUrl={venue.baseUrl} venueId={venue.venueId} />
              <Building2 size={16} />
              <span className="truncate">{venueDisplayName(venue)}</span>
            </div>
            {activeVenueId === venue.venueId && (
              <Check size={16} className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
