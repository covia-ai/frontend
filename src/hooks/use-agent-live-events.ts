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

const IDLE: AgentLiveEventsResult = { live: false, detailVersion: 0, activity: null };

/** The stream's state, filed under the subscription it came from. */
type LiveState = AgentLiveEventsResult & { venue: Venue | null; agentId: string | null };

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
  // Stored with the (venue, agent) it describes and read back only while that
  // is still the subscription, so a switch reports idle at once and a frame
  // from the previous stream has nowhere visible to land.
  const [state, setState] = useState<LiveState>({ venue: null, agentId: null, ...IDLE });
  // The same Venue instance can come back (getVenueFor caches one per venue
  // and account), so the key alone cannot expire a stale frame: switching away
  // and back would briefly report the old stream as live. Adjust on the change
  // itself, during render.
  if (state.venue !== venue || state.agentId !== agentId) {
    setState({ venue, agentId, ...IDLE });
  }

  useEffect(() => {
    if (!venue || !agentId) return;

    let cancelled = false;
    let sawFirstFrame = false;
    const controller = new AbortController();
    const publish = (patch: (current: AgentLiveEventsResult) => Partial<AgentLiveEventsResult>) =>
      setState((previous) => {
        const current =
          previous.venue === venue && previous.agentId === agentId
            ? previous
            : { venue, agentId, ...IDLE };
        return { ...current, ...patch(current) };
      });

    void (async () => {
      try {
        for await (const evt of venue.agents.events(agentId, { signal: controller.signal })) {
          if (cancelled) break;
          if (!sawFirstFrame) {
            sawFirstFrame = true;
            publish(() => ({ live: true }));
          } else if (
            evt.type === "status" ||
            evt.type === "run:end" ||
            evt.type === "cycle:end"
          ) {
            publish((current) => ({ detailVersion: current.detailVersion + 1 }));
          }

          if (evt.type === "inference:start") publish(() => ({ activity: { kind: "inference" } }));
          else if (evt.type === "inference:end") publish(() => ({ activity: null }));
          else if (evt.type === "tool:start") publish(() => ({ activity: { kind: "tool", label: evt.name } }));
          else if (evt.type === "tool:result") publish(() => ({ activity: null }));
          else if (evt.type === "run:end") publish(() => ({ activity: null }));
        }
      } catch {
        // UnsupportedVenueFeatureError on older venues, a dropped
        // connection, or any other failure — fall through to the finally
        // block, which reverts `live` unless this effect is cleaning up.
      } finally {
        if (!cancelled) publish(() => ({ live: false }));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [venue, agentId]);

  const current = state.venue === venue && state.agentId === agentId;
  return {
    live: current ? state.live : IDLE.live,
    detailVersion: current ? state.detailVersion : IDLE.detailVersion,
    activity: current ? state.activity : IDLE.activity,
  };
}
