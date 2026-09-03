"use client";

import { useEffect, useState } from "react";
import type { DLFSEntry } from "@covia/covia-sdk";
import {
  ChevronRight,
  Database,
  Download,
  File,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { useFilesExplorer } from "@/hooks/use-files-explorer";
import { filePreviewKind, useFilePreview } from "@/hooks/use-file-preview";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/CopyField";
import { RawTextPanel } from "@/components/content-preview/RawTextPanel";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

interface FilesExplorerProps {
  initialDrive?: string;
  initialPath?: string;
}

type WebDavInfo = { enabled: boolean; url?: string; windows?: string };

function useWebDavInfo(venue: ReturnType<typeof useFilesExplorer>["venue"]) {
  const [info, setInfo] = useState<WebDavInfo | null>(null);

  useEffect(() => {
    if (!venue) {
      setInfo(null);
      return;
    }
    let active = true;
    void venue.workspace
      .read("v/info/adapters/dlfs")
      .then((result) => {
        if (!active) return;
        const webdav = (result.value as { webdav?: WebDavInfo } | undefined)?.webdav;
        setInfo(webdav ?? { enabled: false });
      })
      .catch(() => {
        if (active) setInfo(null);
      });
    return () => {
      active = false;
    };
  }, [venue]);

  return info;
}

function formatSize(size?: number): string {
  if (size === undefined) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesExplorer({ initialDrive, initialPath }: FilesExplorerProps = {}) {
  const explorer = useFilesExplorer(initialDrive, initialPath);
  const webdav = useWebDavInfo(explorer.venue);
  const [downloading, setDownloading] = useState(false);

  const kind = explorer.selectedEntry ? filePreviewKind(explorer.selectedEntry.name) : "other";
  const selectedPath = explorer.selectedEntry
    ? explorer.path
      ? `${explorer.path}/${explorer.selectedEntry.name}`
      : explorer.selectedEntry.name
    : null;
  const preview = useFilePreview(
    explorer.venue,
    explorer.drive,
    kind === "other" ? null : selectedPath,
    kind,
  );

  async function handleDownload() {
    if (!explorer.venue || !explorer.drive || !selectedPath || !explorer.selectedEntry) return;
    setDownloading(true);
    try {
      const stream = await explorer.venue.dlfs.getContent(explorer.drive, selectedPath);
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (value) chunks.push(value);
        if (done) break;
      }
      const blob = new Blob(chunks as BlobPart[]);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = explorer.selectedEntry.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      notifyError("Unable to download file", err, explorer.venue.baseUrl);
    } finally {
      setDownloading(false);
    }
  }

  if (!explorer.venue) {
    return (
      <div className="mt-4 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-lg border border-border text-muted-foreground shadow-sm">
        <Database size={32} className="mr-2" />
        <p className="text-sm">Select a venue to browse files</p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="grid h-[600px] w-full grid-cols-[11rem_17rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-border shadow-sm">
        {/* Drives */}
        <div className="flex min-w-0 flex-col overflow-y-auto border-r border-border">
          <div className="border-b border-border p-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Drives
          </div>
          {explorer.drivesLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={20} />
            </div>
          )}
          {!explorer.drivesLoading && explorer.drivesError && (
            <ErrorDisplay error={explorer.drivesError} className="p-3" />
          )}
          {!explorer.drivesLoading && !explorer.drivesError && explorer.drives.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No drives yet.</p>
          )}
          {!explorer.drivesLoading &&
            explorer.drives.map((name) => (
              <button
                key={name}
                onClick={() => explorer.selectDrive(name)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0",
                  name === explorer.drive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-foreground hover:bg-accent",
                )}
              >
                <HardDrive size={14} className="shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{name}</span>
              </button>
            ))}
        </div>

        {/* Directory listing */}
        <div className="flex min-w-0 flex-col overflow-y-auto border-r border-border">
          <div className="flex flex-wrap items-center gap-1 border-b border-border p-2 text-xs">
            <button
              onClick={() => explorer.drive && explorer.navigateTo("")}
              className={explorer.pathSegments.length === 0 ? "font-medium text-foreground" : "text-primary hover:underline"}
            >
              {explorer.drive ?? "—"}
            </button>
            {explorer.pathSegments.map((segment, index) => {
              const segPath = explorer.pathSegments.slice(0, index + 1).join("/");
              return (
                <span key={segPath} className="contents">
                  <ChevronRight size={12} className="text-muted-foreground" />
                  <button
                    onClick={() => explorer.navigateTo(segPath)}
                    className={
                      index === explorer.pathSegments.length - 1
                        ? "font-medium text-foreground hover:underline"
                        : "text-primary hover:underline"
                    }
                  >
                    {segment}
                  </button>
                </span>
              );
            })}
          </div>

          {explorer.entriesLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={20} />
            </div>
          )}
          {!explorer.entriesLoading && explorer.entriesError && (
            <ErrorDisplay error={explorer.entriesError} className="p-3" />
          )}
          {!explorer.entriesLoading && !explorer.entriesError && explorer.entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <FolderOpen size={28} />
              <p className="mt-2 text-sm">Empty</p>
            </div>
          )}
          {!explorer.entriesLoading &&
            !explorer.entriesError &&
            entriesSorted(explorer.entries).map((entry) => {
              const isSelected = explorer.selectedEntry?.name === entry.name;
              return (
                <button
                  key={entry.name}
                  onClick={() => explorer.selectEntry(entry)}
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0",
                    isSelected
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  {entry.type === "directory" ? (
                    <Folder size={14} className="shrink-0 text-muted-foreground" />
                  ) : (
                    <File size={14} className="shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{entry.name}</span>
                  {entry.type === "file" && (
                    <span className="shrink-0 text-xs text-muted-foreground">{formatSize(entry.size)}</span>
                  )}
                </button>
              );
            })}
        </div>

        {/* Preview */}
        <div className="flex min-w-0 flex-col overflow-y-auto">
          {!explorer.selectedEntry && (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <File size={28} />
              <p className="mt-2 text-sm">Select a file to preview</p>
            </div>
          )}

          {explorer.selectedEntry && kind === "other" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <File size={32} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{explorer.selectedEntry.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(explorer.selectedEntry.size)}</p>
              </div>
              <Button size="sm" onClick={() => void handleDownload()} disabled={downloading}>
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download
              </Button>
            </div>
          )}

          {explorer.selectedEntry && (kind === "json" || kind === "text") && (
            <div className="h-full p-2">
              <RawTextPanel value={preview.displayText} loading={preview.loading} error={preview.error} />
            </div>
          )}

          {explorer.selectedEntry && kind === "image" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
              {preview.loading && <Loader2 className="animate-spin text-primary" size={24} />}
              {preview.error && <ErrorDisplay error={preview.error} />}
              {preview.imageUrl && (
                // Blob URL from an authenticated fetch — a plain <img src> can't
                // attach the SDK's auth header, so the bytes must be fetched
                // first (see useFilePreview) and rendered from an object URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.imageUrl} alt={explorer.selectedEntry.name} className="max-h-full max-w-full rounded-md object-contain" />
              )}
            </div>
          )}
        </div>
      </div>

      {explorer.drive && webdav && (
        <div className="rounded-lg border border-border p-4">
          {webdav.enabled ? (
            <>
              <CopyField
                label="WebDAV URL"
                value={`${webdav.url?.replace(/\/+$/, "")}/${explorer.drive}`}
                description="Mount this drive in Finder (Cmd+K) or Windows Explorer (Map Network Drive)."
              />
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <ImageIcon size={12} className="mt-0.5 shrink-0" />
                Native OS WebDAV mounting currently only authenticates as this
                venue&apos;s public identity — a signed-in user&apos;s private drive isn&apos;t
                reachable via a plain OS mount yet.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">WebDAV is not enabled on this venue.</p>
          )}
        </div>
      )}
    </div>
  );
}

function entriesSorted(entries: DLFSEntry[]): DLFSEntry[] {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
