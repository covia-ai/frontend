"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Number of tracks in a computed `grid-template-columns` value.
 * `getComputedStyle` resolves it to explicit pixel tracks ("254px 254px …"),
 * so counting them gives the columns actually rendered.
 */
export function countGridColumns(gridTemplateColumns: string | undefined | null): number {
  if (!gridTemplateColumns || gridTemplateColumns === "none") return 1;
  const tracks = gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
  return tracks > 0 ? tracks : 1;
}

/**
 * Columns a responsive CSS grid is currently rendering, so a page size can
 * follow the grid's own breakpoints instead of restating them in JS — the
 * class list stays the single source of truth for how wide the grid gets.
 *
 * Attach the returned `ref` to the grid element.
 */
export function useGridColumns(fallback = 1): {
  ref: (node: HTMLElement | null) => void;
  columns: number;
} {
  const [columns, setColumns] = useState(fallback);
  const observerRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback((node: HTMLElement) => {
    const next = countGridColumns(window.getComputedStyle(node).gridTemplateColumns);
    setColumns((prev) => (prev === next ? prev : next));
  }, []);

  // A callback ref, not an effect: the grid unmounts while the list is loading,
  // so the observer has to follow the node rather than be wired up once.
  const ref = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;
      measure(node);
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => measure(node));
      observer.observe(node);
      observerRef.current = observer;
    },
    [measure],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { ref, columns };
}
