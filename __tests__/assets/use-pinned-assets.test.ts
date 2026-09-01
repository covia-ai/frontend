import { act } from "@testing-library/react";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";

describe("usePinnedAssets store", () => {
  beforeEach(() => {
    act(() => usePinnedAssets.setState({ pinned: [] }));
  });

  it("pins and unpins an asset, scoped by venue", () => {
    act(() => usePinnedAssets.getState().pin("v1", "a1"));
    expect(usePinnedAssets.getState().isPinned("v1", "a1")).toBe(true);
    expect(usePinnedAssets.getState().isPinned("v2", "a1")).toBe(false);

    act(() => usePinnedAssets.getState().unpin("v1", "a1"));
    expect(usePinnedAssets.getState().isPinned("v1", "a1")).toBe(false);
  });

  it("toggles pin state", () => {
    act(() => usePinnedAssets.getState().togglePin("v1", "a1"));
    expect(usePinnedAssets.getState().isPinned("v1", "a1")).toBe(true);

    act(() => usePinnedAssets.getState().togglePin("v1", "a1"));
    expect(usePinnedAssets.getState().isPinned("v1", "a1")).toBe(false);
  });

  it("pinning the same asset twice does not duplicate the entry", () => {
    act(() => {
      usePinnedAssets.getState().pin("v1", "a1");
      usePinnedAssets.getState().pin("v1", "a1");
    });
    expect(usePinnedAssets.getState().pinned).toHaveLength(1);
  });
});
