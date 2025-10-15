"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Venue } from "@/lib/covia";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { useVenues } from "@/hooks/use-venues";
import { Iconbutton } from "./Iconbutton";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Cross, CrossIcon, SquareArrowOutUpRight, X } from "lucide-react";

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  const router = useRouter();
  const { removeVenue } = useVenues();

  if(!(venue instanceof Venue))
    venue = new Venue({baseUrl:venue.baseUrl, venueId:venue.venueId, name:venue.name})
  const handleCardClick = () => {
    const encodedUrl = "/venues/"+encodeURIComponent(venue.venueId);
    router.push(encodedUrl);
  };

  const handleRemoveVenue = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeVenue(venue.venueId);
  };

  return (
    <Card 
      className="shadow-md border-2 bg-card flex flex-col rounded-md hover:border-accent cursor-pointer h-48 overflow-hidden"
      
    >
      {/* Fixed-size header */}
      <div className="h-14 p-3 flex flex-row items-center justify-between border-b ">
        <div className="truncate flex-1 mr-2 text-md text-foreground" onClick={handleCardClick}>{venue.name}</div>
            <AlertDialog>
                    <AlertDialogTrigger  className="flex flex-row ">
                        <Iconbutton icon={X} message="Disconnect Venue" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>

                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to disconnect this venue?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. 
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>No</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => handleRemoveVenue(e)}>Yes</AlertDialogAction>
                            </AlertDialogFooter>
                    </AlertDialogContent>
            </AlertDialog>
                    
           
      </div>

      {/* Flexible middle section */}
      <div className="flex-1 p-3 flex flex-col justify-between" onClick={handleCardClick}>
        <div className="text-xs text-muted-foreground line-clamp-3 mb-2">
          {venue.metadata.description || venue.venueId }
        </div>
      
      </div>

      {/* Fixed-size footer */}
      <div className="p-2 h-12 flex flex-row items-center justify-between" onClick={handleCardClick}>
        <div className="flex flex-row items-center space-x-2">
         
        </div>
        
          <Iconbutton icon={SquareArrowOutUpRight} message="View Venue" path="venues" pathId={venue.venueId}/>

      </div>
    </Card>
  );
}
