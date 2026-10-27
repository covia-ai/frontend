// A deliberate stop's record (covia#590, venue 0.10): who suspended the agent
// (the actual caller, through sudo too), when, and any reason they gave. The
// venue returns it on every `agents.info` / `agents.list` read while the agent
// is suspended, and clears it on resume; a fault suspension has `error`
// instead. Parsed rather than trusted, like `awaiting`: venues before 0.10
// omit it, and it comes straight off the wire.
export type AgentSuspension = {
  by: string;
  /** Stop time, epoch ms. */
  ts?: number;
  reason?: string;
};

export function readSuspension(entry: unknown): AgentSuspension | undefined {
  const raw = (entry as { suspension?: unknown } | null | undefined)?.suspension;
  if (!raw || typeof raw !== "object") return undefined;
  const { by, ts, reason } = raw as Record<string, unknown>;
  if (typeof by !== "string" || by === "") return undefined;
  const text = typeof reason === "string" ? reason.trim() : "";
  return {
    by,
    ...(typeof ts === "number" && Number.isFinite(ts) ? { ts } : {}),
    ...(text ? { reason: text } : {}),
  };
}
