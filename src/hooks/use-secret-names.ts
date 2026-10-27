"use client";

import type { Venue } from "@covia/covia-sdk";
import { useVenueRead } from "@/hooks/use-venue-read";

const NO_NAMES: string[] = [];

/**
 * The caller's stored secret names on `venue`, for the pickers and readiness
 * checks that only need to know which keys exist. A job-free REST read held
 * with the venue it answers for (useVenueRead), so a venue switch never shows
 * another venue's names. Quiet on failure: callers treat an unreadable list as
 * empty, which only means fewer options offered.
 */
export function useSecretNames(
  venue: Venue | null | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { data, loading, error } = useVenueRead<string[]>({
    venue,
    enabled,
    initial: NO_NAMES,
    notify: false,
    failureTitle: "Unable to list secrets",
    load: async (target) => {
      const names = await target.secrets.list();
      return Array.isArray(names) ? names : [];
    },
  });
  return { names: data, loading, error };
}
