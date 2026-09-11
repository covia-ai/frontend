/**
 * BYOA (Bring Your Own Agent) helpers — the client side of the venue's A2A
 * adapter. Imports register a remote A2A endpoint (or another Covia agent) as an
 * immutable asset with a mutable `w/a2a/agents/<name>` binding; sends task it,
 * the local Job mirroring the remote A2A Task. These go through the SDK's typed
 * `venue.a2a` manager (`importAgent` / `send`, covia-sdk#43); the helpers here
 * cover the display/derivation the manager doesn't.
 */

export type { A2AImportAgentResult } from "@covia/covia-sdk";

// The wire types are declared here rather than re-exported from the SDK: the
// SDK's `A2APart` doesn't model the spec's file part, and its `A2ATask` status
// doesn't carry the `message` an agent pauses to ask (A2A v1 §6.3). Re-export
// from the SDK again once it models both.

/** The file a `kind: "file"` part points at. */
export interface A2AFileRef {
  name?: string;
  mimeType?: string;
  uri?: string;
}

/** One part of an A2A message or artifact (v1 wire format). */
export interface A2APart {
  type?: string;
  kind?: string;
  text?: string;
  data?: unknown;
  file?: A2AFileRef;
}

/** One A2A message in a Task's history, or on its status. */
export interface A2AMessage {
  role: string;
  parts: A2APart[];
  messageId?: string;
}

/** The remote A2A Task snapshot a send mirrors onto the local Job's output. */
export interface A2ATask {
  id?: string;
  contextId?: string;
  status?: {
    state?: string;
    timestamp?: string;
    /** The question the agent paused to ask, on an interrupted Task. */
    message?: A2AMessage;
  };
  artifacts?: {
    artifactId?: string;
    parts?: A2APart[];
  }[];
  history?: A2AMessage[];
  [key: string]: unknown;
}

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

/** Cap on how much of a structured data part is rendered inline. */
const MAX_DATA_CHARS = 2000;

/** Name a file part by filename and type, so it isn't dropped silently. */
function describeFilePart(file: A2AFileRef): string {
  const name = typeof file.name === "string" && file.name ? file.name : "file";
  const type = typeof file.mimeType === "string" && file.mimeType ? ` (${file.mimeType})` : "";
  return `[${name}${type}]`;
}

/**
 * Pull displayable text out of one part. Text parts read directly and an echoed
 * `data.message` is followed; file and other structured parts are described
 * rather than dropped, so an artifact with no text part doesn't read as an
 * empty reply.
 */
function textFromPart(part: A2APart): string {
  if (typeof part?.text === "string" && part.text) return part.text;

  const data = part?.data as { message?: A2AMessage } | undefined;
  const nested = data?.message?.parts;
  if (Array.isArray(nested)) {
    return nested.map(textFromPart).filter(Boolean).join("\n");
  }

  if (part?.file && typeof part.file === "object") return describeFilePart(part.file);

  if (data !== undefined && data !== null) {
    try {
      return JSON.stringify(data, null, 2).slice(0, MAX_DATA_CHARS);
    } catch {
      return ""; // circular or otherwise unserialisable — nothing useful to show
    }
  }
  return "";
}

/**
 * The message an interrupted Task carries on its `status` — where A2A puts the
 * question the agent paused to ask. Empty when the remote didn't set one.
 */
export function taskStatusText(task: A2ATask | undefined): string {
  const parts = task?.status?.message?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map(textFromPart).filter(Boolean).join("\n").trim();
}

/**
 * Best-effort reply text from an A2A Task: prefer the artifacts the agent
 * produced, then the message on its status, then the last non-user message in
 * history.
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

  const fromStatus = taskStatusText(task);
  if (fromStatus) return fromStatus;

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

/**
 * Timings for driving one Talk turn to a settled state. Exported so a test can
 * shrink them; production values are what the UI actually waits.
 */
/** Longest wait for a fresh turn to reach a terminal or paused state. */
export const SETTLE_TIMEOUT_MS = 120_000;
/** Longest wait for a continued task to actually advance past the interrupt. */
export const RESUME_TIMEOUT_MS = 30_000;
/** Delay between refreshes when the SSE stream isn't carrying the turn. */
export const POLL_INTERVAL_MS = 1000;

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
