import { act, renderHook, waitFor } from "@testing-library/react";
import {
  parseWorkspaceDraft,
  useWorkspaceExplorer,
  workspaceDraftText,
} from "@/hooks/use-workspace-explorer";

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
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => mockVenue,
}));
jest.mock("@/hooks/use-auth", () => ({
  ...require("@test/use-auth").authMock,
  useIsAuthenticated: () => mockAuthenticated,
}));
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);

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

  it("starts in Workspace without reading any child value", async () => {
    const { result } = renderHook(() => useWorkspaceExplorer());

    await waitFor(() => expect(result.current.listingLoading).toBe(false));
    expect(result.current.currentPath).toBe("w");
    expect(result.current.selectedPath).toBeNull();
    expect(mockVenue.workspace.list).toHaveBeenCalledTimes(1);
    expect(mockVenue.workspace.list).toHaveBeenCalledWith("w");
    expect(mockVenue.workspace.read).not.toHaveBeenCalled();
  });

  it("loads only the child the user explicitly selects", async () => {
    mockVenue.workspace.list.mockImplementation((path: string) => {
      if (path === "w") {
        return Promise.resolve({ exists: true, type: "map", keys: ["alpha", "beta"] });
      }
      return Promise.resolve({ exists: true, type: "map", keys: ["root"] });
    });
    mockVenue.workspace.read.mockResolvedValue({ exists: true, value: "v" });
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    expect(mockVenue.workspace.read).not.toHaveBeenCalled();
    act(() => result.current.selectPath("w/alpha"));
    await waitFor(() => expect(result.current.selectedValue.value).toBe("v"));

    expect(mockVenue.workspace.read).toHaveBeenCalledWith("w/alpha");
    expect(mockVenue.workspace.read).toHaveBeenCalledTimes(1);
  });

  it("reuses listings while navigating until the namespace is refreshed", async () => {
    mockVenue.workspace.list.mockResolvedValue({
      exists: true,
      type: "map",
      keys: ["entry"],
    });
    mockVenue.workspace.read.mockResolvedValue({ exists: true, value: "first" });
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    act(() => result.current.selectPath("w/entry"));
    await waitFor(() => expect(result.current.selectedValue.value).toBe("first"));
    act(() => result.current.navigateTo("v"));
    await waitFor(() => expect(result.current.currentPath).toBe("v"));
    act(() => result.current.navigateTo("w"));
    await waitFor(() => expect(result.current.currentPath).toBe("w"));

    expect(mockVenue.workspace.list.mock.calls.filter(([path]: [string]) => path === "w")).toHaveLength(1);

    act(() => result.current.selectPath("w/entry"));
    await waitFor(() => expect(result.current.selectedValue.value).toBe("first"));
    mockVenue.workspace.read.mockResolvedValue({ exists: true, value: "fresh" });
    act(() => result.current.refreshNamespace());
    await waitFor(() => expect(result.current.selectedValue.value).toBe("fresh"));

    expect(mockVenue.workspace.list.mock.calls.filter(([path]: [string]) => path === "w")).toHaveLength(2);
    expect(mockVenue.workspace.read).toHaveBeenCalledTimes(2);
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

    // Wait for the default Workspace listing before exercising the race.
    await waitFor(() => expect(result.current.listingLoading).toBe(false));
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
      expect(await result.current.save("changed")).toBe(false);
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

    act(() => result.current.navigateTo("j"));
    await waitFor(() => expect(result.current.currentPath).toBe("j"));
    act(() => result.current.selectPath("j/some-job-id"));
    await waitFor(() => expect(result.current.valueLoading).toBe(false));

    await act(async () => {
      expect(await result.current.save("changed")).toBe(false);
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
      expect(await result.current.save("changed")).toBe(false);
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
      expect(await result.current.save("v2")).toBe(true);
    });

    expect(mockVenue.workspace.write).toHaveBeenCalledWith("w/notes", "v2");
  });

  it("does not write — every write is a job — when the value is unchanged", async () => {
    mockAuthenticated = true;
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: { a: 1, nested: { b: [2] } },
      type: "map",
    });
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    act(() => result.current.selectPath("w/notes"));
    await waitFor(() => expect(result.current.valueLoading).toBe(false));

    await act(async () => {
      // An equal value, not the same reference — what blurring out of an
      // untouched editor hands back.
      expect(await result.current.save({ a: 1, nested: { b: [2] } })).toBe(false);
    });

    expect(mockVenue.workspace.write).not.toHaveBeenCalled();
  });

  it("never writes back a value the venue only returned part of", async () => {
    mockAuthenticated = true;
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: "the first part of a very long",
      type: "string",
      truncated: true,
    });
    const { result } = renderHook(() => useWorkspaceExplorer());
    await waitFor(() => expect(result.current.listingLoading).toBe(false));

    act(() => result.current.selectPath("w/big"));
    await waitFor(() => expect(result.current.valueLoading).toBe(false));
    expect(result.current.selectedValue.truncated).toBe(true);

    await act(async () => {
      expect(await result.current.save("an edit")).toBe(false);
    });

    expect(mockVenue.workspace.write).not.toHaveBeenCalled();
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
      "w",
      "w/other",
    ]);
  });
});

describe("workspace scalar draft", () => {
  it("round-trips every scalar through its editor text", () => {
    for (const value of ["plain text", "123", "true", 42, 1.05, false, null]) {
      expect(parseWorkspaceDraft(workspaceDraftText(value), value)).toEqual(value);
    }
  });

  it("keeps a value loaded as a string a string, however numeric the text looks", () => {
    expect(parseWorkspaceDraft("1234", "123")).toBe("1234");
    expect(parseWorkspaceDraft("null", "none")).toBe("null");
  });

  it("lets a string be replaced by structured JSON, which cannot be mistaken for text", () => {
    expect(parseWorkspaceDraft('{"a":1}', "old")).toEqual({ a: 1 });
    expect(parseWorkspaceDraft("[1,2]", "old")).toEqual([1, 2]);
  });

  it("parses a non-string value's text as JSON, falling back to a string", () => {
    expect(parseWorkspaceDraft("1.05", 1)).toBe(1.05);
    expect(parseWorkspaceDraft('"5"', 5)).toBe("5");
    expect(parseWorkspaceDraft("not json", 5)).toBe("not json");
  });
});
