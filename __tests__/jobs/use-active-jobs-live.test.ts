import { renderHook } from "@testing-library/react";
import { useActiveJobsLive } from "@/hooks/use-active-jobs-live";

// Venue refs are stable (defined once) — the real consumer's venue is memoized
// too.

// A stream that stays open and silent until its signal aborts — a PAUSED job.
function quietVenue() {
  const signals: Record<string, AbortSignal> = {};
  const stream = jest.fn((id: string, options?: { signal?: AbortSignal }) => {
    signals[id] = options!.signal!;
    return (async function* () {
      await new Promise<void>((resolve) => options!.signal!.addEventListener("abort", () => resolve()));
    })() as AsyncGenerator<{ json: () => unknown }>;
  });
  return { venue: { jobs: { stream } }, stream, signals };
}

describe("useActiveJobsLive", () => {
  it("opens no streams and returns an empty overlay when there are no active jobs", () => {
    const stream = jest.fn();
    const venue = { jobs: { stream } };
    const { result } = renderHook(() => useActiveJobsLive(venue, []));
    expect(result.current).toEqual({});
    expect(stream).not.toHaveBeenCalled();
  });

  it("no-ops without a venue", () => {
    const { result } = renderHook(() => useActiveJobsLive(null, ["j1"]));
    expect(result.current).toEqual({});
  });

  it("closes a quiet stream on unmount by aborting it, not by waiting for its next event", () => {
    const { venue, signals } = quietVenue();
    const { unmount } = renderHook(() => useActiveJobsLive(venue, ["j1"]));
    expect(signals.j1.aborted).toBe(false);

    unmount();
    expect(signals.j1.aborted).toBe(true);
  });

  it("opens and closes only the streams that differ when the active set changes", () => {
    const { venue, stream, signals } = quietVenue();
    const { rerender } = renderHook(({ ids }) => useActiveJobsLive(venue, ids), {
      initialProps: { ids: ["j1", "j2"] },
    });
    expect(stream).toHaveBeenCalledTimes(2);

    rerender({ ids: ["j2", "j3"] });

    expect(stream).toHaveBeenCalledTimes(3); // j3 only — j2's connection is kept
    expect(signals.j1.aborted).toBe(true);
    expect(signals.j2.aborted).toBe(false);
  });
});
