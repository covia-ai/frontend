'use client'

import { useEffect, useRef, useState } from "react";
import DocViewer, { DocViewerRenderers, TXTRenderer } from "@cyntler/react-doc-viewer";

// TXTRenderer has an unpatched XSS (unsanitized file content cast to ReactNode).
// We exclude it and rely on our own safe Raw tab for text/plain content instead.
const SAFE_RENDERERS = DocViewerRenderers.filter((r) => r !== TXTRenderer);
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Copy, Check } from "lucide-react";

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

  const [rawText, setRawText] = useState("");
  const [copied, setCopied] = useState(false);
  const rawRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!showRawTab) return;
    fetch(contentUrl)
      .then((res) => res.text())
      .then((text) => setRawText(text));
  }, [contentUrl, showRawTab]);

  const handleCopy = () => {
    const el = rawRef.current;
    if (!el) return;
    navigator.clipboard.writeText(el.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!fileType) return null;

  return (
    <Dialog>
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
