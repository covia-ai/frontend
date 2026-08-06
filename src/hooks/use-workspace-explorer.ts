"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Venue, WorkspaceReadResult } from "@covia/covia-sdk";
import { jobFailure, notifyError, notifySuccess } from "@/lib/notify";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useLatestQuery } from "@/hooks/use-latest-query";

export type WorkspaceEntry = {
  key: string;
};

export type WorkspaceValue = {
  exists: boolean;
  value: unknown;
  type: string;
};

export type WorkspaceMutation = "save" | "create" | "delete" | null;

const EMPTY_VALUE: WorkspaceValue = {
  exists: false,
  value: null,
  type: "",
};

export function normalizeWorkspacePath(path?: string): string {
  const segments = path?.split("/").filter(Boolean) ?? [];
  return segments.length > 0 ? segments.join("/") : "/";
}

// Root namespace keys (see covia/venue Namespace.java) are venue-managed —
// jobs, agents, secrets, assets, operations, inbox, and account metadata are
// all written through their own proper lifecycles, not this raw explorer.
// Only "w" (the free-form user workspace) is safe to edit/delete here.
export function isMutableWorkspacePath(path: string): boolean {
  const [root] = normalizeWorkspacePath(path).split("/");
  return root === "w";
}

// The venue rejects writes to the bare "w" root itself — CoviaAdapter
// requires a namespace *and* a key (e.g. "w/my-key"). So an individual
// entry is only writable/deletable when it's under "w" AND at least one
// level deep; "w" as a directory can still be a valid target to CREATE
// a new child key in (see isMutableWorkspacePath above).
export function isWritableWorkspaceEntry(path: string): boolean {
  const segments = normalizeWorkspacePath(path).split("/");
  return segments[0] === "w" && segments.length >= 2;
}

export function joinWorkspacePath(parent: string, child: string): string {
  const normalizedParent = normalizeWorkspacePath(parent);
  const normalizedChild = child.split("/").filter(Boolean).join("/");
  return normalizedParent === "/"
    ? normalizedChild
    : `${normalizedParent}/${normalizedChild}`;
}

