import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockCopy = jest.fn();
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  copyDataToClipBoard: (...args: unknown[]) => mockCopy(...args),
}));

import { A2ACard } from "@/components/venue/A2ACard";

const mockVenue: any = { baseUrl: "https://venue.example" };

const agentCardBody = {
  name: "Covia Venue",
  description: "A federated grid node",
  version: "1.2.3",
  provider: { organization: "Covia" },
  capabilities: { streaming: true, pushNotifications: false, extendedAgentCard: true },
  skills: [],
  supportedInterfaces: [{ protocolBinding: "JSONRPC", url: "https://venue.example/a2a" }],
  url: null,
};

describe("A2ACard", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("renders name, description, version, and capability badges", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => agentCardBody });

    render(<A2ACard venue={mockVenue} />);

    expect(await screen.findByText("Covia Venue")).toBeInTheDocument();
    expect(screen.getByText("A federated grid node")).toBeInTheDocument();
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
    expect(screen.getByText("streaming: on")).toBeInTheDocument();
    expect(screen.getByText("pushNotifications: off")).toBeInTheDocument();
  });

  it("uses supportedInterfaces[0].url, not the null top-level url, as the endpoint value", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => agentCardBody });

    render(<A2ACard venue={mockVenue} />);

    expect(await screen.findByText("https://venue.example/a2a")).toBeInTheDocument();
  });

  it("renders an explicit empty state when skills is empty", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => agentCardBody });

    render(<A2ACard venue={mockVenue} />);

    expect(await screen.findByText("No skills declared")).toBeInTheDocument();
  });

  it("renders a quiet fallback, not a crash, when the venue has no A2A card", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    render(<A2ACard venue={mockVenue} />);

    expect(await screen.findByText("A2A is not available on this venue.")).toBeInTheDocument();
  });
});
