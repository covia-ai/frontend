import { act, renderHook, waitFor } from "@testing-library/react";
import { NotFoundError } from "@covia/covia-sdk";
import { useAgentExplorer } from "@/hooks/use-agent-explorer";
import { usePendingChats } from "@/hooks/use-pending-chats";

let mockVenue: any;

jest.mock("@/hooks/use-authenticated-venue", () => ({
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

function makeVenue(venueId: string, agentIds: string[], configs: Record<string, unknown> = {}) {
  return {
    venueId,
    agents: {
      // Mutated in place by the fork mock below, so this must re-read
      // agentIds at call time rather than snapshot it once via
      // mockResolvedValue.
      list: jest.fn().mockImplementation(() =>
        Promise.resolve({
          agents: agentIds.map((agentId) => ({ agentId, status: "SLEEPING", tasks: 0 })),
        }),
      ),
      info: jest.fn().mockImplementation((agentId: string) =>
        agentIds.includes(agentId)
          ? Promise.resolve({ agentId, status: "SLEEPING", config: configs[agentId] ?? {} })
          : Promise.reject(new NotFoundError(`Agent not found: ${agentId}`)),
      ),
      fork: jest.fn().mockImplementation((input: { sourceId: string; agentId: string; config?: unknown }) => {
        agentIds.push(input.agentId);
        configs[input.agentId] = input.config ?? {};
        return Promise.resolve({
          agentId: input.agentId,
          status: "SLEEPING",
          created: true,
          forkedFrom: input.sourceId,
        });
      }),
      listSessions: jest.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 50 }),
      // Empty by default — the live-events hook sees an immediately-closed
      // stream, stays non-live, and the existing poll-based tests below are
      // unaffected. Individual tests override with a scripted generator.
      events: jest.fn().mockImplementation(async function* () {}),
    },
    agent: jest.fn().mockImplementation(() => ({
      chatSession: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      suspend: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
    })),
    workspace: {
      read: jest.fn().mockResolvedValue({ exists: false, value: null }),
    },
  };
}

const { notifyError, notifyWarning } = jest.requireMock("@/lib/notify");

describe("useAgentExplorer — venue switch under an open agent", () => {
  beforeEach(() => {
    (notifyError as jest.Mock).mockReset();
  });

  it("falls back to the explorer's list view instead of erroring when the open agent doesn't exist on the new venue", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result, rerender } = renderHook(() => useAgentExplorer("agent-a"));

    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());
    expect(result.current.selectedAgentId).toBe("agent-a");

    // Switch venues — "agent-a" belongs to venue-a and doesn't exist on
    // venue-b, so the currently selected agent is now stale.
    mockVenue = makeVenue("venue-b", ["agent-b"]);
    rerender();

    // No error toast for something the user didn't do wrong.
    await waitFor(() => expect(result.current.selectedAgentId).toBe("agent-b"));
    expect(notifyError).not.toHaveBeenCalled();
    expect(result.current.detailError).toBe(false);
    await waitFor(() => expect(result.current.selectedAgentDetail?.agentId).toBe("agent-b"));
  });

  it("still surfaces a real error toast for non-404 failures", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    mockVenue.agents.info.mockRejectedValue(new Error("network unreachable"));
    const { result } = renderHook(() => useAgentExplorer("agent-a"));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(result.current.selectedAgentId).toBe("agent-a");
    expect(result.current.detailError).toBe(true);
  });
});

