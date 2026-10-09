import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Copy used to exist only on user bubbles; people more often want the answer
// than their own question (frontend#285 item 2).
// Assigned in beforeAll and driven with the bare userEvent API:
// userEvent.setup() installs its own clipboard stub, which would replace this
// mock and make every assertion below see zero calls.
const writeText = jest.fn<Promise<void>, [string]>();
beforeAll(() => {
  Object.assign(navigator, { clipboard: { writeText } });
});

jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
import { notifyMock } from "@test/notify";
const mockNotifySuccess = notifyMock.notifySuccess;
const mockNotifyError = notifyMock.notifyError;

import { AgentConversation } from "@/components/AgentConversation";
import type { Session } from "@/config/types";

const session: Session = {
  sessionId: "s1",
  conversation: [
    { role: "user", content: "What is a venue?" },
    { role: "assistant", content: "A venue is a **grid node** hosting operations." },
  ],
};

function renderConversation() {
  return render(
    <AgentConversation
      agentId="writer"
      selectedSessionId="s1"
      session={session}
      pendingChat={null}
      echoAlreadyRecorded={false}
      transcriptRef={React.createRef<HTMLDivElement>()}
    />,
  );
}

describe("AgentConversation copy affordances", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    writeText.mockResolvedValue(undefined);
  });

  it("offers copy on an agent reply, not only on the user's own message", async () => {
    renderConversation();

    await userEvent.click(screen.getByTestId("agent-turn-copy"));

    expect(writeText).toHaveBeenCalledWith("A venue is a **grid node** hosting operations.");
    expect(mockNotifySuccess).toHaveBeenCalledWith("Message copied");
  });

  it("labels the reply control for screen readers, since it shows on hover", () => {
    renderConversation();
    expect(screen.getByTestId("agent-turn-copy")).toHaveAccessibleName("Copy reply");
  });

  it("reports a clipboard failure instead of silently doing nothing", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    renderConversation();

    await userEvent.click(screen.getByTestId("agent-turn-copy"));

    // Reported only after the fallback copy path has also been refused.
    await waitFor(() =>
      expect(mockNotifyError).toHaveBeenCalledWith("Unable to copy message", expect.any(Error)),
    );
    expect(mockNotifySuccess).not.toHaveBeenCalled();
  });

  it("still copies the user's own turn through the bubble menu", async () => {
    renderConversation();

    await userEvent.click(screen.getByTestId("user-turn-bubble"));
    await userEvent.click(await screen.findByTestId("turn-copy"));

    expect(writeText).toHaveBeenCalledWith("What is a venue?");
  });

  // Radix already supplied aria-haspopup and Enter/Space handling on this
  // trigger, but `asChild` over a plain div kept it out of the tab order, so
  // the menu was mouse-only (frontend#243).
  describe("user-turn menu is keyboard-operable", () => {
    it("exposes the bubble as a control that can be tabbed to", () => {
      renderConversation();
      const bubble = screen.getByTestId("user-turn-bubble");

      expect(bubble).toHaveAttribute("role", "button");
      expect(bubble).toHaveAttribute("tabindex", "0");
      expect(bubble).toHaveAttribute("aria-haspopup", "menu");
    });

    it("opens the menu from the keyboard and copies without a pointer", async () => {
      renderConversation();
      const bubble = screen.getByTestId("user-turn-bubble");

      bubble.focus();
      expect(bubble).toHaveFocus();

      // Enter is Radix's own trigger handling — previously unreachable, since
      // the element could never hold focus to receive the keydown.
      await userEvent.keyboard("{Enter}");
      await userEvent.click(await screen.findByTestId("turn-copy"));

      expect(writeText).toHaveBeenCalledWith("What is a venue?");
    });
  });
});

// A failed send stays in the transcript with Retry and Edit (frontend#285 item 1).
describe("AgentConversation — failed send", () => {
  function renderFailed(failedSend: { text: string; reason: string; recorded: boolean }) {
    const onRetry = jest.fn();
    const onEditFailed = jest.fn();
    render(
      <AgentConversation
        agentId="writer"
        selectedSessionId="s1"
        session={session}
        pendingChat={null}
        echoAlreadyRecorded={false}
        transcriptRef={React.createRef<HTMLDivElement>()}
        failedSend={failedSend}
        onRetry={onRetry}
        onEditFailed={onEditFailed}
      />,
    );
    return { onRetry, onEditFailed };
  }

  it("shows an unsent message with its reason, Retry and Edit", async () => {
    const { onRetry, onEditFailed } = renderFailed({ text: "Summarise it", reason: "network down", recorded: false });
    expect(screen.getByText("Summarise it")).toBeInTheDocument();
    expect(screen.getByTestId("failed-send-reason")).toHaveTextContent("Not sent: network down");
    await userEvent.click(screen.getByTestId("failed-send-retry"));
    await userEvent.click(screen.getByTestId("failed-send-edit"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onEditFailed).toHaveBeenCalledTimes(1);
  });

  it("doesn't repeat a message the venue already recorded, and offers only Retry", () => {
    renderFailed({ text: "What is a venue?", reason: "tool loop failed", recorded: true });
    // The recorded user turn appears once (from the transcript), not twice.
    expect(screen.getAllByText("What is a venue?")).toHaveLength(1);
    expect(screen.getByTestId("failed-send-reason")).toHaveTextContent("No reply: tool loop failed");
    expect(screen.getByTestId("failed-send-retry")).toBeInTheDocument();
    expect(screen.queryByTestId("failed-send-edit")).not.toBeInTheDocument();
  });
});
