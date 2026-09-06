import { renderHook } from "@testing-library/react";
import { useActiveJobsLive } from "@/hooks/use-active-jobs-live";

// The streaming path (SSE per active job → live status) is verified live in the
// browser; here we pin the cheap, deterministic guards. Venue refs are stable
// (defined once) — the real consumer's venue is memoized too.
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
});
