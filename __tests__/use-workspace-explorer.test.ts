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
jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
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
      delete: jest.fn(),
    },
  };
}

describe("useWorkspaceExplorer", () => {
  beforeEach(() => {
    mockAuthenticated = false;
    mockVenue = createVenue();
  });

  it("auto-selects the first entry on initial load, without an extra click", async () => {
    const { result } = renderHook(() => useWorkspaceExplorer());

    await waitFor(() => expect(result.current.listingLoading).toBe(false));
    expect(result.current.selectedPath).toBe("root");
  });

  it("auto-selects the first entry after navigating into a directory", async () => {
    mockVenue.workspace.list.mockImplementation((path: string) => {
      if (path === "w") {
        return Promise.resolve({ exists: true, type: "map", keys: ["alpha", "beta"] });
      }
      return Promise.resolve({ exists: true, type: "map", keys: ["root"] });
    });
    mockVenue.workspace.read.mockResolvedValue({ exists: true, value: "v" });
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    act(() => result.current.navigateTo("w"));
    await waitFor(() => expect(result.current.selectedPath).toBe("w/alpha"));

    expect(mockVenue.workspace.read).toHaveBeenCalledWith("w/alpha");
  });

  it("does not auto-select into an empty directory", async () => {
    mockVenue.workspace.list.mockImplementation((path: string) => {
      if (path === "empty") {
        return Promise.resolve({ exists: true, type: "map", keys: [] });
      }
      return Promise.resolve({ exists: true, type: "map", keys: ["root"] });
    });
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    act(() => result.current.navigateTo("empty"));
    await waitFor(() => expect(result.current.currentPath).toBe("empty"));
    expect(result.current.selectedPath).toBeNull();
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
      expect(await result.current.save()).toBe(false);
      expect(await result.current.remove()).toBe(false);
    });

    expect(mockVenue.workspace.write).not.toHaveBeenCalled();
    expect(mockVenue.workspace.delete).not.toHaveBeenCalled();
  });

  it("blocks save, delete, and create outside the \"w\" namespace even when authenticated", async () => {
    mockAuthenticated = true;
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: "v",
      type: "string",
    });
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    act(() => result.current.selectPath("j/some-job-id"));
    await waitFor(() => expect(result.current.valueLoading).toBe(false));

    await act(async () => {
      expect(await result.current.save()).toBe(false);
      expect(await result.current.remove()).toBe(false);
      expect(await result.current.create("key", "value")).toBe(false);
    });

    expect(mockVenue.workspace.write).not.toHaveBeenCalled();
    expect(mockVenue.workspace.delete).not.toHaveBeenCalled();
  });

  it("blocks save and delete on the bare \"w\" root itself (venue requires namespace + key)", async () => {
    mockAuthenticated = true;
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: { daily: {} },
      type: "object",
    });
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    act(() => result.current.selectPath("w"));
    await waitFor(() => expect(result.current.valueLoading).toBe(false));

    await act(async () => {
      expect(await result.current.save()).toBe(false);
      expect(await result.current.remove()).toBe(false);
    });

    expect(mockVenue.workspace.write).not.toHaveBeenCalled();
    expect(mockVenue.workspace.delete).not.toHaveBeenCalled();
  });

  it("allows save under the \"w\" namespace when authenticated", async () => {
    mockAuthenticated = true;
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: "v",
      type: "string",
    });
    mockVenue.workspace.write.mockResolvedValue({});
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    act(() => result.current.selectPath("w/notes"));
    await waitFor(() => expect(result.current.valueLoading).toBe(false));

    await act(async () => {
      expect(await result.current.save()).toBe(true);
    });

    expect(mockVenue.workspace.write).toHaveBeenCalledWith("w/notes", "v");
  });

  it("does not refresh an old directory when its create completes after navigation", async () => {
    // "w" is the only namespace create() will act on — see isMutableWorkspacePath.
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
    act(() => result.current.navigateTo("w"));
    await waitFor(() =>
      expect(mockVenue.workspace.list).toHaveBeenLastCalledWith("w"),
    );

    let creation!: Promise<boolean>;
    act(() => {
      creation = result.current.create("key", "value");
    });
    act(() => result.current.navigateTo("w/other"));
    await waitFor(() =>
      expect(mockVenue.workspace.list).toHaveBeenLastCalledWith("w/other"),
    );

    await act(async () => {
      write.resolve({});
      await creation;
    });

    expect(mockVenue.workspace.write).toHaveBeenCalledWith("w/key", "value");
    expect(mockVenue.workspace.list.mock.calls.map(([path]: [string]) => path)).toEqual([
      "/",
      "w",
      "w/other",
    ]);
  });
});
