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
    expect(draft.customModel).toBe("private-v2");
    expect(configFromAgentSettingsDraft(draft).config).toMatchObject({
      operation: "v/ops/llmagent/chat",
      llmOperation: "w/ops/private/model",
      model: "private-v2",
      systemPrompt: "Be precise.",
    });
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
