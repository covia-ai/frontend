import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

import { AgentConversation } from "@/components/AgentConversation";
import type { Session } from "@/config/types";

// How a turn's content reaches the transcript. Copy affordances live in
// AgentConversation.test.tsx.
function renderTranscript(conversation: Session["conversation"]) {
  render(
    <AgentConversation
      agentId="agent-1"
      selectedSessionId="sess-1"
      session={{ sessionId: "sess-1", conversation }}
      pendingChat={null}
      echoAlreadyRecorded={false}
      transcriptRef={React.createRef<HTMLDivElement>()}
      onStarter={jest.fn()}
    />,
  );
  return screen.getByTestId("agent-transcript");
}

describe("AgentConversation transcript rendering", () => {
  it("unwraps single-string-field envelopes and labels task-originated turns", () => {
    const transcript = renderTranscript([
      { role: "user", source: "request", content: { task: "Tell me about the grid" }, ts: 1 },
      { role: "assistant", source: "transition", content: "Here is the grid overview", ts: 2 },
    ]);

    // {task: "..."} is a lossless envelope — shown as its text, with a
    // provenance label marking it as task-originated rather than typed chat.
    expect(within(transcript).getByText("Tell me about the grid")).toBeInTheDocument();
    expect(within(transcript).getByTestId("turn-source-label")).toBeInTheDocument();
    expect(within(transcript).getByText("Here is the grid overview")).toBeInTheDocument();
  });

  it("renders a flat all-string envelope as sections, every field visible", () => {
    renderTranscript([
      {
        role: "user",
        source: "request",
        content: { task: "just this", expected_output: "must-stay-visible" },
        ts: 1,
      },
    ]);

    // Delegation envelopes are improvised, not a fixed schema — every field
    // renders in its own section, so nothing is silently dropped and no raw
    // JSON lands in the transcript. The generic source chip stands down in
    // favour of the sections' own labels.
    const sections = screen.getByTestId("turn-sections");
    expect(within(sections).getByText("just this")).toBeInTheDocument();
    expect(within(sections).getByText("must-stay-visible")).toBeInTheDocument();
    expect(screen.queryByTestId("turn-source-label")).not.toBeInTheDocument();
  });

  it("renders nested multi-field content as full JSON so no field is silently dropped", () => {
    const transcript = renderTranscript([
      { role: "user", source: "chat", content: { text: "just this", extra: { deep: "must-stay-visible" } }, ts: 1 },
    ]);

    // A nested value cannot be sectioned without misrepresenting it — the
    // transcript falls back to complete JSON.
    expect(within(transcript).getByText(/must-stay-visible/)).toBeInTheDocument();
    expect(within(transcript).queryByText("just this")).not.toBeInTheDocument();
  });

  it("links a turn to the job that made it, restoring the id's 0x prefix", async () => {
    const user = userEvent.setup();
    renderTranscript([
      // The venue records jobId without the 0x prefix.
      { role: "user", source: "chat", content: "create workers", ts: 1, jobId: "019ffef67fdc00006a41dc5777d5c63e" },
    ]);

    await user.click(screen.getByTestId("user-turn-bubble"));

    expect(await screen.findByTestId("turn-job-link")).toHaveAttribute(
      "href",
      "/job/0x019ffef67fdc00006a41dc5777d5c63e",
    );
  });

  it("omits the job link when the turn has no jobId", async () => {
    const user = userEvent.setup();
    renderTranscript([{ role: "user", source: "chat", content: "plain turn", ts: 1 }]);

    await user.click(screen.getByTestId("user-turn-bubble"));

    await screen.findByTestId("turn-copy");
    expect(screen.queryByTestId("turn-job-link")).not.toBeInTheDocument();
  });
});
