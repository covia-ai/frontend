jest.mock("@/lib/notify", () => ({
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  jobFailure: jest.fn((error: unknown) => ({ reason: error, jobHref: "/jobs/failed" })),
}));
jest.mock("@/lib/utils", () => ({
  gtmEvent: {
    sendAgentMessage: jest.fn(),
    sendAgentMessageFailed: jest.fn(),
  },
}));

import { dispatchAgentMessage } from "@/lib/agent-chat";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { gtmEvent } from "@/lib/utils";

const sendAgentMessage = jest.mocked(gtmEvent.sendAgentMessage);

const common = {
  agentId: "assistant",
  venueId: "did:web:venue.example",
  venueBaseUrl: "https://venue.example",
};

describe("dispatchAgentMessage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("trims messages and records successful dispatch", async () => {
    const send = jest.fn().mockResolvedValue({ sessionId: "session-1", response: "hello" });

    await expect(dispatchAgentMessage({ ...common, text: "  hi  ", send })).resolves.toMatchObject({
      sessionId: "session-1",
    });

    expect(send).toHaveBeenCalledWith("hi");
    expect(sendAgentMessage).toHaveBeenCalledWith("assistant");
    expect(notifyWarning).not.toHaveBeenCalled();
  });

  it("uses one empty-reply warning", async () => {
    await dispatchAgentMessage({
      ...common,
      text: "hi",
      send: async () => ({ response: "  " }),
    });

    expect(notifyWarning).toHaveBeenCalledWith("The agent sent an empty reply", {
      description: "It may have hit an error — check its session in the explorer.",
    });
  });

  it("warns on a slow reply but never abandons the send", async () => {
    // The venue already has the message; a slow agent (waking, mid-task) must
    // not be misreported as failed — the reply is still delivered when ready.
    jest.useFakeTimers();
    let resolveSend!: (result: { response: string }) => void;
    const pending = dispatchAgentMessage({
      ...common,
      text: "hi",
      slowAfterMs: 10,
      send: () => new Promise((resolve) => { resolveSend = resolve; }),
    });

    await jest.advanceTimersByTimeAsync(10);
    expect(notifyWarning).toHaveBeenCalledWith(
      "The agent is taking a while to reply",
      expect.objectContaining({ description: expect.stringContaining("session") }),
    );
    expect(notifyError).not.toHaveBeenCalled();

    resolveSend({ response: "eventually" });
    await expect(pending).resolves.toMatchObject({ response: "eventually" });
    expect(sendAgentMessage).toHaveBeenCalledWith("assistant");
    jest.useRealTimers();
  });

  it("reports actual suspension when the status probe confirms it", async () => {
    jest.useFakeTimers();
    const pending = dispatchAgentMessage({
      ...common,
      text: "hi",
      slowAfterMs: 10,
      agentStatus: async () => "SUSPENDED",
      send: () => new Promise(() => undefined),
    });

    await jest.advanceTimersByTimeAsync(10);
    // Flush the async status probe.
    await Promise.resolve();
    expect(notifyWarning).toHaveBeenCalledWith(
      "Agent is suspended",
      expect.objectContaining({ description: expect.stringContaining("resume") }),
    );
    expect(notifyError).not.toHaveBeenCalled();
    jest.useRealTimers();
    void pending;
  });

  it("translates the venue's in-flight-chat rejection into an actionable message", async () => {
    const failure = new Error(
      "Session 0000019ffef1c8cb0000000000000000 already has an in-flight chat",
    );
    await expect(
      dispatchAgentMessage({ ...common, text: "hi", send: () => Promise.reject(failure) }),
    ).rejects.toBe(failure);

    expect(notifyError).toHaveBeenCalledWith(
      "Unable to send message",
      expect.objectContaining({ message: expect.stringContaining("still working") }),
      common.venueBaseUrl,
      "/jobs/failed",
    );
  });

  it("surfaces a real send failure with venue context", async () => {
    const failure = new Error("venue rejected");
    await expect(
      dispatchAgentMessage({ ...common, text: "hi", send: () => Promise.reject(failure) }),
    ).rejects.toThrow("venue rejected");

    expect(jobFailure).toHaveBeenCalledWith(failure, common.venueId);
    expect(notifyError).toHaveBeenCalledWith(
      "Unable to send message",
      failure,
      common.venueBaseUrl,
      "/jobs/failed",
    );
  });
});
