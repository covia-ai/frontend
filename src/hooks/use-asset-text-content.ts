"use client";

import { useEffect, useState } from "react";
import type { Venue } from "@covia/covia-sdk";

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  const [state, setState] =
    useState<TextContentState>(EMPTY_TEXT_CONTENT);

  useEffect(() => {
    let active = true;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    if (!venue || !assetId || !enabled) {
      setState(EMPTY_TEXT_CONTENT);
      return;
    }

    setState({ text: "", loaded: false, loading: true, error: null });
    void venue.assets
      .getContent(assetId)
      .then(async (stream) => {
        if (!stream) throw new Error("Asset content is unavailable");
        const text = await readTextStream(stream, (nextReader) => {
          reader = nextReader;
        });
        if (active) {
          setState({ text, loaded: true, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            text: "",
            loaded: false,
            loading: false,
            error: errorMessage(error),
          });
        }
      });

    return () => {
      active = false;
      if (reader) void reader.cancel().catch(() => undefined);
    };
  }, [assetId, enabled, venue]);

  return state;
}

export function useRemoteTextContent(
  url: string,
  enabled: boolean,
): TextContentState {
  const [state, setState] =
    useState<TextContentState>(EMPTY_TEXT_CONTENT);

  useEffect(() => {
    if (!url || !enabled) {
      setState(EMPTY_TEXT_CONTENT);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setState({ text: "", loaded: false, loading: true, error: null });
    void fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load content (${response.status})`);
        }
        return response.text();
      })
      .then((text) => {
        if (active) {
          setState({ text, loaded: true, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({
          text: "",
          loaded: false,
          loading: false,
          error: errorMessage(error),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, url]);

  return state;
}
