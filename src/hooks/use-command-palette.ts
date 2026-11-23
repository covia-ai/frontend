"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage } from "@/lib/persist-storage";
import type { PaletteItemKind } from "@/lib/command-palette";

export type PaletteRecentItem = {
  kind: PaletteItemKind;
  id: string;
  title: string;
  venueId: string;
  href: string;
  requiresVenueSwitch: boolean;
};

const MAX_RECENT_ITEMS = 10;

type CommandPaletteStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  recentItems: PaletteRecentItem[];
  pushRecent: (item: PaletteRecentItem) => void;
};

const sameItem = (a: PaletteRecentItem, b: PaletteRecentItem) =>
  a.kind === b.kind && a.id === b.id && a.venueId === b.venueId;

export const useCommandPalette = create<CommandPaletteStore>()(
  persist(
    (set, get) => ({
      open: false,
      setOpen: (open) => set({ open }),
      toggle: () => set({ open: !get().open }),
      recentItems: [],
      pushRecent: (item) =>
        set((state) => ({
          recentItems: [item, ...state.recentItems.filter((r) => !sameItem(r, item))].slice(
            0,
            MAX_RECENT_ITEMS,
          ),
        })),
    }),
    {
      name: "command-palette",
      storage: createJSONStorage(browserStorage),
      partialize: (state) => ({ recentItems: state.recentItems }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<CommandPaletteStore> | undefined;
        const recentItems = Array.isArray(saved?.recentItems)
          ? saved.recentItems.filter(
              (item): item is PaletteRecentItem =>
                !!item && typeof item === "object" && typeof item.id === "string",
            )
          : [];
        return { ...current, recentItems: recentItems.slice(0, MAX_RECENT_ITEMS) };
      },
    },
  ),
);
