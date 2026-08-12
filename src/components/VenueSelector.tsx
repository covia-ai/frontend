"use client";

import { ChevronDown, Check, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useVenues } from "@/hooks/use-venues";
import type { VenueDescriptor } from "@/hooks/use-venues";
import { VenueHealthDot } from "./VenueHealthDot";
import { usePathname, useRouter } from "next/navigation";

export function VenueSelector({ venueId }: { venueId?: string }) {
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const selectVenue = useVenues((state) => state.selectVenue);
  const pathname = usePathname();
  const router = useRouter();
  const activeVenueId = venueId ?? selectedVenueId;
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
  const routeVenueLabel = (() => {
    if (!venueId) return "No venues";
    try {
      return decodeURIComponent(venueId);
    } catch {
      return venueId;
    }
  })();

  if (venues.length === 0) {
      
     return (
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="venue" variant="outline" >
          <Building2 size={14} />
          {routeVenueLabel}
        </Button>
      </DropdownMenuTrigger>
    </DropdownMenu>
     )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="venue" variant="outline" className="hover:bg-primary-vlight hover:text-foreground">
          {selectedVenue && <VenueHealthDot baseUrl={selectedVenue.baseUrl} />}
          <Building2 size={14} />
          <span className="hidden md:block lg:block">
            {selectedVenue?.metadata.name ?? routeVenueLabel}
          </span>
          <ChevronDown size={14} />
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
              <VenueHealthDot baseUrl={venue.baseUrl} />
              <Building2 size={16} />
              <span className="truncate">{venue.metadata.name}</span>
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
