"use client";

import { useEffect, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { listCatalogOperations, type CatalogOp } from "@/lib/operations-catalog";
import { listAllSkills, type SkillSummary } from "@/lib/skills";
import { notifyError } from "@/lib/notify";

// Both reads are job-free (v/ops + v/test/ops + w/ops via listCatalogOperations,
// v/skills + w/skills via listAllSkills() — see operations-catalog.ts and
// use-skills-library.ts). `enabled` defers the fetch until the picker is
// actually opened, so mounting a trigger button doesn't cost a read.
export function useToolSkillPickerData(
  venue: Venue | null,
  enabled: boolean,
  includeUserOps: boolean,
) {
  const [ops, setOps] = useState<CatalogOp[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!venue || !enabled) return;
    let active = true;
    setLoading(true);
    Promise.all([
      listCatalogOperations(venue, { includeUserOps }),
      listAllSkills(venue),
    ])
      .then(([nextOps, nextSkills]) => {
        if (!active) return;
        setOps(nextOps);
        setSkills(nextSkills);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        notifyError("Unable to load tools and skills", cause, venue.baseUrl);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [venue, enabled, includeUserOps]);

  return { ops, skills, loading };
}
