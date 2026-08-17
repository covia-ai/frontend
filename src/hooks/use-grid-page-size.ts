"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Number of tracks in a computed `grid-template-columns` value.
 * `getComputedStyle` resolves it to explicit pixel tracks ("254px 254px …"),
 * so counting them gives the columns actually rendered — including the empty
 * ones `auto-fill` leaves in place.
 */
export function countGridColumns(gridTemplateColumns: string | undefined | null): number {
  if (!gridTemplateColumns || gridTemplateColumns === "none") return 1;
  const tracks = gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
  return tracks > 0 ? tracks : 1;
}

/** How many card rows fit in `availableHeight`. */
export function computeGridRows({
  availableHeight,
  cardHeight,
  rowGap,
  minRows = 1,
}: {
  availableHeight: number;
  cardHeight: number;
  rowGap: number;
  minRows?: number;
}): number {
  // Nothing rendered yet, so there is no card to measure against.
  if (cardHeight <= 0) return minRows;
  // n rows occupy n*card + (n-1)*gap, so add one gap before dividing.
  const rows = Math.floor((availableHeight + rowGap) / (cardHeight + rowGap));
  return Math.max(minRows, rows);
}

// Small margin for whatever isn't captured by measuring the grid's own next
// sibling below it (see `measure()`) — spacing between them, the page's
// bottom padding. Deliberately small: the real height of what's below the
// grid is measured directly now, so this only needs to cover slack, not
// guess at the whole amount (a flat 96px guess used to either waste up to a
// full row's worth of visible space when the real content below was
// shorter, or clip a row when it was taller).
const PAGE_BOTTOM_BUFFER_PX = 24;

/**
 * A page size that fills the window: the columns the grid is actually
 * rendering, times the rows that fit in the space below it. Both come from
 * measurement, so the grid's own responsive rule stays the single source of
 * truth for width and the viewport decides the height.
 *
 * Attach the returned `ref` to the grid element.
 */
export function useGridPageSize({
  fallback = 12,
  minRows = 1,
  maxItems = 72,
}: { fallback?: number; minRows?: number; maxItems?: number } = {}): {
  ref: (node: HTMLElement | null) => void;
  pageSize: number;
} {
  const [pageSize, setPageSize] = useState(fallback);
  const nodeRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    const style = window.getComputedStyle(node);
    const columns = countGridColumns(style.gridTemplateColumns);
    const rowGap = parseFloat(style.rowGap) || 0;
    const card = node.firstElementChild as HTMLElement | null;
    const cardHeight = card?.offsetHeight ?? 0;
    if (cardHeight <= 0) return; // nothing to measure yet; keep the last size

    // Document-relative top, so scrolling doesn't change the answer. Using the
    // viewport-relative rect directly would grow the page size as you scroll,
    // which feeds back into the layout.
    const documentTop = node.getBoundingClientRect().top + window.scrollY;
    // What actually sits below the grid (typically PaginationHeader) —
    // measured directly rather than guessed, so a slim or absent pagination
    // row lets the grid claim that space instead of leaving it empty.
    const nextSibling = node.nextElementSibling as HTMLElement | null;
    const belowGridHeight =
      (nextSibling?.getBoundingClientRect().height ?? 0) + PAGE_BOTTOM_BUFFER_PX;
    const availableHeight = window.innerHeight - documentTop - belowGridHeight;

    const rows = computeGridRows({ availableHeight, cardHeight, rowGap, minRows });
    const next = Math.max(1, Math.min(maxItems, columns * rows));
    setPageSize((prev) => (prev === next ? prev : next));
  }, [minRows, maxItems]);

  // A callback ref, not an effect: the grid unmounts while the list is
  // loading, so the observer has to follow the node rather than be wired once.
  const ref = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      nodeRef.current = node;
      if (!node) return;
      measure();
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => measure());
      observer.observe(node);
      observerRef.current = observer;
    },
    [measure],
  );

  // The observer catches the grid's own size changes; a viewport that only
  // changes height may not resize the grid at all, so listen for that too.
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      observerRef.current?.disconnect();
    };
  }, [measure]);

  return { ref, pageSize };
}
