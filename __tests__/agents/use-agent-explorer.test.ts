import { act, renderHook, waitFor } from "@testing-library/react";
import { NotFoundError } from "@covia/covia-sdk";
import { useAgentExplorer } from "@/hooks/use-agent-explorer";

let mockVenue: any;

jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: err, jobHref: undefined }),
}));

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
      outcome = await result.current.updateAgentConfig({ systemPrompt: "my edit" });
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
      outcome = await result.current.updateAgentConfig({ systemPrompt: "my edit" });
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
