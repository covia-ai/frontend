import { useEffect, useState } from "react";
import { Asset, Venue } from "@covia-ai/covialib";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { JsonEditor } from "json-edit-react";

export const JsonViewer = (props:any) => {
   const venueObj = useStore(useVenue, (x) => x.currentVenue);
   const venue = new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.metadata.name})
  
   const [renderData, setRenderData] = useState({});

   useEffect(() => { 
     
      venue.getContent(props.assetId).then((response) => {
        response?.getReader().read().then(({done, value}) => {
          const decoder = new TextDecoder();
          const text = decoder.decode(value);
          const jsonData = JSON.parse(text);
          setRenderData(jsonData)
      });
      
      })
    },[props.assetId])

    
  return (
  <Dialog>
  <DialogTrigger className="text-sm text-secondary dark:text-secondary-light underline">View</DialogTrigger>
  <DialogContent className="bg-card text-card-foreground max-h-[90vh] w-full max-w-4xl p-0 flex flex-col">
     <DialogHeader className="px-6 pt-2 pb-2">
        
    </DialogHeader>
    
    <ScrollArea className="h-[500px] w-full [&>[data-radix-scroll-area-viewport]>div]:!block">
      <div className="p-2">
         <JsonEditor 
                              data={renderData}
                              rootName="content"
                              rootFontSize="1em"
                              maxWidth="80vh"
                              restrictEdit={true}
                              restrictAdd={true}
                              restrictDelete={true}
                              collapse={3}
                            />
      </div>
       <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
    </ScrollArea>
  </DialogContent>
</Dialog>
  );
}