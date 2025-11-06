
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Search } from "@/components/search";
import { VenueCard } from "@/components/VenueCard";
import { useVenues } from "@/hooks/use-venues";
import { toast } from "sonner"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {  useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Venue } from "@/lib/covia";
import { Iconbutton } from "@/components/Iconbutton";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { RefreshCw, RefreshCwIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function VenuesPage() {
  const { addVenue,venues } = useVenues();
  const [venueDidOrUrl, setVenueDidOrUrl] = useState("");
  const [venueId, setVenueId] = useState("");
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const router = useRouter();

  const addVenueToList = () =>{
    let venueExist = false;
    let processVenueDidOrUrl = venueDidOrUrl;
    venues.map((venue => {
        if(processVenueDidOrUrl.endsWith("/"))
            processVenueDidOrUrl = processVenueDidOrUrl.substring(0,processVenueDidOrUrl.length-1);
        console.log(processVenueDidOrUrl)
        if(venue.venueId == processVenueDidOrUrl) {
          venueExist = true;
        }
      
        else if ((processVenueDidOrUrl.startsWith('http:') || processVenueDidOrUrl.startsWith('https:')) && (venue.baseUrl.indexOf(processVenueDidOrUrl) != -1)) {
            venueExist = true;
        }
        
    }))
    console.log(venueExist)
    if(!venueExist) {
      Venue.connect(processVenueDidOrUrl).then((venue)=> {
        addVenue(venue)
      })
    }
    else {
      toast("This venue is already connected. Please check the URL/DID provided")
    }
  }
  return (
    <ContentLayout title="Venues">
      <SmartBreadcrumb />

      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-center w-full space-x-2 mb-2">
          <Search />

        </div>
         <div className="flex flex-row-reverse w-full mb-2">
          <Tooltip>
            <TooltipTrigger>
              <RefreshCwIcon className="text-foreground" size={14} onClick={() => location.reload()}></RefreshCwIcon>
            </TooltipTrigger>
            <TooltipContent>Refresh Venues</TooltipContent>
          </Tooltip>
          </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4 mb-4">
         
          {venues.map((venue) => ( 
            
              ( search && search.length > 0 ? 
                ( (venue.name.toLowerCase().indexOf(search.toLowerCase()) != -1 || venue.venueId.toLowerCase().indexOf(search.toLowerCase()) != -1)
                 && <VenueCard key={venue.venueId} venue={venue} />)
                :
                (  <VenueCard key={venue.venueId} venue={venue} /> )
             
              )
           ))}
        </div>
        <div className="h-48 flex flex-center items-center justify-center ">
          <Dialog>
            <DialogTrigger>
                  <Iconbutton icon={PlusCircledIcon} message="Connect to new venue" label="Connect to venue"/> 
            </DialogTrigger>
            <DialogContent>
                <DialogTitle className="flex flex-row items-center space-x-2">
                      <Label>Connect to a venue </Label>
              </DialogTitle>
                    
                    <div className="flex flex-col items-center justify-between space-y-4">
                      <div className="flex flex-row items-center justify-center space-x-2 w-full">
                      <Label className="w-32">Venue Url/DID</Label>
                      <Input required onChange={e => setVenueDidOrUrl(e.target.value)} placeholder="Provide venue Url/DID"></Input>
                    </div>
                   
                  </div>
                      <DialogClose>
                          <Button onClick={(e) => addVenueToList()}>Connect</Button>                 
                    </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ContentLayout>
  );
}
