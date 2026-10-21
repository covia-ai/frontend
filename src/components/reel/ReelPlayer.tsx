"use client";

import { useCallback, useRef, useState } from "react";
import type { ReelClip, ReelCutId } from "@/config/demo-reel";
import { CutSwitcher } from "./CutSwitcher";
import { YouTubeEmbed, type YouTubeEmbedHandle } from "./YouTubeEmbed";
import { formatRuntime, reelIsCrossOrigin, reelPosterUrl } from "@/lib/reel-media";
import { reelSource } from "@/lib/reel-sources";
import { publicAudiences } from "@/lib/reel-audiences";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReelPlayerProps {
  clip: ReelClip | null;
  /** Which voice to open on, when the grid card asked for one by name. */
  initialCut?: ReelCutId;
  onOpenChange: (open: boolean) => void;
}

export function cutsOf(clip: ReelClip): ReelCutId[] {
  return clip.cuts.ciso ? ["narrated", "ciso"] : ["narrated"];
}

/**
 * Watch one clip, in either voice.
 *
 * The switcher is the reason this is a real component rather than a video in a
 * box. Both cuts of a clip are the same picture at the same length — only the
 * voice and the caption text differ — so switching mid-playback should land on
 * the same frame rather than starting over. The manifest generator refuses to
 * emit a pair whose durations disagree, which is what makes restoring the
 * playhead safe to do blind.
 *
 * Which player appears is decided by `reelSource`, not here: a cut resolves to
 * a YouTube video or to an mp4, and each branch below knows only its own kind.
 * The playhead handoff is written once, against whichever player is mounted, so
 * moving the reel between the two does not change how switching behaves.
 */
export function ReelPlayer({ clip, initialCut = "narrated", onOpenChange }: ReelPlayerProps) {
  // Initialised, not synchronised. The player is keyed per open request by
  // ReelSection, so a new clip — or the same clip asked for in the other voice
  // — mounts a fresh one and this initialiser runs again. Switching tabs inside
  // the player changes this state without changing the key, which is what lets
  // the playhead survive a switch.
  const [cut, setCut] = useState<ReelCutId>(() =>
    clip?.cuts[initialCut] ? initialCut : "narrated",
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const embedRef = useRef<YouTubeEmbedHandle>(null);
  /**
   * Where the mp4 branch should land once the newly chosen cut has loaded.
   *
   * Only that branch needs it, because a media element cannot be told to start
   * somewhere — it has to be moved after it reports its metadata. The YouTube
   * branch is handed the position directly in `changeCut` and keeps nothing.
   */
  const resumeRef = useRef<{ time: number; playing: boolean } | null>(null);

  /**
   * Switch voice without losing the frame.
   *
   * Whichever player is mounted is asked where it is, and then either told
   * (YouTube, which accepts a start position) or left a note for
   * (`<video>`, which cannot be positioned until it has loaded).
   */
  const changeCut = useCallback(
    (next: ReelCutId) => {
      const video = videoRef.current;
      const embed = embedRef.current;

      if (video) {
        resumeRef.current = { time: video.currentTime, playing: !video.paused };
      } else if (embed) {
        const target = clip && reelSource(clip, next);
        if (target?.kind === "youtube") {
          embed.load(target.src, embed.currentTime(), embed.isPlaying());
        }
      }

      setCut(next);
    },
    [clip],
  );

  /**
   * Both jobs that have to wait for the new source: show the captions, and put
   * the playhead back.
   *
   * Captions are turned on here rather than trusted to `default`, because
   * swapping `src` tears the text track down and rebuilds it, and a browser
   * that remembers the viewer's last caption preference will otherwise
   * reinstate it over ours. The YouTube branch does the same job through
   * `cc_load_policy`, which is a player parameter rather than a DOM call.
   */
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    for (const track of Array.from(video.textTracks)) track.mode = "showing";

    const resume = resumeRef.current;
    resumeRef.current = null;
    if (!resume) return;

    video.currentTime = Number.isFinite(video.duration)
      ? Math.min(resume.time, video.duration)
      : resume.time;
    if (resume.playing) void video.play().catch(() => {});
  }, []);

  if (!clip) return null;

  const source = reelSource(clip, cut) ?? reelSource(clip, "narrated");

  return (
    <Dialog open={Boolean(clip)} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] gap-4 overflow-y-auto p-4 sm:max-w-3xl sm:p-6 lg:max-w-4xl"
        data-testid="reel-player"
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-lg">{clip.title}</DialogTitle>
          <DialogDescription className="text-sm">{clip.claim}</DialogDescription>
        </DialogHeader>

        {/* Above the picture, not below it: a control placed after the thing
            it modifies reads as a caption about it. */}
        <CutSwitcher available={cutsOf(clip)} value={cut} onChange={changeCut} />

        {source?.kind === "youtube" ? (
          <YouTubeEmbed
            // Keyed on the clip only, for the same reason the <video> below is:
            // changing the cut must reach the live player, because remounting
            // would discard the playhead.
            key={clip.slug}
            ref={embedRef}
            videoId={source.src}
          />
        ) : (
          source && (
            <video
              ref={videoRef}
              key={clip.slug}
              data-testid="reel-video"
              src={source.src}
              poster={reelPosterUrl(clip.poster)}
              controls
              playsInline
              preload="metadata"
              {...(reelIsCrossOrigin() ? { crossOrigin: "anonymous" as const } : {})}
              onLoadedMetadata={handleLoadedMetadata}
              className="bg-muted aspect-video w-full rounded-md"
            >
              <track
                // Replaced wholesale when the cut changes: the sidecars carry
                // different words, not just a different voice.
                key={cut}
                kind="captions"
                srcLang="en"
                label="English"
                src={source.captions}
                default
              />
            </video>
          )
        )}

        <div className="flex flex-wrap items-center gap-2">
          {publicAudiences(clip.audiences).map((audience) => (
            <Badge key={audience} variant="outline" className="text-xs font-normal">
              {audience}
            </Badge>
          ))}
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {formatRuntime(clip.runtimeSec)}
          </span>
        </div>

        {clip.synopsis && <p className="text-muted-foreground text-sm">{clip.synopsis}</p>}
      </DialogContent>
    </Dialog>
  );
}
