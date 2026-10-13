import { RunStatus } from "@covia/covia-sdk";

/**
 * How many of an agent's pending jobs are paused on a person (covia#557):
 * `input` → INPUT_REQUIRED, `auth` → AUTH_REQUIRED. The venue derives this on
 * every `agents.info` / `agents.list` read, separately from the lifecycle
 * status, so a SLEEPING agent can still be waiting on someone.
 *
 * Mirrors the SDK's `AgentAwaiting`; parsed here rather than trusted so the
 * roster works against venues from before covia#557, which omit the field.
 */
export interface AgentAwaiting {
  input: number;
  auth: number;
}

function count(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** The `awaiting` summary off an agent info/list entry, or undefined when the
 *  venue didn't send one (unknown, not zero). */
export function readAwaiting(entry: unknown): AgentAwaiting | undefined {
  const raw = (entry as { awaiting?: unknown } | null | undefined)?.awaiting;
  if (!raw || typeof raw !== "object") return undefined;
  const { input, auth } = raw as Record<string, unknown>;
  return { input: count(input), auth: count(auth) };
}

export function awaitingTotal(awaiting: AgentAwaiting | undefined): number {
  return awaiting ? awaiting.input + awaiting.auth : 0;
}

/** "2 requests need input · 1 needs sign-in" — for tooltips and aria labels. */
export function awaitingDescription(awaiting: AgentAwaiting): string {
  const parts: string[] = [];
  if (awaiting.input > 0) {
    parts.push(`${awaiting.input} request${awaiting.input === 1 ? " needs" : "s need"} input`);
  }
  if (awaiting.auth > 0) {
    parts.push(`${awaiting.auth} request${awaiting.auth === 1 ? " needs" : "s need"} sign-in`);
  }
  return parts.join(" · ");
}

/**
 * Where to answer. Input asks are raised through HITL, so they land in the
 * Inbox, narrowed to this agent's open requests. Auth asks are not inbox
 * requests; they surface as AUTH_REQUIRED jobs, so those go to the job list
 * filtered to that status.
 */
export function awaitingHref(agentId: string, awaiting: AgentAwaiting): string {
  if (awaiting.input > 0) return `/inbox?agent=${encodeURIComponent(agentId)}`;
  return `/jobs?status=${RunStatus.AUTH_REQUIRED}`;
}
