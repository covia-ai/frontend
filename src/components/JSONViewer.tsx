"use client";

import { useMemo, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useTheme } from "next-themes";
import { JsonEditor, githubDarkTheme, githubLightTheme } from "json-edit-react";
import { Loader2 } from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useAssetTextContent } from "@/hooks/use-asset-text-content";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { RawTextPanel } from "@/components/content-preview/RawTextPanel";
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

type JsonViewerProps = {
  assetId: string;
  venue?: Venue;
};

export const JsonViewer = ({ assetId, venue: providedVenue }: JsonViewerProps) => {
  const fallbackVenue = useAuthenticatedVenue();
  const venue = providedVenue ?? fallbackVenue;
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const content = useAssetTextContent(venue, assetId, open);
  const parsed = useMemo(() => {
    if (!content.loaded || content.loading || content.error) {
      return { value: null as unknown, error: null as string | null };
    }
    try {
      return { value: JSON.parse(content.text) as unknown, error: null };
    } catch (error: unknown) {
      return {
        value: null,
        error:
          error instanceof Error ? error.message : "Invalid JSON content",
      };
    }
  }, [content.error, content.loaded, content.loading, content.text]);

  const renderPreview = () => {
    if (content.loading) {
      return (
        <div className="flex h-[500px] items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      );
    }
    if (content.error || parsed.error) {
      return (
        <ErrorDisplay
          error={content.error ?? parsed.error ?? "Unable to preview JSON"}
          className="p-4"
        />
      );
    }
    if (typeof parsed.value !== "object" || parsed.value === null) {
      return (
        <pre className="whitespace-pre-wrap rounded-lg bg-background p-4 font-mono text-sm">
          {JSON.stringify(parsed.value, null, 2)}
        </pre>
      );
    }
    return (
      <JsonEditor
        data={parsed.value}
        rootName="content"
        rootFontSize="0.875em"
        maxWidth="80vh"
        restrictEdit
        restrictAdd
        restrictDelete
        collapse={3}
        theme={theme === "dark" ? githubDarkTheme : githubLightTheme}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-sm text-secondary underline dark:text-secondary-light">
        View
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border border-border bg-card p-4 text-card-foreground">
        <DialogHeader className="text-sm font-medium text-muted-foreground">
          JSON Preview
        </DialogHeader>
        <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="min-h-0 flex-1">
            <ScrollArea className="h-[500px] w-full rounded-lg [&>[data-radix-scroll-area-viewport]>div]:!block">
              <div className="rounded-lg bg-background p-4">
                {renderPreview()}
              </div>
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
