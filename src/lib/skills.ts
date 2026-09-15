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

// A node is a skill when it carries the `skill` facet; anything else that is a
// plain object is a container to descend into. Same match-by-shape rule
// readCatalog uses for operations (operations-catalog.ts) and for the same
// reason: skills sit at mixed depths. Most live directly under v/skills, but
// every per-provider connection skill is one level down under
// v/skills/connections/<provider>, and a fixed depth silently dropped all 20
// of them — plus rendered their `connections` parent as a description-less,
// tool-less skill of its own (frontend#351).
//
// A string leaf is a legacy bare-string alias (frontend#229); normalizeSkill
// resolves it, so pass it through rather than descending into its characters.
function walkSkillTree(node: unknown, path: string, out: { key: string; value: unknown; path: string }[]): void {
  if (typeof node === "string") {
    out.push({ key: path.split("/").pop() ?? path, value: node, path });
    return;
  }
  if (node === null || typeof node !== "object" || Array.isArray(node)) return;
  const record = node as Record<string, unknown>;
  if ("skill" in record) {
    out.push({ key: path.split("/").pop() ?? path, value: record, path });
    return;
  }
  for (const key of Object.keys(record)) {
    walkSkillTree(record[key], path ? `${path}/${key}` : key, out);
  }
}

// Flatten one skills root into summaries.
//
// The category containers (root/, data/, ops-tools/, building/, admin/) are
// indexes: they mostly re-list skills that already exist at the top level, so
// a plain flatten double-counts. On venue-4 that is 71 nodes for 49 distinct
// skills. De-duplicated by name — the identity agentUsesSkill already treats
// as an alias — keeping the shallowest path, so a skill stays at the canonical
// address it has today and only genuinely nested ones (the connections/*) get
// a deeper one.
export function skillsFromTree(tree: unknown, source: SkillSource, root: string): SkillSummary[] {
  const found: { key: string; value: unknown; path: string }[] = [];
  walkSkillTree(tree, "", found);

  const byName = new Map<string, SkillSummary>();
  const depth = (entry: { path: string }) => entry.path.split("/").length;
  for (const entry of [...found].sort((a, b) => depth(a) - depth(b) || a.path.localeCompare(b.path))) {
    const skill = normalizeSkill(entry.key, entry.value, source, `${root}/${entry.path}`);
    if (!byName.has(skill.name)) byName.set(skill.name, skill);
  }
  return [...byName.values()];
}

// Every skill under v/skills and w/skills, nested ones included. One job-free
// values read per root (GET /api/v1/values/read) returns the whole sub-tree
// with inline metadata, so this is one request per root rather than the
// list-then-get-each pass venue.skills.list() performs — and unlike that
// listing it is not limited to direct children.
export async function listAllSkills(venue: Venue): Promise<SkillSummary[]> {
  const [venueTree, userTree] = await Promise.all([
    venue.workspace.read("v/skills").then((r) => r.value),
    venue.workspace.read("w/skills").then((r) => r.value).catch(() => null),
  ]);
  return [
    ...skillsFromTree(venueTree, "venue", "v/skills"),
    ...skillsFromTree(userTree, "user", "w/skills"),
  ];
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
