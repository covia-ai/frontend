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

  const [drive, setDriveState] = useState<string | null>(initialDrive ?? null);
  const [path, setPath] = useState(normalizeFilesPath(initialPath));
  const [selectedEntry, setSelectedEntry] = useState<DLFSEntry | null>(null);

  const listingCache = useRef(new Map<string, DLFSEntry[]>());
  const venueRef = useRef<Venue | null | undefined>(venue);
  venueRef.current = venue;

  const loadDrives = useCallback(async () => {
    if (!venue) return;
    await runDrives(async () => {
      const result = await venue.dlfs.listDrives();
      return result.drives ?? [];
    });
  }, [runDrives, venue]);

  useEffect(() => {
    void loadDrives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);

  // Default to the requested drive (if it exists) or the first one, once the
  // drive list has actually loaded — never guess ahead of the real list.
  useEffect(() => {
    if (drive || drives.length === 0) return;
    setDriveState(initialDrive && drives.includes(initialDrive) ? initialDrive : drives[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drives]);

  const loadListing = useCallback(
    async (d: string, p: string, force = false) => {
      if (!venue) return;
      const cacheKey = `${d}:${p}`;
      if (!force) {
        const cached = listingCache.current.get(cacheKey);
        if (cached) {
          resetEntries(cached);
          return;
        }
      }
      await runEntries(
        async () => {
          const result = await venue.dlfs.list(d, p || undefined);
          const listed = result.entries ?? [];
          if (venueRef.current === venue) listingCache.current.set(cacheKey, listed);
          return listed;
        },
        { clear: true },
      );
    },
    [resetEntries, runEntries, venue],
  );

  useEffect(() => {
    if (!drive) return;
    setSelectedEntry(null);
    void loadListing(drive, path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drive, path]);

  const selectDrive = useCallback((next: string) => {
    setDriveState(next);
    setPath("");
    setSelectedEntry(null);
  }, []);

  const navigateTo = useCallback((nextPath: string) => {
    setPath(normalizeFilesPath(nextPath));
  }, []);

  const selectEntry = useCallback(
    (entry: DLFSEntry) => {
      if (entry.type === "directory") {
        navigateTo(path ? `${path}/${entry.name}` : entry.name);
      } else {
        setSelectedEntry(entry);
      }
    },
    [navigateTo, path],
  );

  const clearSelection = useCallback(() => setSelectedEntry(null), []);

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
