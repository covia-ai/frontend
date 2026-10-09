"use client";

import { useIsAuthenticated } from "@/hooks/use-auth";
import { useVenueAccessState } from "@/hooks/use-venue-auth-health";
import { useVenues } from "@/hooks/use-venues";

// Whether write affordances (create, run, store, connect…) should be offered
// on a venue. Signing in is necessary but not sufficient: a venue that doesn't
// admit the account (no users.autoCreate, account not provisioned) answers
// every write with 403, so offering the button only sets up a failure.
//
// Signed-out callers are always locked out here. A venue may allow anonymous
// writes (auth.public.caps), but it doesn't report that scope yet
// (covia-ai/covia#562, frontend#220).

export type WriteLockReason = "signed-out" | "not-admitted";

export type WriteAccess = {
  canWrite: boolean;
  reason: WriteLockReason | null;
  /** Label for the disabled stand-in button, e.g. "Sign in to create". */
  lockedLabel: (action: string) => string;
  /** Longer explanation for a tooltip, when there is more to say. */
  lockedTitle?: string;
};

const NOT_ADMITTED_TITLE =
  "This venue hasn't admitted your account, so it refuses changes. Switch account, or ask the venue's operator to admit you.";

export function useWriteAccess(options: { venueId?: string; signedIn?: boolean } = {}): WriteAccess {
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const signedInHere = useIsAuthenticated();
  const signedIn = options.signedIn ?? signedInHere;
  const access = useVenueAccessState(options.venueId ?? selectedVenueId ?? undefined);

  if (!signedIn) {
    return { canWrite: false, reason: "signed-out", lockedLabel: (action) => `Sign in to ${action}` };
  }
  if (access.state === "rejected") {
    return {
      canWrite: false,
      reason: "not-admitted",
      lockedLabel: () => "Account not admitted",
      lockedTitle: NOT_ADMITTED_TITLE,
    };
  }
  return { canWrite: true, reason: null, lockedLabel: (action) => `Sign in to ${action}` };
}
