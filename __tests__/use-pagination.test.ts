import { act, renderHook, waitFor } from "@testing-library/react";
import { useClientPagination } from "@/hooks/use-pagination";

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
