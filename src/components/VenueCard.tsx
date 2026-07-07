"use client";

import { Card } from "@/components/ui/card";
import { Venue } from "@covia/covia-sdk";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { useRouter } from 'next/navigation';
import { useAuthStore } from "@/hooks/use-auth";
import { Badge } from "./ui/badge";
import { RemoveVenueModal } from "./RemoveVenueModal";
import { Copy } from "lucide-react";
import { copyDataToClipBoard } from "@/lib/utils";

interface VenueCardProps {
  venue: Venue | { baseUrl?: string; venueId: string; metadata?: { name?: string } };
  compact:boolean;
}

export function VenueCard({ venue: venueProp, compact }: VenueCardProps) {
  const router = useRouter();
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);

  const venue = venueProp instanceof Venue
    ? venueProp
    : getVenueFor(venueProp, getAuthForVenue(venueProp.venueId))
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
      <div className="p-1 h-8 flex flex-row-reverse">
          <Badge
            variant="outline"
            className="bg-muted text-muted-foreground text-[10px] max-w-full overflow-hidden cursor-pointer hover:border-accent"
            onClick={(e) => {
              e.stopPropagation();
              copyDataToClipBoard(venue.baseUrl, "Venue URL copied to clipboard");
            }}
          >
            <Copy className="text-amber-400 ml-2 flex-shrink-0" size={14}/> <span className="truncate">{venue.baseUrl}</span>
          </Badge>
      </div>
    </Card>
  );
}
