import React from "react";
import { render, screen } from "@testing-library/react";
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

const mockNotifySuccess = jest.fn();
const mockNotifyError = jest.fn();
jest.mock("@/lib/notify", () => ({
  notifySuccess: (...args: unknown[]) => mockNotifySuccess(...args),
  notifyError: (...args: unknown[]) => mockNotifyError(...args),
}));

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

    expect(mockNotifyError).toHaveBeenCalledWith("Unable to copy message", expect.any(Error));
    expect(mockNotifySuccess).not.toHaveBeenCalled();
  });

  it("still copies the user's own turn through the bubble menu", async () => {
    renderConversation();

    await userEvent.click(screen.getByTestId("user-turn-bubble"));
    await userEvent.click(await screen.findByTestId("turn-copy"));

    expect(writeText).toHaveBeenCalledWith("What is a venue?");
  });
});
