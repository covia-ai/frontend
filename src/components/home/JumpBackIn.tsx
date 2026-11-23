"use client";

import Link from "next/link";
import { AgentIdenticon } from "@/components/agent-roster/AgentIdenticon";
import { StatusBadge } from "@/components/StatusBadge";
import { agentDisplay, humanizeAgentId, relTime } from "@/lib/agent-display";
import type { RosterAgent } from "@/hooks/use-agent-roster";

// "Jump back in" — the agents a person was most recently working with, so Home
// stops forgetting them the moment they leave. Same card vocabulary as the
// Agents roster (two-tone identicon + humanised name + status pill), so an
// agent looks identical wherever it appears. Presentational: the caller passes
// an already-ordered, already-sliced list (job-free reads live in the hook).
export function JumpBackIn({ agents }: { agents: RosterAgent[] }) {
  if (agents.length === 0) return null;

  return (
    <section aria-labelledby="home-jump-back-in">
      <h2
        id="home-jump-back-in"
        className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Jump back in
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {agents.map((a) => {
          const brief = agentDisplay(a.config).brief;
          const active = relTime(a.lastActive);
          const subtitle = brief || (active ? `Last active ${active}` : "Open the conversation");
          return (
            <Link
              key={a.agentId}
              href={`/agents/agent/${encodeURIComponent(a.agentId)}`}
              data-testid="home-jump-back-in-item"
              className="group flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-all hover:border-accent hover:shadow-md"
            >
              <AgentIdenticon agentId={a.agentId} className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {humanizeAgentId(a.agentId)}
                  </span>
                  {a.status && <StatusBadge status={a.status} kind="agent" as="pill" className="shrink-0 text-[10px]" />}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
