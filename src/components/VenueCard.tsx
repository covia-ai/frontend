"use client";

import { Card } from "@/components/ui/card";
import { Venue } from "@covia-ai/covialib";
import { useRouter } from 'next/navigation';
import { useVenues } from "@/hooks/use-venues";
import { Iconbutton } from "./Iconbutton";
import {  SquareArrowOutUpRight, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { useEffect, useState } from "react";
import { RemoveVenueModal } from "./RemoveVenueModal";

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter();

  if(!(venue instanceof Venue))
    venue = new Venue({baseUrl:venue.baseUrl, venueId:venue.venueId, name:venue.name})
  
  const handleCardClick = () => {
    const encodedUrl = "/venues/"+encodeURIComponent(venue.venueId);
    router.push(encodedUrl);
  };

 

  return (
    <Card 
      className="shadow-md border-2 bg-card flex flex-col rounded-md border-muted hover:border-accent cursor-pointer h-48 overflow-hidden">
      {/* Fixed-size header */}
      <div className="h-14 p-3 flex flex-row items-center justify-between border-b ">
        <div data-testid="venue-name" className="truncate flex-1 mr-2 text-md text-foreground" onClick={handleCardClick}>{venue.name}</div>
            <RemoveVenueModal venueId={venue.venueId}/>
        </div>
      {/* Flexible middle section */}
      <div className="flex-1 p-3 flex flex-col justify-between" onClick={handleCardClick}>
        <div data-testid="venue-desc" className="text-xs text-card-foreground line-clamp-3 mb-2">
          {venue.metadata.description || "A Covia venue for managing assets and operations" }
        </div>
      
      </div>

      {/* Fixed-size footer */}
      <div className="p-2 h-12 flex flex-row items-center justify-between" onClick={handleCardClick}>
        <div className="text-xs flex flex-row items-center space-x-2">
          <Badge variant="outline" className="bg-muted text-muted-foreground">{venue.venueId }</Badge>
        </div>
        
          <Iconbutton icon={SquareArrowOutUpRight} message="View Venue" path="venues" pathId={venue.venueId} venueId={venue.venueId}/>

      </div>
    </Card>
  );
}
