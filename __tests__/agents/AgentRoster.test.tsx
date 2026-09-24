import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock("@/components/AddNewAgent", () => ({
  AddNewAgent: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));
jest.mock("@/components/agent-roster/AgentRosterCard", () => ({
  AgentRosterCard: ({ agent }: any) => <div data-testid="agent-card">{agent.agentId}</div>,
}));
jest.mock("@/hooks/use-live-stream-slots", () => ({
  useLiveStreamSlots: () => new Set<string>(),
}));

const venue = { venueId: "venue-1", metadata: { name: "Test Venue" } };

let authenticated = true;
jest.mock("@/hooks/use-resolved-venue", () => ({
  useResolvedVenueContext: () => ({
    descriptor: venue,
    venue,
    status: "ready",
    isAuthenticated: authenticated,
  }),
}));

let roster: any[] = [];
jest.mock("@/hooks/use-agent-roster", () => ({
  useAgentRoster: () => ({
    roster,
    counts: {
      total: roster.length,
      running: 0,
      sleeping: 0,
      suspended: 0,
    },
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

import { AgentRoster } from "@/components/AgentRoster";

beforeEach(() => {
  authenticated = true;
  roster = [];
});

describe("AgentRoster when signed out (#423)", () => {
  it("says there is nothing to show rather than claiming the account is empty", () => {
    authenticated = false;
    render(<AgentRoster />);

    expect(screen.getByTestId("agent-roster-signed-out")).toBeInTheDocument();
    expect(screen.queryByText(/No agents yet/i)).not.toBeInTheDocument();
  });

  it("gates creation before the click, since an agent belongs to an account", () => {
    authenticated = false;
    render(<AgentRoster />);

    const button = screen.getByTestId("roster-new-agent");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/Sign in to create/i);
  });
});

describe("AgentRoster when signed in", () => {
  it("keeps the invitation to create a first agent when the account really is empty", () => {
    render(<AgentRoster />);

    expect(screen.getByText(/No agents yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("agent-roster-signed-out")).not.toBeInTheDocument();
    expect(screen.getByTestId("roster-new-agent")).toBeEnabled();
  });

  it("shows neither empty state once there are agents", () => {
    roster = [{ agentId: "alpha", status: "SLEEPING" }];
    render(<AgentRoster />);

    expect(screen.getByTestId("agent-card")).toBeInTheDocument();
    expect(screen.queryByText(/No agents yet/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-roster-signed-out")).not.toBeInTheDocument();
  });
});
