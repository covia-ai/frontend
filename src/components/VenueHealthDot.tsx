"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    state === "connected" || state === "public" ? "bg-green-500"
    : state === "connecting" || state === "auth-checking" ? "bg-amber-400 animate-pulse"
    : state === "signed-out" || state === "auth-unverified" ? "bg-amber-400"
    : state === "auth-rejected" ? "bg-red-500"
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
