"use client";

import { useEffect, useState } from "react";
import type { Venue } from "@covia/covia-sdk";

export interface AgentLiveActivity {
  kind: "inference" | "tool";
  /** Tool name, when kind === "tool". */
  label?: string;
}

export interface AgentLiveEventsResult {
  /** True once the stream has delivered at least one frame for this agent —
   *  SSE is working, so the caller should stop polling this pane. */
  live: boolean;
  /** Increments on every status/run:end/cycle:end frame after the first —
   *  a "please refresh detail+sessions now" signal, not the data itself. */
  detailVersion: number;
  /** Current in-flight tool/inference activity, or null when nothing is
   *  in flight. */
  activity: AgentLiveActivity | null;
}

/**
 * Subscribe to an agent's live run-loop events (venue >= 0.9.7). Falls back
 * silently — `live` stays/reverts to false — on venues without the route,
 * a dropped connection, or any other stream failure, so the caller's own
 * polling fallback takes over; no reconnect/backoff is attempted here.
 */
export function useAgentLiveEvents(
  venue: Venue | null,
  agentId: string | null,
): AgentLiveEventsResult {
  const [live, setLive] = useState(false);
  const [detailVersion, setDetailVersion] = useState(0);
  const [activity, setActivity] = useState<AgentLiveActivity | null>(null);

  useEffect(() => {
    setLive(false);
    setDetailVersion(0);
    setActivity(null);
    if (!venue || !agentId) return;

    let cancelled = false;
    let sawFirstFrame = false;
    const controller = new AbortController();

    void (async () => {
      try {
        for await (const evt of venue.agents.events(agentId, { signal: controller.signal })) {
          if (cancelled) break;
          if (!sawFirstFrame) {
            sawFirstFrame = true;
            setLive(true);
          } else if (
            evt.type === "status" ||
            evt.type === "run:end" ||
            evt.type === "cycle:end"
          ) {
            setDetailVersion((v) => v + 1);
          }

          if (evt.type === "inference:start") setActivity({ kind: "inference" });
          else if (evt.type === "inference:end") setActivity(null);
          else if (evt.type === "tool:start") setActivity({ kind: "tool", label: evt.name });
          else if (evt.type === "tool:result") setActivity(null);
          else if (evt.type === "run:end") setActivity(null);
        }
      } catch {
        // UnsupportedVenueFeatureError on older venues, a dropped
        // connection, or any other failure — fall through to the finally
        // block, which reverts `live` unless this effect is cleaning up.
      } finally {
        if (!cancelled) setLive(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [venue, agentId]);

  return { live, detailVersion, activity };
}
