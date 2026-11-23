"use client";

import { useEffect } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { listCatalogOperations, type CatalogOp } from "@/lib/operations-catalog";
import { listAllSkills, type SkillSummary } from "@/lib/skills";
import { notifyError } from "@/lib/notify";

type PickerData = { ops: CatalogOp[]; skills: SkillSummary[] };

// The outcome carries the inputs it answers, so another venue's tools never
// show while this venue's are still on their way.
type PickerOutcome = { venue: Venue | null; includeUserOps: boolean; data: PickerData };

const NO_DATA: PickerData = { ops: [], skills: [] };
const NO_OUTCOME: PickerOutcome = { venue: null, includeUserOps: false, data: NO_DATA };

// Both reads are job-free (v/ops + v/test/ops + w/ops via listCatalogOperations,
// v/skills + w/skills via listAllSkills() — see operations-catalog.ts and
// use-skills-library.ts). `enabled` defers the fetch until the picker is
// actually opened, so mounting a trigger button doesn't cost a read.
export function useToolSkillPickerData(
  venue: Venue | null,
  enabled: boolean,
  includeUserOps: boolean,
) {
  const { data: outcome, loading, run } = useLatestQuery<PickerOutcome>(NO_OUTCOME);

  useEffect(() => {
    if (!venue || !enabled) return;
    void run(async () => {
      try {
        const [ops, skills] = await Promise.all([
          listCatalogOperations(venue, { includeUserOps }),
          listAllSkills(venue),
        ]);
        return { venue, includeUserOps, data: { ops, skills } };
      } catch (cause: unknown) {
        notifyError("Unable to load tools and skills", cause, venue.baseUrl);
        return { venue, includeUserOps, data: NO_DATA };
      }
    });
  }, [venue, enabled, includeUserOps, run]);

  const current =
    outcome.venue === venue && outcome.includeUserOps === includeUserOps ? outcome.data : NO_DATA;
  return { ops: current.ops, skills: current.skills, loading };
}
