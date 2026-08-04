"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage } from "@/lib/persist-storage";

// User-assigned session names, keyed by "venueId::agentId::sessionId" so the
// same session id can never collide across venues or agents. Purely a local
// display override — the venue has no concept of a session name, so this
// never round-trips to the server.
type SessionNamesStore = {
  names: Record<string, string>;
  setName: (key: string, name: string) => void;
  clearName: (key: string) => void;
};

export const sessionNameKey = (
  venueId: string,
  agentId: string,
  sessionId: string,
) => `${venueId}::${agentId}::${sessionId}`;

export const useSessionNames = create(
  persist<SessionNamesStore>(
    (set) => ({
      names: {},
      setName: (key, name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) {
            const { [key]: _drop, ...rest } = state.names;
            return { names: rest };
          }
          return { names: { ...state.names, [key]: trimmed } };
        }),
      clearName: (key) =>
        set((state) => {
          const { [key]: _drop, ...rest } = state.names;
          return { names: rest };
        }),
    }),
    {
      name: "session-names",
      storage: createJSONStorage(browserStorage),
    },
  ),
);
