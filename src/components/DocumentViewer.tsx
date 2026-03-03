'use client'

import { useEffect, useRef, useState } from "react";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
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
      <DialogContent className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 max-h-[90vh] w-full max-w-4xl p-4 flex flex-col overflow-hidden border dark:border-zinc-700">
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
              <div className="h-[450px] w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800">
                <DocViewer
                  documents={[{ uri: contentUrl, fileType }]}
                  pluginRenderers={DocViewerRenderers}
                  config={{ header: { disableHeader: true } }}
                  style={{ height: "100%", backgroundColor: "transparent" }}
                />
              </div>
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
        ) : (
          <div className="flex-1 min-h-0 h-[500px] w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800">
            <DocViewer
              documents={[{ uri: contentUrl, fileType }]}
              pluginRenderers={DocViewerRenderers}
              config={{ header: { disableHeader: true } }}
              style={{ height: "100%", backgroundColor: "transparent" }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
