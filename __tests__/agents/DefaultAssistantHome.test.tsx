import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DefaultAssistantHome } from "@/components/DefaultAssistantHome";
import { DEFAULT_AGENT_ID } from "@/config/agents";

jest.mock("@/components/AIPrompt", () => ({
  AIPrompt: ({
    fixedAgentId,
    onChatStarted,
  }: {
    fixedAgentId?: string;
    onChatStarted?: (agentId: string) => void;
  }) => (
    <div data-testid="ai-prompt" data-fixed-agent-id={fixedAgentId} data-has-on-chat-started={String(!!onChatStarted)} />
  ),
}));

describe("DefaultAssistantHome", () => {
  it("always renders the start-something-new prompt for the reserved assistant", () => {
    render(<DefaultAssistantHome />);

    const prompt = screen.getByTestId("ai-prompt");
    expect(prompt).toHaveAttribute("data-fixed-agent-id", DEFAULT_AGENT_ID);
  });

  it("does not intercept chat start — leaves navigation to AIPrompt's own router.push", () => {
    render(<DefaultAssistantHome />);

    expect(screen.getByTestId("ai-prompt")).toHaveAttribute(
      "data-has-on-chat-started",
      "false",
    );
  });
});
