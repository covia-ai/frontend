/**
 * BYOA (Bring Your Own Agent) helpers — the client side of the venue's A2A
 * adapter. Imports register a remote A2A endpoint (or another Covia agent) as an
 * immutable asset with a mutable `w/a2a/agents/<name>` binding; sends task it,
 * the local Job mirroring the remote A2A Task. These go through the SDK's typed
 * `venue.a2a` manager (`importAgent` / `send`, covia-sdk#43); the helpers here
 * cover the display/derivation the manager doesn't.
 */

import type { A2AMessage, A2APart, A2ATask } from "@covia/covia-sdk";

// Re-export the SDK's A2A types so callers import them from one place.
export type { A2ATask, A2AMessage, A2APart } from "@covia/covia-sdk";
export type { A2AImportAgentResult } from "@covia/covia-sdk";

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

/** Read the display fields out of a binding value (see `venue.a2a.importAgent`). */
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

/** Pull plain text out of one part, following an echoed `data.message` if present. */
function textFromPart(part: A2APart): string {
  if (typeof part?.text === "string" && part.text) return part.text;
  const data = part?.data as { message?: A2AMessage } | undefined;
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
