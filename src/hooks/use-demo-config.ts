"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage } from "@/lib/persist-storage";
import type { SeedReport } from "@/components/demo-kit/seeding";

// Per-demo, per-venue state that must survive a reload — and, for anything
// that sends the viewer to another page and back, a client-side navigation.
// Keyed demoId → venueId so two demos on two venues never collide.

type ByDemoVenue<T> = Record<string, Record<string, T>>;

type DemoConfigStore = {
  /** Editable addresses, per demo. */
  addresses: Record<string, Record<string, string>>;
  /** What the last seed created on a given venue. */
  reports: ByDemoVenue<SeedReport>;
  /** Arbitrary small facts a demo needs later (job ids, mostly). */
  memos: ByDemoVenue<Record<string, string>>;
  setAddresses: (demoId: string, patch: Record<string, string>) => void;
  resetAddresses: (demoId: string, defaults: Record<string, string>) => void;
  setReport: (demoId: string, venueId: string, report: SeedReport | null) => void;
  setMemo: (demoId: string, venueId: string, key: string, value: string | null) => void;
};

const put = <T,>(map: ByDemoVenue<T>, demoId: string, venueId: string, value: T | null) => {
  const next = { ...map, [demoId]: { ...(map[demoId] ?? {}) } };
  if (value === null) delete next[demoId][venueId];
  else next[demoId][venueId] = value;
  return next;
};

export const useDemoConfig = create(
  persist<DemoConfigStore>(
    (set) => ({
      addresses: {},
      reports: {},
      memos: {},
      setAddresses: (demoId, patch) =>
        set((state) => ({
          addresses: {
            ...state.addresses,
            [demoId]: { ...(state.addresses[demoId] ?? {}), ...patch },
          },
        })),
      resetAddresses: (demoId, defaults) =>
        set((state) => ({ addresses: { ...state.addresses, [demoId]: { ...defaults } } })),
      setReport: (demoId, venueId, report) =>
        set((state) => ({ reports: put(state.reports, demoId, venueId, report) })),
      setMemo: (demoId, venueId, key, value) =>
        set((state) => {
          const current = state.memos[demoId]?.[venueId] ?? {};
          const next = { ...current };
          if (value === null) delete next[key];
          else next[key] = value;
          return { memos: put(state.memos, demoId, venueId, next) };
        }),
    }),
    {
      name: "covia-demos",
      storage: createJSONStorage(browserStorage),
      merge: (persisted, current) => {
        const saved = persisted as Partial<DemoConfigStore> | undefined;
        return {
          ...current,
          addresses: saved?.addresses ?? {},
          reports: saved?.reports ?? {},
          memos: saved?.memos ?? {},
        };
      },
    },
  ),
);

/** Addresses for one demo, with its defaults filling any gap. */
export function useDemoAddresses<T extends Record<string, string>>(
  demoId: string,
  defaults: T,
): { addresses: T; setAddresses: (patch: Partial<T>) => void; reset: () => void } {
  const stored = useDemoConfig((s) => s.addresses[demoId]);
  const setAddresses = useDemoConfig((s) => s.setAddresses);
  const resetAddresses = useDemoConfig((s) => s.resetAddresses);
  return {
    addresses: { ...defaults, ...(stored ?? {}) } as T,
    setAddresses: (patch) => setAddresses(demoId, patch as Record<string, string>),
    reset: () => resetAddresses(demoId, defaults),
  };
}
