"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { notifyError } from "@/lib/notify";
import { formatMaxUploadSize, isAllowedUploadFile, MAX_UPLOAD_BYTES } from "@/lib/upload-constraints";

type GlobalFileDropState = {
  isDragging: boolean;
  droppedFile: File | null;
  // Bumped on every drop so a second drop of a file with the same
  // name/size still gets a fresh CreateAssetComponent instance (mounted
  // keyed on this) rather than reusing stale internal wizard state.
  dropId: number;
  setDragging: (isDragging: boolean) => void;
  drop: (file: File) => void;
  clear: () => void;
};

export const useGlobalFileDropStore = create<GlobalFileDropState>((set) => ({
  isDragging: false,
  droppedFile: null,
  dropId: 0,
  setDragging: (isDragging) => set({ isDragging }),
  drop: (file) => set((state) => ({ droppedFile: file, dropId: state.dropId + 1, isDragging: false })),
  clear: () => set({ droppedFile: null, isDragging: false }),
}));

// Single owner of the app-wide drag/drop listener — mounted once in
// AdminPanelLayout alongside the other app-wide singleton hooks/pollers, so
// dropping a file registers it as an asset from any page with no per-page
// wiring. Validates type/size here, before a file ever reaches the dialog —
// the native <input accept> attribute used elsewhere is advisory only, so
// this (and CreateAssetComponent's own file picker) enforce it in JS.
export function useGlobalFileDropListener() {
  const setDragging = useGlobalFileDropStore((s) => s.setDragging);
  const drop = useGlobalFileDropStore((s) => s.drop);

  useEffect(() => {
    // Fires on every child element a drag crosses, not just window — this
    // depth counter is the standard way to know when a drag has actually
    // left the window rather than just moved between two of its children.
    let dragDepth = 0;

    function isFileDrag(event: DragEvent): boolean {
      return Array.from(event.dataTransfer?.types ?? []).includes("Files");
    }

    function handleDragEnter(event: DragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      dragDepth += 1;
      setDragging(true);
    }
    function handleDragOver(event: DragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
    }
    function handleDragLeave(event: DragEvent) {
      if (!isFileDrag(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setDragging(false);
    }
    function handleDrop(event: DragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      dragDepth = 0;
      setDragging(false);
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      if (!isAllowedUploadFile(file)) {
        notifyError("Unsupported file type", `"${file.name}" isn't an accepted file type for assets.`);
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        notifyError("File too large", `"${file.name}" is over the ${formatMaxUploadSize()} upload limit.`);
        return;
      }
      drop(file);
    }

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [setDragging, drop]);
}

export function useGlobalFileDrop() {
  // Individual field selectors, not one object-literal selector — Zustand's
  // default equality is reference equality, so a selector returning a fresh
  // object on every store change (even to an unrelated field) never
  // stabilizes and starves React's render loop.
  const isDragging = useGlobalFileDropStore((s) => s.isDragging);
  const droppedFile = useGlobalFileDropStore((s) => s.droppedFile);
  const dropId = useGlobalFileDropStore((s) => s.dropId);
  const clear = useGlobalFileDropStore((s) => s.clear);
  return { isDragging, droppedFile, dropId, clear };
}