describe("useAgentExplorer — updateAgentConfig re-fetch-before-save guard (#161)", () => {
  beforeEach(() => {
    (notifyError as jest.Mock).mockReset();
    (notifyWarning as jest.Mock).mockReset();
  });

  it("aborts without writing when the server config changed since it was loaded", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"], { "agent-a": { systemPrompt: "v1" } });
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    const agentHandle = mockVenue.agent.mock.results[0].value;
    // Simulate an external edit landing between load and this save attempt.
    mockVenue.agents.info.mockResolvedValueOnce({
      agentId: "agent-a",
      status: "SLEEPING",
      config: { systemPrompt: "changed elsewhere" },
    });

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.updateAgentConfig({ systemPrompt: "my edit" }, { systemPrompt: "v1" });
    });

    expect(outcome).toEqual({ status: "conflict", freshConfig: { systemPrompt: "changed elsewhere" } });
    expect(agentHandle.update).not.toHaveBeenCalled();
    expect(notifyWarning).toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.selectedAgentDetail?.config).toEqual({ systemPrompt: "changed elsewhere" }),
    );
  });

  it("proceeds normally when the server config hasn't changed", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"], { "agent-a": { systemPrompt: "v1" } });
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    const agentHandle = mockVenue.agent.mock.results[0].value;

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.updateAgentConfig({ systemPrompt: "my edit" }, { systemPrompt: "v1" });
    });

    expect(outcome).toEqual({ status: "saved" });
    expect(agentHandle.update).toHaveBeenCalledWith({ config: { systemPrompt: "my edit" } });
    expect(notifyWarning).not.toHaveBeenCalled();
  });
});

describe("useAgentExplorer — updateAgentConfig guard against the editor's baseline (#161)", () => {
  beforeEach(() => {
    (notifyWarning as jest.Mock).mockReset();
  });
  afterEach(() => jest.useRealTimers());

  // The fallback poll refreshes the hook's copy of the config every few
  // seconds. Comparing against that copy let an outside edit slip past the
  // guard as soon as one poll had absorbed it.
  it("still catches an outside edit after a poll has absorbed it", async () => {
    jest.useFakeTimers();
    mockVenue = makeVenue("venue-a", ["agent-a"], { "agent-a": { systemPrompt: "v1" } });
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());
    const agentHandle = mockVenue.agent.mock.results[0].value;

    mockVenue.agents.info.mockResolvedValue({
      agentId: "agent-a",
      status: "SLEEPING",
      config: { systemPrompt: "changed elsewhere" },
    });
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    await waitFor(() =>
      expect(result.current.selectedAgentDetail?.config).toEqual({ systemPrompt: "changed elsewhere" }),
    );

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.updateAgentConfig({ systemPrompt: "my edit" }, { systemPrompt: "v1" });
    });

    expect(outcome).toEqual({ status: "conflict", freshConfig: { systemPrompt: "changed elsewhere" } });
    expect(agentHandle.update).not.toHaveBeenCalled();
  });

  it("does not treat an outside edit to a field this save leaves alone as a conflict", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"], { "agent-a": { systemPrompt: "v1", model: "m1" } });
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());
    const agentHandle = mockVenue.agent.mock.results[0].value;
    mockVenue.agents.info.mockResolvedValue({
      agentId: "agent-a",
      status: "SLEEPING",
      config: { systemPrompt: "v1", model: "changed elsewhere" },
    });

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.updateAgentConfig(
        { systemPrompt: "my edit" },
        { systemPrompt: "v1", model: "m1" },
      );
    });

    expect(outcome).toEqual({ status: "saved" });
    expect(agentHandle.update).toHaveBeenCalledWith({ config: { systemPrompt: "my edit" } });
    expect(notifyWarning).not.toHaveBeenCalled();
  });
});

