"use client";

import { useEffect, useMemo, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { readTextStream } from "@/hooks/use-asset-text-content";
import { notifyError } from "@/lib/notify";
import { skillsFromAssets, type SkillSummary } from "@/lib/skills";

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

export function useSkillsLibrary() {
  const venue = useAuthenticatedVenue();
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [detail, setDetail] = useState<SkillSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSkills([]);
    setSelectedPath(null);
    setDetail(null);
    setError(null);
    if (!venue) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    void Promise.all([
      venue.skills.list("v/skills"),
      venue.skills.list("w/skills").catch(() => []),
    ])
      .then(([venueAssets, userAssets]) => {
        if (!active) return;
        const combined = [
          ...skillsFromAssets(venueAssets, "venue"),
          ...skillsFromAssets(userAssets, "user"),
        ];
        combined.sort((left, right) =>
          (left.source === "venue" ? 0 : 1) - (right.source === "venue" ? 0 : 1) ||
          left.name.localeCompare(right.name),
        );
        setSkills(combined);
        setSelectedPath(combined[0]?.path ?? null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError("Skills could not be loaded from this venue.");
        notifyError("Unable to load skills", cause, venue.baseUrl);
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [venue]);

  const selected = useMemo(
    () => skills.find((skill) => skill.path === selectedPath) ?? null,
    [selectedPath, skills],
  );

  useEffect(() => {
    let active = true;
    setDetail(null);
    setDetailError(null);
    if (!venue || !selected) {
      setDetailLoading(false);
      return () => { active = false; };
    }
    setDetailLoading(true);
    void loadSkillBody(venue, selected)
      .then((value) => { if (active) setDetail(value); })
      .catch((cause: unknown) => {
        if (!active) return;
        setDetailError("This skill's content could not be read.");
        notifyError("Unable to read skill", cause, venue.baseUrl);
      })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selected, venue]);

  return {
    venue,
    skills,
    selectedPath,
    setSelectedPath,
    detail,
    loading,
    detailLoading,
    error,
    detailError,
  };
}
