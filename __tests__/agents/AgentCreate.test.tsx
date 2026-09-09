import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockList = jest.fn();
const mockInfo = jest.fn();
const mockCreate = jest.fn();
const mockLogout = jest.fn();
const mockPush = jest.fn();
const mockAuth = { type: "bearer", did: "did:key:test", token: "token" };
let mockAccessState: { state: string; detail?: string } = { state: "accepted" };
// The adapter registry backing the Port capability check (#350). Defaults to a
// venue that publishes agent:from-skills; tests override per case.
const mockAdapterList = jest.fn();
const mockVenue = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  adapters: { list: mockAdapterList },
  agents: {
    list: mockList,
    info: mockInfo,
    create: mockCreate,
    request: jest.fn(),
  },
  secrets: {
    list: jest.fn().mockResolvedValue(["ANTHROPIC_API_KEY"]),
  },
  // AddNewAgent now also renders AgentConnectionsPicker, which fetches
  // venue.skills.list(...) eagerly on mount (#295).
  skills: {
    list: jest.fn().mockResolvedValue([]),
  },
};

jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => true,
  useCurrentAuth: () => mockAuth,
  useAuthStore: (selector: (state: { logout: typeof mockLogout }) => unknown) =>
    selector({ logout: mockLogout }),
}));
jest.mock("@/hooks/use-venue-auth-health", () => ({
  useVenueAccessState: () => mockAccessState,
  reportVenueAuthHealth: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock("@/components/AgentTemplates", () => ({
  AgentTemplates: () => <section data-testid="agent-templates">Templates</section>,
}));
jest.mock("@/lib/notify", () => ({
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  jobFailure: (error: unknown) => ({ reason: error }),
}));

import { AgentCreate } from "@/components/AgentCreate";

describe("AgentCreate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccessState = { state: "accepted" };
    mockAdapterList.mockResolvedValue([
      { name: "agent", operations: ["v/ops/agent/create", "v/ops/agent/from-skills"] },
    ]);
    mockList.mockResolvedValue({
      agents: [{ agentId: "writer", status: "SLEEPING" }],
    });
    mockInfo.mockResolvedValue({
      agentId: "writer",
      status: "SLEEPING",
      config: {
        operation: "v/ops/llmagent/chat",
        llmOperation: "v/ops/langchain/anthropic",
        model: "claude-opus-4-8",
        systemPrompt: "You are a careful writer.",
        skills: ["w/skills"],
        customSetting: "preserve-me",
      },
      state: { privateRuntimeValue: "do-not-copy" },
    });
  });

  it("blocks creation when the venue rejects the stored account", () => {
    mockAccessState = { state: "rejected", detail: "403 not provisioned" };

    render(<AgentCreate />);

    expect(screen.getByTestId("agent-auth-rejected")).toHaveTextContent(
      "This venue rejected the stored account",
    );
    expect(screen.queryByTestId("agent-templates")).not.toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("offers template, custom, and clone paths without choosing an existing agent", async () => {
    render(<AgentCreate />);

    expect(screen.getByTestId("agent-templates")).toBeInTheDocument();
    expect(screen.getByText("Create a custom agent")).toBeInTheDocument();
    expect(screen.getByText("Clone an existing agent")).toBeInTheDocument();
    expect(screen.queryByText(/choose an existing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Start from a venue template/i)).not.toBeInTheDocument();
    expect(screen.getByText("Other options")).toBeInTheDocument();
    await waitFor(() => expect(mockList).toHaveBeenCalledWith());
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("loads only the chosen agent's config and prefills the shared create dialog", async () => {
    const user = userEvent.setup();
    render(<AgentCreate />);

    await user.click(await screen.findByTestId("clone-agent-select"));
    await user.click(await screen.findByRole("option", { name: "writer" }));
    await user.click(screen.getByTestId("clone-agent-trigger"));

    await waitFor(() => expect(mockInfo).toHaveBeenCalledWith("writer"));
    expect(await screen.findByText("Clone writer")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., Customer Support Agent")).toHaveValue(
      "writer copy",
    );
    expect(
      screen.getByPlaceholderText("Describe the agent's role, behaviour, and boundaries."),
    ).toHaveValue("You are a careful writer.");
  });

  describe("Port capability detection (#350)", () => {
    it("offers Port when the venue publishes agent:from-skills", async () => {
      render(<AgentCreate />);
      await waitFor(() => expect(mockAdapterList).toHaveBeenCalled());
      expect(await screen.findByTestId("port-agent-trigger")).toBeEnabled();
      expect(screen.queryByTestId("port-unsupported-notice")).not.toBeInTheDocument();
    });

    it("disables Port and names the missing operation when the venue lacks it", async () => {
      mockAdapterList.mockResolvedValue([
        { name: "agent", operations: ["v/ops/agent/create"] },
      ]);
      render(<AgentCreate />);

      await waitFor(() =>
        expect(screen.getByTestId("port-agent-trigger")).toBeDisabled(),
      );
      expect(screen.getByTestId("port-unsupported-notice")).toHaveTextContent(
        "v/ops/agent/from-skills",
      );
    });

    it("keeps Port offered when the adapter registry can't be read", async () => {
      // An unreadable registry is not evidence of absence — a venue that can
      // port must not lose the control because one job-free read failed.
      mockAdapterList.mockRejectedValue(new Error("values API unavailable"));
      render(<AgentCreate />);

      await waitFor(() => expect(mockAdapterList).toHaveBeenCalled());
      expect(await screen.findByTestId("port-agent-trigger")).toBeEnabled();
      expect(screen.queryByTestId("port-unsupported-notice")).not.toBeInTheDocument();
    });
  });
});
