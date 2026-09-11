import { renderHook } from "@testing-library/react";

import { MAX_LIVE_STREAMS, useLiveStreamSlots } from "@/hooks/use-live-stream-slots";

const running = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ agentId: `run-${i}`, status: "RUNNING" }));

describe("useLiveStreamSlots", () => {
  it("grants a slot to each running agent below the cap", () => {
    const { result } = renderHook(() => useLiveStreamSlots(running(3)));

    expect(result.current.size).toBe(3);
    expect(result.current.has("run-0")).toBe(true);
  });

  // Each slot holds a connection open, and browsers allow about six per origin
  // on HTTP/1.1 — beyond the cap the roster's own poll starts queueing.
  it("never grants more than the cap", () => {
    const { result } = renderHook(() => useLiveStreamSlots(running(12)));

    expect(result.current.size).toBe(MAX_LIVE_STREAMS);
  });

  // The 3s membership poll surfaces RUNNING↔SLEEPING flips. Dropping the slot
  // on each flip made a busy agent connect and abort a stream every few
  // seconds, so a carried slot keeps the stream up across the dip.
  it("carries a slot across a running-to-sleeping flip", () => {
    const { result, rerender } = renderHook(
      ({ agents }: { agents: any[] }) => useLiveStreamSlots(agents),
      { initialProps: { agents: [{ agentId: "alpha", status: "RUNNING" }] } },
    );
    expect(result.current.has("alpha")).toBe(true);

    rerender({ agents: [{ agentId: "alpha", status: "SLEEPING" }] });
    expect(result.current.has("alpha")).toBe(true);
  });

  it("gives running agents priority over carried ones when full", () => {
    const { result, rerender } = renderHook(
      ({ agents }: { agents: any[] }) => useLiveStreamSlots(agents, 1),
      { initialProps: { agents: [{ agentId: "alpha", status: "RUNNING" }] } },
    );
    expect(result.current.has("alpha")).toBe(true);

    rerender({
      agents: [
        { agentId: "alpha", status: "SLEEPING" },
        { agentId: "beta", status: "RUNNING" },
      ],
    });

    expect(result.current.has("beta")).toBe(true);
    expect(result.current.has("alpha")).toBe(false);
  });

  it("releases a slot when the agent leaves the roster or terminates", () => {
    const { result, rerender } = renderHook(
      ({ agents }: { agents: any[] }) => useLiveStreamSlots(agents),
      { initialProps: { agents: [{ agentId: "alpha", status: "RUNNING" }] } },
    );
    expect(result.current.has("alpha")).toBe(true);

    rerender({ agents: [{ agentId: "alpha", status: "TERMINATED" }] });
    expect(result.current.has("alpha")).toBe(false);

    rerender({ agents: [] });
    expect(result.current.size).toBe(0);
  });
});
