"use client";

import { useEffect, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { CONNECTIONS } from "@/config/connections";

// The two venue-pulse figures the agent roster doesn't already carry: how many
// jobs the venue has run, and how many connectors are wired up. Both are
// job-free GETs (jobs.list / secrets.list — see the reads-must-not-create-jobs
// rule), read once per venue, best-effort: a failure just leaves the figure out
// rather than blocking the composer, which has already painted above this.
export interface HomeExtras {
  jobs?: number;
  connections?: number;
}

export function useHomeExtras(venue: Venue | null | undefined): HomeExtras {
  const [extras, setExtras] = useState<HomeExtras>({});

  useEffect(() => {
    if (!venue) {
      setExtras({});
      return;
    }
    let active = true;
    void (async () => {
      const next: HomeExtras = {};
      try {
        const jobs = await venue.jobs.list();
        if (Array.isArray(jobs)) next.jobs = jobs.length;
      } catch {
        // Leave `jobs` unset — the tile just doesn't render.
      }
      try {
        const names = await venue.secrets.list();
        const set = new Set(Array.isArray(names) ? names : []);
        next.connections = CONNECTIONS.filter((c) => set.has(c.secretName)).length;
      } catch {
        // Leave `connections` unset.
      }
      if (active) setExtras(next);
    })();
    return () => {
      active = false;
    };
  }, [venue]);

  return extras;
}