describe("useAgentExplorer — forkAgent (#251)", () => {
  beforeEach(() => {
    (notifyError as jest.Mock).mockReset();
  });

  it("forks the selected agent, selects the new one, and refreshes the list", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.forkAgent({
        agentId: "agent-a-fork",
        includeTimeline: true,
      });
    });

    expect(outcome).toEqual({ status: "created", agentId: "agent-a-fork" });
    expect(mockVenue.agents.fork).toHaveBeenCalledWith({
      sourceId: "agent-a",
      agentId: "agent-a-fork",
      includeTimeline: true,
    });
    await waitFor(() => expect(result.current.selectedAgentId).toBe("agent-a-fork"));
    await waitFor(() =>
      expect(result.current.agentList.map((a) => a.agentId)).toContain("agent-a-fork"),
    );
  });

  it("includes a non-empty config override in the fork request", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    await act(async () => {
      await result.current.forkAgent({
        agentId: "agent-a-fork",
        includeTimeline: false,
        config: { systemPrompt: "override" },
      });
    });

    expect(mockVenue.agents.fork).toHaveBeenCalledWith({
      sourceId: "agent-a",
      agentId: "agent-a-fork",
      includeTimeline: false,
      config: { systemPrompt: "override" },
    });
  });

  it("omits an empty config override rather than sending {}", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    await act(async () => {
      await result.current.forkAgent({
        agentId: "agent-a-fork",
        includeTimeline: false,
        config: {},
      });
    });

    expect(mockVenue.agents.fork).toHaveBeenCalledWith({
      sourceId: "agent-a",
      agentId: "agent-a-fork",
      includeTimeline: false,
    });
  });

  it("surfaces an error toast and leaves selection unchanged when the venue rejects the fork", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    mockVenue.agents.fork.mockRejectedValueOnce(new Error("Target agent already exists"));
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.forkAgent({
        agentId: "agent-a",
        includeTimeline: false,
      });
    });

    expect(outcome).toEqual({ status: "failed" });
    expect(notifyError).toHaveBeenCalled();
    expect(result.current.selectedAgentId).toBe("agent-a");
  });
});

describe("useAgentExplorer — live event stream (frontend#242)", () => {
  it("refreshes agent detail immediately on a live status frame, without waiting for the poll", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    let infoCalls = 0;
    mockVenue.agents.info.mockImplementation((agentId: string) => {
      infoCalls += 1;
      return Promise.resolve({
        agentId,
        status: infoCalls === 1 ? "SLEEPING" : "RUNNING",
        config: {},
      });
    });

    let emitSecondFrame!: () => void;
    const secondFrameGate = new Promise<void>((resolve) => {
      emitSecondFrame = resolve;
    });
    // The first frame is always the venue's initial status snapshot and
    // must NOT itself trigger a refetch (see use-agent-live-events.ts) — a
    // second, later frame is what should drive the live refresh.
    mockVenue.agents.events = jest.fn().mockImplementation(async function* () {
      yield { type: "status", status: "SLEEPING", seq: 0, ts: 0, agentId: "agent-a", address: "x" };
      await secondFrameGate;
      yield { type: "status", status: "RUNNING", seq: 1, ts: 1, agentId: "agent-a", address: "x" };
    });

    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail?.status).toBe("SLEEPING"));
    expect(infoCalls).toBe(1);

    await act(async () => {
      emitSecondFrame();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.selectedAgentDetail?.status).toBe("RUNNING"));
  });
});

