import { act, renderHook, waitFor } from "@testing-library/react";
import { useLatestQuery } from "@/hooks/use-latest-query";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useLatestQuery", () => {
  it("allows only the newest request to publish data or loading state", async () => {
    const first = deferred<string[]>();
    const second = deferred<string[]>();
    const { result } = renderHook(() => useLatestQuery<string[]>([]));

    act(() => {
      void result.current.run(async () => first.promise);
      void result.current.run(async () => second.promise);
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      second.resolve(["new"]);
      await second.promise;
    });
    await waitFor(() => expect(result.current.data).toEqual(["new"]));
    expect(result.current.loading).toBe(false);

    await act(async () => {
      first.resolve(["stale"]);
      await first.promise;
    });
    expect(result.current.data).toEqual(["new"]);
    expect(result.current.loading).toBe(false);
  });

  it("supports incremental results without surrendering request ownership", async () => {
    const completion = deferred<string[]>();
    const { result } = renderHook(() =>
      useLatestQuery<string[]>([], { initialLoading: true }),
    );

    act(() => {
      void result.current.run(async (publish) => {
        publish(["partial"], { loading: false });
        return completion.promise;
      });
    });
    await waitFor(() => expect(result.current.data).toEqual(["partial"]));
    expect(result.current.loading).toBe(false);

    await act(async () => {
      completion.resolve(["complete"]);
      await completion.promise;
    });
    expect(result.current.data).toEqual(["complete"]);
  });

  it("keeps prior data while refreshing unless clear is requested", async () => {
    const refresh = deferred<string[]>();
    const { result } = renderHook(() => useLatestQuery(["existing"]));

    act(() => {
      void result.current.run(async () => refresh.promise);
    });
    expect(result.current.data).toEqual(["existing"]);

    act(() => {
      result.current.reset(["reset"]);
    });
    expect(result.current).toMatchObject({
      data: ["reset"],
      loading: false,
      error: null,
    });

    await act(async () => {
      refresh.resolve(["stale"]);
      await refresh.promise;
    });
    expect(result.current.data).toEqual(["reset"]);
  });
});

describe("useLatestQuery settled", () => {
  it("is false before any answer, so a placeholder zero is not mistaken for one", () => {
    const { result } = renderHook(() => useLatestQuery({ total: 0 }));
    expect(result.current.settled).toBe(false);
    expect(result.current.data).toEqual({ total: 0 });
  });

  it("stays false while the first read is in flight", async () => {
    const first = deferred<{ total: number }>();
    const { result } = renderHook(() => useLatestQuery({ total: 0 }));

    act(() => { void result.current.run(async () => first.promise); });
    expect(result.current.loading).toBe(true);
    expect(result.current.settled).toBe(false);

    await act(async () => { first.resolve({ total: 311 }); await first.promise; });
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.data).toEqual({ total: 311 });
  });

  it("settles on a genuinely empty answer", async () => {
    const { result } = renderHook(() => useLatestQuery({ total: 0 }));
    await act(async () => { await result.current.run(async () => ({ total: 0 })); });
    expect(result.current.settled).toBe(true);
  });

  it("settles on an incremental publish", async () => {
    const done = deferred<string[]>();
    const { result } = renderHook(() => useLatestQuery<string[]>([]));

    act(() => {
      void result.current.run(async (publish) => {
        publish(["partial"]);
        return done.promise;
      });
    });
    await waitFor(() => expect(result.current.settled).toBe(true));
    await act(async () => { done.resolve(["final"]); await done.promise; });
  });

  it("does not settle on a first-load failure — the error shows, not a zero", async () => {
    const { result } = renderHook(() => useLatestQuery({ total: 0 }));
    await act(async () => {
      await result.current.run(async () => { throw new Error("venue unreachable"); });
    });
    expect(result.current.error).toBe("venue unreachable");
    expect(result.current.settled).toBe(false);
  });

  it("keeps a previous answer through a refresh, and drops it when cleared", async () => {
    const { result } = renderHook(() => useLatestQuery({ total: 0 }));
    await act(async () => { await result.current.run(async () => ({ total: 311 })); });
    expect(result.current.settled).toBe(true);

    const refresh = deferred<{ total: number }>();
    act(() => { void result.current.run(async () => refresh.promise); });
    expect(result.current.settled).toBe(true); // stale-while-refresh keeps the answer
    await act(async () => { refresh.resolve({ total: 312 }); await refresh.promise; });

    const cleared = deferred<{ total: number }>();
    act(() => { void result.current.run(async () => cleared.promise, { clear: true }); });
    expect(result.current.settled).toBe(false);
    await act(async () => { cleared.resolve({ total: 5 }); await cleared.promise; });
  });

  it("unsettles on reset, and settles when reset supplies data", async () => {
    const { result } = renderHook(() => useLatestQuery({ total: 0 }));
    await act(async () => { await result.current.run(async () => ({ total: 311 })); });

    act(() => { result.current.reset(); });
    expect(result.current.settled).toBe(false);

    act(() => { result.current.reset({ total: 7 }); });
    expect(result.current.settled).toBe(true);
  });
});
