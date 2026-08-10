import { act, renderHook, waitFor } from "@testing-library/react";
import { ReadableStream } from "stream/web";
import {
  readTextStream,
  useAssetTextContent,
  useRemoteTextContent,
} from "@/hooks/use-asset-text-content";
import { useAssetDetails } from "@/hooks/use-asset-details";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function textStream(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("asset content lifecycle", () => {
  it("decodes split multibyte characters without corrupting them", async () => {
    const bytes = new TextEncoder().encode("A£B");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 2));
        controller.enqueue(bytes.slice(2));
        controller.close();
      },
    });

    await expect(readTextStream(stream as any)).resolves.toBe("A£B");
  });

  it("does not fetch until enabled and ignores an older asset response", async () => {
    const oldContent = deferred<ReadableStream<Uint8Array>>();
    const venue = {
      assets: {
        getContent: jest.fn((assetId: string) =>
          assetId === "old"
            ? oldContent.promise
            : Promise.resolve(textStream("new")),
        ),
      },
    } as any;
    const { result, rerender } = renderHook(
      ({ assetId, enabled }) =>
        useAssetTextContent(venue, assetId, enabled),
      { initialProps: { assetId: "old", enabled: false } },
    );

    expect(venue.assets.getContent).not.toHaveBeenCalled();
    rerender({ assetId: "old", enabled: true });
    expect(venue.assets.getContent).toHaveBeenCalledWith("old");
    rerender({ assetId: "new", enabled: true });
    await waitFor(() => expect(result.current.text).toBe("new"));

    await act(async () => {
      oldContent.resolve(textStream("stale"));
      await oldContent.promise;
    });
    expect(result.current.text).toBe("new");
  });

  it("cancels an acquired stream reader when the preview closes", async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    const reader = {
      read: jest.fn(() => new Promise(() => undefined)),
      cancel,
    };
    const venue = {
      assets: {
        getContent: jest.fn().mockResolvedValue({
          getReader: () => reader,
        }),
      },
    } as any;
    const { rerender } = renderHook(
      ({ enabled }) => useAssetTextContent(venue, "asset", enabled),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => expect(reader.read).toHaveBeenCalled());
    rerender({ enabled: false });
    expect(cancel).toHaveBeenCalled();
  });

  it("aborts a remote text request when its consumer closes", async () => {
    let requestSignal: AbortSignal | undefined;
    const originalFetch = global.fetch;
    global.fetch = jest.fn((_url, init) => {
      requestSignal = init?.signal as AbortSignal;
      return new Promise(() => undefined);
    }) as jest.Mock;
    const { rerender } = renderHook(
      ({ enabled }) => useRemoteTextContent("/content", enabled),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => expect(requestSignal).toBeDefined());
    rerender({ enabled: false });
    expect(requestSignal?.aborted).toBe(true);
    global.fetch = originalFetch;
  });

  it("ignores a remote response even if its fetch implementation resolves after abort", async () => {
    const oldResponse = deferred<any>();
    const originalFetch = global.fetch;
    global.fetch = jest.fn((url: string | URL | Request) =>
      String(url).includes("old")
        ? oldResponse.promise
        : Promise.resolve({
            ok: true,
            text: () => Promise.resolve("new"),
          }),
    ) as jest.Mock;
    const { result, rerender } = renderHook(
      ({ url }) => useRemoteTextContent(url, true),
      { initialProps: { url: "/old" } },
    );

    rerender({ url: "/new" });
    await waitFor(() => expect(result.current.text).toBe("new"));
    await act(async () => {
      oldResponse.resolve({
        ok: true,
        text: () => Promise.resolve("stale"),
      });
      await oldResponse.promise;
    });
    expect(result.current.text).toBe("new");
    global.fetch = originalFetch;
  });
});

describe("asset detail lifecycle", () => {
  it("does not let an old asset response replace the current route asset", async () => {
    const oldAsset = deferred<any>();
    const venue = {
      getAsset: jest.fn((assetId: string) =>
        assetId === "old"
          ? oldAsset.promise
          : Promise.resolve({ id: "new", metadata: { name: "New" } }),
      ),
    } as any;
    const { result, rerender } = renderHook(
      ({ assetId }) => useAssetDetails(venue, assetId),
      { initialProps: { assetId: "old" } },
    );

    rerender({ assetId: "new" });
    await waitFor(() => expect(result.current.asset?.id).toBe("new"));
    await act(async () => {
      oldAsset.resolve({ id: "old", metadata: { name: "Old" } });
      await oldAsset.promise;
    });
    expect(result.current.asset?.id).toBe("new");
  });

  // covia-ai/frontend#201: AssetViewer used to show a generic technical error
  // for a missing asset instead of the friendly not-found message
  // OperationViewer already had — flatten AssetNotFoundError's "Asset not
  // found: <id>" message into a notFound flag instead of a raw error string.
  it("flags a not-found error instead of surfacing it as a generic error", async () => {
    const venue = {
      getAsset: jest.fn().mockRejectedValue(new Error("Asset not found: abc123")),
    } as any;
    const { result } = renderHook(
      ({ assetId }) => useAssetDetails(venue, assetId),
      { initialProps: { assetId: "abc123" } },
    );

    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.error).toBeNull();
  });

  it("surfaces a real failure as an error, not notFound", async () => {
    const venue = {
      getAsset: jest.fn().mockRejectedValue(new Error("Network error")),
    } as any;
    const { result } = renderHook(
      ({ assetId }) => useAssetDetails(venue, assetId),
      { initialProps: { assetId: "abc123" } },
    );

    await waitFor(() => expect(result.current.error).toBe("Network error"));
    expect(result.current.notFound).toBe(false);
  });
});