// A host addressed to one agent (the profile page) passes { pinned: true }.
describe("useAgentExplorer — pinned to one agent", () => {
  beforeEach(() => {
    (notifyError as jest.Mock).mockReset();
  });

  it("leaves a missing agent missing instead of selecting another one", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result } = renderHook(() => useAgentExplorer("ghost", { pinned: true }));

    await waitFor(() => expect(mockVenue.agents.info).toHaveBeenCalledWith("ghost"));
    await waitFor(() => expect(result.current.detailLoading).toBe(false));

    expect(result.current.selectedAgentId).toBeNull();
    expect(result.current.selectedAgentDetail).toBeNull();
    // Absent is not an error: nothing to toast, and the host shows not-found.
    expect(result.current.detailError).toBe(false);
    expect(notifyError).not.toHaveBeenCalled();
    expect(mockVenue.agents.info).not.toHaveBeenCalledWith("agent-a");
  });

  it("does not adopt the new venue's agents when the venue is switched", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result, rerender } = renderHook(() => useAgentExplorer("agent-a", { pinned: true }));
    await waitFor(() => expect(result.current.selectedAgentDetail?.agentId).toBe("agent-a"));

    mockVenue = makeVenue("venue-b", ["agent-b"]);
    rerender();

    await waitFor(() => expect(result.current.selectedAgentDetail).toBeNull());
    await waitFor(() => expect(result.current.selectedAgentId).toBeNull());
    expect(mockVenue.agents.info).not.toHaveBeenCalledWith("agent-b");
  });

  it("never fetches the agent list, which such a host does not show", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result } = renderHook(() => useAgentExplorer("agent-a", { pinned: true }));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    await act(async () => {
      await result.current.forkAgent({ agentId: "agent-a-fork", includeTimeline: false });
    });

    expect(mockVenue.agents.list).not.toHaveBeenCalled();
  });

  it("reports the fork but leaves the selection for the host to move", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result } = renderHook(() => useAgentExplorer("agent-a", { pinned: true }));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.forkAgent({ agentId: "agent-a-fork", includeTimeline: false });
    });

    expect(outcome).toEqual({ status: "created", agentId: "agent-a-fork" });
    expect(result.current.selectedAgentId).toBe("agent-a");
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useAgentExplorer — selection", () => {
  it("selects and loads the first agent when the list is bare id strings", async () => {
    // The job-free GET /api/v1/agents returns ["agent-a"], not objects —
    // regression: .agentId of a string is undefined, which left the picker
    // with nothing selected forever.
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    mockVenue.agents.list.mockResolvedValue({ agents: ["agent-a"] });
    const { result } = renderHook(() => useAgentExplorer());

    await waitFor(() => expect(result.current.selectedAgentId).toBe("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail?.agentId).toBe("agent-a"));
  });

  it("ignores a slow detail response after another agent is selected", async () => {
    const first = deferred<unknown>();
    mockVenue = makeVenue("venue-a", ["agent-a", "agent-b"]);
    mockVenue.agents.info.mockImplementation((agentId: string) =>
      agentId === "agent-a"
        ? first.promise
        : Promise.resolve({ agentId, status: "SLEEPING", config: {} }),
    );
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(mockVenue.agents.info).toHaveBeenCalledWith("agent-a"));

    act(() => result.current.setSelectedAgentId("agent-b"));
    await waitFor(() => expect(result.current.selectedAgentDetail?.agentId).toBe("agent-b"));

    await act(async () => {
      first.resolve({ agentId: "agent-a", status: "SLEEPING", config: {} });
    });
    expect(result.current.selectedAgentDetail?.agentId).toBe("agent-b");
  });
});

describe("useAgentExplorer — runtime actions", () => {
  it("suspends and resumes a running agent around its config update", async () => {
    const calls: string[] = [];
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    mockVenue.agents.info.mockResolvedValue({ agentId: "agent-a", status: "RUNNING", config: {} });
    mockVenue.agent.mockReturnValue({
      chatSession: jest.fn(),
      suspend: jest.fn(async () => { calls.push("suspend"); }),
      update: jest.fn(async () => { calls.push("update"); }),
      resume: jest.fn(async () => { calls.push("resume"); }),
    });
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    await act(async () => {
      await result.current.updateAgentConfig({ systemPrompt: "updated while running" }, {});
    });

    expect(calls).toEqual(["suspend", "update", "resume"]);
  });

  it("leaves an agent that is not running alone around its config update", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());
    const agentHandle = mockVenue.agent.mock.results[0].value;

    await act(async () => {
      await result.current.updateAgentConfig({ systemPrompt: "my edit" }, {});
    });

    expect(agentHandle.update).toHaveBeenCalledTimes(1);
    expect(agentHandle.suspend).not.toHaveBeenCalled();
    expect(agentHandle.resume).not.toHaveBeenCalled();
  });

  it("triggers the selected agent once", async () => {
    const trigger = jest.fn().mockResolvedValue({ agentId: "agent-a", status: "SLEEPING" });
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    mockVenue.agent.mockReturnValue({ chatSession: jest.fn(), trigger });
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    await act(async () => {
      result.current.triggerAgent();
    });

    expect(trigger).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.triggering).toBe(false));
  });
});

// One session entry as venue.agents.listSessions returns it.
function sessionEntry(id: string, conversation: unknown[]) {
  return {
    id,
    metadata: { created: 1000, turns: conversation.length },
    pending: [],
    frames: [{ conversation }],
  };
}

