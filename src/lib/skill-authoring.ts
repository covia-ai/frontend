import type { Venue } from "@covia/covia-sdk";
import { SKILL_IMPORT_OP, USER_SKILLSET, validateSkillMarkdown } from "@/lib/skills";

// Saving and deleting a skill are user-driven writes, so they may invoke — the
// reads-must-not-create-jobs rule governs page loads and polling, not an
// explicit Save. Everything the library *reads* still goes through the job-free
// values API (listAllSkills).

/** `v/ops/skills/import` output. `existed` distinguishes an edit from a create. */
export type SkillImportResult = {
  path: string;
  name: string;
  description: string;
  existed: boolean;
  /** Frontmatter keys the venue recognised but does not store. */
  ignored: string[];
};

function readResult(value: unknown): SkillImportResult {
  const record = (value ?? {}) as Record<string, unknown>;
  const ignored = Array.isArray(record.ignored)
    ? record.ignored.filter((key): key is string => typeof key === "string")
    : [];
  const path = typeof record.path === "string" ? record.path : "";
  if (!path) throw new Error("The venue accepted the skill but returned no path.");
  return {
    path,
    name: typeof record.name === "string" ? record.name : "",
    description: typeof record.description === "string" ? record.description : "",
    existed: record.existed === true,
    ignored,
  };
}

/**
 * Writes one SKILL.md to `skillset/<name>`, where the name comes from the
 * frontmatter. The venue parses and writes in a single operation and fails
 * without writing when the text is not a valid skill, so there is no
 * partially-saved state to clean up.
 *
 * The local pre-flight is only there to keep an obviously bad draft from
 * becoming a job; the venue re-validates everything.
 */
export async function saveSkill(
  venue: Venue,
  markdown: string,
  skillset: string = USER_SKILLSET,
): Promise<SkillImportResult> {
  const check = validateSkillMarkdown(markdown);
  if (!check.ok) throw new Error(check.error);
  return readResult(
    await venue.operations.run(SKILL_IMPORT_OP, { text: markdown, skillset }),
  );
}

/**
 * Removes a user skill. A lattice delete on the caller's own `w/` namespace, so
 * no job and no operation — the venue's namespace rules still gate it.
 */
export async function deleteSkill(venue: Venue, path: string): Promise<void> {
  if (!path.startsWith(`${USER_SKILLSET}/`)) {
    throw new Error("Only skills in your workspace can be deleted.");
  }
  await venue.workspace.delete(path);
}
