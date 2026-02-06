"use client";

import { Card } from "@/components/ui/card";
import { Venue } from "@covia-ai/covialib";
import { useRouter } from 'next/navigation';
import { useVenues } from "@/hooks/use-venues";
import { Badge } from "./ui/badge";
import { RemoveVenueModal } from "./RemoveVenueModal";
import { Building } from "lucide-react";

interface VenueCardProps {
  venue: Venue;
  compact:boolean;
}

export function VenueCard({ venue, compact }: VenueCardProps) {
  const router = useRouter();

  if(!(venue instanceof Venue))
    venue = new Venue({baseUrl:venue.baseUrl, venueId:venue.venueId, name:venue.metadata.name})
  console.log(venue)
  const handleCardClick = () => {
    const encodedUrl = "/venues/"+encodeURIComponent(venue.venueId);
    router.push(encodedUrl);
  };

  return (
    <Card 
      className={`shadow-md border-2 h-full bg-card flex flex-col rounded-md border-muted hover:border-accent hover:border-2 
          ${ compact ? 'h-32 p-1' : 'h-48 p-2'  }`}>
      {/* Fixed-size header */}
      <div className={` ${ compact ? 'h-10' : 'h-14'  } p-2 flex flex-row items-center border-b bg-card-banner`}>
        <div data-testid="venue-name" className="truncate flex-1 mr-2 text-md text-foreground" onClick={handleCardClick}>{venue.metadata.name}</div>
            <RemoveVenueModal venueId={venue.venueId}/>
        </div>
      {/* Flexible middle section */}
      <div className="flex-1 p-2 flex flex-col justify-between" onClick={handleCardClick}>
        <div data-testid="venue-desc" className={` ${ compact ? 'line-clamp-2' : 'line-clamp-3' } text-xs text-card-foreground `}>
          {venue.metadata.description || "A Covia venue for managing assets and operations" }
        </div>
      
      </div>

      {/* Fixed-size footer */}
      <div className="p-1 h-8 flex flex-row-reverse" onClick={handleCardClick}>
          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]"><Building className="text-amber-400 ml-2" size={14}/> {venue.venueId }</Badge>
          
      </div>
    </Card>
  );
}
