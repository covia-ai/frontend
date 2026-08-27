"use client";

import { useEffect, useState } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
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

// Reads the venue's agent templates from v/agents/templates — job-free, one
// values read, the same way the operations catalog reads v/ops. Replaces the
// old hardcoded list so the templates track the platform instead of drifting.
export function useAgentTemplates() {
  const venue = useAuthenticatedVenue();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venue) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    let ignore = false;
    const loadTemplates = () => {
      setLoading(true);
      void Promise.all([
        venue.workspace.read("v/agents/templates"),
        venue.workspace.read("w/templates").catch(() => ({ value: null })),
      ])
      .then(([venueResult, workspaceResult]) => {
        if (ignore) return;
        const venueTree = (venueResult as { value?: Record<string, unknown> })?.value;
        const workspaceTree = (workspaceResult as { value?: Record<string, unknown> })?.value;
        // User workspace templates take precedence over venue templates with
        // the same ID, making a local customisation the version the user sees.
        const tree = {
          ...(venueTree && typeof venueTree === "object" ? venueTree : {}),
          ...(workspaceTree && typeof workspaceTree === "object" ? workspaceTree : {}),
        };
        const list = Object.entries(tree)
                .map(([key, value]) => normalizeAgentTemplate(key, value))
                .filter((template): template is AgentTemplate => template !== null)
                .sort((a, b) => orderRank(a.key) - orderRank(b.key) || a.key.localeCompare(b.key));
        setTemplates(list);
      })
      .catch(() => { if (!ignore) setTemplates([]); })
      .finally(() => { if (!ignore) setLoading(false); });
    };
    loadTemplates();
    window.addEventListener(AGENT_TEMPLATES_CHANGED_EVENT, loadTemplates);
    return () => {
      ignore = true;
      window.removeEventListener(AGENT_TEMPLATES_CHANGED_EVENT, loadTemplates);
    };
  }, [venue]);

  return { templates, loading };
}
