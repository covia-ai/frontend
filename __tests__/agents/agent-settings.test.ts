import {
  agentConfigUpdatePatch,
  configFromAgentSettingsDraft,
  createAgentSettingsDraft,
} from "@/lib/agent-settings";
import { CUSTOM_PROVIDER_OPTION } from "@/lib/agent-config";

describe("agent settings config", () => {
  it("does not turn a non-LLM agent into an LLM agent by default", () => {
    const original = { operation: "v/ops/test/never" };
    const draft = createAgentSettingsDraft(original);
    const result = configFromAgentSettingsDraft(draft, original);

    expect(result.config).toEqual(original);
    expect(agentConfigUpdatePatch(original, result.config ?? {})).toEqual({});
  });

  it("keeps custom provider operations editable without replacing them", () => {
    const draft = createAgentSettingsDraft({
      operation: "v/ops/llmagent/chat",
      llmOperation: "w/ops/private/model",
      model: "private-v2",
      systemPrompt: "Be precise.",
    });

    expect(draft.providerId).toBe(CUSTOM_PROVIDER_OPTION);
    expect(draft.customProviderOperation).toBe("w/ops/private/model");
    expect(draft.model).toBe("private-v2");
    expect(configFromAgentSettingsDraft(draft).config).toMatchObject({
      operation: "v/ops/llmagent/chat",
      llmOperation: "w/ops/private/model",
      model: "private-v2",
      systemPrompt: "Be precise.",
    });
  });

  it("edits skillsets as their own field, not as additional configuration", () => {
    const original = { skills: ["w/skills/tone"], skillsets: ["w/skills"] };
    const draft = createAgentSettingsDraft(original);

    expect(JSON.parse(draft.skillsetsJson)).toEqual(["w/skills"]);
    expect(JSON.parse(draft.advancedJson)).toEqual({});
    expect(configFromAgentSettingsDraft(draft, original).config).toEqual(original);

    draft.skillsetsJson = "[]";
    expect(agentConfigUpdatePatch(original, configFromAgentSettingsDraft(draft, original).config ?? {}))
      .toEqual({ skillsets: [] });
  });

  it("validates structured capability fields before saving", () => {
    const draft = createAgentSettingsDraft({});
    draft.toolsJson = '{ "not": "an array" }';

    expect(configFromAgentSettingsDraft(draft).error).toBe(
      "Tools must be a JSON array.",
    );
  });

  it("builds a minimal patch and uses null to clear removed values", () => {
    const original = {
      systemPrompt: "Old prompt",
      model: "old-model",
      nested: { b: 2, a: 1 },
      tools: ["v/ops/old"],
    };
    const next = {
      systemPrompt: "New prompt",
      nested: { a: 1, b: 2 },
      tools: [],
    };

    expect(agentConfigUpdatePatch(original, next)).toEqual({
      systemPrompt: "New prompt",
      model: null,
      tools: [],
    });
  });
});

describe("agent settings caps (covia 0.11)", () => {
  it("reads caps: \"unrestricted\" as unrestricted and writes it back explicitly", () => {
    const original = { caps: "unrestricted" };
    const draft = createAgentSettingsDraft(original);
    expect(draft.capsMode).toBe("unrestricted");
    expect(draft.caps).toEqual([]);
    expect(configFromAgentSettingsDraft(draft, original).config).toEqual({ caps: "unrestricted" });
    expect(agentConfigUpdatePatch(original, configFromAgentSettingsDraft(draft, original).config ?? {}))
      .toEqual({});
  });

  it("never patches caps to null when an agent is switched to unrestricted", () => {
    const original = { caps: [{ with: "w/", can: "crud/read" }] };
    const draft = { ...createAgentSettingsDraft(original), capsMode: "unrestricted" as const };
    expect(agentConfigUpdatePatch(original, configFromAgentSettingsDraft(draft, original).config ?? {}))
      .toEqual({ caps: "unrestricted" });
  });

  it("keeps an empty list (no authority) as an empty list", () => {
    const original = { caps: [] };
    const draft = createAgentSettingsDraft(original);
    expect(draft.capsMode).toBe("restricted");
    expect(configFromAgentSettingsDraft(draft, original).config).toEqual({ caps: [] });
  });

  it("leaves a config that never had caps (a venue before 0.11) without them", () => {
    const draft = createAgentSettingsDraft({});
    expect(draft.capsMode).toBe("unrestricted");
    expect(configFromAgentSettingsDraft(draft, {}).config).not.toHaveProperty("caps");
  });
});
