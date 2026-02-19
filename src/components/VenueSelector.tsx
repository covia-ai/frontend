"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Check, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useVenue } from "@/hooks/use-venue";
import { useVenues } from "@/hooks/use-venues";
import { Venue } from "@covia/covialib";

export function VenueSelector() {
  const pathname = usePathname();
  const  venues = useVenues().getVenue();
  const { currentVenue, setCurrentVenue } = useVenue();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
;

  useEffect(() => {  
  
    // If we already have a current venue, use it
    if (currentVenue) {
      setSelectedVenue(currentVenue);
      return;
    }

    // Check if the pathname contains a venue slug
    const venueMatch = pathname.match(/\/venues\/([^\/]+)/);
    if (venueMatch) {
      const venueSlug = venueMatch[1];
      const venue = venues.find(v => v.venueId === venueSlug);
      if (venue) {
        setCurrentVenue(venue);
        setSelectedVenue(venue);
        return;
      }
    }

    // Default to first venue if no specific venue is found
    if (venues.length > 0) {
      const defaultVenue = venues[0]
      setCurrentVenue(defaultVenue);
      setSelectedVenue(defaultVenue);
    }
  }, [pathname, venues, currentVenue, setCurrentVenue]);

  const handleVenueSelect = (venue: Venue) => {
    setCurrentVenue(venue);
    setSelectedVenue(venue);
    window.location.reload();

    
  };
  if (!selectedVenue || venues.length === 0) {
      
     return (
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="venue" variant="outline" >
          <Building2 size={14} />
          No venues
        </Button>
      </DropdownMenuTrigger>
    </DropdownMenu>
     )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="venue" variant="outline" className="dark:hover:bg-primary-light dark:hover:text-foreground">
          <Building2 size={14} />
          <span className="hidden md:block lg:block">{selectedVenue.metadata.name}</span>
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 " align="start">
        {venues.map((venue) => (
          <DropdownMenuItem
            key={venue.venueId}
            onClick={() => handleVenueSelect(venue)}
            className="flex items-center justify-between cursor-pointer dark:hover:bg-primary-light dark:hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <Building2 size={16} />
              <span className="truncate">{venue.metadata.name}</span>
            </div>
            {selectedVenue?.venueId === venue.venueId && (
              <Check size={16} className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
