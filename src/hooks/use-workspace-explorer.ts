"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Venue, WorkspaceReadResult } from "@covia/covia-sdk";
import { jobFailure, notifyError, notifySuccess } from "@/lib/notify";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { ROOT_NAMESPACES } from "@/lib/workspace-namespaces";

export type WorkspaceEntry = {
  key: string;
};

export type WorkspaceValue = {
  exists: boolean;
  value: unknown;
  type: string;
  truncated?: boolean;
};

export type WorkspaceMutation = "save" | "create" | "delete" | null;

const EMPTY_VALUE: WorkspaceValue = {
  exists: false,
  value: null,
  type: "",
};

const DEFAULT_WORKSPACE_PATH = "w";

export function normalizeWorkspacePath(path?: string): string {
  const segments = path?.split("/").filter(Boolean) ?? [];
  return segments.length > 0 ? segments.join("/") : "/";
}

// Root namespace keys (see workspace-namespaces.ts) are venue-managed —
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

// The backend only reports root namespaces that already have data under
// them. Every venue supports the full fixed set regardless, so the root
// listing always shows all of them — with any extra keys the backend does
// report (a namespace not in the fixed set) appended after.
function withFixedRootNamespaces(keys: string[]): WorkspaceEntry[] {
  const known = new Set(ROOT_NAMESPACES.map((n) => n.key));
  const extras = keys.filter((key) => !known.has(key));
  return [
    ...ROOT_NAMESPACES.map(({ key }) => ({ key })),
    ...extras.map((key) => ({ key })),
  ];
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
    truncated: result.truncated,
  };
}

export function useWorkspaceExplorer(initialPath?: string) {
  const venue = useAuthenticatedVenue();
  const startPath = initialPath ? normalizeWorkspacePath(initialPath) : DEFAULT_WORKSPACE_PATH;
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
  const [currentPath, setCurrentPath] = useState(startPath);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<unknown>(null);
  const [pendingMutation, setPendingMutation] =
    useState<WorkspaceMutation>(null);
  const [namespaceRefreshing, setNamespaceRefreshing] = useState(false);
  // The SDK deliberately does not cache mutable lattice paths. Keep a small,
  // page-lifetime navigation cache here so backtracking through the explorer
  // is instant; the namespace refresh action invalidates the relevant subtree.
  const listingCache = useRef(new Map<string, WorkspaceEntry[]>());
  const valueCache = useRef(new Map<string, WorkspaceValue>());

  const venueRef = useRef<Venue | null>(venue);
  const currentPathRef = useRef(currentPath);
  const selectedPathRef = useRef(selectedPath);
  const mutationGeneration = useRef(0);
  const refreshGeneration = useRef(0);
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
    resetValue();
  }, [invalidateMutation, resetValue]);

  const loadListing = useCallback(
    async (path: string, force = false): Promise<WorkspaceEntry[]> => {
      if (!venue) {
        resetListing();
        return [];
      }
      const normalizedPath = normalizeWorkspacePath(path);
      if (!force) {
        const cached = listingCache.current.get(normalizedPath);
        if (cached) {
          resetListing(cached);
          return cached;
        }
      }
      let listed: WorkspaceEntry[] = [];
      await runListing(
        async () => {
          const result = await venue.workspace.list(normalizedPath);
          const keys = result.keys ?? [];
          listed =
            normalizedPath === "/"
              ? withFixedRootNamespaces(keys)
              : keys.map((key) => ({ key }));
          if (venueRef.current === venue) {
            listingCache.current.set(normalizedPath, listed);
          }
          return listed;
        },
        { clear: true },
      );
      return listed;
    },
    [resetListing, runListing, venue],
  );

  const loadValue = useCallback(
    async (path: string, force = false) => {
      if (!venue) {
        resetValue();
        return;
      }
      if (!force) {
        const cached = valueCache.current.get(path);
        if (cached) {
          resetValue(cached);
          return;
        }
      }
      await runValue(
        async () => {
          const value = workspaceValue(await venue.workspace.read(path));
          if (venueRef.current !== venue) return value;
          valueCache.current.set(path, value);
          return value;
        },
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
      void loadValue(path);
    },
    [invalidateMutation, loadValue],
  );

  useEffect(() => {
    mutationGeneration.current += 1;
    refreshGeneration.current += 1;
    setPendingMutation(null);
    setNamespaceRefreshing(false);
    currentPathRef.current = startPath;
    setCurrentPath(startPath);
    selectedPathRef.current = null;
    setSelectedPath(null);
    setEditedData(null);
    listingCache.current.clear();
    valueCache.current.clear();
    resetValue();
    void loadListing(startPath);
    // startPath intentionally excluded: it's derived once from the caller's
    // initialPath prop (a query param at mount), not a live dependency —
    // re-including it would re-seed the explorer back to the deep-linked
    // path every time venue-triggered state elsewhere causes a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadListing, resetValue]);

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
      ++refreshGeneration.current;
      setNamespaceRefreshing(false);
      const normalizedPath = normalizeWorkspacePath(path);
      currentPathRef.current = normalizedPath;
      setCurrentPath(normalizedPath);
      clearSelection();
      void loadListing(normalizedPath);
    },
    [clearSelection, loadListing],
  );

  const refreshNamespace = useCallback(() => {
    const path = selectedPathRef.current ?? currentPathRef.current;
    const [root] = normalizeWorkspacePath(path).split("/").filter(Boolean);
    if (!root) return;
    const inNamespace = (candidate: string) =>
      candidate === root || candidate.startsWith(`${root}/`);
    for (const key of listingCache.current.keys()) {
      if (inNamespace(key)) listingCache.current.delete(key);
    }
    for (const key of valueCache.current.keys()) {
      if (inNamespace(key)) valueCache.current.delete(key);
    }
    const generation = ++refreshGeneration.current;
    setNamespaceRefreshing(true);
    const requests: Promise<unknown>[] = [
      loadListing(currentPathRef.current, true),
    ];
    if (selectedPathRef.current) {
      requests.push(loadValue(selectedPathRef.current, true));
    }
    void Promise.all(requests).finally(() => {
      if (generation === refreshGeneration.current) {
        setNamespaceRefreshing(false);
      }
    });
  }, [loadListing, loadValue]);

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
        valueCache.current.delete(path);
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
        listingCache.current.delete(directory);
        notifySuccess("Created successfully");
        if (mutationIsCurrent(generation, venue, undefined, directory)) {
          void loadListing(directory, true);
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
      valueCache.current.delete(path);
      listingCache.current.delete(directory);
      notifySuccess("Deleted successfully");
      if (mutationIsCurrent(generation, venue, path, directory)) {
        clearSelection();
        void loadListing(directory, true);
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
    pendingMutation,
    namespaceRefreshing,
    setEditedData,
    navigateTo,
    selectPath,
    refreshNamespace,
    save,
    create,
    remove,
  };
}
