"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TONE_STYLES } from "@/lib/status";
import { useVenueHealth } from "@/hooks/use-venue-health";
import { useVenueAccess } from "@/hooks/use-venue-access";
import { useValidateVenueById } from "@/hooks/use-authenticated-venue";

// Reachability indicator for a venue's transport address. The tooltip carries
// the same detail the error toasts would — an unreachable venue is visible
// here before any page fails against it.
export function VenueHealthDot({ baseUrl, venueId }: { baseUrl?: string; venueId?: string }) {
  useValidateVenueById(venueId);
  const health = useVenueHealth((x) => (baseUrl ? x.byUrl[baseUrl] : undefined));
  const { state, detail } = useVenueAccess(baseUrl, venueId);
  const color =
    state === "connected" || state === "public" ? TONE_STYLES.success.dot
    : state === "connecting" || state === "auth-checking" ? `${TONE_STYLES.attention.dot} animate-pulse`
    : state === "signed-out" || state === "auth-unverified" ? TONE_STYLES.attention.dot
    : state === "auth-rejected" ? TONE_STYLES.failure.dot
    : "bg-muted-foreground/40";
  const label =
    state === "connected" ? `Connected and signed in${health?.state === "connected" && health.version ? ` — venue ${health.version}` : ""}`
    : state === "public" ? `Connected — public access${health?.state === "connected" && health.version ? ` — venue ${health.version}` : ""}`
    : state === "signed-out" ? "Connected — signed out"
    : state === "auth-checking" ? "Connected — checking account…"
    : state === "auth-rejected" ? `Connected — account rejected: ${detail}`
    : state === "auth-unverified" ? `Connected — account could not be verified: ${detail}`
    : state === "connecting" ? "Connecting…"
    : state === "unreachable" ? `Unreachable — ${detail}`
    : "Not checked yet";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-testid="venue-health-dot"
          data-health={state}
          className={`inline-block h-2 w-2 rounded-full shrink-0 ${color}`}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
