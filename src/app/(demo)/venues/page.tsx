
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
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
import {  useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Iconbutton } from "@/components/Iconbutton";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { RefreshCwIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Grid,CredentialsHTTP } from "@covia-ai/covialib";
import { useSession } from "next-auth/react";
import { TopBar } from "@/components/admin-panel/TopBar";

export default function VenuesPage() {
  const { addVenue,venues } = useVenues();
  const [venueDidOrUrl, setVenueDidOrUrl] = useState("");
  const [venueId, setVenueId] = useState("");
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false)

  const addVenueToList = () =>{
    let venueExist = false;
    let processVenueDidOrUrl = venueDidOrUrl;
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
      Grid.connect(processVenueDidOrUrl,new CredentialsHTTP(venueId,"",session?.user?.email || "")).then((venue)=> {
        addVenue(venue)
      })
    }
    else {
      toast("This venue is already connected. Please check the URL/DID provided")
    }
  }
    useEffect(() => {
        const handleKeyDown = (e) => {
         
          // Ctrl/Cmd + K: Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          e.preventDefault();
          setOpen(true)
        }
        }
       window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

  return (
    <ContentLayout>
      <TopBar />

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
        <div className="w-full grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4 mb-4">
         
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
          <Dialog open={open} onOpenChange={setOpen}>
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
                          <Button aria-label="connect" role="button" onClick={(e) => addVenueToList()}>Connect</Button>                 
                    </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ContentLayout>
  );
}
