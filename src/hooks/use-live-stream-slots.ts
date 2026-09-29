"use client";

import { useMemo, useState } from "react";

/** Browsers allow roughly six concurrent connections per origin on HTTP/1.1.
 *  Each live agent stream holds one open for as long as it is mounted, so the
 *  roster keeps well under that: the 3s membership poll and every other request
 *  to the same venue queue behind whatever streams are open. */
export const MAX_LIVE_STREAMS = 4;

type Candidate = { agentId: string; status?: string };

/** Running agents first, then whoever already held a slot; at most `max`. */
function allocate(candidates: Candidate[], previous: string[], max: number): string[] {
  const statusOf = new Map(
    candidates.map((c) => [c.agentId, (c.status ?? "").toUpperCase()] as const),
  );
  const running = candidates
    .filter((c) => statusOf.get(c.agentId) === "RUNNING")
    .map((c) => c.agentId);
  const carried = previous.filter(
    (id) => statusOf.has(id) && statusOf.get(id) !== "TERMINATED" && !running.includes(id),
  );
  const next = [...running, ...carried].slice(0, max);
  const unchanged =
    next.length === previous.length && next.every((id, i) => id === previous[i]);
  return unchanged ? previous : next;
}

/**
 * Decide which agents may hold an open event stream.
 *
 * Two rules. Running agents come first, so the cards that actually have
 * something to show get the slots. Agents that already hold a slot keep it
 * while they remain on the roster and un-terminated, which matters because the
 * 3s poll surfaces RUNNING↔SLEEPING flips: without the carry-over a busy agent
 * would connect and abort a stream every few seconds.
 *
 * Returns a Set of agent ids, at most `max` of them.
 */
export function useLiveStreamSlots(
  candidates: Candidate[],
  max: number = MAX_LIVE_STREAMS,
): Set<string> {
  // Status only matters here as RUNNING / TERMINATED / other, and the poll
  // hands us a fresh array every 3s — so key on the shape we actually read
  // rather than on array identity.
  const signature = useMemo(
    () =>
      `${max}|${candidates.map((c) => `${c.agentId}:${(c.status ?? "").toUpperCase()}`).join(" ")}`,
    [candidates, max],
  );

  // The carry-over rule makes this state, not a derivation: who holds a slot
  // depends on who held one before. It is adjusted during render when the
  // inputs change (the "information from previous renders" pattern), so the
  // answer is always in step with the roster it was computed from.
  const [slots, setSlots] = useState<{ signature: string; granted: string[] }>({
    signature: "",
    granted: [],
  });
  let granted = slots.granted;
  if (slots.signature !== signature) {
    granted = allocate(candidates, slots.granted, max);
    setSlots({ signature, granted });
  }

  return useMemo(() => new Set(granted), [granted]);
}
