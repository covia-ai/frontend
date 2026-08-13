import { renderHook, waitFor } from "@testing-library/react";
import { useOperationAsset } from "@/hooks/use-operation-asset";

jest.mock("@/lib/operations-catalog", () => ({
  resolveOperationByAddress: jest.fn(),
}));
import { resolveOperationByAddress } from "@/lib/operations-catalog";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useOperationAsset loading state", () => {
  beforeEach(() => {
    (resolveOperationByAddress as jest.Mock).mockReset();
  });


  // covia-ai/frontend#201: OperationViewer previously had no loading
  // indicator at all while resolving — asset/notFound/errorMessage all fell
  // through to their empty defaults, rendering nothing during the fetch.
  it("starts loading, then resolves once the asset arrives", async () => {
    const pending = deferred<any>();
    (resolveOperationByAddress as jest.Mock).mockReturnValue(pending.promise);
    const venue = {} as any;

    const { result } = renderHook(() => useOperationAsset(venue, "v/ops/test"));
    expect(result.current.loading).toBe(true);

    pending.resolve({ id: "v/ops/test", metadata: { name: "Test" } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.asset?.id).toBe("v/ops/test");
  });

  it("stops loading on a not-found error", async () => {
    const pending = deferred<any>();
    (resolveOperationByAddress as jest.Mock).mockReturnValue(pending.promise);
    const venue = {} as any;

    const { result } = renderHook(() => useOperationAsset(venue, "v/ops/missing"));
    expect(result.current.loading).toBe(true);

    pending.reject(new Error("404 not found"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notFound).toBe(true);
  });

  it("stays loading while there is no venue to resolve against yet", () => {
    const { result } = renderHook(() => useOperationAsset(undefined, "v/ops/test"));
    expect(result.current.loading).toBe(true);
    expect(resolveOperationByAddress).not.toHaveBeenCalled();
  });
});
