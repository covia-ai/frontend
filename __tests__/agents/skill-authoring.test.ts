import {
  formatSkillMarkdown,
  isEditableSkill,
  isValidSkillName,
  NEW_SKILL_TEMPLATE,
  parseSkillFrontmatter,
  skillToMarkdown,
  validateSkillMarkdown,
  type SkillSummary,
} from "@/lib/skills";
import { deleteSkill, saveSkill } from "@/lib/skill-authoring";

function summary(overrides: Partial<SkillSummary> = {}): SkillSummary {
  return {
    key: "research",
    name: "research",
    description: "Find reliable sources.",
    path: "w/skills/research",
    source: "user",
    body: "## Research\nStart with primary sources.",
    tools: [],
    reference: null,
    hasContent: true,
    ...overrides,
  };
}

describe("skill name validation", () => {
  it("accepts a single path segment", () => {
    expect(isValidSkillName("research")).toBe(true);
    expect(isValidSkillName("my-skill_2")).toBe(true);
  });

  it("rejects what the venue would reject", () => {
    expect(isValidSkillName("")).toBe(false);
    expect(isValidSkillName("two words")).toBe(false);
    expect(isValidSkillName("nested/skill")).toBe(false);
    expect(isValidSkillName("trailing\t")).toBe(false);
  });
});

describe("formatSkillMarkdown", () => {
  it("round-trips through the reader without loss", () => {
    const draft = {
      name: "research",
      description: "Find reliable sources.",
      body: "## Research\n\nStart with primary sources.",
    };
    const parsed = parseSkillFrontmatter(formatSkillMarkdown(draft));
    expect(parsed.name).toBe(draft.name);
    expect(parsed.description).toBe(draft.description);
    expect(parsed.body.trim()).toBe(draft.body);
  });

  it("keeps a colon in the description readable rather than quoting it", () => {
    // Both parsers split on the first colon and keep the rest verbatim, so a
    // description like this needs no quoting — and must not gain any.
    const markdown = formatSkillMarkdown({
      name: "research",
      description: "One line: what it does — and when to load it.",
      body: "",
    });
    expect(markdown).toContain("description: One line: what it does — and when to load it.");
    expect(parseSkillFrontmatter(markdown).description).toBe(
      "One line: what it does — and when to load it.",
    );
  });

  it("wraps a value that would otherwise parse as a block scalar", () => {
    // A leading > or | is YAML's folded/literal block marker.
    const markdown = formatSkillMarkdown({
      name: "research",
      description: "> quoted guidance",
      body: "",
    });
    expect(markdown).toContain('description: "> quoted guidance"');
    expect(parseSkillFrontmatter(markdown).description).toBe("> quoted guidance");
  });

  it("wraps with single quotes when the value already contains a double quote", () => {
    // Quoting is a wrapper, never an escape — neither parser unescapes, so a
    // JSON-style \" would survive into the stored value.
    const markdown = formatSkillMarkdown({
      name: "research",
      description: '> the "hard" case',
      body: "",
    });
    expect(markdown).toContain("description: '> the \"hard\" case'");
    expect(parseSkillFrontmatter(markdown).description).toBe('> the "hard" case');
  });

  it("collapses a multi-line description, which the venue stores as one line", () => {
    const markdown = formatSkillMarkdown({
      name: "research",
      description: "First line\n  second line",
      body: "",
    });
    expect(markdown).toContain("description: First line second line");
  });

  it("emits list keys as block sequences the venue reads as the skill facet", () => {
    const markdown = formatSkillMarkdown({
      name: "research",
      description: "Find sources.",
      body: "Body.",
      tools: ["v/ops/covia/read", "v/ops/covia/list"],
      skillsets: ["v/skills/data"],
    });
    expect(markdown).toContain("tools:\n  - v/ops/covia/read\n  - v/ops/covia/list");
    expect(markdown).toContain("skillsets:\n  - v/skills/data");
    // An empty list contributes no key at all.
    expect(markdown).not.toContain("skills:\n");
  });

  it("omits the body entirely for a pure toolset", () => {
    const markdown = formatSkillMarkdown({ name: "tools", description: "Just tools.", body: "  " });
    expect(markdown.endsWith("---\n")).toBe(true);
  });

  it("ships a template that validates", () => {
    expect(validateSkillMarkdown(NEW_SKILL_TEMPLATE)).toMatchObject({ ok: true, name: "my-skill" });
  });
});