function sessionsPage(items: unknown[]) {
  return { items, total: items.length, offset: 0, limit: 50 };
}

describe("useAgentExplorer — composer", () => {
  afterEach(() => {
    act(() => usePendingChats.setState({ pendingChats: [] }));
    jest.useRealTimers();
  });

  // chatSession/sessions are shared state, not scoped per agent — a send's
  // resolution must check the user hasn't switched agents before touching
  // them, or a slow reply for the old agent overwrites the one now on screen
  // (covia-ai/frontend#195).
  it("does not let a slow send for a previous agent disturb the newly selected agent", async () => {
    const send = deferred<unknown>();
    mockVenue = makeVenue("venue-a", ["agent-a", "agent-b"]);
    mockVenue.agents.info.mockImplementation((agentId: string) =>
      Promise.resolve({ agentId, status: "RUNNING", config: {} }),
    );
    mockVenue.agents.listSessions.mockImplementation((agentId: string) =>
      Promise.resolve(sessionsPage([
        sessionEntry(`sess-${agentId}`, [{ role: "assistant", content: `${agentId}-reply`, ts: 1 }]),
      ])),
    );
    mockVenue.agent.mockReturnValue({
      chatSession: (sessionId?: string) => ({ sessionId, send: () => send.promise }),
    });
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedSessionId).toBe("sess-agent-a"));

    act(() => result.current.setMessageText("hello"));
    act(() => result.current.send());
    act(() => result.current.setSelectedAgentId("agent-b"));
    await waitFor(() => expect(result.current.selectedSessionId).toBe("sess-agent-b"));

    await act(async () => {
      send.resolve({ response: "ok", sessionId: "sess-agent-a" });
    });

    expect(result.current.selectedSessionId).toBe("sess-agent-b");
    expect(result.current.currentSession?.conversation).toEqual([
      expect.objectContaining({ content: "agent-b-reply" }),
    ]);
  });

  it("drops the draft when another agent is selected, so it cannot be sent to them", async () => {
    mockVenue = makeVenue("venue-a", ["agent-a", "agent-b"]);
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.selectedAgentDetail).not.toBeNull());

    act(() => result.current.setMessageText("for agent-a only"));
    act(() => result.current.setSelectedAgentId("agent-b"));

    await waitFor(() => expect(result.current.selectedAgentDetail?.agentId).toBe("agent-b"));
    expect(result.current.messageText).toBe("");
  });

  it("keeps echoing a repeated message until the venue records the new turn", async () => {
    jest.useFakeTimers();
    const earlier = [
      { role: "user", content: "yes", ts: 1 },
      { role: "assistant", content: "Shall I continue?", ts: 2 },
    ];
    mockVenue = makeVenue("venue-a", ["agent-a"]);
    mockVenue.agents.info.mockResolvedValue({ agentId: "agent-a", status: "RUNNING", config: {} });
    mockVenue.agents.listSessions.mockResolvedValue(sessionsPage([sessionEntry("sess-1", earlier)]));
    // A send that never settles — the agent is still thinking.
    mockVenue.agent.mockReturnValue({
      chatSession: (sessionId?: string) => ({ sessionId, send: () => new Promise(() => {}) }),
    });
    const { result } = renderHook(() => useAgentExplorer("agent-a"));
    await waitFor(() => expect(result.current.currentSession?.conversation).toHaveLength(2));

    act(() => result.current.setMessageText("yes"));
    act(() => result.current.send());

    // The identical earlier "yes" is not this message.
    expect(result.current.pendingChat?.text).toBe("yes");
    expect(result.current.echoAlreadyRecorded).toBe(false);

    mockVenue.agents.listSessions.mockResolvedValue(
      sessionsPage([sessionEntry("sess-1", [...earlier, { role: "user", content: "yes", ts: 3 }])]),
    );
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });

    await waitFor(() => expect(result.current.echoAlreadyRecorded).toBe(true));
  });
});
