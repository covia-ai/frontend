"use client";

import { useMemo } from "react";
import { Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useAuthStore } from "@/hooks/use-auth";
import { createAuthProvider } from "@/lib/auth-provider";

export function useAuthenticatedVenue(): Venue | null {
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);

  return useMemo(() => {
    if (!venueObj) return null;
    const auth = getAuthForVenue(venueObj.venueId);
    return new Venue({
      baseUrl: venueObj?.baseUrl,
      venueId: venueObj?.venueId,
      name: venueObj?.metadata?.name,
      auth: createAuthProvider(auth),
    });
  }, [venueObj, authMap, getAuthForVenue]);
}
