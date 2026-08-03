"use client";

import { create } from "zustand";

// Session-only log of every notification shown to the user, fed by the
// notify helpers (lib/notify.ts) and surfaced on the Profile page.
// Deliberately not persisted — it resets on reload.

export type NotificationKind = "success" | "error" | "warning" | "info";

export type NotificationEntry = {
  id: number;
  kind: NotificationKind;
  title: string;
  description?: string;
  at: number; // epoch ms
};

// Bounded so a long session can't grow memory without limit.
export const MAX_LOG_ENTRIES = 200;

let nextId = 1;

type NotificationLogState = {
  entries: NotificationEntry[]; // newest first
  record: (kind: NotificationKind, title: string, description?: string) => void;
  clear: () => void;
};

export const useNotificationLog = create<NotificationLogState>((set) => ({
  entries: [],
  record: (kind, title, description) =>
    set((state) => ({
      entries: [
        { id: nextId++, kind, title, description, at: Date.now() },
        ...state.entries,
      ].slice(0, MAX_LOG_ENTRIES),
    })),
  clear: () => set({ entries: [] }),
}));

// Module-level accessor for non-React callers (the notify helpers).
export function recordNotification(
  kind: NotificationKind,
  title: string,
  description?: string,
): void {
  useNotificationLog.getState().record(kind, title, description);
}
