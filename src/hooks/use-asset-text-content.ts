"use client";

import { useEffect } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";

type TextContentState = {
  text: string;
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

const EMPTY_TEXT_CONTENT: TextContentState = {
  text: "",
  loaded: false,
  loading: false,
  error: null,
};

const LOADING_TEXT_CONTENT: TextContentState = {
  text: "",
  loaded: false,
  loading: true,
  error: null,
};

// What a read answers for. `source` is the venue for an asset read and null for
// a plain URL; `key` is the asset id or the URL. An outcome for anything else
// is simply not the current one.
type TextOutcome = {
  source: Venue | null;
  key: string;
  text: string;
  error: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stateFor(wanted: boolean, outcome: TextOutcome | null): TextContentState {
  if (!wanted) return EMPTY_TEXT_CONTENT;
  if (!outcome) return LOADING_TEXT_CONTENT;
  if (outcome.error !== null) return { text: "", loaded: false, loading: false, error: outcome.error };
  return { text: outcome.text, loaded: true, loading: false, error: null };
}

export async function readTextStream(
  stream: ReadableStream<Uint8Array>,
  onReader?: (reader: ReadableStreamDefaultReader<Uint8Array>) => void,
): Promise<string> {
  const reader = stream.getReader();
  onReader?.(reader);
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (value) text += decoder.decode(value, { stream: !done });
    if (done) return text + decoder.decode();
  }
}

/**
 * Loads an asset body only while its consumer is active. Each dependency
 * change invalidates the previous request and cancels an acquired stream
 * reader, so an old asset cannot publish into a newly selected preview.
 */
export function useAssetTextContent(
  venue: Venue | null | undefined,
  assetId: string,
  enabled: boolean,
): TextContentState {
  const { data: outcome, run, invalidate } = useLatestQuery<TextOutcome | null>(null);

  useEffect(() => {
    if (!venue || !assetId || !enabled) {
      invalidate();
      return;
    }
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    void run(async () => {
      try {
        const stream = await venue.assets.getContent(assetId);
        if (!stream) throw new Error("Asset content is unavailable");
        const text = await readTextStream(stream, (nextReader) => {
          reader = nextReader;
        });
        return { source: venue, key: assetId, text, error: null };
      } catch (error: unknown) {
        return { source: venue, key: assetId, text: "", error: errorMessage(error) };
      }
    });
    return () => {
      if (reader) void reader.cancel().catch(() => undefined);
    };
  }, [assetId, enabled, venue, run, invalidate]);

  const wanted = !!venue && !!assetId && enabled;
  const current =
    wanted && outcome && outcome.source === venue && outcome.key === assetId ? outcome : null;
  return stateFor(wanted, current);
}

export function useRemoteTextContent(
  url: string,
  enabled: boolean,
): TextContentState {
  const { data: outcome, run, invalidate } = useLatestQuery<TextOutcome | null>(null);

  useEffect(() => {
    if (!url || !enabled) {
      invalidate();
      return;
    }
    const controller = new AbortController();
    void run(async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Unable to load content (${response.status})`);
        }
        return { source: null, key: url, text: await response.text(), error: null };
      } catch (error: unknown) {
        // An aborted request belongs to a consumer that has since closed; the
        // query has already moved on, so this outcome is never shown.
        return { source: null, key: url, text: "", error: controller.signal.aborted ? null : errorMessage(error) };
      }
    });
    return () => controller.abort();
  }, [enabled, url, run, invalidate]);

  const wanted = !!url && enabled;
  const current = wanted && outcome && outcome.source === null && outcome.key === url ? outcome : null;
  return stateFor(wanted, current);
}
