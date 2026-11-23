import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/admin-panel/content-layout", () => ({
  ContentLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/admin-panel/TopBar", () => ({ TopBar: () => <div data-testid="top-bar" /> }));
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import ResourcesPage from "@/app/(demo)/learning/page";
import { RESOURCE_VIDEOS } from "@/lib/resources";

describe("ResourcesPage", () => {
  it("renders a real YouTube anchor for every registry video (not window.open)", () => {
    render(<ResourcesPage />);
    for (const v of RESOURCE_VIDEOS) {
      const link = screen.getByTestId(`resource-video-${v.id}`);
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", `https://www.youtube.com/watch?v=${v.id}`);
      expect(link).toHaveAttribute("target", "_blank");
    }
  });

  it("renders Discord and Docs as real anchors", () => {
    render(<ResourcesPage />);
    expect(screen.getByRole("link", { name: /join discord server/i })).toHaveAttribute(
      "href",
      "https://discord.gg/fywdrKd8QT",
    );
    expect(screen.getByRole("link", { name: /view documentation/i })).toHaveAttribute(
      "href",
      "https://docs.covia.ai",
    );
  });

  it("uses the corrected 'Covia Labs' / 'Covia' brand copy", () => {
    render(<ResourcesPage />);
    expect(screen.getByText("Covia Labs Discord")).toBeInTheDocument();
    expect(screen.queryByText("Covia AI Discord")).not.toBeInTheDocument();
    // PageHeading highlight
    expect(screen.getByText("build")).toBeInTheDocument();
  });
});
