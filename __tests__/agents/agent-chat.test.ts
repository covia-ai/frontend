jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
import { notifyMock } from "@test/notify";
jest.mock("@/lib/utils", () => ({
  gtmEvent: {
    sendAgentMessage: jest.fn(),
    sendAgentMessageFailed: jest.fn(),
  },
}));

import { AGENT_CHAT_OPERATION, dispatchAgentMessage, sendAgentChat } from "@/lib/agent-chat";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";
import { gtmEvent } from "@/lib/utils";

const sendAgentMessage = jest.mocked(gtmEvent.sendAgentMessage);

const common = {
  agentId: "assistant",
  venueId: "did:web:venue.example",
  venueBaseUrl: "https://venue.example",
};

describe("dispatchAgentMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // This suite asserts the job link reaches notifyError.
    notifyMock.jobFailure.mockImplementation((error: unknown) => ({
      reason: error,
      jobHref: "/jobs/failed",
    }));
  });

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

    expect(notifyWarning).toHaveBeenCalledTimes(1);
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

// Stopping the wait (#542) silences the warnings meant for someone waiting,
// never the failure.
describe("dispatchAgentMessage after the user stopped waiting", () => {
  beforeEach(() => jest.clearAllMocks());

  it("leaves out the slow-reply and empty-reply warnings", async () => {
    jest.useFakeTimers();
    let resolveSend!: (result: { response: string }) => void;
    const pending = dispatchAgentMessage({
      ...common,
      text: "hi",
      slowAfterMs: 10,
      stoppedWaiting: () => true,
      send: () => new Promise((resolve) => { resolveSend = resolve; }),
    });
    await jest.advanceTimersByTimeAsync(10);
    resolveSend({ response: "" });
    await pending;
    expect(notifyWarning).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("still reports a failure", async () => {
    notifyMock.jobFailure.mockImplementation((error: unknown) => ({ reason: error, jobHref: undefined }));
    await expect(dispatchAgentMessage({
      ...common,
      text: "hi",
      stoppedWaiting: () => true,
      send: () => Promise.reject(new Error("model down")),
    })).rejects.toThrow("model down");
    expect(notifyError).toHaveBeenCalled();
  });
});

describe("sendAgentChat", () => {
  const venueFor = (output: unknown, accepted: unknown = { metadata: { sessionId: "s-new" } }) => ({
    operations: {
      invoke: jest.fn().mockResolvedValue({ id: "0xjob", result: () => Promise.resolve(output) }),
    },
    jobs: { get: jest.fn().mockResolvedValue(accepted) },
  });

  it("reports a new chat's job and session before the reply, then returns the reply", async () => {
    const venue = venueFor({ sessionId: "s-new", response: "hello" });
    const onJob = jest.fn();
    const onSession = jest.fn();

    await expect(
      sendAgentChat(venue as never, { agentId: "a1", message: "hi", onJob, onSession }),
    ).resolves.toEqual({ sessionId: "s-new", response: "hello" });

    expect(venue.operations.invoke).toHaveBeenCalledWith(AGENT_CHAT_OPERATION, { agentId: "a1", message: "hi" });
    expect(onJob).toHaveBeenCalledWith("0xjob");
    expect(venue.jobs.get).toHaveBeenCalledWith("0xjob");
    expect(onSession).toHaveBeenCalledWith("s-new");
  });

  it("continues an existing session without reading the job for it", async () => {
    const venue = venueFor({ sessionId: "s-1", response: "ok" });
    const onSession = jest.fn();

    await sendAgentChat(venue as never, { agentId: "a1", message: "hi", sessionId: "s-1", onSession });

    expect(venue.operations.invoke).toHaveBeenCalledWith(AGENT_CHAT_OPERATION, {
      agentId: "a1", message: "hi", sessionId: "s-1",
    });
    expect(venue.jobs.get).not.toHaveBeenCalled();
    expect(onSession).not.toHaveBeenCalled();
  });

  it("still returns the reply when the job read fails or names no session", async () => {
    const venue = venueFor({ sessionId: "s-new", response: "ok" });
    venue.jobs.get.mockRejectedValue(new Error("blip"));
    const onSession = jest.fn();

    await expect(
      sendAgentChat(venue as never, { agentId: "a1", message: "hi", onSession }),
    ).resolves.toMatchObject({ response: "ok" });
    expect(onSession).not.toHaveBeenCalled();
  });
});

// Follow-ups typed mid-reply reach the venue in order (#541): each waits for
// the one before it to be accepted, never for its reply.
describe("sendAgentChat queue", () => {
  it("hands a follow-up over once the first is accepted, without waiting for its reply", async () => {
    let acceptFirst!: (job: unknown) => void;
    let replyFirst!: (output: unknown) => void;
    const firstReply = new Promise((resolve) => { replyFirst = resolve; });
    const invoke = jest.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { acceptFirst = resolve; }))
      .mockImplementationOnce(() => Promise.resolve({ id: "0xjob2", result: () => Promise.resolve({ response: "two" }) }));
    const venue = { operations: { invoke }, jobs: { get: jest.fn() } };

    const first = sendAgentChat(venue as never, { agentId: "a1", message: "one", sessionId: "s-1", queue: "q1" });
    const second = sendAgentChat(venue as never, { agentId: "a1", message: "two", sessionId: "s-1", queue: "q1" });

    await Promise.resolve();
    expect(invoke).toHaveBeenCalledTimes(1);           // the follow-up waits its turn

    acceptFirst({ id: "0xjob1", result: () => firstReply });
    await expect(second).resolves.toEqual({ response: "two" });
    expect(invoke.mock.calls.map((call) => call[1].message)).toEqual(["one", "two"]);

    replyFirst({ response: "one" });                   // the first reply came last
    await expect(first).resolves.toEqual({ response: "one" });
  });

  it("asks a follow-up's session only once the one ahead has its session", async () => {
    let minted: string | null = null;
    const invoke = jest.fn().mockImplementation(() =>
      Promise.resolve({ id: "0xjob", result: () => new Promise(() => {}) }));
    const venue = {
      operations: { invoke },
      jobs: { get: jest.fn().mockResolvedValue({ metadata: { sessionId: "s-new" } }) },
    };

    void sendAgentChat(venue as never, {
      agentId: "a1", message: "one", queue: "q2", onSession: (s) => { minted = s; },
    });
    void sendAgentChat(venue as never, {
      agentId: "a1", message: "two", queue: "q2", sessionId: () => minted,
    });

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls[1][1]).toEqual({ agentId: "a1", message: "two", sessionId: "s-new" });
  });

  it("still hands a follow-up over when the send ahead of it failed", async () => {
    const invoke = jest.fn()
      .mockRejectedValueOnce(new Error("refused"))
      .mockResolvedValueOnce({ id: "0xjob2", result: () => Promise.resolve({ response: "ok" }) });
    const venue = { operations: { invoke }, jobs: { get: jest.fn() } };

    const first = sendAgentChat(venue as never, { agentId: "a1", message: "one", sessionId: "s", queue: "q3" });
    const second = sendAgentChat(venue as never, { agentId: "a1", message: "two", sessionId: "s", queue: "q3" });

    await expect(first).rejects.toThrow("refused");
    await expect(second).resolves.toEqual({ response: "ok" });
  });
});

async function waitFor(check: () => void, tries = 50): Promise<void> {
  for (let i = 0; ; i++) {
    try { check(); return; } catch (error) {
      if (i >= tries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}
