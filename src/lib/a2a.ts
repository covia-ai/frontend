/**
 * BYOA (Bring Your Own Agent) helpers — the client side of the venue's A2A
 * adapter. `a2a:import-agent` registers a remote A2A endpoint (or another Covia
 * agent) as an immutable asset with a mutable `w/a2a/agents/<name>` binding;
 * `a2a:send` tasks it, the local Job mirroring the remote A2A Task. The SDK has
 * no typed manager for these yet, so callers invoke them by operation path.
 */

export const IMPORT_AGENT_OP = "v/ops/a2a/import-agent";
export const A2A_SEND_OP = "v/ops/a2a/send";

/** The workspace directory of connected-agent bindings, one per local alias. */
export const A2A_AGENTS_DIR = "w/a2a/agents";

/** Display view of one `w/a2a/agents/<name>` binding. */
export interface ConnectedAgent {
  /** Local alias (the binding key). */
  name: string;
  /** The remote agent's advertised card name, if known. */
  cardName?: string;
  /** The remote agent's description, if advertised. */
  description?: string;
  /** The imported endpoint URL (external A2A). */
  url?: string;
  /** The Covia grid agent address, when imported from another Covia agent. */
  coviaAgent?: string;
}

/** Read the display fields out of a binding value (see `a2a:import-agent`). */
export function connectedAgentFromBinding(name: string, value: unknown): ConnectedAgent {
  const a2a = (value as { a2a?: Record<string, unknown> } | undefined)?.a2a;
  const card = a2a?.card as { name?: string; description?: string } | undefined;
  const target = a2a?.target as { url?: string; coviaAgent?: string } | undefined;
  return {
    name,
    cardName: card?.name,
    description: card?.description,
    url: target?.url ?? (a2a?.cardUrl as string | undefined),
    coviaAgent: target?.coviaAgent,
  };
}

/** `[a-z0-9-]{1,64}` — the local alias that becomes `w/a2a/agents/<name>`. */
export const A2A_NAME_PATTERN = /^[a-z0-9-]{1,64}$/;

export const slugifyAgentName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

/** Output of `a2a:import-agent`: the binding path plus the immutable identity. */
export interface ImportAgentResult {
  /** Mutable workspace binding, e.g. `w/a2a/agents/venue-b-bot`. */
  path?: string;
  /** Immutable agent-asset hash. */
  a2aAgentAsset?: string;
  /** Whether the binding was written. */
  stored?: boolean;
  /** Full immutable DID URL of the agent asset. */
  id?: string;
}

/** A part of an A2A message/artifact, as the venue serves it (v1 wire format). */
interface A2APart {
  type?: string;
  kind?: string;
  text?: string;
  data?: unknown;
}

interface A2AMessageLike {
  role?: string;
  parts?: A2APart[];
}

/** The remote A2A Task snapshot returned by `a2a:send`. */
export interface A2ATask {
  id?: string;
  contextId?: string;
  status?: { state?: string; timestamp?: string };
  artifacts?: { artifactId?: string; parts?: A2APart[] }[];
  history?: A2AMessageLike[];
  [key: string]: unknown;
}

/** Pull plain text out of one part, following an echoed `data.message` if present. */
function textFromPart(part: A2APart): string {
  if (typeof part?.text === "string" && part.text) return part.text;
  const data = part?.data as { message?: A2AMessageLike } | undefined;
  const nested = data?.message?.parts;
  if (Array.isArray(nested)) {
    return nested.map(textFromPart).filter(Boolean).join("\n");
  }
  return "";
}

/**
 * Best-effort reply text from a completed A2A Task: prefer the artifacts the
 * agent produced, else fall back to the last non-user message in history.
 */
export function taskReplyText(task: A2ATask | undefined): string {
  if (!task) return "";
  const fromArtifacts = (task.artifacts ?? [])
    .flatMap((a) => a.parts ?? [])
    .map(textFromPart)
    .filter(Boolean)
    .join("\n")
    .trim();
  if (fromArtifacts) return fromArtifacts;

  const history = task.history ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const role = (msg?.role ?? "").toUpperCase();
    if (role.includes("USER")) continue;
    const text = (msg.parts ?? []).map(textFromPart).filter(Boolean).join("\n").trim();
    if (text) return text;
  }
  // Last resort: echo back whatever text the task carries at all.
  return history
    .flatMap((m) => m.parts ?? [])
    .map(textFromPart)
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** Whether a Task state string denotes a terminal, non-failed completion. */
export function isTaskComplete(state?: string): boolean {
  return (state ?? "").toUpperCase().includes("COMPLETED");
}

/** A human label for a Job status while an A2A turn is in flight. */
export function jobStatusLabel(status?: string): string {
  switch ((status ?? "").toUpperCase()) {
    case "PENDING":
      return "Sending…";
    case "STARTED":
      return "Working…";
    case "INPUT_REQUIRED":
      return "Waiting for your input";
    case "AUTH_REQUIRED":
      return "Authentication required";
    case "PAUSED":
      return "Paused";
    case "COMPLETE":
      return "Done";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status ? status : "Working…";
  }
}
