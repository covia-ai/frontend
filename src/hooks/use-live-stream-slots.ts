"use client";

import { useEffect, useMemo, useState } from "react";

/** Browsers allow roughly six concurrent connections per origin on HTTP/1.1.
 *  Each live agent stream holds one open for as long as it is mounted, so the
 *  roster keeps well under that: the 3s membership poll and every other request
 *  to the same venue queue behind whatever streams are open. */
export const MAX_LIVE_STREAMS = 4;

type Candidate = { agentId: string; status?: string };

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
  const [granted, setGranted] = useState<string[]>([]);

  // Status only matters here as RUNNING / TERMINATED / other, and the poll
  // hands us a fresh array every 3s — so key the effect on the shape we
  // actually read rather than on array identity.
  const signature = useMemo(
    () => candidates.map((c) => `${c.agentId}:${(c.status ?? "").toUpperCase()}`).join(" "),
    [candidates],
  );

  useEffect(() => {
    const statusOf = new Map(
      candidates.map((c) => [c.agentId, (c.status ?? "").toUpperCase()] as const),
    );
    const running = candidates
      .filter((c) => statusOf.get(c.agentId) === "RUNNING")
      .map((c) => c.agentId);

    setGranted((previous) => {
      const carried = previous.filter(
        (id) => statusOf.has(id) && statusOf.get(id) !== "TERMINATED" && !running.includes(id),
      );
      const next = [...running, ...carried].slice(0, max);
      const unchanged =
        next.length === previous.length && next.every((id, i) => id === previous[i]);
      return unchanged ? previous : next;
    });
    // `signature` stands in for `candidates`; see the memo above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, max]);

  return useMemo(() => new Set(granted), [granted]);
}
