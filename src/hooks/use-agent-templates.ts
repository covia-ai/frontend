"use client";

import { useEffect, useState } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";

// An agent template as published by the venue at v/agents/templates/<key>.
// Everything past name/description is agent config the create op understands.
export interface AgentTemplate {
  /** The directory key — canonical identity (COG-18: the key wins over an inner name). */
  key: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  /** Provider op the template defaults to (e.g. v/ops/langchain/openai). */
  llmOperation?: string;
  model?: string;
  /** Transition op, when the template specifies one (e.g. goaltree). */
  operation?: string;
  skills?: string[];
  tools?: string[];
  defaultTools?: boolean;
}

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
        const tree = (res as { value?: Record<string, Omit<AgentTemplate, "key">> })?.value;
        const list =
          tree && typeof tree === "object"
            ? Object.entries(tree)
                .filter(([, cfg]) => cfg && typeof cfg === "object")
                // Directory key is canonical identity (COG-18) — it wins over any inner name.
                .map(([key, cfg]) => ({ ...cfg, key }))
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
