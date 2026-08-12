"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVenueHealth } from "@/hooks/use-venue-health";
import { useVenueAccessState } from "@/hooks/use-venue-auth-health";
import { useValidateVenueById } from "@/hooks/use-authenticated-venue";

// Reachability indicator for a venue's transport address. The tooltip carries
// the same detail the error toasts would — an unreachable venue is visible
// here before any page fails against it.
export function VenueHealthDot({ baseUrl, venueId }: { baseUrl?: string; venueId?: string }) {
  useValidateVenueById(venueId);
  const health = useVenueHealth((x) => (baseUrl ? x.byUrl[baseUrl] : undefined));
  const access = useVenueAccessState(venueId);
  const transportState = health?.state ?? "unknown";
  const publicAccess = health?.state === "connected" ? health.publicAccess : undefined;
  const state = transportState !== "connected" || !venueId
    ? transportState
    : access.state === "accepted" ? "connected"
    : access.state === "signed-out" && publicAccess === true ? "public"
    : access.state === "signed-out" ? "signed-out"
    : access.state === "rejected" ? "auth-rejected"
    : access.state === "unverified" ? "auth-unverified"
    : "auth-checking";
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
    : state === "auth-rejected" && access.state === "rejected" ? `Connected — account rejected: ${access.detail}`
    : state === "auth-unverified" && access.state === "unverified" ? `Connected — account could not be verified: ${access.detail}`
    : state === "connecting" ? "Connecting…"
    : state === "unreachable" && health?.state === "unreachable" ? `Unreachable — ${health.detail}`
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
