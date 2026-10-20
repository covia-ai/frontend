import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { AgentChat } from "@/components/agent-chat/AgentChat";
import { useAgentExplorer } from "@/hooks/use-agent-explorer";
import { warmMarkdownPipeline } from "@test/lazy-boundaries";

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
    failedSend: null,
    retrySend: jest.fn(),
    editFailedSend: jest.fn(),
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
    activity: null,
    canSend: true,
    echoAlreadyRecorded: false,
    suspend: jest.fn(),
    resume: jest.fn(),
    triggerAgent: jest.fn(),
    triggering: false,
    forkAgent: jest.fn().mockResolvedValue({ status: "created", agentId: "writer-fork" }),
    forking: false,
    deleteAgent: jest.fn(),
    updateAgentConfig: jest.fn().mockResolvedValue(true),
    renameSession: jest.fn(),
    startNewChat: jest.fn(),
    selectSession: jest.fn(),
    send: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useAgentExplorer>;
}

// Compile the lazy module before the clock starts — see @test/lazy-boundaries.
beforeAll(warmMarkdownPipeline);

describe("AgentChat", () => {
  it("renders a focused conversation and sends from the multiline composer", async () => {
    const value = controller();
    mockUseAgentExplorer.mockReturnValue(value);

    render(<AgentChat initialAgentId="writer" />);

    expect(mockUseAgentExplorer).toHaveBeenCalledWith("writer");
    expect(screen.getByTestId("agent-transcript")).toBeInTheDocument();
    expect(screen.getByText("Draft a launch post")).toBeInTheDocument();
    // Markdown loads on first use (#473); the reply is a <p> once it has.
    const reply = await screen.findByText("Here is a concise first draft.", { selector: "p" });
    expect(reply.parentElement?.parentElement).toHaveClass("text-[15px]", "leading-6");

    fireEvent.keyDown(screen.getByTestId("clean-composer-input"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(value.send).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("clean-new-session"));
    expect(value.startNewChat).toHaveBeenCalledTimes(1);
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
