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
