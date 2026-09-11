"use client";

import { cn } from "@/lib/utils";
import { useVenueAccess } from "@/hooks/use-venue-access";
import { VenueHealthDot } from "./VenueHealthDot";

// The health dot (tested, carries data-health) plus a short readable label —
// one "trust" chip for a venue's real access state. Keyed on the same
// useVenueAccess states the dot colours, so there's no second state machine and
// nothing to drift. Shared by the venue card and the detail identity hero.
const TRUST_LABEL: Record<string, string> = {
  connected: "Signed in",
  public: "Public",
  "signed-out": "Sign in",
  "auth-checking": "Checking…",
  connecting: "Connecting…",
  "auth-rejected": "Rejected",
  "auth-unverified": "Unverified",
  unreachable: "Unreachable",
};

export function VenueTrustPill({
  baseUrl,
  venueId,
  className,
}: {
  baseUrl?: string;
  venueId?: string;
  className?: string;
}) {
  const { state } = useVenueAccess(baseUrl, venueId);
  const trust = TRUST_LABEL[state] ?? "";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <VenueHealthDot baseUrl={baseUrl} venueId={venueId} />
      {trust && <span className="font-mono text-[11px] font-medium text-muted-foreground">{trust}</span>}
    </span>
  );
}
