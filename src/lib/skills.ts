import type { Skill } from "@covia/covia-sdk";

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

export function agentUsesSkill(config: unknown, skill: SkillSummary): boolean {
  const values = record(config)?.skills;
  if (!Array.isArray(values)) return false;
  const candidates = new Set([skill.path, skill.reference, skill.name, skill.key].filter(Boolean));
  return values.some((value) => typeof value === "string" && candidates.has(value));
}

// A skill can be matched in an agent's `skills` array by any of several
// aliases (path, reference, name, key — see agentUsesSkill), so detaching has
// to strip all of them, not just the one the picker happens to display;
// attaching always (re-)adds the canonical `path`.
export function withSkillToggled(skills: string[], skill: SkillSummary, attached: boolean): string[] {
  const candidates = new Set([skill.path, skill.reference, skill.name, skill.key].filter(Boolean));
  const next = skills.filter((value) => !candidates.has(value));
  return attached ? [...next, skill.path] : next;
}
