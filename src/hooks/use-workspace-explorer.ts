"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Venue, WorkspaceReadResult } from "@covia/covia-sdk";
import { toast } from "sonner";
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

export type WorkspaceMutation =
  | "save"
  | "create"
  | "append"
  | "delete"
  | null;

const EMPTY_VALUE: WorkspaceValue = {
  exists: false,
  value: null,
  type: "",
};

export function normalizeWorkspacePath(path?: string): string {
  const segments = path?.split("/").filter(Boolean) ?? [];
  return segments.length > 0 ? segments.join("/") : "/";
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

  const loadListing = useCallback(
    async (path: string) => {
      if (!venue) {
        resetListing();
        return;
      }
      const normalizedPath = normalizeWorkspacePath(path);
      await runListing(
        async () => {
          const result = await venue.workspace.list(normalizedPath);
          return (result.keys ?? []).map((key) => ({ key }));
        },
        { clear: true },
      );
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
    void loadListing("/");
  }, [loadListing, resetValue]);

  useEffect(() => {
    if (listingError) toast("Unable to list workspace");
  }, [listingError]);

  useEffect(() => {
    if (valueError) toast("Unable to read path");
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
      void loadListing(normalizedPath);
    },
    [clearSelection, loadListing],
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

  const refreshListing = useCallback(() => {
    void loadListing(currentPathRef.current);
  }, [loadListing]);

  const cancelEdit = useCallback(() => {
    setEditedData(selectedValue.value);
    setEditMode(false);
  }, [selectedValue.value]);

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

  const save = useCallback(async (): Promise<boolean> => {
    if (!venue || !isAuthenticated || !selectedPath) return false;
    const generation = ++mutationGeneration.current;
    const path = selectedPath;
    const value = editedData;
    setPendingMutation("save");
    try {
      await venue.workspace.write(path, value);
      toast("Saved successfully");
      if (mutationIsCurrent(generation, venue, path)) {
        setEditMode(false);
        void loadValue(path);
      }
      return true;
    } catch {
      toast("Unable to save");
      return false;
    } finally {
      if (mutationIsCurrent(generation, venue, path)) {
        setPendingMutation(null);
      }
    }
  }, [
    editedData,
    isAuthenticated,
    loadValue,
    mutationIsCurrent,
    selectedPath,
    venue,
  ]);

  const create = useCallback(
    async (key: string, rawValue: string): Promise<boolean> => {
      if (!venue || !isAuthenticated || !key.trim()) return false;
      const generation = ++mutationGeneration.current;
      const directory = currentPathRef.current;
      const path = joinWorkspacePath(directory, key);
      setPendingMutation("create");
      try {
        await venue.workspace.write(path, parseWorkspaceInput(rawValue));
        toast("Created successfully");
        if (mutationIsCurrent(generation, venue, undefined, directory)) {
          void loadListing(directory);
        }
        return true;
      } catch {
        toast("Unable to create");
        return false;
      } finally {
        if (mutationIsCurrent(generation, venue, undefined, directory)) {
          setPendingMutation(null);
        }
      }
    },
    [isAuthenticated, loadListing, mutationIsCurrent, venue],
  );

  const append = useCallback(
    async (rawValue: string): Promise<boolean> => {
      if (
        !venue ||
        !isAuthenticated ||
        !selectedPath ||
        !rawValue.trim()
      ) {
        return false;
      }
      const generation = ++mutationGeneration.current;
      const path = selectedPath;
      setPendingMutation("append");
      try {
        await venue.workspace.append(path, parseWorkspaceInput(rawValue));
        toast("Appended successfully");
        if (mutationIsCurrent(generation, venue, path)) {
          void loadValue(path);
        }
        return true;
      } catch {
        toast("Unable to append");
        return false;
      } finally {
        if (mutationIsCurrent(generation, venue, path)) {
          setPendingMutation(null);
        }
      }
    },
    [isAuthenticated, loadValue, mutationIsCurrent, selectedPath, venue],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!venue || !isAuthenticated || !selectedPath) return false;
    const generation = ++mutationGeneration.current;
    const path = selectedPath;
    const directory = currentPathRef.current;
    setPendingMutation("delete");
    try {
      await venue.workspace.delete(path);
      toast("Deleted successfully");
      if (mutationIsCurrent(generation, venue, path, directory)) {
        clearSelection();
        void loadListing(directory);
      }
      return true;
    } catch {
      toast("Unable to delete");
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
    cancelEdit,
    navigateTo,
    selectPath,
    refreshListing,
    save,
    create,
    append,
    remove,
  };
}
