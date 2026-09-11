"use client";

import { useMemo } from "react";
import { AIPrompt } from "@/components/AIPrompt";
import { JumpBackIn } from "@/components/home/JumpBackIn";
import { QuickActions } from "@/components/home/QuickActions";
import { VenuePulse } from "@/components/home/VenuePulse";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useAgentRoster } from "@/hooks/use-agent-roster";
import { useHomeExtras } from "@/hooks/use-home-extras";

// Generic, venue-agnostic openers — enough to unstick a blank page without
// pretending to know what this person does. They FILL the composer (never
// auto-send), matching the Chat redesign's starter pattern.
const HOME_STARTERS = [
  "Summarise my open work",
  "Draft an agent for release notes",
  "What can this venue do?",
  "Run an operation on a file",
];

/**
 * Home as a launchpad. The composer (`AIPrompt`) is the hero — it renders and
 * paints first, unchanged, still handing off to /agents/chat on submit. The
 * launchpad sections below are additive and hydrate from job-free reads after
 * the composer is already on screen; they show only when signed in, and each
 * folds away on a fresh venue rather than showing an empty frame. Home makes
 * ZERO blocking calls: the composer never waits on any of this.
 */
export function HomeLauncher() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const { roster, counts } = useAgentRoster(isAuthenticated ? venue : null);
  const extras = useHomeExtras(isAuthenticated ? venue : null);

  // The agents this person most recently worked with — used ones only (a real
  // last-activity), most-recent first, top three.
  const recent = useMemo(
    () =>
      roster
        .filter((a) => (a.status ?? "").toUpperCase() !== "TERMINATED" && typeof a.lastActive === "number")
        .sort((x, y) => (y.lastActive ?? 0) - (x.lastActive ?? 0))
        .slice(0, 3),
    [roster],
  );

  return (
    <>
      <AIPrompt fixedAgentId={DEFAULT_AGENT_ID} variant="launchpad" starters={HOME_STARTERS} />

      {isAuthenticated && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 sm:px-10">
          <JumpBackIn agents={recent} />
          <QuickActions />
          <VenuePulse
            running={counts.running}
            total={counts.total}
            jobs={extras.jobs}
            connections={extras.connections}
          />
        </div>
      )}
    </>
  );
}
