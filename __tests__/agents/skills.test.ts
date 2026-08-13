import {
  agentUsesSkill,
  normalizeSkill,
  parseSkillFrontmatter,
  skillsFromTree,
} from "@/lib/skills";

describe("skills library normalization", () => {
  it("reads canonical skill metadata and inline markdown", () => {
    const skill = normalizeSkill("agents", {
      name: "Agent management",
      description: "Manage agents.",
      content: { inline: "## Instructions\nBe careful." },
      skill: { tools: ["v/ops/agent/list", 42] },
    }, "venue", "v/skills/agents");

    expect(skill.name).toBe("Agent management");
    expect(skill.body).toContain("## Instructions");
    expect(skill.tools).toEqual(["v/ops/agent/list"]);
  });

  it("supports SKILL.md frontmatter and strips it from rendered content", () => {
    const parsed = parseSkillFrontmatter(
      "---\nname: Research\ndescription: Find reliable sources.\nargument-hint: topic\n---\n\n# Research workflow",
    );
    expect(parsed).toEqual({
      name: "Research",
      description: "Find reliable sources.",
      body: "# Research workflow",
    });
  });

  it("preserves venue and user entries as distinct sources", () => {
    expect(skillsFromTree({ review: { description: "Review work" } }, "user", "w/skills"))
      .toEqual([expect.objectContaining({ path: "w/skills/review", source: "user" })]);
  });

  it("matches agent configs by canonical path, reference, or skill name", () => {
    const skill = normalizeSkill("review", "a/abc", "user", "w/skills/review");
    expect(agentUsesSkill({ skills: ["w/skills/review"] }, skill)).toBe(true);
    expect(agentUsesSkill({ skills: ["a/abc"] }, skill)).toBe(true);
    expect(agentUsesSkill({ skills: ["other"] }, skill)).toBe(false);
  });
});
