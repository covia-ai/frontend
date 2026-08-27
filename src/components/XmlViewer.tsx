"use client";

import { useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { Eye, Loader2 } from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useAssetTextContent } from "@/hooks/use-asset-text-content";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { RawTextPanel } from "@/components/content-preview/RawTextPanel";
import { ShikiCodeBlock } from "@/components/ShikiCodeBlock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CONTENT_PREVIEW_DIALOG_CLASS } from "@/lib/dialog-sizes";

type XmlViewerProps = {
  assetId: string;
  venue?: Venue;
};

export const XmlViewer = ({ assetId, venue: providedVenue }: XmlViewerProps) => {
  const fallbackVenue = useAuthenticatedVenue();
  const venue = providedVenue ?? fallbackVenue;
  const [open, setOpen] = useState(false);
  const content = useAssetTextContent(venue, assetId, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <Eye size={14} />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className={CONTENT_PREVIEW_DIALOG_CLASS}>
        <DialogHeader className="text-sm font-medium text-muted-foreground">
          XML Preview
        </DialogHeader>
        <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="min-h-0 flex-1">
            <ScrollArea className="h-[500px] w-full rounded-lg [&>[data-radix-scroll-area-viewport]>div]:!block">
              {content.loading ? (
                <div className="flex h-[500px] items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={28} />
                </div>
              ) : content.error ? (
                <ErrorDisplay error={content.error} className="p-4" />
              ) : (
                <ShikiCodeBlock
                  code={content.text}
                  language="xml"
                  showLineNumbers
                  wrapLongLines
                  className="m-0 rounded-lg"
                />
              )}
              <ScrollBar orientation="horizontal" />
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="raw" className="min-h-0 flex-1">
            <RawTextPanel
              value={content.text}
              loading={content.loading}
              error={content.error}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
