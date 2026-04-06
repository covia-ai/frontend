"use client";

import { useMemo } from "react";
import { Venue, BearerAuth } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useAuthStore } from "@/hooks/use-auth";

export function useAuthenticatedVenue(): Venue | null {
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const auth = useAuthStore((x) => x.auth);

  return useMemo(() => {
    if (!venueObj) return null;
    return new Venue({
      baseUrl: venueObj?.baseUrl,
      venueId: venueObj?.venueId,
      name: venueObj?.metadata?.name,
      auth: auth ? new BearerAuth(auth.token) : undefined,
    });
  }, [venueObj, auth]);
}
