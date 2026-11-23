"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DLFSEntry, Venue } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useLatestQuery } from "@/hooks/use-latest-query";

// Read-first MVP (#253): own drives by bare name only, no drive/file
// management here — Phase 2 (upload/mkdir/rename/move/delete) is a separate
// pass. Mirrors use-workspace-explorer.ts's shape (per-path listing cache,
// latest-request-wins loading state) with a drive-selector layer on top,
// since DLFS (unlike the single-namespace lattice workspace) has multiple
// independent drives.

export function normalizeFilesPath(path?: string): string {
  return path?.split("/").filter(Boolean).join("/") ?? "";
}

/** A selected file, remembered with the listing it was picked from. */
type Selection = { drive: string; path: string; entry: DLFSEntry };

export function useFilesExplorer(initialDrive?: string, initialPath?: string) {
  const venue = useAuthenticatedVenue();
  const {
    data: drives,
    loading: drivesLoading,
    error: drivesError,
    run: runDrives,
  } = useLatestQuery<string[]>([], { initialLoading: true });
  const {
    data: entries,
    loading: entriesLoading,
    error: entriesError,
    run: runEntries,
    reset: resetEntries,
  } = useLatestQuery<DLFSEntry[]>([]);

  // The drive the user picked; until then the default below applies.
  const [chosenDrive, setChosenDrive] = useState<string | null>(null);
  const [path, setPath] = useState(normalizeFilesPath(initialPath));
  const [selection, setSelection] = useState<Selection | null>(null);

  // One listing cache per Venue instance, so a reply that arrives after a
  // venue switch is filed under the venue it came from and never shown for
  // another.
  const listingCaches = useRef(new WeakMap<Venue, Map<string, DLFSEntry[]>>());
  const cacheFor = (target: Venue) => {
    let cache = listingCaches.current.get(target);
    if (!cache) {
      cache = new Map();
      listingCaches.current.set(target, cache);
    }
    return cache;
  };

  // The drive the user picked, if this venue has it; else the requested drive,
  // if it exists; else the first — and only once the drive list has actually
  // loaded, never guessing ahead of the real list. Checking the pick against
  // the list is what keeps a pick made on one venue from being listed on
  // another that lacks it.
  const drive =
    drives.length === 0
      ? null
      : chosenDrive && drives.includes(chosenDrive)
        ? chosenDrive
        : initialDrive && drives.includes(initialDrive)
          ? initialDrive
          : drives[0];
  // A selection belongs to the listing it was made in; leaving that listing
  // deselects without anything having to be reset.
  const selectedEntry =
    selection && selection.drive === drive && selection.path === path ? selection.entry : null;

  const loadDrives = useCallback(async () => {
    if (!venue) return;
    await runDrives(async () => {
      const result = await venue.dlfs.listDrives();
      return result.drives ?? [];
    });
  }, [runDrives, venue]);

  useEffect(() => {
    void loadDrives();
  }, [loadDrives]);

  const loadListing = useCallback(
    async (d: string, p: string, force = false) => {
      if (!venue) return;
      const cache = cacheFor(venue);
      const cacheKey = `${d}:${p}`;
      if (!force) {
        const cached = cache.get(cacheKey);
        if (cached) {
          resetEntries(cached);
          return;
        }
      }
      await runEntries(
        async () => {
          const result = await venue.dlfs.list(d, p || undefined);
          const listed = result.entries ?? [];
          cache.set(cacheKey, listed);
          return listed;
        },
        { clear: true },
      );
    },
    [resetEntries, runEntries, venue],
  );

  useEffect(() => {
    if (!drive) return;
    void loadListing(drive, path);
  }, [drive, path, loadListing]);

  const selectDrive = useCallback((next: string) => {
    setChosenDrive(next);
    setPath("");
    setSelection(null);
  }, []);

  const navigateTo = useCallback((nextPath: string) => {
    setPath(normalizeFilesPath(nextPath));
  }, []);

  const selectEntry = useCallback(
    (entry: DLFSEntry) => {
      if (entry.type === "directory") {
        navigateTo(path ? `${path}/${entry.name}` : entry.name);
      } else if (drive) {
        setSelection({ drive, path, entry });
      }
    },
    [drive, navigateTo, path],
  );

  const clearSelection = useCallback(() => setSelection(null), []);

  const pathSegments = path.split("/").filter(Boolean);

  return {
    venue,
    drives,
    drivesLoading,
    drivesError,
    drive,
    selectDrive,
    path,
    pathSegments,
    navigateTo,
    entries,
    entriesLoading,
    entriesError,
    selectedEntry,
    selectEntry,
    clearSelection,
  };
}
