"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { readTextStream } from "@/hooks/use-asset-text-content";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { useVenueRead } from "@/hooks/use-venue-read";
import { notifyError } from "@/lib/notify";
import { listAllSkills, type SkillSummary } from "@/lib/skills";

// Content is already inline in `skill.body` when the asset carries it that
// way (covia-sdk#32's list() already fetched full metadata, and inline
// content rides along with it) — this only fires for the rarer non-inline
// (CAS/DLFS-backed) case, uniformly resolvable by path since covia#368.
async function loadSkillBody(venue: Venue, skill: SkillSummary): Promise<SkillSummary> {
  if (skill.body !== null || !skill.hasContent) return skill;
  const stream = await venue.assets.getContent(skill.path);
  if (!stream) throw new Error("Skill content is unavailable");
  return { ...skill, body: await readTextStream(stream) };
}

const NO_SKILLS: SkillSummary[] = [];

// The venue's skills lead, then the person's own; each group by name.
async function readSkills(venue: Venue): Promise<SkillSummary[]> {
  const combined = await listAllSkills(venue);
  return combined.sort((left, right) =>
    (left.source === "venue" ? 0 : 1) - (right.source === "venue" ? 0 : 1) ||
    left.name.localeCompare(right.name),
  );
}

// A read body remembers which skill, on which venue, it is the body of.
type Detail = {
  venue: Venue;
  path: string;
  skill: SkillSummary | null;
  error: string | null;
};

export function useSkillsLibrary() {
  const venue = useAuthenticatedVenue();
  const { data: skills, loading, error: listError, reload: reloadList } = useVenueRead<SkillSummary[]>({
    venue,
    initial: NO_SKILLS,
    failureTitle: "Unable to load skills",
    load: readSkills,
  });

  // The person's choice, remembered with the venue it was made on, so a venue
  // switch starts from that venue's first skill rather than a path from
  // elsewhere. While the chosen path is absent from the list — including the
  // path a save has just written, until the reload lands — the first skill
  // stands in, and the choice is kept so the reload lands on it.
  const [choice, setChoice] = useState<{ venue: Venue; path: string } | null>(null);
  const chosenPath = choice && choice.venue === venue ? choice.path : null;
  const selected = useMemo(
    () => skills.find((skill) => skill.path === chosenPath) ?? skills[0] ?? null,
    [skills, chosenPath],
  );
  const setSelectedPath = useCallback(
    (path: string) => {
      if (venue) setChoice({ venue, path });
    },
    [venue],
  );

  const { data: detail, run: runDetail, invalidate: invalidateDetail } =
    useLatestQuery<Detail | null>(null);

  useEffect(() => {
    if (!venue || !selected) {
      invalidateDetail();
      return;
    }
    void runDetail(async () => {
      try {
        return { venue, path: selected.path, skill: await loadSkillBody(venue, selected), error: null };
      } catch (cause: unknown) {
        notifyError("Unable to read skill", cause, venue.baseUrl);
        return {
          venue,
          path: selected.path,
          skill: null,
          error: "This skill's content could not be read.",
        };
      }
    });
  }, [venue, selected, runDetail, invalidateDetail]);

  const currentDetail =
    detail && detail.venue === venue && detail.path === selected?.path ? detail : null;

  // `select` names the skill to land on once the reload completes — the path
  // the venue just wrote, which may not have existed before this call.
  const reload = useCallback(
    (select?: string) => {
      if (select && venue) setChoice({ venue, path: select });
      reloadList();
    },
    [venue, reloadList],
  );

  return {
    venue,
    reload,
    skills,
    selectedPath: selected?.path ?? null,
    setSelectedPath,
    detail: currentDetail?.skill ?? null,
    loading,
    detailLoading: !!venue && !!selected && !currentDetail,
    error: listError ? "Skills could not be loaded from this venue." : null,
    detailError: currentDetail?.error ?? null,
  };
}
