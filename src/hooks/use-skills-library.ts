"use client";

import { useEffect, useMemo, useState } from "react";
import type { Asset, Venue } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { readTextStream } from "@/hooks/use-asset-text-content";
import { notifyError } from "@/lib/notify";
import {
  normalizeSkill,
  skillsFromTree,
  type SkillSummary,
} from "@/lib/skills";

async function hydrateReference(venue: Venue, skill: SkillSummary): Promise<SkillSummary> {
  if (!skill.reference) return skill;
  try {
    const asset = await venue.assets.get(skill.reference);
    const resolved = normalizeSkill(skill.key, asset.metadata, skill.source, skill.path);
    return { ...resolved, reference: skill.reference };
  } catch {
    return skill;
  }
}

async function loadSkillBody(venue: Venue, skill: SkillSummary): Promise<SkillSummary> {
  if (skill.body !== null || !skill.hasContent) return skill;
  const asset: Asset = await venue.assets.get(skill.reference ?? skill.path);
  const resolved = normalizeSkill(skill.key, asset.metadata, skill.source, skill.path);
  if (resolved.body !== null || asset.metadata?.content === undefined) {
    return { ...resolved, reference: skill.reference };
  }
  const stream = await venue.assets.getContent(asset.id);
  if (!stream) throw new Error("Skill content is unavailable");
  return {
    ...resolved,
    reference: skill.reference,
    body: await readTextStream(stream),
  };
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
      venue.workspace.read("v/skills"),
      venue.workspace.read("w/skills").catch(() => ({ exists: false, value: null })),
    ])
      .then(async ([venueResult, userResult]) => {
        const venueSkills = skillsFromTree(venueResult?.value, "venue", "v/skills");
        const userSkills = skillsFromTree(userResult?.value, "user", "w/skills");
        const hydrated = await Promise.all(
          [...venueSkills, ...userSkills].map((skill) => hydrateReference(venue, skill)),
        );
        if (!active) return;
        hydrated.sort((left, right) =>
          (left.source === "venue" ? 0 : 1) - (right.source === "venue" ? 0 : 1) ||
          left.name.localeCompare(right.name),
        );
        setSkills(hydrated);
        setSelectedPath(hydrated[0]?.path ?? null);
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
