"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReelClip, ReelCutId } from "@/config/demo-reel";
import { CutSwitcher } from "./CutSwitcher";
import { formatRuntime, reelIsCrossOrigin, reelMediaUrl, reelPosterUrl } from "@/lib/reel-media";
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
 * The switcher is the reason this is a real component rather than a `<video>`
 * in a box. Both cuts of a clip are the same picture at the same length — only
 * the voice and the caption text differ — so switching mid-playback should
 * land on the same frame rather than starting over. The manifest generator
 * refuses to emit a pair whose durations disagree, which is what makes
 * restoring the playhead safe to do blind.
 */
export function ReelPlayer({ clip, initialCut = "narrated", onOpenChange }: ReelPlayerProps) {
  const [cut, setCut] = useState<ReelCutId>(initialCut);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Where to land once the newly chosen cut has loaded. */
  const resumeRef = useRef<{ time: number; playing: boolean } | null>(null);

  // A fresh clip opens on the voice it was asked for — the grid card can name
  // one — and never on the voice left over from the previous clip, which would
  // silently hand someone a CISO cut because they picked it once.
  useEffect(() => {
    if (clip) setCut(clip.cuts[initialCut] ? initialCut : "narrated");
    resumeRef.current = null;
  }, [clip, initialCut]);

  const changeCut = useCallback((next: ReelCutId) => {
    const video = videoRef.current;
    if (video) resumeRef.current = { time: video.currentTime, playing: !video.paused };
    setCut(next);
  }, []);

  /**
   * Both jobs that have to wait for the new source: show the captions, and put
   * the playhead back.
   *
   * Captions are turned on here rather than trusted to `default`, because
   * swapping `src` tears the text track down and rebuilds it, and a browser
   * that remembers the viewer's last caption preference will otherwise
   * reinstate it over ours.
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

  const source = clip.cuts[cut] ?? clip.cuts.narrated;

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

        <video
          ref={videoRef}
          // Keyed on the clip only. Changing the cut must update `src` on the
          // same element — remounting here would throw away the playhead this
          // component exists to preserve.
          key={clip.slug}
          data-testid="reel-video"
          src={reelMediaUrl(source.media)}
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
            src={reelMediaUrl(source.captions)}
            default
          />
        </video>

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
