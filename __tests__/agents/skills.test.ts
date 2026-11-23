import {
  agentUsesSkill,
  normalizeSkill,
  skillsFromSkillset,
  skillsFromSkillsets,
  withSkillToggled,
  parseSkillFrontmatter,
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

  it("matches agent configs by canonical path, reference, or skill name", () => {
    // A skillset member can be a bare reference string (an asset id or path,
    // see SKILL_REF), which the listing passes straight to normalizeSkill.
    const skill = normalizeSkill("review", "a/abc", "user", "w/skills/review");
    expect(agentUsesSkill({ skills: ["w/skills/review"] }, skill)).toBe(true);
    expect(agentUsesSkill({ skills: ["a/abc"] }, skill)).toBe(true);
    expect(agentUsesSkill({ skills: ["other"] }, skill)).toBe(false);
  });
});

// Listing follows the venue's skillset rule (covia SKILLS.md §4.1,
// Skills.isSkillValue): a skillset is one directory read one level deep, and
// v/skills is a directory of skillsets (frontend#351, frontend#482).
describe("skillsFromSkillsets (v/skills)", () => {
  const tree = {
    root: {
      agents: { name: "agents", description: "Manage agents.", skill: { tools: ["v/ops/agent/list"] } },
    },
    connections: {
      sentry: { name: "sentry", description: "Read Sentry issues.", skill: {} },
      github: { name: "github", description: "Read GitHub.", skill: {} },
    },
    "ops-tools": {
      http: { name: "http", description: "Call HTTP." },
      lattice: { name: "lattice", description: "Lattice reads.", skill: {} },
    },
    // Re-lists a skill another skillset already holds.
    agents: {
      agents: { name: "agents", description: "Manage agents.", skill: {} },
      tasks: { name: "tasks", description: "Delegate tasks.", skill: {} },
    },
  };

  it("lists each key of v/skills as a skillset, one level deep", () => {
    const names = skillsFromSkillsets(tree, "venue", "v/skills").map((s) => s.name).sort();
    expect(names).toEqual(["agents", "github", "http", "lattice", "sentry", "tasks"]);
  });

  it("addresses a skill by its skillset path", () => {
    const sentry = skillsFromSkillsets(tree, "venue", "v/skills").find((s) => s.name === "sentry");
    expect(sentry?.path).toBe("v/skills/connections/sentry");
  });

  it("counts a skill without a `skill` facet, as the venue does (#482)", () => {
    const http = skillsFromSkillsets(tree, "venue", "v/skills").find((s) => s.name === "http");
    expect(http?.path).toBe("v/skills/ops-tools/http");
  });

  it("never emits a skillset as a skill of its own", () => {
    const keys = skillsFromSkillsets(tree, "venue", "v/skills").map((s) => s.key);
    expect(keys).not.toContain("connections");
    expect(keys).not.toContain("ops-tools");
  });

  it("resolves a name collision first-wins, with root listed first", () => {
    const agents = skillsFromSkillsets(tree, "venue", "v/skills").filter((s) => s.name === "agents");
    expect(agents).toHaveLength(1);
    expect(agents[0].path).toBe("v/skills/root/agents");
  });

  it("keeps every address of a mirrored skill, so an agent naming any of them matches", () => {
    const agents = skillsFromSkillsets(tree, "venue", "v/skills").find((s) => s.name === "agents")!;
    expect(agents.aliases).toEqual(["v/skills/root/agents", "v/skills/agents/agents"]);
    expect(agentUsesSkill({ skills: ["v/skills/agents/agents"] }, agents)).toBe(true);
    expect(withSkillToggled(["v/skills/agents/agents", "other"], agents, false)).toEqual(["other"]);
  });

  it("drops the name/description strings of a node that is both a skill and a skillset", () => {
    // Long-lived venues hold legacy flat skills like v/skills/agents beside
    // the agents/ family; listing that node as a skillset meets its own
    // metadata strings, which the venue fails to resolve and leaves out.
    const mixed = {
      agents: {
        name: "agents",
        description: "Create, configure and delegate to other agents.",
        content: { contentType: "text/markdown", inline: "## Agents" },
        skill: { tools: [] },
        hitl: { name: "hitl", description: "Ask a human.", skill: {} },
      },
    };
    const keys = skillsFromSkillsets(mixed, "venue", "v/skills").map((s) => s.key);
    expect(keys).toEqual(["hitl"]);
  });

  it("does not walk into a nested directory inside a skillset", () => {
    const nested = { data: { deeper: { inner: { name: "inner", description: "Hidden.", skill: {} } } } };
    expect(skillsFromSkillsets(nested, "venue", "v/skills")).toEqual([]);
  });

  it("returns nothing for an absent root", () => {
    expect(skillsFromSkillsets(null, "venue", "v/skills")).toEqual([]);
  });
});

describe("skillsFromSkillset (w/skills)", () => {
  it("lists an imported skill as one skill, not its metadata fields (#482)", () => {
    const wSkills = {
      "fence-demo": {
        name: "fence-demo",
        description: "Test skill",
        content: { contentType: "text/markdown", inline: "## Fence demo" },
        createdBy: { did: "did:key:z6MkOwner" },
      },
    };
    const skills = skillsFromSkillset(wSkills, "user", "w/skills");
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({ name: "fence-demo", path: "w/skills/fence-demo", source: "user" });
  });

  it("keeps a string member that is a skill reference (#229)", () => {
    const skills = skillsFromSkillset(
      { alias: "a/abc123", shared: "v/skills/data/workspace", file: "file://reference/skills/agent/SKILL.md" },
      "user",
      "w/skills",
    );
    expect(skills.map((s) => [s.key, s.reference])).toEqual([
      ["alias", "a/abc123"],
      ["file", "file://reference/skills/agent/SKILL.md"],
      ["shared", "v/skills/data/workspace"],
    ]);
  });

  it("drops a string member that is not a reference form the venue resolves", () => {
    expect(skillsFromSkillset({ note: "just some words" }, "user", "w/skills")).toEqual([]);
  });

  it("returns nothing for an absent w/skills", () => {
    expect(skillsFromSkillset(null, "user", "w/skills")).toEqual([]);
  });
});
