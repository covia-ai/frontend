"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import * as mime from "mime-types";
import type { Asset, Venue } from "@covia/covia-sdk";
import { Download, FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { JSON_EDITOR_DIALOG_CLASS, JSON_EDITOR_MAX_WIDTH } from "@/lib/dialog-sizes";
import { notifyError } from "@/lib/notify";
import { CopyAssetDialog } from "@/components/CopyAssetDialog";

const ThemedJsonEditor = dynamic(
  () => import("@/components/ThemedJsonEditor").then((m) => m.ThemedJsonEditor),
  { ssr: false },
);
const JsonViewer = dynamic(() => import("@/components/JSONViewer").then((m) => m.JsonViewer), { ssr: false });
const XmlViewer = dynamic(() => import("@/components/XmlViewer").then((m) => m.XmlViewer), { ssr: false });
const DocumentViewer = dynamic(() => import("@/components/DocumentViewer").then((m) => m.DocumentViewer), { ssr: false });

const XML_CONTENT_TYPES = ["text/xml", "application/xml"];

// The asset detail action column: Download (blob-streamed through the SDK) plus
// the content-type-appropriate viewer, then View-metadata (raw JSON) and Copy
// Asset. Split out of MetadataViewer (W3 3B); behaviour unchanged.
export function AssetActions({
  asset,
  venue,
  isAuthenticated = false,
}: {
  asset: Asset;
  venue?: Venue;
  isAuthenticated?: boolean;
}) {
  const inlineContent = typeof asset.metadata?.content?.inline === "string" ? asset.metadata.content.inline : null;
  const contentType = asset.metadata?.content?.contentType?.split(";")[0];
  // A "Download" link only makes sense when the asset has a content descriptor
  // with nothing inline to show instead — a bare reference has nothing at that
  // URL (covia-ai/frontend#209 follow-up). Keyed on the raw field, not
  // kind === "artifact", so a blob-backed skill still gets a Download button.
  const hasBlobContent = asset.metadata?.content !== undefined && inlineContent === null;
  const contentURL = hasBlobContent ? asset.getContentURL() : null;

  const [downloading, setDownloading] = useState(false);
  // A plain <a href download> only forces a save when the URL is same-origin (or
  // the server sends Content-Disposition: attachment) — the content endpoint
  // lives on the venue's own origin, so the browser just opens it instead of
  // downloading. Fetch the bytes through the SDK and save from a blob: URL.
  const handleDownload = async () => {
    if (!venue) return;
    setDownloading(true);
    try {
      const stream = await venue.assets.getContent(asset.id);
      if (!stream) throw new Error("Asset content is unavailable");
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (value) chunks.push(value);
        if (done) break;
      }
      const blob = new Blob(chunks as BlobPart[], contentType ? { type: contentType } : undefined);
      const objectUrl = URL.createObjectURL(blob);
      const base = asset.metadata?.name || asset.id;
      const ext = contentType ? mime.extension(contentType) : false;
      const filename = ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base;
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      notifyError("Unable to download asset", err, venue.baseUrl);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {contentURL && (
        <div className="flex flex-row flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download
          </Button>
          {contentType == "application/json" && <JsonViewer assetId={asset.id} venue={venue} />}
          {XML_CONTENT_TYPES.includes(contentType ?? "") && <XmlViewer assetId={asset.id} venue={venue} />}
          {contentType != "application/json" && !XML_CONTENT_TYPES.includes(contentType ?? "") && (
            <DocumentViewer contentUrl={contentURL} contentType={contentType ?? ""} />
          )}
        </div>
      )}
      <div className="flex flex-row flex-wrap items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <FileJson size={14} />
              View metadata
            </Button>
          </DialogTrigger>
          <DialogContent className={cn(JSON_EDITOR_DIALOG_CLASS, "content-start overflow-y-auto")}>
            <DialogTitle>Asset Metadata</DialogTitle>
            <ThemedJsonEditor data={asset.metadata} rootName="metadata" maxWidth={JSON_EDITOR_MAX_WIDTH} />
          </DialogContent>
        </Dialog>
        <CopyAssetDialog asset={asset} venue={venue} isAuthenticated={isAuthenticated} />
      </div>
    </>
  );
}
