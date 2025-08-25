
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Search } from "@/components/search";
import { VenueCard } from "@/components/VenueCard";
import { useVenues } from "@/hooks/use-venues";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {  PlusCircleIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export default function VenuesPage() {
  const { venues } = useVenues();
  const [venueDid, setVenueDid] = useState("");
  return (
    <ContentLayout title="Venues">
      <SmartBreadcrumb />

      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-evenly w-full space-x-2">
          <Search></Search>
        </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4">
          {venues.map((venue) => (
            <VenueCard key={venue.venueId} venue={venue} />
          ))}
             <Dialog>
                    <DialogTrigger>
                        <Tooltip>
                           <TooltipTrigger>
                           <PlusCircleIcon size={32} color="#636363"></PlusCircleIcon>
                             </TooltipTrigger>
                            <TooltipContent>Create new Asset</TooltipContent>
                          </Tooltip>  
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle className="flex flex-row items-center space-x-2">
                              <Label>Connect to a venue </Label>
                      </DialogTitle>
                            
                            <div className="flex flex-col items-center justify-between space-y-4">
                              <div className="flex flex-row items-center justify-center space-x-2 w-full">
                              <Label>Venue</Label>
                              <Input required onChange={e => setVenueDid(e.target.value)} placeholder="Provide venue url or did"></Input>
                            </div>
                          </div>
                             <DialogClose>
                                  <Button>Connect</Button>                 
                            </DialogClose>
                    </DialogContent>
            </Dialog>
        </div>
      </div>
    </ContentLayout>
  );
}
