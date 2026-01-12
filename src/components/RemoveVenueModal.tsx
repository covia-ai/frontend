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
import { useState } from "react"
import { useVenues } from "@/hooks/use-venues";
import { Iconbutton } from "./Iconbutton";
import { X } from "lucide-react";

export const RemoveVenueModal = (props:any) => {
    const [open, setOpen] = useState(false)
    const { removeVenue } = useVenues();
    const handleRemoveVenue = (e: React.MouseEvent) => {
                e.stopPropagation();
                removeVenue(props.venueId);
     };


    return (
        <AlertDialog data-testid="remove-venue" open={open} onOpenChange={setOpen}>
                    <AlertDialogTrigger  className="flex flex-row ">
                        <Iconbutton icon={X} message="Disconnect Venue" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card text-card-foreground">

                        <AlertDialogHeader>
                            <AlertDialogTitle data-testid="remove-title">Are you sure you want to disconnect this venue?</AlertDialogTitle>
                            <AlertDialogDescription data-testid="remove-desc">
                                This action cannot be undone. 
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>No</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => handleRemoveVenue(e)}>Yes</AlertDialogAction>
                        </AlertDialogFooter>

                    </AlertDialogContent>
         </AlertDialog>   
    )
}