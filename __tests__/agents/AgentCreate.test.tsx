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
const mockVenue = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  agents: {
    list: mockList,
    info: mockInfo,
    create: mockCreate,
    request: jest.fn(),
  },
  secrets: {
    list: jest.fn().mockResolvedValue(["ANTHROPIC_API_KEY"]),
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
      screen.getByPlaceholderText("e.g., You are a helpful customer support agent that..."),
    ).toHaveValue("You are a careful writer.");
  });
});
