import { useEffect, useState } from "react";
import { Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";

export const JsonViewer = (props:any) => {
   const venueObj = useStore(useVenue, (x) => x.currentVenue);
   const venue = new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.metadata.name})
   const { theme } = useTheme();

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
  <DialogContent className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 max-h-[90vh] w-full max-w-4xl p-4 flex flex-col overflow-hidden border dark:border-zinc-700">
     <DialogHeader className="text-sm font-medium text-muted-foreground">
        JSON Preview
    </DialogHeader>

    <ScrollArea className="flex-1 min-h-0 h-[500px] w-full [&>[data-radix-scroll-area-viewport]>div]:!block rounded-lg">
      <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg">
         <JsonEditor
                              data={renderData}
                              rootName="content"
                              rootFontSize="0.875em"
                              maxWidth="80vh"
                              restrictEdit={true}
                              restrictAdd={true}
                              restrictDelete={true}
                              collapse={3}
                              theme={theme === "dark" ? githubDarkTheme : githubLightTheme}
                            />
      </div>
       <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
    </ScrollArea>
  </DialogContent>
</Dialog>
  );
}