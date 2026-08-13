import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DefaultAssistantHome } from "@/components/DefaultAssistantHome";

const mockUseAuthenticatedVenue = jest.fn();
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockUseAuthenticatedVenue(),
}));

jest.mock("@/components/agent-chat/AgentChat", () => ({
  AgentChat: ({ initialAgentId, fixedAgent }: { initialAgentId?: string; fixedAgent?: boolean }) => (
    <div data-testid="agent-chat">
      {initialAgentId}:{String(fixedAgent)}
    </div>
  ),
}));

jest.mock("@/components/AIPrompt", () => ({
  AIPrompt: ({
    fixedAgentId,
    onChatStarted,
  }: {
    fixedAgentId?: string;
    onChatStarted?: (agentId: string) => void;
  }) => (
    <button data-testid="assistant-setup" onClick={() => onChatStarted?.("assistant")}>
      Set up {fixedAgentId}
    </button>
  ),
}));

describe("DefaultAssistantHome", () => {
  beforeEach(() => mockUseAuthenticatedVenue.mockReset());

  it("opens the existing default assistant in the focused chat", async () => {
    const list = jest.fn().mockResolvedValue({
      agents: [{ agentId: "assistant", status: "RUNNING" }],
    });
    mockUseAuthenticatedVenue.mockReturnValue({ agents: { list } });

    render(<DefaultAssistantHome />);

    expect(await screen.findByTestId("agent-chat")).toHaveTextContent(
      "assistant:true",
    );
    expect(list).toHaveBeenCalledWith(true);
  });

  it("offers first-message setup when the assistant is absent, then opens chat", async () => {
    mockUseAuthenticatedVenue.mockReturnValue({
      agents: { list: jest.fn().mockResolvedValue({ agents: [] }) },
    });

    render(<DefaultAssistantHome />);

    const setup = await screen.findByTestId("assistant-setup");
    expect(setup).toHaveTextContent("Set up assistant");
    act(() => setup.click());

    await waitFor(() => expect(screen.getByTestId("agent-chat")).toBeInTheDocument());
  });

  it("recreates a terminated assistant instead of opening an unusable chat", async () => {
    mockUseAuthenticatedVenue.mockReturnValue({
      agents: {
        list: jest.fn().mockResolvedValue({
          agents: [{ agentId: "assistant", status: "TERMINATED" }],
        }),
      },
    });

    render(<DefaultAssistantHome />);

    expect(await screen.findByTestId("assistant-setup")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-chat")).not.toBeInTheDocument();
  });
});
