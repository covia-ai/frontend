// The Resources-page content registry. The /learning page renders these, so
// adding a video is adding an entry here — no JSX to touch. The grid on the
// page reflows at any count, so the layout holds whether there are 2 videos or
// a dozen. Mirrors the demo registry (lib/demos.tsx).

export type ResourceVideo = {
  /** YouTube video id — both the thumbnail and the watch URL derive from it. */
  id: string;
  title: string;
  /** Optional one-line description, shown under the title when present. */
  blurb?: string;
};

export const RESOURCE_VIDEOS: ResourceVideo[] = [
  { id: "b0HwKymJbnA", title: "Covia.ai App Demo showing federated orchestration" },
  { id: "5FtCG8bYS3w", title: "Covia.ai Venue Operation with Gemini Demo" },
  { id: "qgfCdKwG4Rs", title: "Covia.ai multi-agent coordination and agentic economics" },
];

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

// maxresdefault is the sharp 16:9 thumbnail; hqdefault is the always-present
// fallback (used on the img onError, since not every video has a maxres frame).
export function youtubeThumb(id: string, quality: "maxres" | "hq" = "maxres"): string {
  const file = quality === "maxres" ? "maxresdefault" : "hqdefault";
  return `https://img.youtube.com/vi/${id}/${file}.jpg`;
}
