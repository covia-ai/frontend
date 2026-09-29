"use client";

import { useEffect } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useVenueRead } from "@/hooks/use-venue-read";
import {
  AGENT_TEMPLATES_CHANGED_EVENT,
  normalizeAgentTemplate,
  type AgentTemplate,
} from "@/lib/agent-templates";

export type { AgentTemplate } from "@/lib/agent-templates";

// Skilled is the recommended default (per its own description), so it leads;
// the rest keep a sensible teaching order, unknowns last.
const PREFERRED_ORDER = ["skilled", "full", "worker", "manager", "analyst", "reader", "minimal", "goaltree"];

function orderRank(key: string): number {
  const i = PREFERRED_ORDER.indexOf(key);
  return i === -1 ? PREFERRED_ORDER.length : i;
}

const NO_TEMPLATES: AgentTemplate[] = [];

// Reads the venue's agent templates from v/agents/templates — job-free, one
// values read, the same way the operations catalog reads v/ops. Replaces the
// old hardcoded list so the templates track the platform instead of drifting.
async function readTemplates(venue: Venue): Promise<AgentTemplate[]> {
  const [venueResult, workspaceResult] = await Promise.all([
    venue.workspace.read("v/agents/templates"),
    // A workspace without templates is the common case, not a failure.
    venue.workspace.read("w/templates").catch(() => ({ value: null })),
  ]);
  const venueTree = (venueResult as { value?: Record<string, unknown> })?.value;
  const workspaceTree = (workspaceResult as { value?: Record<string, unknown> })?.value;
  // User workspace templates take precedence over venue templates with the
  // same ID, making a local customisation the version the user sees.
  const tree = {
    ...(venueTree && typeof venueTree === "object" ? venueTree : {}),
    ...(workspaceTree && typeof workspaceTree === "object" ? workspaceTree : {}),
  };
  return Object.entries(tree)
    .map(([key, value]) => normalizeAgentTemplate(key, value))
    .filter((template): template is AgentTemplate => template !== null)
    .sort((a, b) => orderRank(a.key) - orderRank(b.key) || a.key.localeCompare(b.key));
}

export function useAgentTemplates() {
  const venue = useAuthenticatedVenue();
  const { data: templates, loading, reload } = useVenueRead<AgentTemplate[]>({
    venue,
    initial: NO_TEMPLATES,
    failureTitle: "Unable to load agent templates",
    load: readTemplates,
  });

  // Authoring a template elsewhere announces it; re-read so the picker shows it.
  useEffect(() => {
    window.addEventListener(AGENT_TEMPLATES_CHANGED_EVENT, reload);
    return () => window.removeEventListener(AGENT_TEMPLATES_CHANGED_EVENT, reload);
  }, [reload]);

  return { templates, loading };
}
