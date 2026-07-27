"use client";

import { useState } from "react";
import DocViewer, { DocViewerRenderers, TXTRenderer } from "@cyntler/react-doc-viewer";

// TXTRenderer has an unpatched XSS (unsanitized file content cast to ReactNode).
// We exclude it and rely on our own safe Raw tab for text/plain content instead.
const SAFE_RENDERERS = DocViewerRenderers.filter((r) => r !== TXTRenderer);
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { useRemoteTextContent } from "@/hooks/use-asset-text-content";
import { RawTextPanel } from "@/components/content-preview/RawTextPanel";

const CONTENT_TYPE_TO_FILE_TYPE: Record<string, string> = {
  "text/csv": "csv",
  "text/plain": "txt",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/webp": "webp",
  "image/tiff": "tiff",
  "image/svg+xml": "svg",
  "text/html": "html",
  "application/xhtml+xml": "html",
};

const RAW_SUPPORTED_TYPES = new Set(["text/csv", "text/plain", "text/html", "application/xhtml+xml"]);

interface DocumentViewerProps {
  contentUrl: string;
  contentType: string;
}

export const DocumentViewer = ({ contentUrl, contentType }: DocumentViewerProps) => {
  const fileType = CONTENT_TYPE_TO_FILE_TYPE[contentType];
  const showRawTab = RAW_SUPPORTED_TYPES.has(contentType);
  const [open, setOpen] = useState(false);
  const rawContent = useRemoteTextContent(
    contentUrl,
    open && showRawTab,
  );

  if (!fileType) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-sm text-secondary dark:text-secondary-light underline">
        View
      </DialogTrigger>
      <DialogContent className="bg-card text-card-foreground max-h-[90vh] w-full max-w-4xl p-4 flex flex-col overflow-hidden border border-border">
        <DialogHeader className="text-sm font-medium text-muted-foreground">
          Document Preview
        </DialogHeader>
        {showRawTab ? (
          <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="flex-1 min-h-0">
              <div className="h-[450px] w-full overflow-auto rounded-lg bg-background">
                <DocViewer
                  documents={[{ uri: contentUrl, fileType }]}
                  pluginRenderers={SAFE_RENDERERS}
                  config={{ header: { disableHeader: true } }}
                  style={{ height: "100%", backgroundColor: "transparent" }}
                />
              </div>
            </TabsContent>
            <TabsContent value="raw" className="flex-1 min-h-0">
              <RawTextPanel
                value={rawContent.text}
                loading={rawContent.loading}
                error={rawContent.error}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 min-h-0 h-[500px] w-full overflow-auto rounded-lg bg-background">
            <DocViewer
              documents={[{ uri: contentUrl, fileType }]}
              pluginRenderers={SAFE_RENDERERS}
              config={{ header: { disableHeader: true } }}
              style={{ height: "100%", backgroundColor: "transparent" }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
