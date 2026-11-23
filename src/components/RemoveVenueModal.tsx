"use client";

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
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X } from "lucide-react";
import { gtmEvent } from "@/lib/utils";
import { forgetVenue } from "@/lib/venue-replacement";

export function RemoveVenueModal({ venueId }: { venueId: string }) {
  const handleRemoveVenue = (event: React.MouseEvent) => {
    // The card behind the dialog is itself clickable.
    event.stopPropagation();
    forgetVenue(venueId);
    gtmEvent.removeVenue(venueId);
  };

  return (
    <AlertDialog>
      {/* Single <button> (AlertDialogTrigger's) — TooltipTrigger adopts it via
          asChild; nested trigger buttons are invalid HTML and break
          hydration. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger className="flex flex-row" aria-label="Remove venue">
            <X size={16} data-testid="remove_btn" />
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent data-testid="btn-tootip">Remove Venue</TooltipContent>
      </Tooltip>
      <AlertDialogContent className="bg-card text-card-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle data-testid="remove-title">
            Are you sure you want to disconnect this venue?
          </AlertDialogTitle>
          <AlertDialogDescription data-testid="remove-desc">
            This also signs you out of it and forgets its saved accounts on this
            browser. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="remove-cancel">No</AlertDialogCancel>
          <AlertDialogAction data-testid="remove-confirm" onClick={handleRemoveVenue}>
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
