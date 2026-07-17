"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVenueHealth } from "@/hooks/use-venue-health";

// Reachability indicator for a venue's transport address. The tooltip carries
// the same detail the error toasts would — an unreachable venue is visible
// here before any page fails against it.
export function VenueHealthDot({ baseUrl }: { baseUrl?: string }) {
  const health = useVenueHealth((x) => (baseUrl ? x.byUrl[baseUrl] : undefined));
  const state = health?.state ?? "unknown";
  const color =
    state === "connected" ? "bg-green-500"
    : state === "connecting" ? "bg-amber-400 animate-pulse"
    : state === "unreachable" ? "bg-red-500"
    : "bg-muted-foreground/40";
  const label =
    health?.state === "connected" ? `Connected${health.version ? ` — venue ${health.version}` : ""}`
    : health?.state === "connecting" ? "Connecting…"
    : health?.state === "unreachable" ? `Unreachable — ${health.detail}`
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
