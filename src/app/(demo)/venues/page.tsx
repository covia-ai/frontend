
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
import { Grid,CredentialsHTTP } from "@covia/covia-sdk";
import { useSession } from "next-auth/react";
import { TopBar } from "@/components/admin-panel/TopBar";
import { AddNewVenueModal } from "@/components/AddNewVenueModal";

export default function VenuesPage() {
  const { addVenue,venues } = useVenues();
  const [venueId, setVenueId] = useState("");
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false)

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
        <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-stretch justify-center gap-4 mb-4">
         
          {venues.map((venue) => ( 
            
              ( search && search.length > 0 ? 
                ( (venue.metadata.name?.toLowerCase().indexOf(search.toLowerCase()) != -1 || venue.venueId.toLowerCase().indexOf(search.toLowerCase()) != -1)
                 && <VenueCard key={venue.venueId} venue={venue} compact={true}/>)
                :
                (  <VenueCard key={venue.venueId} venue={venue} compact={true} /> )
             
              )
           ))}
        </div>
        <div className="h-48 flex flex-center items-center justify-center ">
           <AddNewVenueModal/>
        </div>
      </div>
    </ContentLayout>
  );
}
