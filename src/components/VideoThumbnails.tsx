"use client";

import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { RESOURCE_VIDEOS, youtubeThumb, youtubeWatchUrl } from "@/lib/resources";

// A responsive grid of the resource videos, data-driven from lib/resources so
// adding a video is a one-line registry entry and the grid reflows at any count
// (1 → n). Each card is a real anchor to YouTube (keyboard-focusable), replacing
// the old window.open on a clickable div, and uses theme tokens instead of the
// hardcoded card sizes / bg-red-600 play button of the legacy version.
export function VideoThumbnails() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {RESOURCE_VIDEOS.map((video) => (
        <a
          key={video.id}
          href={youtubeWatchUrl(video.id)}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`resource-video-${video.id}`}
          className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative aspect-video overflow-hidden bg-muted">
            <Image
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              src={youtubeThumb(video.id)}
              alt={video.title}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = youtubeThumb(video.id, "hq");
              }}
            />
            {/* Play affordance — a neutral dark overlay sits over the image in
                either theme (the thumbnail itself doesn't change with theme). */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="flex size-14 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/25">
                <Play size={24} className="ml-0.5 fill-white text-white" />
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 p-3">
            <p className="text-sm font-medium leading-snug">{video.title}</p>
            {video.blurb && <p className="text-xs text-muted-foreground">{video.blurb}</p>}
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink size={12} aria-hidden="true" /> YouTube
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}
