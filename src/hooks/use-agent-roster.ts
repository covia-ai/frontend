"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { normalizeAgentEntries } from "@/lib/agent-list";
import { errorMessage } from "@/lib/errors";

const POLL_INTERVAL_MS = 3000;
/** Sessions fetched per request when scanning an agent's liveness. */
const SESSION_PAGE_SIZE = 50;
/** Hard stop on how many of one agent's sessions the roster will scan. The
 *  venue guarantees no ordering, so a partial scan would pick an arbitrary
 *  window — we take whole pages until the page count is covered, and give up
 *  past this many rather than pulling an unbounded history onto the roster. */
const SESSION_SCAN_CAP = 200;
/** Session reads carry every frame of every session, so they are expensive.
 *  Run at most this many at once instead of one per agent in parallel. */
const SESSION_CONCURRENCY = 3;

/** Map with a fixed worker count, preserving input order. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface RosterAgent {
  agentId: string;
  status?: string;
  tasks?: number;
  config?: Record<string, any>;
  /** Completed runs (info.timelineLength). */
  runs?: number;
  /** Most recent session activity, ms epoch. */
  lastActive?: number;
  /** Queued (pending) messages across the agent's sessions. */
  queued?: number;
  /** Soonest future scheduled wake, ms epoch. */
  nextWake?: number;
}

export interface RosterCounts {
  total: number;
  running: number;
  sleeping: number;
  suspended: number;
  terminated: number;
  tasks: number;
}

type InfoSnapshot = {
  status?: string;
  tasks?: number;
  config?: Record<string, any>;
  runs?: number;
};
type SessionSnapshot = { lastActive?: number; queued: number; nextWake?: number };

// Covia timestamps come through as ms; guard the odd seconds value.
function toMs(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return v < 1e12 ? v * 1000 : v;
}

/**
 * Backs the agent workforce roster. Membership + status come from a 3s poll of
 * the job-free `agents.list` (same cadence as the explorer). Per-agent config
 * and liveness (model/skills/prompt, completed-runs, last-active, queued
 * messages, next wake) are read via `agents.info` + `agents.listSessions` —
 * both job-free — refreshed only when the set of agents changes or on manual
 * refresh, since N agents = N reads and this data moves slowly. Relative-time
 * labels re-render on the 3s poll, so countdowns stay live without refetching.
 *
 * Session reads are the expensive part: the SDK's session record carries every
 * frame of the conversation, and there is no lighter liveness surface, so they
 * run at a fixed concurrency and stop at `SESSION_SCAN_CAP` per agent. A
 * venue-side session summary would let the roster drop this scan entirely.
 */
