"use client";

import { useMemo, useState } from "react";
import { Bot, Plus, Search } from "lucide-react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import { AddNewAgent } from "@/components/AddNewAgent";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { useAgentRoster, type RosterAgent } from "@/hooks/use-agent-roster";
import { agentDisplay, humanizeAgentId, shortRefLabel } from "@/lib/agent-display";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { AgentRosterCard } from "@/components/agent-roster/AgentRosterCard";

const AGENTS_GRID_CLASS =
  "grid w-full grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] items-stretch gap-4";

// Status groups, in the order the workforce reads best: what's working, then
// what's asleep, paused, or spent. Anything unrecognised falls to "Other".
const GROUPS: { key: string; label: string }[] = [
  { key: "RUNNING", label: "Running" },
  { key: "SLEEPING", label: "Sleeping" },
  { key: "SUSPENDED", label: "Suspended" },
  { key: "TERMINATED", label: "Terminated" },
  { key: "OTHER", label: "Other" },
];

function groupKey(status?: string): string {
  const s = (status ?? "").toUpperCase();
  return ["RUNNING", "SLEEPING", "SUSPENDED", "TERMINATED"].includes(s) ? s : "OTHER";
}

// Assistant first (the reserved magic-wand), then alphabetical — same rule the
// rest of the app sorts agents by.
function sortAgents(a: RosterAgent, b: RosterAgent): number {
  if (a.agentId === DEFAULT_AGENT_ID) return -1;
  if (b.agentId === DEFAULT_AGENT_ID) return 1;
  return a.agentId.localeCompare(b.agentId);
}

function searchText(agent: RosterAgent): string {
  const d = agentDisplay(agent.config);
  return [
    agent.agentId,
    humanizeAgentId(agent.agentId),
    d.brief,
    d.model,
    d.providerLabel,
    ...d.skills.map(shortRefLabel),
  ]
    .join(" ")
    .toLowerCase();
}

export function AgentRoster({ venueId }: { venueId?: string } = {}) {
  const resolved = useResolvedVenueContext(venueId);
  const { descriptor: venueObj, venue } = resolved;
  const venueStatus = resolved.status ?? (venue ? "ready" : "absent");

  const { roster, counts, loading, error, refresh } = useAgentRoster(
    venueStatus === "ready" ? venue : null,
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return roster;
    return roster.filter((a) => searchText(a).includes(term));
  }, [roster, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, RosterAgent[]>();
    for (const a of filtered) {
      const key = groupKey(a.status);
      (map.get(key) ?? map.set(key, []).get(key)!).push(a);
    }
    for (const list of map.values()) list.sort(sortAgents);
    return map;
  }, [filtered]);

  const statTiles = [
    { label: "Agents", value: counts.total },
    { label: "Running", value: counts.running },
    { label: "Sleeping", value: counts.sleeping },
    { label: "Suspended", value: counts.suspended },
  ];

  if (venueStatus !== "ready") {
    return (
      <ContentLayout>
        <TopBar venueId={venueId} venueName={venueObj?.metadata.name} />
        <VenueResolutionState
          status={venueStatus}
          error={resolved.error}
          icon={Bot}
          subject="Agents"
          venueId={venueId}
        />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <TopBar venueId={venueId} venueName={venueObj?.metadata.name} />
      <div className="flex w-full flex-col items-center">
        {!loading && counts.total > 0 && (
          <div data-testid="agent-roster-stats" className="mt-4 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            {statTiles.map((t) => (
              <div key={t.label} className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div className="text-xs font-medium text-muted-foreground">{t.label}</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{t.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents by name, model or skill…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <AddNewAgent
            trigger={
              <Button className="gap-1.5" data-testid="roster-new-agent">
                <Plus size={15} /> New agent
              </Button>
            }
          />
        </div>

        {error && <ErrorDisplay error={error} className="mt-4 w-full" />}

        {loading ? (
          <div className="flex h-100 w-full items-center justify-center">
            <Spinner variant="ellipsis" className="text-primary" size={64} />
          </div>
        ) : counts.total === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <Bot size={34} className="text-primary/60" />
            <p>No agents yet. Create your first agent to get started.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-16 text-sm text-muted-foreground">No agents match “{query}”.</p>
        ) : (
          <div className="mt-5 w-full space-y-6">
            {GROUPS.filter((g) => (grouped.get(g.key)?.length ?? 0) > 0).map((g) => {
              const list = grouped.get(g.key)!;
              return (
                <section key={g.key}>
                  <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.label}
                    <span className="font-mono text-muted-foreground/70">· {list.length}</span>
                  </h2>
                  <div className={AGENTS_GRID_CLASS}>
                    {venue &&
                      list.map((a) => (
                        <AgentRosterCard key={a.agentId} agent={a} venue={venue} onChanged={refresh} />
                      ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </ContentLayout>
  );
}