export function parseWorkspaceInput(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function workspaceValue(result: WorkspaceReadResult): WorkspaceValue {
  const value = result.value;
  const inferredType = Array.isArray(value)
    ? "array"
    : value === null
      ? "null"
      : typeof value;

  return {
    exists: result.exists,
    value,
    type: result.type ?? inferredType,
  };
}

export function useWorkspaceExplorer() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const {
    data: entries,
    loading: listingLoading,
    error: listingError,
    run: runListing,
    reset: resetListing,
  } = useLatestQuery<WorkspaceEntry[]>([], {
    initialLoading: true,
  });
  const {
    data: selectedValue,
    loading: valueLoading,
    error: valueError,
    run: runValue,
    reset: resetValue,
  } = useLatestQuery<WorkspaceValue>(EMPTY_VALUE);
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<unknown>(null);
  const [editMode, setEditMode] = useState(false);
  const [pendingMutation, setPendingMutation] =
    useState<WorkspaceMutation>(null);

  const venueRef = useRef<Venue | null>(venue);
  const currentPathRef = useRef(currentPath);
  const selectedPathRef = useRef(selectedPath);
  const mutationGeneration = useRef(0);
  venueRef.current = venue;
  currentPathRef.current = currentPath;
  selectedPathRef.current = selectedPath;

  const invalidateMutation = useCallback(() => {
    ++mutationGeneration.current;
    setPendingMutation(null);
  }, []);

  const clearSelection = useCallback(() => {
    invalidateMutation();
    selectedPathRef.current = null;
    setSelectedPath(null);
    setEditedData(null);
    setEditMode(false);
    resetValue();
  }, [invalidateMutation, resetValue]);

  // Returns the entries it listed so callers can auto-select the first one
  // without waiting a tick for `entries` state to catch up.
  const loadListing = useCallback(
    async (path: string): Promise<WorkspaceEntry[]> => {
      if (!venue) {
        resetListing();
        return [];
      }
      const normalizedPath = normalizeWorkspacePath(path);
      let listed: WorkspaceEntry[] = [];
      await runListing(
        async () => {
          const result = await venue.workspace.list(normalizedPath);
          listed = (result.keys ?? []).map((key) => ({ key }));
          return listed;
        },
        { clear: true },
      );
      return listed;
    },
    [resetListing, runListing, venue],
  );

  const loadValue = useCallback(
    async (path: string) => {
      if (!venue) {
        resetValue();
        return;
      }
      await runValue(
        async () => workspaceValue(await venue.workspace.read(path)),
        { clear: true },
      );
    },
    [resetValue, runValue, venue],
  );

  const selectPath = useCallback(
    (path: string) => {
      invalidateMutation();
      selectedPathRef.current = path;
      setSelectedPath(path);
      setEditedData(null);
      setEditMode(false);
      void loadValue(path);
    },
    [invalidateMutation, loadValue],
  );

  // After listing a directory, auto-select its first entry so browsing into
  // a folder immediately shows data instead of requiring a second click.
  // Guarded on currentPathRef so a stale listing can't select into a
  // directory the user has since navigated away from.
  const selectFirstEntry = useCallback(
    (path: string, listedEntries: WorkspaceEntry[]) => {
      if (currentPathRef.current !== path) return;
      const first = listedEntries[0];
      if (first) selectPath(joinWorkspacePath(path, first.key));
    },
    [selectPath],
  );

  useEffect(() => {
    mutationGeneration.current += 1;
    setPendingMutation(null);
    currentPathRef.current = "/";
    setCurrentPath("/");
    selectedPathRef.current = null;
    setSelectedPath(null);
    setEditedData(null);
    setEditMode(false);
    resetValue();
    void loadListing("/").then((listed) => selectFirstEntry("/", listed));
  }, [loadListing, resetValue, selectFirstEntry]);

  useEffect(() => {
    if (listingError) notifyError("Unable to list workspace", listingError);
  }, [listingError]);

  useEffect(() => {
    if (valueError) notifyError("Unable to read path", valueError);
  }, [valueError]);

  useEffect(() => {
    if (!valueLoading) {
      setEditedData(selectedValue.value);
    }
  }, [selectedValue.value, valueLoading]);

  const navigateTo = useCallback(
    (path: string) => {
      const normalizedPath = normalizeWorkspacePath(path);
      currentPathRef.current = normalizedPath;
      setCurrentPath(normalizedPath);
      clearSelection();
      void loadListing(normalizedPath).then((listed) =>
        selectFirstEntry(normalizedPath, listed),
      );
    },
    [clearSelection, loadListing, selectFirstEntry],
  );

  const refreshListing = useCallback(() => {
    void loadListing(currentPathRef.current);
  }, [loadListing]);

  const mutationIsCurrent = useCallback(
    (
      generation: number,
      mutationVenue: Venue,
      path?: string,
      directory?: string,
    ) =>
      generation === mutationGeneration.current &&
      mutationVenue === venueRef.current &&
      (path === undefined || path === selectedPathRef.current) &&
      (directory === undefined || directory === currentPathRef.current),
    [],
  );

  // Accepts an optional fresh value so callers that just received a new
  // value from an onChange handler (e.g. the JSON editor) can save it
  // immediately without waiting a tick for `editedData` state to catch up.
  const save = useCallback(
    async (nextValue?: unknown): Promise<boolean> => {
      if (!venue || !isAuthenticated || !selectedPath) return false;
      if (!isWritableWorkspaceEntry(selectedPath)) return false;
      const generation = ++mutationGeneration.current;
      const path = selectedPath;
      const value = nextValue !== undefined ? nextValue : editedData;
      setPendingMutation("save");
      try {
        await venue.workspace.write(path, value);
        notifySuccess("Saved successfully");
        if (mutationIsCurrent(generation, venue, path)) {
          void loadValue(path);
        }
        return true;
      } catch (err) {
        const { reason, jobHref } = jobFailure(err, venue.venueId);
        notifyError("Unable to save", reason, venue.baseUrl, jobHref);
        return false;
      } finally {
        if (mutationIsCurrent(generation, venue, path)) {
          setPendingMutation(null);
        }
      }
    },
    [editedData, isAuthenticated, loadValue, mutationIsCurrent, selectedPath, venue],
  );

  const create = useCallback(
    async (key: string, rawValue: string): Promise<boolean> => {
      if (!venue || !isAuthenticated || !key.trim()) return false;
      const directory = currentPathRef.current;
      if (!isMutableWorkspacePath(directory)) return false;
      const generation = ++mutationGeneration.current;
      const path = joinWorkspacePath(directory, key);
      setPendingMutation("create");
      try {
        await venue.workspace.write(path, parseWorkspaceInput(rawValue));
        notifySuccess("Created successfully");
        if (mutationIsCurrent(generation, venue, undefined, directory)) {
          void loadListing(directory);
        }
        return true;
      } catch (err) {
        const { reason, jobHref } = jobFailure(err, venue.venueId);
        notifyError("Unable to create", reason, venue.baseUrl, jobHref);
        return false;
      } finally {
        if (mutationIsCurrent(generation, venue, undefined, directory)) {
          setPendingMutation(null);
        }
      }
    },
    [isAuthenticated, loadListing, mutationIsCurrent, venue],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!venue || !isAuthenticated || !selectedPath) return false;
    if (!isWritableWorkspaceEntry(selectedPath)) return false;
    const generation = ++mutationGeneration.current;
    const path = selectedPath;
    const directory = currentPathRef.current;
    setPendingMutation("delete");
    try {
      await venue.workspace.delete(path);
      notifySuccess("Deleted successfully");
      if (mutationIsCurrent(generation, venue, path, directory)) {
        clearSelection();
        void loadListing(directory);
      }
      return true;
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to delete", reason, venue.baseUrl, jobHref);
      return false;
    } finally {
      if (mutationIsCurrent(generation, venue, path, directory)) {
        setPendingMutation(null);
      }
    }
  }, [
    clearSelection,
    isAuthenticated,
    loadListing,
    mutationIsCurrent,
    selectedPath,
    venue,
  ]);

  const pathSegments = useMemo(
    () => currentPath.split("/").filter(Boolean),
    [currentPath],
  );

  return {
    venue,
    isAuthenticated,
    entries,
    listingLoading,
    listingError,
    currentPath,
    pathSegments,
    selectedPath,
    selectedValue,
    valueLoading,
    valueError,
    editedData,
    editMode,
    pendingMutation,
    setEditedData,
    setEditMode,
    navigateTo,
    selectPath,
    refreshListing,
    save,
    create,
    remove,
  };
}
