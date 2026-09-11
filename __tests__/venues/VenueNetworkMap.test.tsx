import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
jest.mock("@/components/VenueHealthDot", () => ({
  VenueHealthDot: () => <span data-testid="venue-health-dot" />,
}));

import { VenueNetworkMap } from "@/components/VenueNetworkMap";

const venues = [
  { venueId: "did:web:alpha.example", baseUrl: "https://alpha.example", metadata: { name: "Alpha" } },
  { venueId: "did:web:bravo.example", baseUrl: "https://bravo.example", metadata: {} },
] as any;

describe("VenueNetworkMap", () => {
  it("renders a node per venue, each linking to its detail, around a hub", () => {
    render(<VenueNetworkMap venues={venues} selectedVenueId="did:web:alpha.example" />);
    const nodes = screen.getAllByTestId("venues-map-node");
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toHaveAttribute("href", "/venues/did%3Aweb%3Aalpha.example");
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("bravo.example")).toBeInTheDocument(); // falls back to host
    expect(screen.getByText("Your network")).toBeInTheDocument();
  });
});
