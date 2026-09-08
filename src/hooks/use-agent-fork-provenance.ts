import { create } from "zustand";

// The venue records forkedFrom only in the agent:fork job result, not on the
// forked agent's own persistent state (see AgentAdapter#handleFork) — so
// there's nothing to re-read from agent:info after the fact. This mirrors
// that: a client-side, per-venue note captured at fork time so the Explorer
// can still show provenance after the initial success toast scrolls away.
// Deliberately not persisted — same reasoning as use-pending-chats: a note
// about "how this session forked something" doesn't need to survive a reload.
export type ForkRecord = { venueId: string; agentId: string; forkedFrom: string };

type AgentForkProvenanceStore = {
  records: ForkRecord[];
  record: (venueId: string, agentId: string, forkedFrom: string) => void;
  forkedFromOf: (venueId: string, agentId: string) => string | null;
};

export const useAgentForkProvenance = create<AgentForkProvenanceStore>((set, get) => ({
  records: [],

  record: (venueId, agentId, forkedFrom) =>
    set((state) => ({
      records: [
        ...state.records.filter((r) => !(r.venueId === venueId && r.agentId === agentId)),
        { venueId, agentId, forkedFrom },
      ],
    })),

  forkedFromOf: (venueId, agentId) =>
    get().records.find((r) => r.venueId === venueId && r.agentId === agentId)?.forkedFrom ?? null,
}));
