"use client";

import { useEffect, useMemo, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { readTextStream } from "@/hooks/use-asset-text-content";
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

export function useSkillsLibrary() {
  const venue = useAuthenticatedVenue();
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [detail, setDetail] = useState<SkillSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  // Bumped after an authoring write so the list re-reads. A counter rather than
  // a callback that refetches directly: the effect below already owns the
  // active/cancel bookkeeping, and re-entering it keeps that in one place.
  const [reloadToken, setReloadToken] = useState(0);
  // Survives the reload: the list effect resets selection to the first skill,
  // which would otherwise drop the person somewhere else right after they saved.
  const [pendingPath, setPendingPath] = useState<string | null>(null);

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
    void listAllSkills(venue)
      .then((combined) => {
        if (!active) return;
        combined.sort((left, right) =>
          (left.source === "venue" ? 0 : 1) - (right.source === "venue" ? 0 : 1) ||
          left.name.localeCompare(right.name),
        );
        setSkills(combined);
        setSelectedPath((current) => {
          const wanted = pendingPath ?? current;
          if (wanted && combined.some((skill) => skill.path === wanted)) return wanted;
          return combined[0]?.path ?? null;
        });
        setPendingPath(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError("Skills could not be loaded from this venue.");
        notifyError("Unable to load skills", cause, venue.baseUrl);
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
    // pendingPath is read inside but must not re-trigger the load: it is set
    // alongside the token bump, which is what schedules the reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, reloadToken]);

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

  // `select` names the skill to land on once the reload completes — the path
  // the venue just wrote, which may not have existed before this call.
  const reload = (select?: string) => {
    if (select) setPendingPath(select);
    setReloadToken((n) => n + 1);
  };

  return {
    venue,
    reload,
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
