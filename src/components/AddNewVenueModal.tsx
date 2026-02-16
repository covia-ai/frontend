import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { useVenues } from "@/hooks/use-venues";
import { Iconbutton } from "./Iconbutton";
import { CredentialsHTTP, Grid } from "@covia-ai/covialib";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { gtmEvent } from "@/lib/utils";

export const AddNewVenueModal = (props:any) => {
    const [open, setOpen] = useState(false)
    const { addVenue,venues } = useVenues();
    const { data: session } = useSession();
    const [venueDidOrUrl, setVenueDidOrUrl] = useState("");

    const addVenueToList = () =>{
    let venueExist = false;
    let processVenueDidOrUrl = venueDidOrUrl;
    gtmEvent.buttonClick('Add Venue', venueDidOrUrl);

    venues.map((venue => {
        if(processVenueDidOrUrl.endsWith("/"))
            processVenueDidOrUrl = processVenueDidOrUrl.substring(0,processVenueDidOrUrl.length-1);
        if(venue.venueId == processVenueDidOrUrl) {
          venueExist = true;
        }
      
        else if ((processVenueDidOrUrl.startsWith('http:') || processVenueDidOrUrl.startsWith('https:')) && (venue.baseUrl.indexOf(processVenueDidOrUrl) != -1)) {
            venueExist = true;
        }
        
    }))
    if(!venueExist) {
      Grid.connect(processVenueDidOrUrl,new CredentialsHTTP(venueDidOrUrl,"",session?.user?.email || "")).then((venue)=> {
        addVenue(venue)
      })
    }
    else {
      toast("This venue is already connected. Please check the URL/DID provided")
    }
    }

    return (
       <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                  <Iconbutton icon={PlusCircledIcon} message="Connect to new venue" label="Connect to venue"/> 
            </DialogTrigger>
            <DialogContent className="bg-card text-card-foreground">
                <DialogTitle data-testid="add-title" className="flex flex-row items-center space-x-2">
                      Connect to a venue
              </DialogTitle>
                    
                    <div className="flex flex-col items-center justify-between space-y-4">
                      <div className="flex flex-row items-center justify-center space-x-2 w-full">
                      <Label  className="w-32">Venue Url/DID</Label>
                      <Input data-testid="venue-urlid" required onChange={e => setVenueDidOrUrl(e.target.value)} placeholder="Provide venue Url/DID"></Input>
                    </div>
                   
                  </div>
                      <DialogClose>
                          <Button data-testid="venue-addbtn" aria-label="connect" role="button" onClick={(e) => addVenueToList()}>Connect</Button>                 
                    </DialogClose>
            </DialogContent>
       </Dialog>
    )
}