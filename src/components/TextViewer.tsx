import { useEffect, useState } from "react";
import { Asset, Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

export const TextViewer = (props:any) => {
   const venueObj = useStore(useVenue, (x) => x.currentVenue);
   const venue = new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.metadata.name})
  
   const [renderData, setRenderData] = useState("");

   useEffect(() => { 
      venue.getContent(props.assetId).then((response) => {
        response?.getReader().read().then(({done, value}) => {
          const decoder = new TextDecoder();
          const text = decoder.decode(value);
          setRenderData(text)
      });
      
      })
    },[props.assetId])

    
  return (
  <Dialog>
  <DialogTrigger className="text-sm text-secondary dark:text-secondary-light underline">View</DialogTrigger>
  <DialogContent className="bg-card text-card-foreground max-h-[90vh] w-full max-w-4xl p-0 flex flex-col items-center">
    <DialogHeader className="px-6 pt-2 pb-2">
        
    </DialogHeader>
    
    <ScrollArea className="h-[500px] w-11/12 rounded-md [&>[data-radix-scroll-area-viewport]>div]:!block m-2 border border-slate-100 rounded-md">
      <div className="p-2">
          {renderData}
      </div>
       <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
    </ScrollArea>
  </DialogContent>
</Dialog>
  );
}