import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Copy, Check } from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";

export const JsonViewer = (props:any) => {
   const venue = useAuthenticatedVenue();
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
      if (!venue) return;
      venue.assets.getContent(props.assetId).then((response) => {
        response?.getReader().read().then(({ value }) => {
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
  <DialogContent className="bg-card text-card-foreground max-h-[90vh] w-full max-w-4xl p-4 flex flex-col overflow-hidden border border-border">
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
          <div className="p-4 bg-background rounded-lg">
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
          className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
          title={copied ? "Copied!" : "Copy selected or all"}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <textarea
          ref={rawRef}
          readOnly
          value={rawText}
          className="w-full h-[450px] p-4 text-sm bg-background rounded-lg resize-none border-none outline-none font-mono"
        />
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
  );
}
