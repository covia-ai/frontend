import { act, renderHook, waitFor } from "@testing-library/react";
import { useWorkspaceExplorer } from "@/hooks/use-workspace-explorer";

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

let mockAuthenticated = false;
let mockVenue: any;

jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock("@/hooks/use-auth", () => ({
  useIsAuthenticated: () => mockAuthenticated,
}));
jest.mock("sonner", () => ({
  toast: jest.fn(),
}));

function createVenue() {
  return {
    venueId: "venue-1",
    workspace: {
      list: jest.fn().mockResolvedValue({
        exists: true,
        type: "map",
        keys: ["root"],
      }),
      read: jest.fn(),
      write: jest.fn(),
      append: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("useWorkspaceExplorer", () => {
  beforeEach(() => {
    mockAuthenticated = false;
    mockVenue = createVenue();
  });

  it("keeps the newest directory listing when an older request finishes last", async () => {
    const oldListing = deferred<any>();
    mockVenue.workspace.list.mockImplementation((path: string) => {
      if (path === "old") return oldListing.promise;
      if (path === "new") {
        return Promise.resolve({
          exists: true,
          type: "map",
          keys: ["new-value"],
        });
      }
      return Promise.resolve({
        exists: true,
        type: "map",
        keys: ["root"],
      });
    });
    const { result } = renderHook(() => useWorkspaceExplorer());

    await waitFor(() => expect(result.current.entries).toEqual([{ key: "root" }]));
    act(() => result.current.navigateTo("old"));
    act(() => result.current.navigateTo("new"));
    await waitFor(() =>
      expect(result.current.entries).toEqual([{ key: "new-value" }]),
    );

    await act(async () => {
      oldListing.resolve({
        exists: true,
        type: "map",
        keys: ["stale-value"],
      });
      await oldListing.promise;
    });
    expect(result.current.entries).toEqual([{ key: "new-value" }]);
    expect(result.current.currentPath).toBe("new");
  });

  it("keeps the newest selected value when an older read finishes last", async () => {
    const oldRead = deferred<any>();
    mockVenue.workspace.read.mockImplementation((path: string) => {
      if (path === "old") return oldRead.promise;
      return Promise.resolve({ exists: true, value: "new-value" });
    });
    const { result } = renderHook(() => useWorkspaceExplorer());

    await waitFor(() => expect(result.current.listingLoading).toBe(false));
    act(() => result.current.selectPath("old"));
    act(() => result.current.selectPath("new"));
    await waitFor(() => expect(result.current.selectedValue.value).toBe("new-value"));

    await act(async () => {
      oldRead.resolve({ exists: true, value: "stale-value" });
      await oldRead.promise;
    });
    expect(result.current.selectedPath).toBe("new");
    expect(result.current.selectedValue.value).toBe("new-value");
  });

  it("does not expose mutations through hook calls for an anonymous venue", async () => {
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    await act(async () => {
      expect(await result.current.create("key", '{"value":1}')).toBe(false);
      expect(await result.current.append("value")).toBe(false);
      expect(await result.current.save()).toBe(false);
      expect(await result.current.remove()).toBe(false);
    });

    expect(mockVenue.workspace.write).not.toHaveBeenCalled();
    expect(mockVenue.workspace.append).not.toHaveBeenCalled();
    expect(mockVenue.workspace.delete).not.toHaveBeenCalled();
  });

  it("does not refresh an old directory when its create completes after navigation", async () => {
    mockAuthenticated = true;
    const write = deferred<any>();
    mockVenue.workspace.write.mockReturnValue(write.promise);
    mockVenue.workspace.list.mockResolvedValue({
      exists: true,
      type: "map",
      keys: [],
    });
    const { result } = renderHook(() => useWorkspaceExplorer());

    await waitFor(() => expect(result.current.listingLoading).toBe(false));
    let creation!: Promise<boolean>;
    act(() => {
      creation = result.current.create("key", "value");
    });
    act(() => result.current.navigateTo("other"));
    await waitFor(() =>
      expect(mockVenue.workspace.list).toHaveBeenLastCalledWith("other"),
    );

    await act(async () => {
      write.resolve({});
      await creation;
    });

    expect(mockVenue.workspace.write).toHaveBeenCalledWith("key", "value");
    expect(mockVenue.workspace.list.mock.calls.map(([path]: [string]) => path)).toEqual([
      "/",
      "other",
    ]);
  });
});
