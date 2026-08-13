import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { AgentChat } from "@/components/agent-chat/AgentChat";
import { useAgentExplorer } from "@/hooks/use-agent-explorer";

jest.mock("@/hooks/use-agent-explorer", () => ({
  useAgentExplorer: jest.fn(),
}));

const mockUseAgentExplorer = useAgentExplorer as jest.MockedFunction<
  typeof useAgentExplorer
>;

function controller(overrides: Record<string, unknown> = {}) {
  return {
    agentList: [{ agentId: "writer", status: "RUNNING" }],
    selectedAgentId: "writer",
    setSelectedAgentId: jest.fn(),
    selectedAgentDetail: { agentId: "writer", status: "RUNNING" },
    loading: false,
    detailLoading: false,
    detailError: false,
    sessions: [
      {
        sessionId: "session-1",
        title: "Draft launch post",
        conversation: [
          { role: "user", content: "Draft a launch post" },
          { role: "assistant", content: "Here is a concise first draft." },
        ],
      },
    ],
    hasChatSession: true,
    selectedSessionId: "session-1",
    currentSession: {
      sessionId: "session-1",
      title: "Draft launch post",
      conversation: [
        { role: "user", content: "Draft a launch post" },
        { role: "assistant", content: "Here is a concise first draft." },
      ],
    },
    messageText: "Follow up",
    setMessageText: jest.fn(),
    pendingChat: null,
    sending: false,
    canSend: true,
    echoAlreadyRecorded: false,
    suspend: jest.fn(),
    resume: jest.fn(),
    deleteAgent: jest.fn(),
    renameSession: jest.fn(),
    startNewChat: jest.fn(),
    selectSession: jest.fn(),
    send: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useAgentExplorer>;
}

describe("AgentChat", () => {
  it("renders a focused conversation and sends from the multiline composer", () => {
    const value = controller();
    mockUseAgentExplorer.mockReturnValue(value);

    render(<AgentChat initialAgentId="writer" />);

    expect(mockUseAgentExplorer).toHaveBeenCalledWith("writer");
    expect(screen.getByTestId("agent-transcript")).toBeInTheDocument();
    expect(screen.getByText("Draft a launch post")).toBeInTheDocument();
    expect(screen.getByText("Here is a concise first draft.").parentElement?.parentElement).toHaveClass(
      "text-[15px]",
      "leading-6",
    );

    fireEvent.keyDown(screen.getByTestId("clean-composer-input"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(value.send).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("clean-new-session"));
    expect(value.startNewChat).toHaveBeenCalledTimes(1);
  });

  it("keeps the assistant identity fixed on the home-style surface", () => {
    mockUseAgentExplorer.mockReturnValue(controller());

    render(<AgentChat initialAgentId="writer" fixedAgent />);

    expect(screen.getByText("writer")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Agent" })).not.toBeInTheDocument();
  });

  it("offers agent creation when the venue has no selectable agent", () => {
    mockUseAgentExplorer.mockReturnValue(
      controller({
        agentList: [],
        selectedAgentId: null,
        selectedAgentDetail: null,
        sessions: [],
        currentSession: null,
        hasChatSession: false,
        messageText: "",
        canSend: false,
      }),
    );

    render(<AgentChat />);

    expect(screen.getByText("No agents yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an agent" })).toHaveAttribute(
      "href",
      "/agents/create",
    );
  });
});
