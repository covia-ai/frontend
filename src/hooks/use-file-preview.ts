"use client";

import { useEffect, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { readTextStream } from "@/hooks/use-asset-text-content";

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
  const [state, setState] = useState<FilePreviewState>(EMPTY_STATE);

  useEffect(() => {
    let active = true;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let objectUrl: string | null = null;

    if (!venue || !drive || !path || (kind !== "json" && kind !== "text" && kind !== "image")) {
      setState(EMPTY_STATE);
      return;
    }

    setState({ ...EMPTY_STATE, loading: true });

    if (kind === "image") {
      void venue.dlfs
        .getContent(drive, path)
        .then(async (stream) => {
          reader = stream.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { value, done } = await reader.read();
            if (value) chunks.push(value);
            if (done) break;
          }
          if (!active) return;
          const blob = new Blob(chunks as BlobPart[]);
          objectUrl = URL.createObjectURL(blob);
          setState({ ...EMPTY_STATE, imageUrl: objectUrl });
        })
        .catch((error: unknown) => {
          if (active) setState({ ...EMPTY_STATE, error: errorMessage(error) });
        });
    } else {
      void venue.dlfs
        .getContent(drive, path)
        .then(async (stream) => {
          const text = await readTextStream(stream, (nextReader) => {
            reader = nextReader;
          });
          if (!active) return;
          let displayText = text;
          if (kind === "json") {
            try {
              displayText = JSON.stringify(JSON.parse(text), null, 2);
            } catch {
              // Not actually valid JSON despite the extension — show it raw.
            }
          }
          setState({ ...EMPTY_STATE, text, displayText });
        })
        .catch((error: unknown) => {
          if (active) setState({ ...EMPTY_STATE, error: errorMessage(error) });
        });
    }

    return () => {
      active = false;
      if (reader) void reader.cancel().catch(() => undefined);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [venue, drive, path, kind]);

  return state;
}
