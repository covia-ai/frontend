"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Drag-to-resize for a left pane inside a horizontal flex container.
// Shared by AgentExplorer and WorkspaceExplorer, which previously hand-rolled
// this with two bugs: width was computed as `clientX - 20` (viewport-relative,
// wrong by the sidebar + page-padding offset, so panes ballooned on every
// drag), and a blanket `select-none` on the whole container made pane content
// — chat transcripts, workspace values — uncopyable at all times.
//
// Here width is measured from the container's own left edge, bounds are
// proportional (collapse to 0, at most `maxFraction` of the container) rather
// than fixed px, and text selection is suppressed on <body> only while a drag
// is in progress, so content stays selectable.
export function usePaneResize(initialWidth: number, maxFraction = 0.6) {
  const [width, setWidth] = useState(initialWidth);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setWidth(Math.min(Math.max(0, e.clientX - rect.left), rect.width * maxFraction));
  }, [maxFraction]);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleMouseMove]);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [handleMouseMove, stopResizing]);

  // Unmount mid-drag must not leak the document listeners or body styles.
  useEffect(() => stopResizing, [stopResizing]);

  return { width, containerRef, startResizing };
}
