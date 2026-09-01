import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock("@/components/venue/McpConnectSection", () => ({
  McpConnectSection: () => <div data-testid="mcp-section" />,
}));
jest.mock("@/components/venue/A2ACard", () => ({
  A2ACard: () => <div data-testid="a2a-card" />,
}));
jest.mock("@/components/venue/RestApiSection", () => ({
  RestApiSection: () => <div data-testid="rest-section" />,
}));
jest.mock("@/components/venue/SdkInstallSnippets", () => ({
  SdkInstallSnippets: () => <div data-testid="sdk-section" />,
}));

const mockVenue: any = { baseUrl: "https://venue.example", metadata: { name: "Test Venue" } };
let mockContext: any;
jest.mock("@/hooks/use-resolved-venue", () => ({
  useResolvedVenueContext: () => mockContext,
}));

import { ConnectPanel } from "@/components/venue/ConnectPanel";

describe("ConnectPanel", () => {
  it("shows the venue resolution state while connecting", () => {
    mockContext = { venue: null, status: "connecting", error: null };
    render(<ConnectPanel venueId="venue-1" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("mcp-section")).not.toBeInTheDocument();
  });

  it("shows the venue resolution state when unreachable", () => {
    mockContext = { venue: null, status: "unreachable", error: "The venue could not be reached." };
    render(<ConnectPanel venueId="venue-1" />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByTestId("mcp-section")).not.toBeInTheDocument();
  });

  it("renders all four integration sections once the venue is ready", () => {
    mockContext = { venue: mockVenue, status: "ready", error: null };
    render(<ConnectPanel venueId="venue-1" />);

    expect(screen.getByTestId("mcp-section")).toBeInTheDocument();
    expect(screen.getByTestId("a2a-card")).toBeInTheDocument();
    expect(screen.getByTestId("rest-section")).toBeInTheDocument();
    expect(screen.getByTestId("sdk-section")).toBeInTheDocument();
  });
});
