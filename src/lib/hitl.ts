import { Venue } from "@covia/covia-sdk";
import { resolveOperationByAddress } from "@/lib/operations-catalog";

// Human-in-the-loop requests. A request is delivered as a durable record into
// the target user's `h/` lattice inbox, carried by a Job that sits in
// INPUT_REQUIRED until the human answers, rejects, or it expires.

export type HitlAskType = "text" | "approval" | "choice" | "checkboxes";

export type HitlOption = {
  id: string;
  label: string;
  description?: string;
  /** Capability grants this option would confer if echoed back. */
  grants?: unknown[];
};

export type HitlAsk = {
  id: string;
  type: HitlAskType;
  prompt: string;
  required?: boolean;
  /** choice / checkboxes only. */
  options?: HitlOption[];
  /** approval only. */
  grants?: unknown[];
};

export type HitlStatus = "open" | "answered" | "rejected" | "expired" | "cancelled";

export type HitlRequest = {
  id: string;
  title: string;
  status: HitlStatus;
  /** DID of the requester. */
  from?: string;
  description?: string;
  created?: number;
  expires?: number;
  asks: HitlAsk[];
};

/** text → string, approval → boolean, choice → option id, checkboxes → option ids. */
export type HitlAnswer = string | boolean | string[];

export const HITL_RESPOND_ADDRESS = "v/ops/hitl/respond";

// Job-free. The inbox is the caller's own `h/` namespace, so the key listing
// and each record read go over GET /api/v1/values/* and persist nothing. The
// `v/ops/hitl/list` operation returns the same summaries but mints a Job on
// every call — unacceptable for a page load or a poll (AGENTS.md), which is
// why the lattice is read directly here.
export async function listHitlRequests(venue: Venue): Promise<HitlRequest[]> {
  let keys: string[];
  try {
    const res = await venue.workspace.list("h");
    keys = ((res as { keys?: string[] })?.keys) ?? [];
  } catch {
    // An inbox that has never received a request simply doesn't exist yet.
    return [];
  }

  const records = await Promise.all(keys.map((key) => readHitlRequest(venue, key)));
  return records
    .filter((r): r is HitlRequest => r !== null)
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
}

export async function readHitlRequest(venue: Venue, id: string): Promise<HitlRequest | null> {
  try {
    const res = await venue.workspace.read(`h/${id}`);
    const value = (res as { value?: HitlRequest })?.value;
    return value?.id ? value : null;
  } catch {
    return null;
  }
}

// Which required asks are still unanswered. `false` is a legitimate answer to
// an approval ask (it means "no"), so it must never count as missing — only
// absent values, blank text and empty selections do.
export function missingRequiredAnswers(
  asks: HitlAsk[],
  answers: Record<string, HitlAnswer>,
): string[] {
  return asks
    .filter((ask) => {
      if (!ask.required) return false;
      const value = answers[ask.id];
      if (value === undefined || value === null) return true;
      if (typeof value === "string") return value.trim() === "";
      if (Array.isArray(value)) return value.length === 0;
      return false;
    })
    .map((ask) => ask.id);
}

export type HitlRespondInput = {
  id: string;
  outcome: "answer" | "reject";
  answers?: Record<string, HitlAnswer>;
  /** For "reject" this is the reason the requester sees. */
  comment?: string;
};

export type HitlRespondResult = { status?: string; id?: string };

// User-driven: answering or rejecting is an explicit human action, so the Job
// this invoke persists is exactly what should be recorded.
//
// `grants` is deliberately never sent. Echoing a grant makes the venue issue a
// real UCAN capability, so conferring one must be a considered choice rather
// than a side effect of clicking Answer; omitting the field confers nothing.
export async function respondToHitl(
  venue: Venue,
  input: HitlRespondInput,
): Promise<HitlRespondResult> {
  const op = await resolveOperationByAddress(venue, HITL_RESPOND_ADDRESS);
  return (await op.run(input)) as HitlRespondResult;
}
