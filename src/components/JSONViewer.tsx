import { useEffect, useRef, useState } from "react";
import { Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Copy, Check } from "lucide-react";

export const JsonViewer = (props:any) => {
   const venueObj = useStore(useVenue, (x) => x.currentVenue);
   const venue = new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.metadata.name})
   const { theme } = useTheme();

   const [renderData, setRenderData] = useState({});
   const [rawText, setRawText] = useState("");
   const [copied, setCopied] = useState(false);
   const rawRef = useRef<HTMLTextAreaElement>(null);

   const handleCopy = () => {
     const el = rawRef.current;
     if (!el) return;
      navigator.clipboard.writeText(el.value).then(() => {
       setCopied(true);
       setTimeout(() => setCopied(false), 2000);
     });
   };

   useEffect(() => {

      venue.getContent(props.assetId).then((response) => {
        response?.getReader().read().then(({done, value}) => {
          const decoder = new TextDecoder();
          const text = decoder.decode(value);
          setRawText(text);
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

    <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
      <TabsList>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="raw">Raw</TabsTrigger>
      </TabsList>
      <TabsContent value="preview" className="flex-1 min-h-0">
        <ScrollArea className="h-[500px] w-full [&>[data-radix-scroll-area-viewport]>div]:!block rounded-lg">
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
      </TabsContent>
      <TabsContent value="raw" className="flex-1 min-h-0 relative">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          title={copied ? "Copied!" : "Copy selected or all"}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <textarea
          ref={rawRef}
          readOnly
          value={rawText}
          className="w-full h-[450px] p-4 text-sm bg-white dark:bg-zinc-800 rounded-lg resize-none border-none outline-none font-mono"
        />
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
  );
}
