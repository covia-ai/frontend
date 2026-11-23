import { act, renderHook, waitFor } from "@testing-library/react";
import { useClientPagination, useInfiniteWindow } from "@/hooks/use-pagination";

describe("useClientPagination", () => {
  it("slices the requested page and clamps when the result set shrinks", async () => {
    const { result, rerender } = renderHook(
      ({ items }) =>
        useClientPagination({
          items,
          pageSize: 2,
          resetKey: "same-filter",
        }),
      { initialProps: { items: [1, 2, 3, 4, 5] } },
    );

    act(() => result.current.setCurrentPage(3));
    expect(result.current.pageItems).toEqual([5]);

    rerender({ items: [1, 2, 3] });
    await waitFor(() => expect(result.current.currentPage).toBe(2));
    expect(result.current.pageItems).toEqual([3]);
  });

  it("returns to page one when the filter identity changes", async () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) =>
        useClientPagination({
          items: [1, 2, 3, 4],
          pageSize: 2,
          resetKey,
        }),
      { initialProps: { resetKey: "all" } },
    );

    act(() => result.current.setCurrentPage(2));
    expect(result.current.pageItems).toEqual([3, 4]);

    rerender({ resetKey: "filtered" });
    await waitFor(() => expect(result.current.currentPage).toBe(1));
    expect(result.current.pageItems).toEqual([1, 2]);
  });
});

describe("useInfiniteWindow", () => {
  const items = Array.from({ length: 10 }, (_, i) => i);

  it("shows one batch, grows by a batch on loadMore, and stops at the end", () => {
    const { result } = renderHook(() => useInfiniteWindow(items, "k", 4));
    expect(result.current.visibleItems).toEqual([0, 1, 2, 3]);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    expect(result.current.visibleItems).toHaveLength(8);
    act(() => result.current.loadMore());
    expect(result.current.visibleItems).toHaveLength(10);
    expect(result.current.hasMore).toBe(false);
  });

  it("starts from the first batch again in the same render when the reset key changes", () => {
    const { result, rerender } = renderHook(({ key }) => useInfiniteWindow(items, key, 4), {
      initialProps: { key: "a" },
    });
    act(() => result.current.loadMore());
    expect(result.current.visibleItems).toHaveLength(8);

    rerender({ key: "b" });
    expect(result.current.visibleItems).toEqual([0, 1, 2, 3]);
  });
});
