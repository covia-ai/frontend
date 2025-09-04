"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon, CircleArrowRight } from "lucide-react";
import { Venue } from "@/lib/covia";
import { useRouter } from 'next/navigation';
import { copyDataToClipBoard } from "@/lib/utils";

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/venues/${venue.venueId}`);
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyDataToClipBoard(venue.baseUrl, "Venue link copied to clipboard");
  };

  const handleViewVenueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(venue.baseUrl, '_blank');
  };

  return (
    <Card 
      className="shadow-md bg-slate-100 flex flex-col rounded-md hover:border-accent hover:border-2 cursor-pointer h-48 overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Fixed-size header */}
      <div className="h-14 p-3 flex flex-row items-center justify-between border-b bg-slate-50">
        <div className="truncate flex-1 mr-2 font-semibold text-sm">{venue.name}</div>
        <div className="flex space-x-2">
          <Tooltip>
            <TooltipTrigger>
              <CopyIcon 
                size={16} 
                onClick={handleCopyClick}
              />
            </TooltipTrigger>
            <TooltipContent>Copy Venue</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Flexible middle section */}
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div className="text-xs text-slate-600 line-clamp-3 mb-2">
          {venue.metadata.description || `${venue.name} Covia Venue`}
        </div>
        <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded break-all">
          {venue.getDID()}
        </div>
      </div>

      {/* Fixed-size footer */}
      <div className="p-2 h-12 flex flex-row items-center justify-between">
        <div className="flex flex-row items-center space-x-2">
          <Badge variant="default" className="border bg-secondary text-white text-xs">
            covia
          </Badge>
        </div>
        
        <Tooltip>
          <TooltipTrigger>
            <CircleArrowRight 
              color="#6B46C1" 
              onClick={handleCardClick}
            />
          </TooltipTrigger>
          <TooltipContent>
            View Venue
          </TooltipContent>
        </Tooltip>
      </div>
    </Card>
  );
}
