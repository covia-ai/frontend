"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage } from "@/lib/persist-storage";

// Persistent log of every notification shown to the user, fed by the notify
// helpers (lib/notify.ts) and surfaced both on the Profile page and the
// TopBar's notification bell (issue #241). Backed by localStorage — unlike
// the sessionStorage this used before #241, entries and their read-state
// must survive a closed tab, since the whole point is "what happened while
// I was away."

export type NotificationKind = "success" | "error" | "warning" | "info";

export type NotificationEntry = {
  id: number;
  kind: NotificationKind;
  title: string;
  description?: string;
  at: number; // epoch ms
  read: boolean;
  // Scoping/deep-link, both derived from receiptHref (never passed
  // separately) so the ~30 existing notifyError call sites that already
  // pass a jobHref need no changes to populate venue grouping.
  venueId?: string;
  receiptHref?: string;
};

// Bounded so a long session can't grow the store without limit.
export const MAX_LOG_ENTRIES = 200;

// receiptHref is always "/venues/<venueId>/jobs/<jobId>" today (see
// notify.ts's jobFailure()) — pull the venue back out of it rather than
// threading a separate venueId param through every call site.
function venueIdFromReceiptHref(receiptHref?: string): string | undefined {
  const match = receiptHref?.match(/^\/venues\/([^/]+)\//);
  return match ? decodeURIComponent(match[1]) : undefined;
}

type NotificationLogState = {
  entries: NotificationEntry[]; // newest first
  record: (
    kind: NotificationKind,
    title: string,
    description?: string,
    receiptHref?: string,
  ) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  clear: () => void;
};

export const useNotificationLog = create<NotificationLogState>()(
  persist(
    (set) => ({
      entries: [],
      record: (kind, title, description, receiptHref) =>
        set((state) => ({
          entries: [
            {
              // Newest-first, so the head entry always carries the max id.
              id: (state.entries[0]?.id ?? 0) + 1,
              kind,
              title,
              description,
              at: Date.now(),
              read: false,
              venueId: venueIdFromReceiptHref(receiptHref),
              receiptHref,
            },
            ...state.entries,
          ].slice(0, MAX_LOG_ENTRIES),
        })),
      markRead: (id) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, read: true } : entry,
          ),
        })),
      markAllRead: () =>
        set((state) => ({
          entries: state.entries.map((entry) => ({ ...entry, read: true })),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "notification-log",
      storage: createJSONStorage(browserStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

// Module-level accessor for non-React callers (the notify helpers).
export function recordNotification(
  kind: NotificationKind,
  title: string,
  description?: string,
  receiptHref?: string,
): void {
  useNotificationLog.getState().record(kind, title, description, receiptHref);
}
