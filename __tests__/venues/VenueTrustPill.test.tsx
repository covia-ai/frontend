import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

let mockState = "public";
jest.mock("@/hooks/use-venue-access", () => ({
  useVenueAccess: () => ({ state: mockState, detail: "" }),
}));
jest.mock("@/components/VenueHealthDot", () => ({
  VenueHealthDot: () => <span data-testid="venue-health-dot" />,
}));

import { VenueTrustPill } from "@/components/VenueTrustPill";

describe("VenueTrustPill", () => {
  it.each([
    ["public", "Public"],
    ["connected", "Signed in"],
    ["signed-out", "Sign in"],
    ["unreachable", "Unreachable"],
  ])("labels the %s access state as %s", (state, label) => {
    mockState = state;
    render(<VenueTrustPill baseUrl="https://v.example" venueId="did:web:v.example" />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByTestId("venue-health-dot")).toBeInTheDocument();
  });

  it("shows the dot with no label for an unknown state", () => {
    mockState = "unknown";
    render(<VenueTrustPill baseUrl="https://v.example" venueId="did:web:v.example" />);
    expect(screen.getByTestId("venue-health-dot")).toBeInTheDocument();
    expect(screen.queryByText(/Public|Signed in|Sign in|Unreachable/)).not.toBeInTheDocument();
  });
});
