"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage } from "@/lib/persist-storage";

// Assets are immutable and content-addressed (see workspace CLAUDE.md), so
// "pinned" is a client-side, per-user preference rather than a mutation of
// asset metadata on the venue. Scoped per venue since the same asset id
// shape can exist on different venues.
export type PinnedAssetKey = { venueId: string; assetId: string };

type PinnedAssetsState = {
  pinned: PinnedAssetKey[];
  isPinned: (venueId: string, assetId: string) => boolean;
  pin: (venueId: string, assetId: string) => void;
  unpin: (venueId: string, assetId: string) => void;
  togglePin: (venueId: string, assetId: string) => void;
};

export const usePinnedAssets = create<PinnedAssetsState>()(
  persist(
    (set, get) => ({
      pinned: [],

      isPinned: (venueId, assetId) =>
        get().pinned.some((p) => p.venueId === venueId && p.assetId === assetId),

      pin: (venueId, assetId) =>
        set((state) => {
          if (state.pinned.some((p) => p.venueId === venueId && p.assetId === assetId)) return state;
          return { pinned: [...state.pinned, { venueId, assetId }] };
        }),

      unpin: (venueId, assetId) =>
        set((state) => ({
          pinned: state.pinned.filter((p) => !(p.venueId === venueId && p.assetId === assetId)),
        })),

      togglePin: (venueId, assetId) => {
        if (get().isPinned(venueId, assetId)) {
          get().unpin(venueId, assetId);
        } else {
          get().pin(venueId, assetId);
        }
      },
    }),
    {
      name: "pinned-assets",
      storage: createJSONStorage(browserStorage),
    },
  ),
);
