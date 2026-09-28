"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

type StoredValueOptions = {
  /**
   * Window events, besides `storage`, after which the value is read again —
   * the custom event a writer dispatches so same-tab listeners hear about it.
   */
  events?: readonly string[];
};

/**
 * A value that lives in the browser — localStorage, sessionStorage, the URL —
 * read the way React wants external state read: through useSyncExternalStore,
 * so the server render and the first client render agree (both see
 * `undefined`) and the real value arrives with hydration rather than through a
 * setState in an effect.
 *
 * `read` runs on every render and after each notification; its result is
 * compared structurally, so an unchanged value keeps its identity and can be a
 * dependency. Keep it cheap. Pass a stable function (or a `useCallback`): a new
 * `read` re-reads, which is how what is being read changes.
 *
 * Returns `[value, refresh]`. `refresh()` re-reads after a write the calling
 * code has just made itself, which no event announces.
 */
export function useStoredValue<T>(
  read: () => T,
  { events = [] }: StoredValueOptions = {},
): [T | undefined, () => void] {
  const listeners = useRef<Set<() => void> | null>(null);
  const cache = useRef<{ value: T; json: string | null } | null>(null);
  const eventKey = events.join("\u0000");

  const subscribe = useCallback(
    (onChange: () => void) => {
      const set = (listeners.current ??= new Set());
      set.add(onChange);
      const names = ["storage", ...(eventKey ? eventKey.split("\u0000") : [])];
      for (const name of names) window.addEventListener(name, onChange);
      return () => {
        set.delete(onChange);
        for (const name of names) window.removeEventListener(name, onChange);
      };
    },
    [eventKey],
  );

  const getSnapshot = useCallback(() => {
    const value = read();
    const cached = cache.current;
    if (cached && (Object.is(cached.value, value) || (cached.json !== null && cached.json === toJson(value)))) {
      return cached.value;
    }
    cache.current = { value, json: toJson(value) };
    return value;
  }, [read]);

  const refresh = useCallback(() => {
    for (const notify of listeners.current ?? []) notify();
  }, []);

  return [useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot), refresh];
}

const getServerSnapshot = () => undefined;

// Structural identity for the snapshot; null when the value cannot be
// serialised, in which case only reference equality counts.
function toJson(value: unknown): string | null {
  try {
    return JSON.stringify(value) ?? "undefined";
  } catch {
    return null;
  }
}
