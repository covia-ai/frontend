"use client";

import { useEffect } from "react";
import type { Venue } from "@covia/covia-sdk";
import { readTextStream } from "@/hooks/use-asset-text-content";
import { useLatestQuery } from "@/hooks/use-latest-query";

// Preview-type dispatch by filename extension — mirrors DocumentViewer's
// CONTENT_TYPE_TO_FILE_TYPE convention rather than inventing a new
// content-type system. Anything not JSON/text/image is "other": download-only,
// never eagerly fetched (see useFileDownload).
export type FilePreviewKind = "json" | "text" | "image" | "other";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "csv", "log", "yml", "yaml", "xml", "html", "css",
  "js", "ts", "tsx", "jsx", "py", "java", "sh", "toml", "ini",
]);

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function filePreviewKind(name: string): FilePreviewKind {
  const ext = extensionOf(name);
  if (ext === "json") return "json";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "other";
}

type FilePreviewState = {
  loading: boolean;
  error: string | null;
  text: string;
  /** Pretty-printed for JSON; raw for text. */
  displayText: string;
  imageUrl: string | null;
};

const EMPTY_STATE: FilePreviewState = {
  loading: false,
  error: null,
  text: "",
  displayText: "",
  imageUrl: null,
};

const LOADING_STATE: FilePreviewState = { ...EMPTY_STATE, loading: true };

// A preview remembers the file it is of, so selecting another file reads as
// "nothing yet" by comparison rather than by clearing state in an effect.
type PreviewOutcome = {
  venue: Venue;
  drive: string;
  path: string;
  kind: FilePreviewKind;
  text: string;
  displayText: string;
  imageUrl: string | null;
  error: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Loads a DLFS file's preview content only for the two kinds that need it
 * eagerly (text/JSON decode to a string; image reassembles into a blob URL).
 * "other" files are never fetched here — see useFileDownload for the
 * click-triggered download path.
 */
export function useFilePreview(
  venue: Venue | null | undefined,
  drive: string | null,
  path: string | null,
  kind: FilePreviewKind,
): FilePreviewState {
  const { data: outcome, run, invalidate } = useLatestQuery<PreviewOutcome | null>(null);
  const wanted =
    !!venue && !!drive && !!path && (kind === "json" || kind === "text" || kind === "image");

  useEffect(() => {
    if (!venue || !drive || !path || (kind !== "json" && kind !== "text" && kind !== "image")) {
      invalidate();
      return;
    }
    let active = true;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let objectUrl: string | null = null;
    const base: PreviewOutcome = {
      venue, drive, path, kind, text: "", displayText: "", imageUrl: null, error: null,
    };

    void run(async () => {
      try {
        const stream = await venue.dlfs.getContent(drive, path);
        if (kind === "image") {
          reader = stream.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { value, done } = await reader.read();
            if (value) chunks.push(value);
            if (done) break;
          }
          // Superseded before the image was assembled: no URL to leak. The
          // query has moved on, so whatever is returned here is never shown.
          if (!active) return base;
          objectUrl = URL.createObjectURL(new Blob(chunks as BlobPart[]));
          return { ...base, imageUrl: objectUrl };
        }
        const text = await readTextStream(stream, (nextReader) => {
          reader = nextReader;
        });
        let displayText = text;
        if (kind === "json") {
          try {
            displayText = JSON.stringify(JSON.parse(text), null, 2);
          } catch {
            // Not actually valid JSON despite the extension — show it raw.
          }
        }
        return { ...base, text, displayText };
      } catch (error: unknown) {
        return { ...base, error: errorMessage(error) };
      }
    });

    return () => {
      active = false;
      if (reader) void reader.cancel().catch(() => undefined);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [venue, drive, path, kind, run, invalidate]);

  if (!wanted) return EMPTY_STATE;
  const current =
    outcome &&
    outcome.venue === venue &&
    outcome.drive === drive &&
    outcome.path === path &&
    outcome.kind === kind
      ? outcome
      : null;
  if (!current) return LOADING_STATE;
  return {
    loading: false,
    error: current.error,
    text: current.text,
    displayText: current.displayText,
    imageUrl: current.imageUrl,
  };
}
