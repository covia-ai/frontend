import {
  agentUsesSkill,
  normalizeSkill,
  skillsFromTree,
  parseSkillFrontmatter,
  skillsFromAssets,
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

  it("maps resolved SDK skill assets, preserving venue and user as distinct sources", () => {
    const assets = [
      { id: "w/skills/review", metadata: { description: "Review work" } },
    ] as never;
    expect(skillsFromAssets(assets, "user"))
      .toEqual([expect.objectContaining({ key: "review", path: "w/skills/review", source: "user" })]);
  });

  it("matches agent configs by canonical path, reference, or skill name", () => {
    // normalizeSkill's string-value branch is defensive: SkillManager
    // (venue.skills.list()/get()) never hands back a raw reference string —
    // it either resolves to a full asset or is skipped entirely
    // (covia-sdk#32) — but the function itself still supports it directly.
    const skill = normalizeSkill("review", "a/abc", "user", "w/skills/review");
    expect(agentUsesSkill({ skills: ["w/skills/review"] }, skill)).toBe(true);
    expect(agentUsesSkill({ skills: ["a/abc"] }, skill)).toBe(true);
    expect(agentUsesSkill({ skills: ["other"] }, skill)).toBe(false);
  });
});

// Skills sit at mixed depths: most directly under v/skills, but every
// per-provider connection skill one level down. The old direct-children
// listing dropped all of those and rendered their container as a skill
// (frontend#351).
describe("skillsFromTree", () => {
  const tree = {
    agents: { name: "agents", description: "Manage agents.", skill: { tools: ["v/ops/agent/list"] } },
    http: { name: "http", description: "Call HTTP.", skill: {} },
    // A container: no facet of its own, real skills one level down.
    connections: {
      sentry: { name: "sentry", description: "Read Sentry issues.", skill: {} },
      github: { name: "github", description: "Read GitHub.", skill: {} },
    },
    // A category index that re-lists a skill already present at the top
    // level, plus one that only exists here.
    "ops-tools": {
      http: { name: "http", description: "Call HTTP.", skill: {} },
      lattice: { name: "lattice", description: "Lattice reads.", skill: {} },
    },
  };

  it("finds skills nested below the top level", () => {
    const names = skillsFromTree(tree, "venue", "v/skills").map((s) => s.name).sort();
    expect(names).toEqual(["agents", "github", "http", "lattice", "sentry"]);
  });

  it("addresses a nested skill by its full path", () => {
    const sentry = skillsFromTree(tree, "venue", "v/skills").find((s) => s.name === "sentry");
    expect(sentry?.path).toBe("v/skills/connections/sentry");
    expect(sentry?.description).toBe("Read Sentry issues.");
  });

  it("never emits a container as a skill of its own", () => {
    // The pre-fix symptom: `connections` listed as a description-less,
    // tool-less skill because its children were invisible.
    const keys = skillsFromTree(tree, "venue", "v/skills").map((s) => s.key);
    expect(keys).not.toContain("connections");
  });

  it("de-duplicates a skill re-listed under a category index, keeping the shallowest path", () => {
    const skills = skillsFromTree(tree, "venue", "v/skills");
    expect(skills.filter((s) => s.name === "http")).toHaveLength(1);
    expect(skills.find((s) => s.name === "http")?.path).toBe("v/skills/http");
    // One that exists only under the index is still reached, at its own path.
    expect(skills.find((s) => s.name === "lattice")?.path).toBe("v/skills/ops-tools/lattice");
  });

  it("treats a bare-string leaf as a reference rather than descending into it", () => {
    const skills = skillsFromTree({ alias: "a/abc" }, "user", "w/skills");
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({ key: "alias", reference: "a/abc", path: "w/skills/alias" });
  });

  it("returns nothing for an absent root", () => {
    expect(skillsFromTree(null, "user", "w/skills")).toEqual([]);
  });
});
