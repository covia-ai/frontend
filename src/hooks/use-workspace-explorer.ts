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

// The scalar editor edits TEXT and only becomes a value here, on save — parsing
// per keystroke made "1.05" untypeable (it collapsed at "1.0") and silently
// turned a stored "123" into a number. The rule: text is JSON when it parses
// and a string when it does not — except that a value loaded as a string stays
// a string, unless the text is a JSON object or array, the only JSON that
// cannot be mistaken for plain text.
export function workspaceDraftText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function parseWorkspaceDraft(text: string, loaded: unknown): unknown {
  const parsed = parseWorkspaceInput(text);
  if (typeof loaded !== "string") return parsed;
  return typeof parsed === "object" && parsed !== null ? parsed : text;
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

/** Where the explorer is, on the venue it is exploring. */
type Navigation = { venue: Venue | null; currentPath: string; selectedPath: string | null };
/** A flag that only means anything for the venue it was raised on. */
type VenueFlag<T> = { venue: Venue | null; value: T };
/** The SDK deliberately does not cache mutable lattice paths; this is a small,
 *  page-lifetime navigation cache so backtracking is instant. One per Venue
 *  instance, so a reply that lands after a switch is filed under its own venue. */
type VenueCaches = { listings: Map<string, WorkspaceEntry[]>; values: Map<string, WorkspaceValue> };

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
  // Navigation and the mutation flags are stored with the venue they belong to
  // and read back only while it is the current one, so a venue switch lands
  // back at the start path with nothing pending — in the same render, with
  // nothing to reset.
  const [navigation, setNavigation] = useState<Navigation>({
    venue,
    currentPath: startPath,
    selectedPath: null,
  });
  const [pending, setPending] = useState<VenueFlag<WorkspaceMutation>>({ venue, value: null });
  const [refreshing, setRefreshing] = useState<VenueFlag<boolean>>({ venue, value: false });
  const caches = useRef(new WeakMap<Venue, VenueCaches>());
  const mutationGeneration = useRef(0);
  const refreshGeneration = useRef(0);

  // The same Venue instance can come back (getVenueFor caches one per venue
  // and account), so the venue key alone cannot expire what was stored under
  // it: switching away and back would resurface the old path, or a mutation
  // flag that nothing ever cleared. Adjust on the change itself, during render.
  if (navigation.venue !== venue) setNavigation({ venue, currentPath: startPath, selectedPath: null });
  if (pending.venue !== venue) setPending({ venue, value: null });
  if (refreshing.venue !== venue) setRefreshing({ venue, value: false });

  const currentPath = navigation.venue === venue ? navigation.currentPath : startPath;
  const selectedPath = navigation.venue === venue ? navigation.selectedPath : null;
  const pendingMutation = pending.venue === venue ? pending.value : null;
  const namespaceRefreshing = refreshing.venue === venue ? refreshing.value : false;

  const cachesFor = (target: Venue): VenueCaches => {
    let cached = caches.current.get(target);
    if (!cached) {
      cached = { listings: new Map(), values: new Map() };
      caches.current.set(target, cached);
    }
    return cached;
  };

  // Bumping the generation is what retires every in-flight mutation: each one
  // checks it before touching the explorer again.
  const invalidateMutation = useCallback(() => {
    ++mutationGeneration.current;
    setPending({ venue, value: null });
  }, [venue]);

  const clearSelection = useCallback(() => {
    invalidateMutation();
    setNavigation((previous) => ({
      venue,
      currentPath: previous.venue === venue ? previous.currentPath : startPath,
      selectedPath: null,
    }));
    resetValue();
  }, [invalidateMutation, resetValue, startPath, venue]);

  const loadListing = useCallback(
    async (path: string, force = false): Promise<WorkspaceEntry[]> => {
      if (!venue) {
        resetListing();
        return [];
      }
      const normalizedPath = normalizeWorkspacePath(path);
      const cache = cachesFor(venue).listings;
      if (!force) {
        const cached = cache.get(normalizedPath);
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
          cache.set(normalizedPath, listed);
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
      const cache = cachesFor(venue).values;
      if (!force) {
        const cached = cache.get(path);
        if (cached) {
          resetValue(cached);
          return;
        }
      }
      await runValue(
        async () => {
          const value = workspaceValue(await venue.workspace.read(path));
          cache.set(path, value);
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
      setNavigation((previous) => ({
        venue,
        currentPath: previous.venue === venue ? previous.currentPath : startPath,
        selectedPath: path,
      }));
      void loadValue(path);
    },
    [invalidateMutation, loadValue, startPath, venue],
  );

  useEffect(() => {
    ++mutationGeneration.current;
    ++refreshGeneration.current;
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

  const navigateTo = useCallback(
    (path: string) => {
      ++refreshGeneration.current;
      invalidateMutation();
      const normalizedPath = normalizeWorkspacePath(path);
      setNavigation({ venue, currentPath: normalizedPath, selectedPath: null });
      setRefreshing({ venue, value: false });
      resetValue();
      void loadListing(normalizedPath);
    },
    [invalidateMutation, loadListing, resetValue, venue],
  );

  const refreshNamespace = useCallback(() => {
    if (!venue) return;
    const path = selectedPath ?? currentPath;
    const [root] = normalizeWorkspacePath(path).split("/").filter(Boolean);
    if (!root) return;
    const inNamespace = (candidate: string) =>
      candidate === root || candidate.startsWith(`${root}/`);
    const { listings, values } = cachesFor(venue);
    for (const key of listings.keys()) {
      if (inNamespace(key)) listings.delete(key);
    }
    for (const key of values.keys()) {
      if (inNamespace(key)) values.delete(key);
    }
    const generation = ++refreshGeneration.current;
    setRefreshing({ venue, value: true });
    const requests: Promise<unknown>[] = [loadListing(currentPath, true)];
    if (selectedPath) {
      requests.push(loadValue(selectedPath, true));
    }
    void Promise.all(requests).finally(() => {
      if (generation === refreshGeneration.current) {
        setRefreshing({ venue, value: false });
      }
    });
  }, [currentPath, loadListing, loadValue, selectedPath, venue]);

  // Still the mutation the explorer is waiting on? Selecting another path,
  // navigating, or switching venue all bump the generation, so this one check
  // covers every way the target could have moved on.
  const mutationIsCurrent = (generation: number) => generation === mutationGeneration.current;

  // Resolves true only when a write happened. Every write is an operation —
  // a job on the venue — so an unchanged value (blurring out of an untouched
  // editor) must not write. A truncated read never writes either: the editor
  // only holds part of the value, and saving it would destroy the rest.
  const save = useCallback(
    async (value: unknown): Promise<boolean> => {
      if (!venue || !isAuthenticated || !selectedPath) return false;
      if (!isWritableWorkspaceEntry(selectedPath)) return false;
      if (selectedValue.truncated) return false;
      if (JSON.stringify(value) === JSON.stringify(selectedValue.value)) return false;
      const generation = ++mutationGeneration.current;
      const path = selectedPath;
      setPending({ venue, value: "save" });
      try {
        await venue.workspace.write(path, value);
        cachesFor(venue).values.delete(path);
        notifySuccess("Saved successfully");
        if (mutationIsCurrent(generation)) {
          void loadValue(path);
        }
        return true;
      } catch (err) {
        const { reason, jobHref } = jobFailure(err, venue.venueId);
        notifyError("Unable to save", reason, venue.baseUrl, jobHref);
        return false;
      } finally {
        if (mutationIsCurrent(generation)) {
          setPending({ venue, value: null });
        }
      }
    },
    [isAuthenticated, loadValue, selectedPath, selectedValue, venue],
  );

  const create = useCallback(
    async (key: string, rawValue: string): Promise<boolean> => {
      if (!venue || !isAuthenticated || !key.trim()) return false;
      const directory = currentPath;
      if (!isMutableWorkspacePath(directory)) return false;
      const generation = ++mutationGeneration.current;
      const path = joinWorkspacePath(directory, key);
      setPending({ venue, value: "create" });
      try {
        await venue.workspace.write(path, parseWorkspaceInput(rawValue));
        cachesFor(venue).listings.delete(directory);
        notifySuccess("Created successfully");
        if (mutationIsCurrent(generation)) {
          void loadListing(directory, true);
        }
        return true;
      } catch (err) {
        const { reason, jobHref } = jobFailure(err, venue.venueId);
        notifyError("Unable to create", reason, venue.baseUrl, jobHref);
        return false;
      } finally {
        if (mutationIsCurrent(generation)) {
          setPending({ venue, value: null });
        }
      }
    },
    [currentPath, isAuthenticated, loadListing, venue],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!venue || !isAuthenticated || !selectedPath) return false;
    if (!isWritableWorkspaceEntry(selectedPath)) return false;
    const generation = ++mutationGeneration.current;
    const path = selectedPath;
    const directory = currentPath;
    setPending({ venue, value: "delete" });
    try {
      await venue.workspace.delete(path);
      const { listings, values } = cachesFor(venue);
      values.delete(path);
      listings.delete(directory);
      notifySuccess("Deleted successfully");
      if (mutationIsCurrent(generation)) {
        clearSelection();
        void loadListing(directory, true);
      }
      return true;
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to delete", reason, venue.baseUrl, jobHref);
      return false;
    } finally {
      if (mutationIsCurrent(generation)) {
        setPending({ venue, value: null });
      }
    }
  }, [clearSelection, currentPath, isAuthenticated, loadListing, selectedPath, venue]);

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
    pendingMutation,
    namespaceRefreshing,
    navigateTo,
    selectPath,
    clearSelection,
    refreshNamespace,
    save,
    create,
    remove,
  };
}
