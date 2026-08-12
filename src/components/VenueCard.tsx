"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import type { VenueDescriptor } from "@/hooks/use-venues";
import { useRouter } from 'next/navigation';
import { useAuthStore } from "@/hooks/use-auth";
import { RemoveVenueModal } from "./RemoveVenueModal";
import { VenueHealthDot } from "./VenueHealthDot";
import { Copy, Database, PlayCircle } from "lucide-react";
import { copyDataToClipBoard } from "@/lib/utils";
import { venueDisplayName } from "@/lib/venue-display";

interface VenueCardProps {
  venue: VenueDescriptor;
  compact:boolean;
}

export function VenueCard({ venue: venueProp, compact }: VenueCardProps) {
  const router = useRouter();
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);

  const venue = getVenueFor(
    venueProp,
    getAuthForVenue(venueProp.venueId),
  );

  // Same job-free /api/v1/status read the venue detail page uses for its
  // stat panel — surfaced here too so the list view isn't just a name and a
  // generic description. Left at "–" (never a false 0) if the read fails.
  const [stats, setStats] = useState<{ assets?: number; ops?: number } | null>(null);
  useEffect(() => {
    let ignore = false;
    venue.status()
      .then((status) => { if (!ignore) setStats(status?.stats ?? {}); })
      .catch(() => { /* leave stats unset */ });
    return () => { ignore = true; };
  }, [venue]);

  const handleCardClick = () => {
    const encodedUrl = "/venues/"+encodeURIComponent(venue.venueId);
    router.push(encodedUrl);
  };

  const statValue = (n?: number) => n ?? "–";

  return (
    <Card
      className={`shadow-md border-2 h-full bg-card flex flex-col rounded-md border-muted hover:border-accent hover:border-2
          ${ compact ? 'h-40 p-1' : 'h-60 p-2'  }`}>
      {/* Fixed-size header */}
      <div className={` ${ compact ? 'h-10' : 'h-14'  } p-2 flex flex-row items-center gap-2 border-b bg-card-banner`}>
        <VenueHealthDot baseUrl={venue.baseUrl} venueId={venue.venueId} />
        <div data-testid="venue-name" className="truncate flex-1 mx-2 text-md text-foreground" onClick={handleCardClick}>{venueDisplayName(venue)}</div>
            <RemoveVenueModal venueId={venue.venueId}/>
        </div>
      {/* Flexible middle section */}
      <div className="flex-1 p-2 flex flex-col gap-2 justify-start" onClick={handleCardClick}>
        <div data-testid="venue-desc" className={` ${ compact ? 'line-clamp-1' : 'line-clamp-2' } text-xs text-card-foreground `}>
          {venue.metadata.description || "A Covia venue for managing assets and operations" }
        </div>
        <div className="flex flex-row items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1" title="Assets">
            <Database size={12} className="text-primary shrink-0"/>
            <span>{statValue(stats?.assets)}</span>
          </div>
          <div className="flex items-center gap-1" title="Operations">
            <PlayCircle size={12} className="text-primary shrink-0"/>
            <span>{statValue(stats?.ops)}</span>
          </div>
        </div>
      </div>

      {/* Fixed-size footer */}
      <div className="px-2 h-8 flex flex-row items-center justify-end">
          <button
            type="button"
            aria-label="Copy venue URL"
            className="flex items-center gap-1 max-w-full overflow-hidden text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              copyDataToClipBoard(venue.baseUrl, "Venue URL copied to clipboard");
            }}
          >
            <Copy size={12} className="shrink-0"/> <span className="truncate">{venue.baseUrl}</span>
          </button>
      </div>
    </Card>
  );
}
