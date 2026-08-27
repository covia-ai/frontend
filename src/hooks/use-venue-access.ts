"use client";

import { useVenueHealth } from "@/hooks/use-venue-health";
import { useVenueAccessState } from "@/hooks/use-venue-auth-health";

// The read-access verdict for a venue, folding transport reachability
// (useVenueHealth) together with account status (useVenueAccessState) into
// the single state a caller actually needs: can I read from this venue right
// now, and if not, why. Mirrors the derivation VenueHealthDot has always done
// for its tooltip — pulled out here so data-fetching components can gate on
// the same signal instead of firing a request and rendering whatever error
// comes back.
export type VenueAccessState =
  | "unknown"
  | "connecting"
  | "unreachable"
  | "connected" // signed in, account accepted
  | "public" // signed out, venue allows anonymous reads
  | "signed-out" // signed out, venue requires an account
  | "auth-rejected" // signed in, venue rejected the account
  | "auth-unverified" // signed in, account status couldn't be confirmed
  | "auth-checking"; // signed in, account status not back yet

export type VenueAccessSummary = {
  state: VenueAccessState;
  detail?: string;
};

export function useVenueAccess(baseUrl?: string, venueId?: string): VenueAccessSummary {
  const health = useVenueHealth((x) => (baseUrl ? x.byUrl[baseUrl] : undefined));
  const access = useVenueAccessState(venueId);
  const transportState = health?.state ?? "unknown";
  const publicAccess = health?.state === "connected" ? health.publicAccess : undefined;

  if (transportState !== "connected" || !venueId) {
    return {
      state: transportState as VenueAccessState,
      detail: health?.state === "unreachable" ? health.detail : undefined,
    };
  }
  if (access.state === "accepted") return { state: "connected" };
  if (access.state === "signed-out" && publicAccess === true) return { state: "public" };
  if (access.state === "signed-out") return { state: "signed-out" };
  if (access.state === "rejected") return { state: "auth-rejected", detail: access.detail };
  if (access.state === "unverified") return { state: "auth-unverified", detail: access.detail };
  return { state: "auth-checking" };
}
