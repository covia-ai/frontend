import {
  CUSTOM_PROVIDER_OPTION,
  DEFAULT_PROVIDER_OPTION,
  cloneSeedFromAgent,
  providerSelectionForOperation,
} from "@/lib/agent-config";
import { LLM_PROVIDERS } from "@/config/llm-providers";
import type { AgentDetail } from "@/config/types";

describe("providerSelectionForOperation", () => {
  it("names the curated provider that owns the operation", () => {
    expect(providerSelectionForOperation(LLM_PROVIDERS.openai.operation)).toEqual({
      providerId: "openai",
      customProviderOperation: "",
    });
  });

  it("keeps an operation outside the curated list as a custom provider", () => {
    expect(providerSelectionForOperation("v/ops/local/my-llm")).toEqual({
      providerId: CUSTOM_PROVIDER_OPTION,
      customProviderOperation: "v/ops/local/my-llm",
    });
  });

  it.each([undefined, "", 42])("reads %p as the venue default", (operation) => {
    expect(providerSelectionForOperation(operation).providerId).toBe(DEFAULT_PROVIDER_OPTION);
  });
});

describe("cloneSeedFromAgent", () => {
  const agent = (config: Record<string, unknown>): AgentDetail =>
    ({ agentId: "writer", status: "SLEEPING", config }) as AgentDetail;

  it("lifts the editable fields out of the config it passes through", () => {
    const seed = cloneSeedFromAgent(
      agent({
        llmOperation: LLM_PROVIDERS.anthropic.operation,
        model: "claude-opus-4-8",
        systemPrompt: "Write carefully.",
        skills: ["w/skills"],
      }),
    );

    expect(seed).toMatchObject({
      initialAgentName: "writer copy",
      initialProvider: "anthropic",
      initialModel: "claude-opus-4-8",
      initialSystemPrompt: "Write carefully.",
      initialConfig: { skills: ["w/skills"] },
    });
  });

  // Both used to fall back to Anthropic, so the clone silently changed provider.
  it("keeps a custom provider operation", () => {
    expect(cloneSeedFromAgent(agent({ llmOperation: "v/ops/local/my-llm" }))).toMatchObject({
      initialProvider: CUSTOM_PROVIDER_OPTION,
      initialCustomProviderOperation: "v/ops/local/my-llm",
    });
  });

  it("keeps the venue default when the source names no operation", () => {
    expect(cloneSeedFromAgent(agent({})).initialProvider).toBe(DEFAULT_PROVIDER_OPTION);
  });
});
