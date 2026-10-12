"use client";

import { useIsAuthenticated } from "@/hooks/use-auth";
import { useVenueAccessState } from "@/hooks/use-venue-auth-health";
import { useVenueHealth } from "@/hooks/use-venue-health";
import { useVenues } from "@/hooks/use-venues";

// Whether write affordances (create, run, store, connect…) should be offered
// on a venue. Signing in is necessary but not sufficient: a venue that doesn't
// admit the account (no users.autoCreate, account not provisioned) answers
// every write with 403, so offering the button only sets up a failure.
//
// Signed-out callers write only where the call site opts in (`anonymous`) and
// the venue reports `access.publicCaps: "unrestricted"` (covia-ai/covia#562).
// Every signed-out caller shares one account on the venue (`<venue>:public`),
// so anything stored that way is visible to the next anonymous visitor: never
// opt in for credentials or other per-person state. "custom" names no
// particular write, so it stays locked too (frontend#220).

export type WriteLockReason = "signed-out" | "not-admitted";

export type WriteAccess = {
  canWrite: boolean;
  reason: WriteLockReason | null;
  /** Label for the disabled stand-in button, e.g. "Sign in to create". */
  lockedLabel: (action: string) => string;
  /** Longer explanation for a tooltip, when there is more to say. */
  lockedTitle?: string;
  /** Signed out, writing as the venue's shared anonymous account. */
  anonymous?: boolean;
  /** Says so, for a hint beside the write affordance. Set when `anonymous`. */
  anonymousNote?: string;
};

const ANONYMOUS_NOTE =
  "You're signed out, so this uses the venue's shared guest account. Anyone else signed out can see what you create or run. Sign in to keep it to yourself.";

const NOT_ADMITTED_TITLE =
  "This venue hasn't admitted your account, so it refuses changes. Switch account, or ask the venue's operator to admit you.";

export function useWriteAccess(
  options: { venueId?: string; signedIn?: boolean; anonymous?: boolean } = {},
): WriteAccess {
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const venueId = options.venueId ?? selectedVenueId ?? undefined;
  const baseUrl = useVenues((state) => state.venues.find((v) => v.venueId === venueId)?.baseUrl);
  const publicCaps = useVenueHealth((state) => {
    const health = baseUrl ? state.byUrl[baseUrl] : undefined;
    return health?.state === "connected" ? health.publicCaps : undefined;
  });
  const signedInHere = useIsAuthenticated();
  const signedIn = options.signedIn ?? signedInHere;
  const access = useVenueAccessState(venueId);

  if (!signedIn) {
    if (options.anonymous && publicCaps === "unrestricted") {
      return {
        canWrite: true,
        reason: null,
        anonymous: true,
        anonymousNote: ANONYMOUS_NOTE,
        lockedLabel: (action) => `Sign in to ${action}`,
      };
    }
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
