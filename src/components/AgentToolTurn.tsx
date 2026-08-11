"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolTurn } from "@/lib/agent-turns";

interface AgentToolTurnProps {
  role?: string;
  tool: ToolTurn;
  ts?: number;
}

// A tool/system turn in the agent transcript. The result is collapsed by
// default — a full-capability agent makes many tool calls and the raw JSON is
// noise until asked for — behind a clickable header. Failures start expanded,
// since a failure is the one result you always want to see.
export function AgentToolTurn({ role, tool, ts }: AgentToolTurnProps) {
  const [expanded, setExpanded] = useState(tool.isError);

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          tool.isError
            ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
            : "bg-muted/40 text-muted-foreground border border-border",
        )}
      >
        <button
          type="button"
          data-testid="tool-turn-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {/* Mono, not uppercased — the name is a code identifier (auth_whoami). */}
          <span className="font-mono">{role}{tool.name ? ` · ${tool.name}` : ""}</span>
        </button>

        {expanded && (
          <>
            <div data-testid="tool-turn-body" className="mt-1 whitespace-pre-wrap break-words">
              {tool.text}
            </div>
            {/* Timestamp is rarely useful for a tool call, so it lives inside the
                expander rather than under every collapsed row. */}
            {ts && (
              <div data-testid="tool-turn-time" className="text-[10px] mt-1 text-muted-foreground">
                {new Date(ts).toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface AgentToolTurnGroupProps {
  turns: AgentToolTurnProps[];
}

// A run of consecutive tool calls (e.g. skill_load, then two covia_list
// calls). Only the first renders at full height; the rest sit behind a
// "+N more" toggle so a burst of tool activity doesn't crowd out the actual
// conversation around it.
export function AgentToolTurnGroup({ turns }: AgentToolTurnGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const [first, ...rest] = turns;

  if (!first) return null;

  return (
    <div className="space-y-1">
      <AgentToolTurn {...first} />
      {rest.length > 0 && (
        <div className="flex justify-start">
          <button
            type="button"
            data-testid="tool-group-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 pl-3 text-xs text-muted-foreground opacity-70 hover:opacity-100"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {expanded ? "Show less" : `+${rest.length} more tool call${rest.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
      {expanded &&
        rest.map((turn, i) => <AgentToolTurn key={i} {...turn} />)}
    </div>
  );
}
