"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";

type PageNumberOptions = {
  totalItems: number;
  pageSize: number;
  resetKey?: string;
};

export function usePageNumber({
  totalItems,
  pageSize,
  resetKey,
}: PageNumberOptions) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  // The chosen page is stored with the filter identity it was chosen under, so
  // a new identity reads as page one in the same render — nothing has to reset
  // it a frame later. A result set that shrinks pulls the page back into range
  // the same way: the clamp is applied on read, never written back.
  const [chosen, setChosen] = useState<{ resetKey?: string; page: number }>({ resetKey, page: 1 });
  const currentPage = Math.min(chosen.resetKey === resetKey ? chosen.page : 1, totalPages);

  const setCurrentPage = useCallback(
    (update: SetStateAction<number>) => {
      setChosen((previous) => {
        const base = Math.min(previous.resetKey === resetKey ? previous.page : 1, totalPages);
        return { resetKey, page: typeof update === "function" ? update(base) : update };
      });
    },
    [resetKey, totalPages],
  );

  return { currentPage, setCurrentPage, totalPages };
}

export function useClientPagination<T>({
  items,
  pageSize,
  resetKey,
}: {
  items: T[];
  pageSize: number;
  resetKey?: string;
}) {
  const page = usePageNumber({
    totalItems: items.length,
    pageSize,
    resetKey,
  });
  const pageItems = useMemo(
    () =>
      items.slice(
        (page.currentPage - 1) * pageSize,
        page.currentPage * pageSize,
      ),
    [items, page.currentPage, pageSize],
  );

  return { ...page, pageItems };
}

/**
 * A growing window over an in-memory list, for infinite scroll: the first
 * `batchSize` items, then another batch each time the sentinel scrolls into
 * view, or when `loadMore` is called (the "Load more" button, which also covers
 * environments without IntersectionObserver, e.g. jsdom). The window is stored
 * with the `resetKey` it was grown under, so a new search or filter starts from
 * the first batch in the same render rather than an effect resetting it a
 * frame late.
 */
export function useInfiniteWindow<T>(items: T[], resetKey: string, batchSize: number) {
  const [shown, setShown] = useState({ resetKey, count: batchSize });
  const visibleCount = shown.resetKey === resetKey ? shown.count : batchSize;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Set the moment a grow is requested; cleared once the new slice renders, so
  // a burst of intersection events can't stack multiple batches at once.
  const growingRef = useRef(false);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (growingRef.current) return;
    growingRef.current = true;
    setShown((previous) => ({
      resetKey,
      count: (previous.resetKey === resetKey ? previous.count : batchSize) + batchSize,
    }));
  }, [resetKey, batchSize]);

  useEffect(() => {
    growingRef.current = false;
  }, [visibleItems.length]);

  // Re-armed on every slice change so each batch can trigger the next.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, visibleItems.length]);

  return { visibleItems, hasMore, loadMore, sentinelRef };
}
