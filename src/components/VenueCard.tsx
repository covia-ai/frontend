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
  compact:boolean;
}

export function VenueCard({ venue, compact }: VenueCardProps) {
  const router = useRouter();

  if(!(venue instanceof Venue))
    venue = new Venue({baseUrl:venue.baseUrl, venueId:venue.venueId, name:venue.name})
  
  const handleCardClick = () => {
    const encodedUrl = "/venues/"+encodeURIComponent(venue.venueId);
    router.push(encodedUrl);
  };

  return (
    <Card 
      className={`shadow-md border-2 h-full bg-card flex flex-col rounded-md border-muted hover:border-accent hover:border-2 
          ${ compact ? 'h-36 p-1' : 'h-48 p-2' }`}>
      {/* Fixed-size header */}
      <div className={` ${ compact ? 'h-10' : 'h-14' } p-2 flex flex-row items-center border-b bg-card-banner`}>
        <div data-testid="venue-name" className="truncate flex-1 mr-2 text-md text-foreground" onClick={handleCardClick}>{venue.metadata.name}</div>
            <RemoveVenueModal venueId={venue.venueId}/>
        </div>
      {/* Flexible middle section */}
      <div className="flex-1 p-3 flex flex-col justify-between" onClick={handleCardClick}>
        <div data-testid="venue-desc" className={` ${ compact ? 'line-clamp-2' : 'line-clamp-3' } text-xs text-card-foreground `}>
          {venue.metadata.description || "A Covia venue for managing assets and operations" }
        </div>
      
      </div>

      {/* Fixed-size footer */}
      <div className="p-2 h-12 flex flex-row items-center justify-between" onClick={handleCardClick}>
        <div className="text-xs flex flex-row items-center space-x-2">
          <Badge variant="outline" className="bg-muted text-muted-foreground">{venue.venueId }</Badge>
        </div>
        
          <Iconbutton compact={compact} icon={SquareArrowOutUpRight} message="View Venue" path="venues" pathId={venue.venueId} venueId={venue.venueId}/>

      </div>
    </Card>
  );
}
