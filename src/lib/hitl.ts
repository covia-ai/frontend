import { Venue, createUCANJWT, hexToPrivateKey } from "@covia/covia-sdk";
import { resolveOperationByAddress } from "@/lib/operations-catalog";

// Human-in-the-loop requests. A request is delivered as a durable record into
// the target user's `h/` lattice inbox, carried by a Job that sits in
// INPUT_REQUIRED until the human answers, rejects, or it expires.

// `token` (COG-19) is the self-sovereign access-token ask: the human signs a
// UCAN with their own key. The others are COG-16 asks.
export type HitlAskType = "text" | "approval" | "choice" | "checkboxes" | "token";

// A capability {with, can} — the shared shape behind both a venue-minted grant
// (COG-17, offered on an approval/option ask) and a self-sovereign access token
// (COG-19, requested by a token ask).
export type HitlCap = {
  with: string;
  can: string;
  /** Grant expiry (Unix seconds), where the offer carries one. */
  exp?: number;
};

// COG-19 token spec: what a `token` ask requests. `caps` is what the agent asks
// for; the human decides what to actually sign.
export type HitlTokenSpec = {
  caps: HitlCap[];
  /** Requested lifetime hint (seconds); the responder sets the real expiry. */
  exp?: number;
  /** DID the signed token must be audienced to; defaults to the request's `from`. */
  audience?: string;
  /** Target venue — informational, for the responder's UI. */
  venue?: string;
};

export type HitlOption = {
  id: string;
  label: string;
  description?: string;
  /** Capability grants this option would confer if echoed back (COG-17). */
  grants?: HitlCap[];
};

export type HitlAsk = {
  id: string;
  type: HitlAskType;
  prompt: string;
  required?: boolean;
  /** choice / checkboxes only. */
  options?: HitlOption[];
  /** approval only — venue-minted grants offered (COG-17). */
  grants?: HitlCap[];
  /** token only — the requested self-sovereign grant (COG-19). */
  token?: HitlTokenSpec;
};

// The COG-19 token spec on a token ask, or null. A token ask needs at least one
// requested capability to be actionable.
export function tokenSpecOf(ask: HitlAsk): HitlTokenSpec | null {
  const spec = ask.token;
  if (ask.type !== "token" || !spec || !Array.isArray(spec.caps) || spec.caps.length === 0) {
    return null;
  }
  return spec;
}

/** Venue-minted grants offered on an approval ask (COG-17), or []. */
export function offeredGrantsOf(ask: HitlAsk): HitlCap[] {
  return Array.isArray(ask.grants) ? ask.grants : [];
}

// Which of a request's asks is the grant/token surface, if any — and which kind.
// A grant-bearing request is answered through the capability form, never the
// quick path: signing / conferring authority is always deliberate.
export function grantAskOf(request: { asks?: HitlAsk[] }): { ask: HitlAsk; kind: "token" | "grant" } | null {
  for (const ask of request.asks ?? []) {
    if (tokenSpecOf(ask)) return { ask, kind: "token" };
    if (offeredGrantsOf(ask).length > 0) return { ask, kind: "grant" };
  }
  return null;
}

export type HitlStatus = "open" | "answered" | "rejected" | "expired" | "cancelled";

export type HitlRequest = {
  id: string;
  title: string;
  status: HitlStatus;
  /** DID of the requesting user — the agent's owner when `agent` is set. */
  from?: string;
  /**
   * Id of the agent that raised the request, when one did. Absent for requests
   * raised directly by a person or a plain operation call.
   */
  agent?: string;
  description?: string;
  created?: number;
  expires?: number;
  asks: HitlAsk[];
  /** Present once resolved — what the human decided. */
  response?: HitlResponse;
};

export type HitlResponse = {
  outcome?: "answer" | "reject";
  /** Keyed by ask id. Choice/checkbox values are option *ids*, not labels. */
  answers?: Record<string, HitlAnswer>;
  /** For a rejection this is the reason the requester was given. */
  comment?: string;
  comments?: Record<string, string>;
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
  // An inbox that has never received a request resolves to Nil (exists:false)
  // rather than throwing, so anything thrown here is a genuine failure — a 403
  // because the selected venue isn't the one holding your requests, an expired
  // session, an unreachable host. Let it propagate. Swallowing it renders
  // "nothing waiting on you", which is indistinguishable from a healthy empty
  // inbox and leaves the user with nothing to debug.
  const res = await venue.workspace.list("h");
  const keys = ((res as { keys?: string[] })?.keys) ?? [];

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
  /**
   * COG-17: the venue-minted grants the responder approves. The venue issues a
   * UCAN for exactly the intersection of these and the choices actually made.
   * Only ever set from an explicit capability approval — never a side effect.
   */
  grants?: HitlCap[];
};

export type HitlRespondResult = { status?: string; id?: string };

// User-driven: answering or rejecting is an explicit human action, so the Job
// this invoke persists is exactly what should be recorded. `grants` and a
// token-ask JWT answer are only ever populated by the capability form, where
// the human has reviewed exactly what they are conferring.
export async function respondToHitl(
  venue: Venue,
  input: HitlRespondInput,
): Promise<HitlRespondResult> {
  const op = await resolveOperationByAddress(venue, HITL_RESPOND_ADDRESS);
  return (await op.run(input)) as HitlRespondResult;
}

// Sign a self-sovereign UCAN with the responder's own device key (COG-19). The
// token roots in the user (iss = their did:key), is bound to `audience`, and
// carries exactly `caps` — so it verifies on any venue where the user is the
// root authority. The venue only transports it; it never signs.
export function signAccessToken(opts: {
  privateKeyHex: string;
  audience: string;
  caps: HitlCap[];
  lifetimeSeconds: number;
}): string {
  const priv = hexToPrivateKey(opts.privateKeyHex);
  const att = opts.caps.map((c) => ({ with: c.with, can: c.can }));
  return createUCANJWT(priv, opts.audience, att, opts.lifetimeSeconds);
}
