import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { VideoThumbnails } from "@/components/VideoThumbnails";
import { RESOURCE_VIDEOS } from "@/lib/resources";
import { publicAudiences } from "@/lib/reel-audiences";

/**
 * The Resources page tags every video on it, not only the reel clips, so the
 * two bands read in one vocabulary. Upstream owns this component's structure
 * (real anchors, registry-driven, reflowing grid); this only covers the tags
 * added on top, so it cannot fight a future change to the rest of the card.
 */
describe("audience tags on the resource videos", () => {
  it("tags each video from the registry", () => {
    render(<VideoThumbnails />);
    for (const video of RESOURCE_VIDEOS) {
      if (!video.audiences) continue;
      const card = screen.getByTestId(`resource-video-${video.id}`);
      const tags = Array.from(card.querySelectorAll('[data-slot="badge"]')).map((e) =>
        e.textContent?.trim(),
      );
      expect(tags).toEqual(publicAudiences(video.audiences));
    }
  });

  /** Same rule as the reel: the registry keeps it, the page does not show it. */
  it("keeps Investor in the registry and off the page", () => {
    expect(RESOURCE_VIDEOS.some((v) => v.audiences?.includes("Investor"))).toBe(true);
    render(<VideoThumbnails />);
    expect(screen.queryByText("Investor")).not.toBeInTheDocument();
  });

  it("leaves a video with no audiences untagged rather than empty-framed", () => {
    render(<VideoThumbnails />);
    for (const video of RESOURCE_VIDEOS.filter((v) => !v.audiences)) {
      const card = screen.getByTestId(`resource-video-${video.id}`);
      expect(card.querySelectorAll('[data-slot="badge"]')).toHaveLength(0);
    }
  });
});
