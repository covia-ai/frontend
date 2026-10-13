import type { Skill, Venue } from "@covia/covia-sdk";

export type SkillSource = "venue" | "user";

export type SkillSummary = {
  key: string;
  name: string;
  description: string;
  path: string;
  source: SkillSource;
  body: string | null;
  tools: string[];
  reference: string | null;
  hasContent: boolean;
  /** Every address this skill was listed at. The venue installs an entry
   *  point in more than one skillset (root/ and its family), and an agent
   *  may name any of them; `path` is the one shown. Absent → just `path`. */
  aliases?: string[];
};

type SkillMetadata = {
  name?: unknown;
  description?: unknown;
  content?: unknown;
  skill?: unknown;
};

export function parseSkillFrontmatter(markdown: string): {
  name?: string;
  description?: string;
  body: string;
} {
  if (!(markdown.startsWith("---\n") || markdown.startsWith("---\r\n"))) {
    return { body: markdown };
  }

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const close = lines.indexOf("---", 1);
  if (close === -1) return { body: markdown };

  const values: Record<string, string> = {};
  for (const line of lines.slice(1, close)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    if (key === "name" || key === "description") values[key] = value;
  }

  return {
    name: values.name,
    description: values.description,
    body: lines.slice(close + 1).join("\n").replace(/^\n+/, ""),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeSkill(
  key: string,
  value: unknown,
  source: SkillSource,
  path: string,
): SkillSummary {
  if (typeof value === "string") {
    return {
      key,
      name: key,
      description: "Description available from the referenced skill.",
      path,
      source,
      body: null,
      tools: [],
      reference: value,
      hasContent: true,
    };
  }

  const metadata = (record(value) ?? {}) as SkillMetadata;
  const content = record(metadata.content);
  const inline = typeof content?.inline === "string" ? content.inline : null;
  const frontmatter = inline === null ? null : parseSkillFrontmatter(inline);
  const facet = record(metadata.skill);
  const tools = Array.isArray(facet?.tools)
    ? facet.tools.filter((tool): tool is string => typeof tool === "string")
    : [];

  return {
    key,
    name: typeof metadata.name === "string" ? metadata.name : frontmatter?.name ?? key,
    description: typeof metadata.description === "string"
      ? metadata.description
      : frontmatter?.description ?? "No description provided.",
    path,
    source,
    body: frontmatter?.body ?? inline,
    tools,
    reference: null,
    hasContent: metadata.content !== undefined,
  };
}

// Maps SDK-resolved Skill assets (venue.skills.list()) into SkillSummary.
// The "value is a string" branch in normalizeSkill above is defensive dead
// weight here in practice: SkillManager.get() (which list() calls per key)
// only ever returns a resolved Asset with object metadata or fails the
// entry entirely (skipped upstream by SkillManager.list(), covia-sdk#32) —
// it can never hand back a raw string. Kept anyway as cheap insurance
// against a future SDK change re-exposing unresolved values.
export function skillsFromAssets(assets: Skill[], source: SkillSource): SkillSummary[] {
  return assets.map((asset) => {
    const key = asset.id.split("/").pop() ?? asset.id;
    return normalizeSkill(key, asset.metadata, source, asset.id);
  });
}

// Skillset listing mirrors the venue exactly (covia venue/docs/SKILLS.md §4.1,
// Skills.listSkills / Skills.isSkillValue), frontend#482:
//
//  - A skillset is ONE directory, a map whose keys are skill names, read one
//    level deep. Nothing is walked recursively.
//  - A member is a skill when isSkillValue holds (below). Any other member is
//    a nested directory: the venue reports it as "not a skill" and does not
//    look inside it.
//  - `w/skills` is one skillset. `v/skills` holds skillsets, so each of its
//    keys (`root`, `data`, `connections`, …) is listed as one. That is how
//    v/skills/connections/<provider> is reached (frontend#351).
//
// The previous walk recursed everywhere and counted only nodes with a `skill`
// facet, which the venue treats as optional. A skill without one (most
// imported SKILL.md files) was opened up and its metadata strings listed as
// skills of their own.

const SKILL_KEYS = ["description", "name", "skill", "content", "operation"];

/** covia Skills.isSkillValue: a string reference, or a non-empty map with any
 *  skill-shaped key. */
function isSkillValue(value: unknown): boolean {
  if (typeof value === "string") return true;
  const map = record(value);
  return map !== null && Object.keys(map).length > 0 && SKILL_KEYS.some((key) => key in map);
}

// A string member is a reference the venue resolves when listing, and its
// listing drops one that fails to resolve. Accept exactly the reference forms
// SKILLS.md §4.1 names for a skill ref: a lattice path, an asset ref
// (a/<hash>, /a/<hash>, bare hex), a DID path, or a content ref (file://,
// dlfs/). This also drops the `name` / `description` strings of a node that
// is both a skill and a skillset (v/skills/agents on long-lived venues), which
// the venue fails to resolve for the same reason.
const SKILL_REF = /^(?:\/?a\/[0-9a-fA-F]+|[0-9a-fA-F]{64}|[vwgo]\/\S+|did:\S+|file:\/\/\S+|dlfs\/\S+)$/;

function isListedMember(value: unknown): boolean {
  return typeof value === "string" ? SKILL_REF.test(value) : isSkillValue(value);
}

/** One skillset's members, one level deep, keys sorted as the venue lists them. */
function skillsetMembers(dir: unknown, path: string): { key: string; value: unknown; path: string }[] {
  const map = record(dir);
  if (!map) return [];
  return Object.keys(map)
    .sort()
    .filter((key) => isListedMember(map[key]))
    .map((key) => ({ key, value: map[key], path: `${path}/${key}` }));
}

// First-wins by name, as the venue resolves collisions. The later addresses
// are kept as aliases so an agent that names any of them still matches.
function firstWins(members: { key: string; value: unknown; path: string }[], source: SkillSource): SkillSummary[] {
  const byName = new Map<string, SkillSummary>();
  for (const member of members) {
    const skill = normalizeSkill(member.key, member.value, source, member.path);
    const first = byName.get(skill.name);
    if (first) first.aliases = [...(first.aliases ?? [first.path]), member.path];
    else byName.set(skill.name, skill);
  }
  return [...byName.values()];
}

/** The skills in one skillset (e.g. `w/skills`). */
export function skillsFromSkillset(dir: unknown, source: SkillSource, path: string): SkillSummary[] {
  return firstWins(skillsetMembers(dir, path), source);
}

/** The skills in a directory of skillsets (`v/skills`): each key is one
 *  skillset. `root` (the venue's default entry skillset) is listed first so
 *  an entry point keeps its root/ address; the rest follow in key order. */
export function skillsFromSkillsets(dir: unknown, source: SkillSource, path: string): SkillSummary[] {
  const map = record(dir);
  if (!map) return [];
  const sets = Object.keys(map).sort((a, b) => Number(b === "root") - Number(a === "root") || a.localeCompare(b));
  return firstWins(sets.flatMap((set) => skillsetMembers(map[set], `${path}/${set}`)), source);
}

// Every skill in the venue's skillsets (v/skills/*) and the caller's own
// w/skills. One job-free values read per root (GET /api/v1/values/read)
// returns the sub-tree with inline metadata, so this is one request per root
// rather than invoking skills:list, which would create a job per call.
export async function listAllSkills(venue: Venue): Promise<SkillSummary[]> {
  const [venueTree, userTree] = await Promise.all([
    venue.workspace.read("v/skills").then((r) => r.value),
    venue.workspace.read("w/skills").then((r) => r.value).catch(() => null),
  ]);
  return [
    ...skillsFromSkillsets(venueTree, "venue", "v/skills"),
    ...skillsFromSkillset(userTree, "user", "w/skills"),
  ];
}

/** Every string an agent's `skills` array might name this skill by. */
function skillAliases(skill: SkillSummary): Set<string> {
  return new Set(
    [skill.path, ...(skill.aliases ?? []), skill.reference, skill.name, skill.key].filter(
      (value): value is string => Boolean(value),
    ),
  );
}

export function agentUsesSkill(config: unknown, skill: SkillSummary): boolean {
  const values = record(config)?.skills;
  if (!Array.isArray(values)) return false;
  const candidates = skillAliases(skill);
  return values.some((value) => typeof value === "string" && candidates.has(value));
}

// A skill can be matched in an agent's `skills` array by any of several
// aliases (path, reference, name, key — see agentUsesSkill), so detaching has
// to strip all of them, not just the one the picker happens to display;
// attaching always (re-)adds the canonical `path`.
export function withSkillToggled(skills: string[], skill: SkillSummary, attached: boolean): string[] {
  const candidates = skillAliases(skill);
  const next = skills.filter((value) => !candidates.has(value));
  return attached ? [...next, skill.path] : next;
}

// ---------------------------------------------------------------------------
// Authoring (frontend#252)
// ---------------------------------------------------------------------------
// Writes go through the venue's own `v/ops/skills/import`, which parses the
// SKILL.md with the same code path `skills/parse` uses and writes the result to
// `<skillset>/<name>`. Reimplementing that parse here would mean two parsers
// that must agree forever; instead the venue stays authoritative and this file
// only has to *produce* SKILL.md and pre-flight it, so the editor can reject
// the obvious mistakes without a round trip.
//
// Frontmatter keys the venue understands (Skills.parseSkillText): name and
// description are required; tools/skills/skillsets become the skill facet;
// license and compatibility are carried onto the metadata. Everything else is
// reported back in the import result's `ignored` list rather than stored.

export const SKILL_IMPORT_OP = "v/ops/skills/import";
export const USER_SKILLSET = "w/skills";

/** Frontmatter list keys, in the order {@link formatSkillMarkdown} emits them. */
const LIST_KEYS = ["tools", "skills", "skillsets"] as const;

export type SkillDraft = {
  name: string;
  description: string;
  body: string;
  tools?: string[];
  skills?: string[];
  skillsets?: string[];
};

/**
 * A skill name is one path segment: the venue rejects whitespace or `/`, and
 * the name becomes the final segment of `w/skills/<name>`.
 */
export function isValidSkillName(name: string): boolean {
  return name.length > 0 && !name.includes("/") && !/\s/.test(name);
}

// Quoting here is a *wrapper*, never an escape: both parsers strip a matching
// pair of surrounding quotes and neither unescapes what is inside (the venue's
// Skills.unquote, and parseSkillFrontmatter above). So JSON.stringify would
// leak its own backslashes into the stored value.
//
// Almost nothing needs quoting. A value containing ": " is safe because both
// parsers split on the *first* colon and keep the rest verbatim, and "#" only
// starts a comment at the beginning of a line. What genuinely misparses is a
// leading ">" or "|" (read as a block scalar) or an empty value.
function quoteIfNeeded(value: string): string {
  if (!(value === "" || value.startsWith(">") || value.startsWith("|"))) return value;
  return value.includes('"') ? `'${value}'` : `"${value}"`;
}

/**
 * Renders a draft as SKILL.md — the inverse of {@link parseSkillFrontmatter},
 * and what the editor seeds from an existing skill so an edit round-trips.
 */
export function formatSkillMarkdown(draft: SkillDraft): string {
  const lines = [
    "---",
    `name: ${quoteIfNeeded(draft.name)}`,
    `description: ${quoteIfNeeded(draft.description.replace(/\s*\n\s*/g, " ").trim())}`,
  ];
  for (const key of LIST_KEYS) {
    const values = draft[key];
    if (!values?.length) continue;
    lines.push(`${key}:`);
    for (const value of values) lines.push(`  - ${value}`);
  }
  lines.push("---");
  const header = `${lines.join("\n")}\n`;
  // A skill with no body is a pure toolset, and gets no trailing blank line.
  const body = draft.body.trim();
  return body ? `${header}\n${body}\n` : header;
}

/**
 * The SKILL.md for an existing skill, used to seed the editor when editing a
 * user skill or duplicating a venue one. `key` rather than `name` supplies the
 * fallback: the name is a display label that may carry spaces, while the key is
 * already the path segment the venue will write to.
 */
export function skillToMarkdown(skill: SkillSummary, overrides: Partial<SkillDraft> = {}): string {
  const name = overrides.name ?? (isValidSkillName(skill.name) ? skill.name : skill.key);
  return formatSkillMarkdown({
    name,
    description: overrides.description ?? skill.description,
    body: overrides.body ?? skill.body ?? "",
    tools: overrides.tools ?? skill.tools,
  });
}

export const NEW_SKILL_TEMPLATE = `---
name: my-skill
description: One line: what it does — and when to load it.
---

## My skill

Write for an agent in the middle of a task: concise, imperative, specific.
`;

export type SkillMarkdownCheck =
  | { ok: true; name: string; description: string }
  | { ok: false; error: string };

/**
 * Pre-flight mirroring the venue's own rules so the editor can refuse a bad
 * draft inline. The venue re-checks everything and stays authoritative — this
 * only saves a round trip and gives the message a field to point at.
 */
export function validateSkillMarkdown(markdown: string): SkillMarkdownCheck {
  if (!(markdown.startsWith("---\n") || markdown.startsWith("---\r\n"))) {
    return { ok: false, error: "A skill starts with a --- frontmatter block declaring name and description." };
  }
  const { name, description } = parseSkillFrontmatter(markdown);
  if (!name) return { ok: false, error: "The frontmatter declares no name." };
  if (!isValidSkillName(name)) {
    return { ok: false, error: `The name must be one path segment without spaces — got “${name}”.` };
  }
  if (!description) return { ok: false, error: "The frontmatter declares no description." };
  return { ok: true, name, description };
}

/** Skills the signed-in user can edit: their own, under `w/skills`. */
export function isEditableSkill(skill: SkillSummary): boolean {
  return skill.source === "user";
}
