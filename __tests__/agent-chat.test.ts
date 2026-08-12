const notifyError = jest.fn();
const notifyWarning = jest.fn();
const jobFailure = jest.fn((error: unknown) => ({ reason: error, jobHref: "/jobs/failed" }));
const sendAgentMessage = jest.fn();
const sendAgentMessageFailed = jest.fn();

jest.mock("@/lib/notify", () => ({ notifyError, notifyWarning, jobFailure }));
jest.mock("@/lib/utils", () => ({
  gtmEvent: { sendAgentMessage, sendAgentMessageFailed },
}));

import { dispatchAgentMessage } from "@/lib/agent-chat";

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

  it("times out and logs the failure with venue context", async () => {
    jest.useFakeTimers();
    const pending = dispatchAgentMessage({
      ...common,
      text: "hi",
      timeoutMs: 10,
      send: () => new Promise(() => undefined),
    });
    const rejection = expect(pending).rejects.toThrow("Agent is not responding");

    await jest.advanceTimersByTimeAsync(10);
    await rejection;
    expect(jobFailure).toHaveBeenCalledWith(expect.any(Error), common.venueId);
    expect(notifyError).toHaveBeenCalledWith(
      "Unable to send message",
      expect.any(Error),
      common.venueBaseUrl,
      "/jobs/failed",
    );
    jest.useRealTimers();
  });
});
