"use client";

import { useEffect, useMemo, useState } from "react";
import type { DLFSEntry } from "@covia/covia-sdk";
import {
  ChevronRight,
  Database,
  Download,
  File,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Search,
} from "lucide-react";
import { useFilesExplorer } from "@/hooks/use-files-explorer";
import { filePreviewKind, useFilePreview } from "@/hooks/use-file-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyField } from "@/components/CopyField";
import { RawTextPanel } from "@/components/content-preview/RawTextPanel";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { TypeTile } from "@/components/TypeTile";
import { DRIVE_LOOK, FOLDER_LOOK, fileTypeLook } from "@/lib/file-type-look";
import { notifyError } from "@/lib/notify";
import { cn, formatRelativeTime } from "@/lib/utils";

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
  const [query, setQuery] = useState("");

  // Directories-first, then filtered by the in-column search over the already
  // loaded listing (client-side — no new read).
  const shownEntries = useMemo(() => {
    const sorted = entriesSorted(explorer.entries);
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((entry) => entry.name.toLowerCase().includes(q)) : sorted;
  }, [explorer.entries, query]);

  const kind = explorer.selectedEntry ? filePreviewKind(explorer.selectedEntry.name) : "other";
  const selectedLook = explorer.selectedEntry ? fileTypeLook(explorer.selectedEntry.name) : null;
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
      <div className="grid h-[calc(100vh-14rem)] min-h-[26rem] w-full grid-cols-[10rem_16rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-border shadow-sm sm:grid-cols-[11rem_17rem_minmax(0,1fr)]">
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
                <TypeTile Icon={DRIVE_LOOK.Icon} tile={DRIVE_LOOK.tile} className="size-7" iconSize={15} />
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

          {explorer.drive && (
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter this folder…"
                  aria-label="Filter files"
                  className="h-7 pl-7 text-xs"
                />
              </div>
            </div>
          )}

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
              <p className="mt-2 text-sm">This folder is empty</p>
            </div>
          )}
          {!explorer.entriesLoading &&
            !explorer.entriesError &&
            explorer.entries.length > 0 &&
            shownEntries.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No files match “{query}”.</p>
            )}
          {!explorer.entriesLoading &&
            !explorer.entriesError &&
            shownEntries.map((entry) => {
              const isSelected = explorer.selectedEntry?.name === entry.name;
              const look = entry.type === "directory" ? FOLDER_LOOK : fileTypeLook(entry.name);
              return (
                <button
                  key={entry.name}
                  onClick={() => explorer.selectEntry(entry)}
                  className={cn(
                    "flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0",
                    isSelected
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <TypeTile Icon={look.Icon} tile={look.tile} className="size-7" iconSize={15} />
                  <span className="flex-1 truncate">{entry.name}</span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] text-muted-foreground">
                    {entry.type === "file" && <span>{formatSize(entry.size)}</span>}
                    {entry.modified && <span>{formatRelativeTime(entry.modified)}</span>}
                  </span>
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

          {explorer.selectedEntry && kind === "other" && selectedLook && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <TypeTile Icon={selectedLook.Icon} tile={selectedLook.tile} className="size-12" iconSize={26} />
              <div>
                <p className="text-sm font-medium">{explorer.selectedEntry.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(explorer.selectedEntry.size)}
                  {explorer.selectedEntry.modified && ` · modified ${formatRelativeTime(explorer.selectedEntry.modified)}`}
                </p>
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
