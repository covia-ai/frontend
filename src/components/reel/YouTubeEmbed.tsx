"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { YOUTUBE_EMBED_HOST, youtubeEmbedUrl } from "@/lib/reel-sources";
// The page already has one of these for the "Watch" section's videos; a second
// copy of a two-line URL builder is how the two drift apart.
import { youtubeWatchUrl } from "@/lib/resources";

/**
 * What the player exposes to the component holding it.
 *
 * Deliberately shaped like the handful of things the `<video>` branch does to a
 * DOM element — where are we, are we moving, go here — because the cut switcher
 * drives both and should not care which one it has. A media element is driven
 * imperatively; so is this.
 */
export interface YouTubeEmbedHandle {
  currentTime: () => number;
  isPlaying: () => boolean;
  /** Show a different video, from a given point, playing or paused. */
  load: (videoId: string, startSeconds: number, play: boolean) => void;
}

interface YouTubeEmbedProps {
  /**
   * The cut being shown. Read once on mount to build the player; after that a
   * change arrives through `load` on the handle, and this prop follows it so
   * the rendered markup keeps naming what is actually on screen.
   */
  videoId: string;
  ref?: React.Ref<YouTubeEmbedHandle>;
  className?: string;
}

/** The subset of YouTube's IFrame API this component actually calls. */
interface YTPlayer {
  getCurrentTime: () => number;
  getPlayerState: () => number;
  loadVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  destroy: () => void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      /** Without this the API serves the player from youtube.com. */
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";

/** One script tag per document, however many players ask for it. */
let apiPromise: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    // The API calls this global once, by name, when it finishes parsing. It is
    // the only handshake it offers, so it has to be installed before the script
    // is appended and left in place afterwards.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API loaded without a Player"));
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("Could not load the YouTube IFrame API"));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    // Let the next mount try again rather than caching a network failure for
    // the life of the page.
    apiPromise = null;
    throw error;
  });

  return apiPromise;
}

/**
 * Error codes that mean "this video will not play in a frame".
 *
 * 101 and 150 are the same condition reported twice — the owner has disallowed
 * embedding — and it is the failure worth naming on screen, because a video
 * uploaded with embedding off fails exactly here and otherwise fails silently:
 * the frame simply sits there.
 */
const EMBED_DISALLOWED = new Set([101, 150]);

/**
 * One clip cut, played from YouTube.
 *
 * This is a scripted player rather than a plain `<iframe src>` for one reason:
 * the eight clips with a governance register are the same picture at the same
 * length in both voices, and switching voice mid-clip should land on the frame
 * you were already looking at. A bare iframe cannot be asked where it is, so
 * the switch would restart the clip. The IFrame API can, and
 * `loadVideoById({ startSeconds })` puts it back.
 *
 * Caption behaviour is carried by the player parameters, not by anything here
 * — see `REEL_YOUTUBE_PLAYER_PARAMS` for why `cc_load_policy` matters.
 */
export function YouTubeEmbed({ videoId, ref, className }: YouTubeEmbedProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [failure, setFailure] = useState<"embed-disallowed" | "unavailable" | null>(null);

  // The cut this player was built around. Captured at mount and never
  // reassigned, so a later cut change reaches the live player through `load`
  // instead of tearing it down and rebuilding it — which would throw away the
  // playhead this component exists to carry across.
  const builtFor = useRef(videoId);

  useImperativeHandle(
    ref,
    () => ({
      currentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      isPlaying: () =>
        playerRef.current?.getPlayerState() === (window.YT?.PlayerState.PLAYING ?? 1),
      load: (next, startSeconds, play) => {
        const player = playerRef.current;
        if (!player) return;
        setFailure(null);
        const options = { videoId: next, startSeconds };
        // Cue rather than load when it was paused, so a switch made while
        // stopped does not start playing by itself.
        if (play) player.loadVideoById(options);
        else player.cueVideoById(options);
      },
    }),
    [],
  );

  const handleError = useCallback((event: { data: number }) => {
    setFailure(EMBED_DISALLOWED.has(event.data) ? "embed-disallowed" : "unavailable");
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!hostRef.current) return;

    void loadApi()
      .then((YT) => {
        const host = hostRef.current;
        if (cancelled || !host) return;
        playerRef.current = new YT.Player(host, {
          videoId: builtFor.current,
          host: YOUTUBE_EMBED_HOST,
          playerVars: Object.fromEntries(
            new URL(youtubeEmbedUrl(builtFor.current, { origin: window.location.origin }))
              .searchParams,
          ),
          events: { onError: handleError },
        });
      })
      .catch(() => {
        if (!cancelled) setFailure("unavailable");
      });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [handleError]);

  if (failure) {
    return (
      <div
        data-testid="reel-embed-failure"
        className={`bg-muted flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md p-6 text-center ${className ?? ""}`}
      >
        <p className="text-sm font-medium">
          {failure === "embed-disallowed"
            ? "This cut cannot be played here"
            : "This cut is unavailable"}
        </p>
        <p className="text-muted-foreground text-sm">
          {failure === "embed-disallowed"
            ? "YouTube is refusing to play it in an embedded frame."
            : "YouTube could not load it."}{" "}
          <a
            href={youtubeWatchUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Watch it on YouTube
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-muted aspect-video w-full overflow-hidden rounded-md ${className ?? ""}`}
      data-testid="reel-youtube"
      data-video-id={videoId}
    >
      {/* Replaced in place by the API with an <iframe> of the same size, which
          the API titles with the video's own name — so there is nothing useful
          to put on this element: it does not survive. */}
      <div ref={hostRef} className="size-full" />
    </div>
  );
}
