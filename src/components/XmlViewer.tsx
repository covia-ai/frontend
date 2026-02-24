import { useEffect, useState } from "react";
import { Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export const XmlViewer = (props: { assetId: string }) => {
  const venueObj = useStore(useVenue, (x) => x.currentVenue);
  const venue = new Venue({ baseUrl: venueObj?.baseUrl, venueId: venueObj?.venueId, name: venueObj?.metadata.name });

  const [renderData, setRenderData] = useState("");

  useEffect(() => {
    venue.getContent(props.assetId).then((response) => {
      const reader = response?.getReader();
      const chunks: Uint8Array[] = [];
      const read = (): void => {
        reader?.read().then(({ done, value }) => {
          if (done) {
            const decoder = new TextDecoder();
            const text = chunks.map(chunk => decoder.decode(chunk, { stream: true })).join("") + decoder.decode();
            setRenderData(text);
            return;
          }
          chunks.push(value);
          read();
        });
      };
      read();
    });
  }, [props.assetId]);

  return (
    <Dialog>
      <DialogTrigger className="text-sm text-secondary dark:text-secondary-light underline">View</DialogTrigger>
      <DialogContent className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 max-h-[90vh] w-full max-w-4xl p-4 flex flex-col overflow-hidden border dark:border-zinc-700">
        <DialogHeader className="text-sm font-medium text-muted-foreground">
          XML Preview
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 h-[500px] w-full [&>[data-radix-scroll-area-viewport]>div]:!block rounded-lg">
          <SyntaxHighlighter
            language="xml"
            style={oneDark}
            showLineNumbers
            wrapLongLines
            customStyle={{ margin: 0, borderRadius: "0.5rem", fontSize: "0.875rem" }}
          >
            {renderData}
          </SyntaxHighlighter>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
