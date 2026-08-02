"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage } from "@/lib/persist-storage";
import {
  AdaptiveRiskAddresses,
  DEFAULT_ADDRESSES,
} from "@/components/adaptive-risk/fixtures";

export type SeedItemStatus = "created" | "existing" | "removed" | "failed";

export type SeedItemResult = {
  kind: "value" | "operation" | "policy-asset" | "agent";
  label: string;
  address: string;
  status: SeedItemStatus;
  /** The venue's own error string, verbatim, when status is "failed". */
  error?: string;
};

export type SeedReport = {
  seededAt: number;
  items: SeedItemResult[];
};

/** Beat 4 sends the viewer to the Inbox and back, so its job ids must
 *  survive navigation — React state does not. Keyed by venue. */
export type EscalationRef = {
  analysisJobId: string | null;
  askJobId: string;
};

type AdaptiveRiskConfigStore = {
  addresses: AdaptiveRiskAddresses;
  escalations: Record<string, EscalationRef>;
  /** Seed reports keyed by venueId — a seed on one venue says nothing about another. */
  reports: Record<string, SeedReport>;
  setAddresses: (patch: Partial<AdaptiveRiskAddresses>) => void;
  resetAddresses: () => void;
  setReport: (venueId: string, report: SeedReport | null) => void;
  setEscalation: (venueId: string, ref: EscalationRef | null) => void;
};

export const useAdaptiveRiskConfig = create(
  persist<AdaptiveRiskConfigStore>(
    (set) => ({
      addresses: DEFAULT_ADDRESSES,
      reports: {},
      escalations: {},
      setAddresses: (patch) =>
        set((state) => ({ addresses: { ...state.addresses, ...patch } })),
      resetAddresses: () => set({ addresses: DEFAULT_ADDRESSES }),
      setEscalation: (venueId, ref) =>
        set((state) => {
          const escalations = { ...state.escalations };
          if (ref) escalations[venueId] = ref;
          else delete escalations[venueId];
          return { escalations };
        }),
      setReport: (venueId, report) =>
        set((state) => {
          const reports = { ...state.reports };
          if (report) reports[venueId] = report;
          else delete reports[venueId];
          return { reports };
        }),
    }),
    {
      name: "adaptive-risk-demo",
      storage: createJSONStorage(browserStorage),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AdaptiveRiskConfigStore> | undefined;
        return {
          ...current,
          // New address fields added in later versions keep their defaults.
          addresses: { ...DEFAULT_ADDRESSES, ...(saved?.addresses ?? {}) },
          reports: saved?.reports ?? {},
          escalations: saved?.escalations ?? {},
        };
      },
    },
  ),
);
