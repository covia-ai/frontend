import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { HomeLauncher } from "@/components/home/HomeLauncher";
import { DEFAULT_AGENT_ID } from "@/config/agents";

// The composer is mocked to record the props HomeLauncher hands it — the same
// contract DefaultAssistantHome used to assert directly.
jest.mock("@/components/AIPrompt", () => ({
  AIPrompt: ({ fixedAgentId, onChatStarted, variant, starters }: any) => (
    <div
      data-testid="ai-prompt"
      data-fixed-agent-id={fixedAgentId}
      data-has-on-chat-started={String(!!onChatStarted)}
      data-variant={variant}
      data-starters={String((starters ?? []).length)}
    />
  ),
}));

// Sections are covered in home-sections.test; here they're stubbed so the test
// focuses on the launcher's own job: what it passes the composer and when it
// shows the sections.
jest.mock("@/components/home/JumpBackIn", () => ({
  JumpBackIn: ({ agents }: any) => <div data-testid="jump-back-in" data-count={agents.length} />,
}));
jest.mock("@/components/home/QuickActions", () => ({
  QuickActions: () => <div data-testid="quick-actions" />,
}));
jest.mock("@/components/home/VenuePulse", () => ({
  VenuePulse: (p: any) => <div data-testid="venue-pulse" data-running={p.running} data-total={p.total} />,
}));

let mockAuthed = true;
jest.mock("@/hooks/use-auth", () => ({ useIsAuthenticated: () => mockAuthed }));
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => ({ venueId: "v", baseUrl: "https://v" }),
}));

let mockRoster: any;
jest.mock("@/hooks/use-agent-roster", () => ({ useAgentRoster: () => mockRoster }));
jest.mock("@/hooks/use-home-extras", () => ({ useHomeExtras: () => ({ jobs: 7, connections: 2 }) }));

beforeEach(() => {
  mockAuthed = true;
  mockRoster = {
    roster: [],
    counts: { total: 4, running: 1, sleeping: 3, suspended: 0, terminated: 0, tasks: 0 },
    loading: false,
    error: null,
    refresh: jest.fn(),
  };
});

describe("HomeLauncher", () => {
  it("keeps the composer hero fixed to the assistant, in launchpad layout, with starters and no navigation intercept", () => {
    render(<HomeLauncher />);
    const prompt = screen.getByTestId("ai-prompt");
    expect(prompt).toHaveAttribute("data-fixed-agent-id", DEFAULT_AGENT_ID);
    expect(prompt).toHaveAttribute("data-has-on-chat-started", "false");
    expect(prompt).toHaveAttribute("data-variant", "launchpad");
    expect(Number(prompt.getAttribute("data-starters"))).toBeGreaterThan(0);
  });

  it("shows the launchpad sections when signed in", () => {
    render(<HomeLauncher />);
    expect(screen.getByTestId("quick-actions")).toBeInTheDocument();
    expect(screen.getByTestId("venue-pulse")).toHaveAttribute("data-running", "1");
    expect(screen.getByTestId("venue-pulse")).toHaveAttribute("data-total", "4");
  });

  it("hides every section when signed out, leaving only the composer", () => {
    mockAuthed = false;
    render(<HomeLauncher />);
    expect(screen.getByTestId("ai-prompt")).toBeInTheDocument();
    expect(screen.queryByTestId("quick-actions")).not.toBeInTheDocument();
    expect(screen.queryByTestId("venue-pulse")).not.toBeInTheDocument();
    expect(screen.queryByTestId("jump-back-in")).not.toBeInTheDocument();
  });

  it("passes only recently-active, non-terminated agents to Jump back in — most recent first, capped at three", () => {
    mockRoster.roster = [
      { agentId: "a", status: "SLEEPING", lastActive: 100 },
      { agentId: "b", status: "RUNNING", lastActive: 500 },
      { agentId: "c", status: "TERMINATED", lastActive: 999 }, // excluded
      { agentId: "d", status: "SLEEPING" }, // never used → excluded
      { agentId: "e", status: "SLEEPING", lastActive: 300 },
      { agentId: "f", status: "SLEEPING", lastActive: 400 },
    ];
    render(<HomeLauncher />);
    // b(500), f(400), e(300) — three most recent; a(100) drops off, c/d excluded.
    expect(screen.getByTestId("jump-back-in")).toHaveAttribute("data-count", "3");
  });
});
