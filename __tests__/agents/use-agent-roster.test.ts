import { act, renderHook, waitFor } from "@testing-library/react";

import { useAgentRoster } from "@/hooks/use-agent-roster";

function sessionPage(items: any[], total = items.length) {
  return { items, total, offset: 0, limit: 50 };
}

function makeVenue(overrides: any = {}) {
  return {
    venueId: "venue-1",
    agents: {
      list: jest.fn().mockResolvedValue({ agents: [{ agentId: "alpha", status: "SLEEPING" }] }),
      info: jest.fn().mockResolvedValue({
        agentId: "alpha",
        status: "SLEEPING",
        tasks: 0,
        config: { model: "claude-opus-5" },
        timelineLength: 3,
      }),
      listSessions: jest.fn().mockResolvedValue(sessionPage([])),
      ...overrides.agents,
    },
  } as any;
}

describe("useAgentRoster", () => {
  beforeEach(() => jest.clearAllMocks());

  // The venue store has not rehydrated on first mount, so the hook is called
  // with null before the venue arrives. Leaving `loading` false through the
  // first list round-trip made /agents flash its "no agents yet" empty state.
  it("returns to loading when a venue arrives after a null first render", async () => {
    const venue = makeVenue();
    const { result, rerender } = renderHook(({ v }: { v: any }) => useAgentRoster(v), {
      initialProps: { v: null as any },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.counts.total).toBe(0);

    rerender({ v: venue });
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roster.map((a) => a.agentId)).toEqual(["alpha"]);
  });

  // A venue switch previously kept the old venue's agents on screen. Their
  // cards build the action handle from the new venue, so Trigger / Suspend /
  // Delete would have fired against the wrong venue with a stale agent id.
  it("clears the roster immediately when the venue changes", async () => {
    const first = makeVenue();
    const second = makeVenue({
      agents: {
        list: jest.fn().mockResolvedValue({ agents: [{ agentId: "beta", status: "RUNNING" }] }),
        info: jest.fn().mockResolvedValue({ agentId: "beta", status: "RUNNING" }),
        listSessions: jest.fn().mockResolvedValue(sessionPage([])),
      },
    });

    const { result, rerender } = renderHook(({ v }: { v: any }) => useAgentRoster(v), {
      initialProps: { v: first },
    });
    await waitFor(() => expect(result.current.roster).toHaveLength(1));
    expect(result.current.roster[0].agentId).toBe("alpha");

    rerender({ v: second });
    expect(result.current.roster).toHaveLength(0);

    await waitFor(() => expect(result.current.roster.map((a) => a.agentId)).toEqual(["beta"]));
  });

  // One rejected `info` used to drop that agent's key from the map entirely,
  // blanking the card until the agent set changed or the user refreshed.
  it("keeps the last good info when a later info call fails", async () => {
    const info = jest
      .fn()
      .mockResolvedValueOnce({
        agentId: "alpha",
        status: "SLEEPING",
        config: { model: "claude-opus-5" },
        timelineLength: 3,
      })
      .mockRejectedValue(new Error("network blip"));
    const venue = makeVenue({ agents: { info } });

    const { result } = renderHook(() => useAgentRoster(venue));
    await waitFor(() => expect(result.current.roster[0]?.config).toBeDefined());
    expect(result.current.roster[0].runs).toBe(3);

    act(() => result.current.refresh());

    await waitFor(() => expect(info).toHaveBeenCalledTimes(2));
    expect(result.current.roster[0].config).toEqual({ model: "claude-opus-5" });
    expect(result.current.roster[0].runs).toBe(3);
  });

  // Taking only the first page read an arbitrary subset, since the venue
  // guarantees no ordering — an agent active a minute ago could read "3d ago".
  it("pages through every session when there are more than one page", async () => {
    const recent = Date.now() - 60_000;
    const listSessions = jest
      .fn()
      .mockResolvedValueOnce(
        sessionPage(
          Array.from({ length: 50 }, () => ({ metadata: { lastActivity: 1_000_000 }, pending: [] })),
          51,
        ),
      )
      .mockResolvedValueOnce(
        sessionPage([{ metadata: { lastActivity: recent }, pending: [{}, {}] }], 51),
      );
    const venue = makeVenue({ agents: { listSessions } });

    const { result } = renderHook(() => useAgentRoster(venue));

    await waitFor(() => expect(result.current.roster[0]?.lastActive).toBe(recent));
    expect(listSessions).toHaveBeenCalledTimes(2);
    expect(listSessions.mock.calls[1][1]).toEqual({ offset: 50, limit: 50 });
    expect(result.current.roster[0].queued).toBe(2);
  });

  it("skips session reads for terminated agents", async () => {
    const listSessions = jest.fn().mockResolvedValue(sessionPage([]));
    const venue = makeVenue({
      agents: {
        list: jest.fn().mockResolvedValue({ agents: [{ agentId: "gone", status: "TERMINATED" }] }),
        info: jest.fn().mockResolvedValue({ agentId: "gone", status: "TERMINATED" }),
        listSessions,
      },
    });

    const { result } = renderHook(() => useAgentRoster(venue));
    await waitFor(() => expect(result.current.counts.terminated).toBe(1));
    expect(listSessions).not.toHaveBeenCalled();
  });
});
