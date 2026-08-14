"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserSessionStorage } from "@/lib/persist-storage";

// Session-scoped log of every notification shown to the user, fed by the
// notify helpers (lib/notify.ts) and surfaced on the Profile page. Backed by
// sessionStorage: per-tab and gone when the tab closes, but it survives
// reloads and dev-server hot reloads — a toast the user saw must still be in
// the log when they go looking for it.

export type NotificationKind = "success" | "error" | "warning" | "info";

export type NotificationEntry = {
  id: number;
  kind: NotificationKind;
  title: string;
  description?: string;
  at: number; // epoch ms
};

// Bounded so a long session can't grow the store without limit.
export const MAX_LOG_ENTRIES = 200;

type NotificationLogState = {
  entries: NotificationEntry[]; // newest first
  record: (kind: NotificationKind, title: string, description?: string) => void;
  clear: () => void;
};

export const useNotificationLog = create<NotificationLogState>()(
  persist(
    (set) => ({
      entries: [],
      record: (kind, title, description) =>
        set((state) => ({
          entries: [
            {
              // Newest-first, so the head entry always carries the max id.
              id: (state.entries[0]?.id ?? 0) + 1,
              kind,
              title,
              description,
              at: Date.now(),
            },
            ...state.entries,
          ].slice(0, MAX_LOG_ENTRIES),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "notification-log",
      storage: createJSONStorage(browserSessionStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

// Module-level accessor for non-React callers (the notify helpers).
export function recordNotification(
  kind: NotificationKind,
  title: string,
  description?: string,
): void {
  useNotificationLog.getState().record(kind, title, description);
}
