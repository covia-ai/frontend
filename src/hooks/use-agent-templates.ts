"use client";

import { useEffect, useState } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import {
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
    setLoading(true);
    venue.workspace
      .read("v/agents/templates")
      .then((res) => {
        if (ignore) return;
        const tree = (res as { value?: Record<string, unknown> })?.value;
        const list =
          tree && typeof tree === "object"
            ? Object.entries(tree)
                .map(([key, value]) => normalizeAgentTemplate(key, value))
                .filter((template): template is AgentTemplate => template !== null)
                .sort((a, b) => orderRank(a.key) - orderRank(b.key) || a.key.localeCompare(b.key))
            : [];
        setTemplates(list);
      })
      .catch(() => { if (!ignore) setTemplates([]); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [venue]);

  return { templates, loading };
}
