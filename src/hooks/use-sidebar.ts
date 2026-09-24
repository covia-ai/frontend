import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { browserStorage } from "@/lib/persist-storage";

type SidebarStore = {
  isOpen: boolean;
  toggleOpen: () => void;
};

// Safe to read during render without a hydration guard: on the server and for
// the hydration render zustand serves the initial state (`isOpen: true`), then
// re-renders with the persisted value.
export const useSidebar = create(
  persist<SidebarStore, [], [], Pick<SidebarStore, "isOpen">>(
    (set, get) => ({
      isOpen: true,
      toggleOpen: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: "sidebar",
      storage: createJSONStorage(browserStorage),
      partialize: ({ isOpen }) => ({ isOpen }),
      // Earlier versions persisted hover and settings state under this key;
      // take only what is still meaningful.
      merge: (persisted, current) => {
        const saved = persisted as { isOpen?: unknown } | undefined;
        return { ...current, isOpen: typeof saved?.isOpen === "boolean" ? saved.isOpen : current.isOpen };
      },
    },
  ),
);
