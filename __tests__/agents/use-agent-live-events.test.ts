import { act, renderHook, waitFor } from "@testing-library/react";
import { useAgentLiveEvents } from "@/hooks/use-agent-live-events";

function makeVenue(eventsImpl: (agentId: string, options: { signal?: AbortSignal }) => AsyncGenerator<any>) {
  return { agents: { events: jest.fn().mockImplementation(eventsImpl) } } as any;
}

describe("useAgentLiveEvents", () => {
  it("returns the idle default when there is no venue or agentId", () => {
    const { result } = renderHook(() => useAgentLiveEvents(null, null));
    expect(result.current).toEqual({ live: false, detailVersion: 0, activity: null });
  });

  it("sets live on the first frame without bumping detailVersion", async () => {
    const venue = makeVenue(async function* () {
      yield { type: "status", status: "SLEEPING" };
      await new Promise(() => {}); // keep the stream open
    });

    const { result } = renderHook(() => useAgentLiveEvents(venue, "a1"));

    await waitFor(() => expect(result.current.live).toBe(true));
    expect(result.current.detailVersion).toBe(0);
  });

  it("bumps detailVersion on status/run:end/cycle:end frames after the first", async () => {
    let advance!: () => void;
    let gate = new Promise<void>((resolve) => {
      advance = resolve;
    });
    const venue = makeVenue(async function* () {
      yield { type: "status", status: "SLEEPING" };
      await gate;
      yield { type: "run:end", run: 1, status: "SLEEPING", cycles: 1 };
      gate = new Promise<void>((resolve) => {
        advance = resolve;
      });
      await gate;
      yield { type: "cycle:end", run: 1, cycle: 2, ms: 5 };
      await new Promise(() => {});
    });

    const { result } = renderHook(() => useAgentLiveEvents(venue, "a1"));
    await waitFor(() => expect(result.current.live).toBe(true));
    expect(result.current.detailVersion).toBe(0);

    await act(async () => {
      advance();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.detailVersion).toBe(1));

    await act(async () => {
      advance();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.detailVersion).toBe(2));
  });

  it("toggles activity for tool and inference frames, and clears it on run:end", async () => {
    let advance!: () => void;
    let gate = new Promise<void>((resolve) => {
      advance = resolve;
    });
    const next = () => {
      gate = new Promise<void>((resolve) => {
        advance = resolve;
      });
    };
    const venue = makeVenue(async function* () {
      yield { type: "status", status: "RUNNING" };
      await gate; next();
      yield { type: "inference:start", op: "chat", messages: [], tools: [], bytes: 0, budget: {} };
      await gate; next();
      yield { type: "inference:end", ms: 5 };
      await gate; next();
      yield { type: "tool:start", id: "t1", name: "web-search", detail: { input: {} } };
      await gate; next();
      yield { type: "tool:result", id: "t1", name: "web-search", ms: 5, detail: { result: {} } };
      await gate; next();
      yield { type: "run:end", run: 1, status: "RUNNING", cycles: 1 };
      await new Promise(() => {});
    });

    const { result } = renderHook(() => useAgentLiveEvents(venue, "a1"));
    await waitFor(() => expect(result.current.live).toBe(true));
    expect(result.current.activity).toBeNull();

    await act(async () => {
      advance();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.activity).toEqual({ kind: "inference" }));

    await act(async () => {
      advance();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.activity).toBeNull());

    await act(async () => {
      advance();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.activity).toEqual({ kind: "tool", label: "web-search" }));

    await act(async () => {
      advance();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.activity).toBeNull());

    await act(async () => {
      advance();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.detailVersion).toBeGreaterThan(0));
    expect(result.current.activity).toBeNull();
  });

  it("leaves live false when the stream throws (e.g. UnsupportedVenueFeatureError)", async () => {
    const venue = makeVenue(async function* () {
      throw new Error("not supported on this venue");
    });

    const { result } = renderHook(() => useAgentLiveEvents(venue, "a1"));

    await waitFor(() => expect(venue.agents.events).toHaveBeenCalled());
    expect(result.current.live).toBe(false);
  });

  it("aborts the previous stream's signal when the agent id changes", async () => {
    const signals: AbortSignal[] = [];
    const venue = makeVenue(async function* (_agentId: string, options: { signal?: AbortSignal }) {
      signals.push(options.signal!);
      yield { type: "status", status: "SLEEPING" };
      await new Promise(() => {});
    });

    const { rerender } = renderHook(
      ({ agentId }) => useAgentLiveEvents(venue, agentId),
      { initialProps: { agentId: "a1" } },
    );
    await waitFor(() => expect(signals).toHaveLength(1));

    rerender({ agentId: "a2" });
    await waitFor(() => expect(signals).toHaveLength(2));

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});