describe("skillToMarkdown", () => {
  it("seeds the editor from an existing skill, carrying its tools", () => {
    const markdown = skillToMarkdown(summary({ tools: ["v/ops/covia/read"] }));
    expect(validateSkillMarkdown(markdown)).toMatchObject({ ok: true, name: "research" });
    expect(markdown).toContain("  - v/ops/covia/read");
    expect(parseSkillFrontmatter(markdown).body.trim()).toBe(
      "## Research\nStart with primary sources.",
    );
  });

  it("falls back to the key when the display name is not a valid path segment", () => {
    // Venue skills often have prose names ("Agent management") that cannot be
    // a path segment; duplicating one must still produce a writable name.
    const markdown = skillToMarkdown(summary({ name: "Agent management", key: "agents" }));
    expect(validateSkillMarkdown(markdown)).toMatchObject({ ok: true, name: "agents" });
  });

  it("applies overrides, as the duplicate action does when renaming", () => {
    const markdown = skillToMarkdown(summary(), { name: "research-copy" });
    expect(validateSkillMarkdown(markdown)).toMatchObject({ ok: true, name: "research-copy" });
  });

  it("handles a skill with no body", () => {
    const markdown = skillToMarkdown(summary({ body: null }));
    expect(validateSkillMarkdown(markdown)).toMatchObject({ ok: true });
  });
});

describe("validateSkillMarkdown", () => {
  it("requires a frontmatter block", () => {
    expect(validateSkillMarkdown("# Just markdown")).toEqual({
      ok: false,
      error: expect.stringContaining("--- frontmatter block"),
    });
  });

  it("requires a name", () => {
    expect(validateSkillMarkdown("---\ndescription: Something.\n---\nBody")).toEqual({
      ok: false,
      error: expect.stringContaining("no name"),
    });
  });

  it("requires a description, which the venue treats as the index line", () => {
    expect(validateSkillMarkdown("---\nname: research\n---\nBody")).toEqual({
      ok: false,
      error: expect.stringContaining("no description"),
    });
  });

  it("rejects a name that is not one path segment", () => {
    expect(validateSkillMarkdown("---\nname: two words\ndescription: d\n---\n")).toEqual({
      ok: false,
      error: expect.stringContaining("one path segment"),
    });
  });
});

describe("isEditableSkill", () => {
  it("is true for workspace skills and false for venue ones", () => {
    expect(isEditableSkill(summary({ source: "user" }))).toBe(true);
    expect(isEditableSkill(summary({ source: "venue", path: "v/skills/agents" }))).toBe(false);
  });
});

describe("saveSkill", () => {
  const valid = "---\nname: research\ndescription: Find sources.\n---\n\nBody\n";

  function venueWith(result: unknown) {
    return { operations: { run: jest.fn().mockResolvedValue(result) } } as never;
  }

  it("imports the text through the venue's own parser, into w/skills by default", async () => {
    const venue = venueWith({ path: "w/skills/research", name: "research", description: "Find sources.", existed: false });
    const result = await saveSkill(venue, valid);

    expect((venue as any).operations.run).toHaveBeenCalledWith("v/ops/skills/import", {
      text: valid,
      skillset: "w/skills",
    });
    expect(result).toEqual({
      path: "w/skills/research",
      name: "research",
      description: "Find sources.",
      existed: false,
      ignored: [],
    });
  });

  it("writes to a caller-supplied skillset", async () => {
    const venue = venueWith({ path: "w/team-skills/research" });
    await saveSkill(venue, valid, "w/team-skills");
    expect((venue as any).operations.run).toHaveBeenCalledWith(
      "v/ops/skills/import",
      expect.objectContaining({ skillset: "w/team-skills" }),
    );
  });

  it("reports `existed` so the caller can tell an edit from a create", async () => {
    const venue = venueWith({ path: "w/skills/research", existed: true });
    await expect(saveSkill(venue, valid)).resolves.toMatchObject({ existed: true });
  });

  it("surfaces frontmatter keys the venue dropped", async () => {
    const venue = venueWith({ path: "w/skills/research", ignored: ["argument-hint", 7] });
    // Non-string entries are discarded rather than rendered as "7".
    await expect(saveSkill(venue, valid)).resolves.toMatchObject({ ignored: ["argument-hint"] });
  });

  it("refuses an invalid draft without invoking anything", async () => {
    const venue = venueWith({});
    await expect(saveSkill(venue, "# no frontmatter")).rejects.toThrow(/frontmatter block/);
    expect((venue as any).operations.run).not.toHaveBeenCalled();
  });

  it("fails loudly when the venue returns no path", async () => {
    const venue = venueWith({ name: "research" });
    await expect(saveSkill(venue, valid)).rejects.toThrow(/returned no path/);
  });
});

describe("deleteSkill", () => {
  it("deletes a workspace skill through the job-free lattice delete", async () => {
    const venue = { workspace: { delete: jest.fn().mockResolvedValue({}) } } as never;
    await deleteSkill(venue, "w/skills/research");
    expect((venue as any).workspace.delete).toHaveBeenCalledWith("w/skills/research");
  });

  it("refuses to delete outside the user's workspace", async () => {
    const venue = { workspace: { delete: jest.fn() } } as never;
    await expect(deleteSkill(venue, "v/skills/agents")).rejects.toThrow(/your workspace/);
    expect((venue as any).workspace.delete).not.toHaveBeenCalled();
  });
});
