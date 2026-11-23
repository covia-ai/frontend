import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

let mockPathname = "/";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const mockVenues = [
  { venueId: "did:web:venue.example", baseUrl: "https://venue.example", metadata: { name: "Test Venue" } },
];
jest.mock("@/hooks/use-venues", () => ({
  useVenues: (selector: (s: unknown) => unknown) => selector({ venues: mockVenues }),
}));

import { VenueSubnav } from "@/components/VenueSubnav";

const SLUG = encodeURIComponent("did:web:venue.example");

describe("VenueSubnav", () => {
  it("renders nothing off a venue route", () => {
    mockPathname = "/operations";
    const { container } = render(<VenueSubnav />);
    expect(container).toBeEmptyDOMElement();
  });

  it("also hides on the top-level /venues list", () => {
    mockPathname = "/venues";
    const { container } = render(<VenueSubnav />);
    expect(container).toBeEmptyDOMElement();
  });

  it("on the landing shows the venue name and marks Overview active, with correct hrefs", () => {
    mockPathname = `/venues/${SLUG}`;
    render(<VenueSubnav />);

    expect(screen.getByText("Test Venue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /overview/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /assets/i })).toHaveAttribute("href", `/venues/${SLUG}/assets`);
    // "Integrate" keeps the /connect route.
    expect(screen.getByRole("link", { name: /integrate/i })).toHaveAttribute("href", `/venues/${SLUG}/connect`);
    // Overview links to the bare landing.
    expect(screen.getByRole("link", { name: /overview/i })).toHaveAttribute("href", `/venues/${SLUG}`);
  });

  it("marks the active section on a sub-page (and keeps it on a detail route)", () => {
    mockPathname = `/venues/${SLUG}/adapters`;
    render(<VenueSubnav />);
    expect(screen.getByRole("link", { name: /adapters/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /overview/i })).not.toHaveAttribute("aria-current");
  });

  it("keeps the section highlighted on a detail route", () => {
    mockPathname = `/venues/${SLUG}/operations/v/ops/a2a/send`;
    render(<VenueSubnav />);
    expect(screen.getByRole("link", { name: /operations/i })).toHaveAttribute("aria-current", "page");
  });
});