export function useAgentRoster(venue: Venue | null | undefined) {
  const [entries, setEntries] = useState<{ agentId: string; status?: string; tasks?: number }[]>([]);
  const [infos, setInfos] = useState<Record<string, InfoSnapshot>>({});
  const [sessions, setSessions] = useState<Record<string, SessionSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const infoGen = useRef(0);
  const sessionGen = useRef(0);

  // A venue switch must not leave the previous venue's agents on screen: their
  // cards build their action handle from the *new* venue, so Trigger / Suspend
  // / Delete would fire against the wrong venue with a stale agent id. This
  // also restores `loading`, which the no-venue branch below clears on first
  // mount while the venue store is still rehydrating — without it the roster
  // shows its "no agents yet" empty state for the whole first list round-trip.
  // Keyed on `venue` alone, so a manual refresh does not blank the roster.
  useEffect(() => {
    setEntries([]);
    setInfos({});
    setSessions({});
    setError(null);
    setLoading(!!venue);
  }, [venue]);

  // Membership + status: poll the lean list.
  useEffect(() => {
    if (!venue) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let active = true;
    const fetchList = async () => {
      try {
        const result = await venue.agents.list(true);
        if (!active) return;
        setEntries(normalizeAgentEntries(result?.agents));
        setError(null);
      } catch (err) {
        if (active) setError(errorMessage(err, "Unable to load agents"));
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchList();
    const timer = setInterval(fetchList, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [venue, refreshKey]);

  const idKey = useMemo(() => entries.map((e) => e.agentId).sort().join(" "), [entries]);

  // Config + completed-runs: one `info` per agent, keyed on the id set.
  useEffect(() => {
    if (!venue || entries.length === 0) return;
    const gen = ++infoGen.current;
    let active = true;
    void (async () => {
      const pairs = await Promise.all(
        entries.map(async (e) => {
          try {
            const info = await venue.agents.info(e.agentId);
            return [
              e.agentId,
              { status: info.status, tasks: info.tasks, config: info.config, runs: info.timelineLength },
            ] as const;
          } catch {
            return [e.agentId, undefined] as const;
          }
        }),
      );
      if (!active || gen !== infoGen.current) return;
      // Merge rather than replace, and drop only agents that have left the
      // roster. A rejected `info` call contributes no key, so replacing would
      // blank that card — no model chip, no skills, "No instructions set." —
      // until the agent set changes or the user refreshes by hand, which one
      // transient network failure should not cause.
      const present = new Set(entries.map((e) => e.agentId));
      setInfos((previous) => {
        const next: Record<string, InfoSnapshot> = {};
        for (const [id, info] of Object.entries(previous)) {
          if (present.has(id)) next[id] = info;
        }
        for (const [id, info] of pairs) if (info) next[id] = info;
        return next;
      });
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, idKey, refreshKey]);

  // Liveness: sessions per non-terminated agent → last-active, queued, next wake.
  useEffect(() => {
    if (!venue || entries.length === 0) return;
    const gen = ++sessionGen.current;
    let active = true;
    const targets = entries.filter((e) => (e.status ?? "").toUpperCase() !== "TERMINATED");
    void (async () => {
      const pairs = await mapLimit(targets, SESSION_CONCURRENCY, async (e) => {
        try {
          const now = Date.now();
          let lastActive: number | undefined;
          let queued = 0;
          let nextWake: number | undefined;
          let offset = 0;
          // Page until the agent's sessions are covered. Taking only the first
          // page would read an arbitrary subset — the venue promises no
          // ordering — so an agent active a minute ago could show "3d ago" and
          // queued work could read zero.
          for (;;) {
            const page = await venue.agents.listSessions(e.agentId, {
              offset,
              limit: SESSION_PAGE_SIZE,
            });
            if (!active || gen !== sessionGen.current) return [e.agentId, undefined] as const;
            const items: any[] = Array.isArray(page?.items) ? page.items : [];
            for (const s of items) {
              const la = toMs(s?.metadata?.lastActivity ?? s?.metadata?.started ?? s?.metadata?.created);
              if (la !== undefined) lastActive = Math.max(lastActive ?? 0, la);
              queued += Array.isArray(s?.pending) ? s.pending.length : 0;
              const w = toMs(s?.wakeTime);
              if (w !== undefined && w > now) nextWake = nextWake === undefined ? w : Math.min(nextWake, w);
            }
            offset += items.length;
            const total = typeof page?.total === "number" ? page.total : offset;
            if (items.length === 0 || offset >= total || offset >= SESSION_SCAN_CAP) break;
          }
          return [e.agentId, { lastActive, queued, nextWake }] as const;
        } catch {
          return [e.agentId, undefined] as const;
        }
      });
      if (!active || gen !== sessionGen.current) return;
      // Same merge-don't-replace rule as `infos` above: a failed read must not
      // silently erase an agent's liveness meta until the next id-set change.
      const present = new Set(targets.map((e) => e.agentId));
      setSessions((previous) => {
        const next: Record<string, SessionSnapshot> = {};
        for (const [id, snap] of Object.entries(previous)) {
          if (present.has(id)) next[id] = snap;
        }
        for (const [id, snap] of pairs) if (snap) next[id] = snap;
        return next;
      });
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, idKey, refreshKey]);

  const roster: RosterAgent[] = useMemo(
    () =>
      entries.map((e) => {
        const info = infos[e.agentId];
        const sess = sessions[e.agentId];
        return {
          agentId: e.agentId,
          status: e.status ?? info?.status,
          tasks: e.tasks ?? info?.tasks,
          config: info?.config,
          runs: info?.runs,
          lastActive: sess?.lastActive,
          queued: sess?.queued,
          nextWake: sess?.nextWake,
        };
      }),
    [entries, infos, sessions],
  );

  const counts: RosterCounts = useMemo(() => {
    const c: RosterCounts = { total: roster.length, running: 0, sleeping: 0, suspended: 0, terminated: 0, tasks: 0 };
    for (const a of roster) {
      const s = (a.status ?? "").toUpperCase();
      if (s === "RUNNING") c.running++;
      else if (s === "SLEEPING") c.sleeping++;
      else if (s === "SUSPENDED") c.suspended++;
      else if (s === "TERMINATED") c.terminated++;
      c.tasks += a.tasks ?? 0;
    }
    return c;
  }, [roster]);

  return {
    roster,
    counts,
    loading,
    error,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
