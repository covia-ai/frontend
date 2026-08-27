import { LLM_PROVIDERS } from "@/config/llm-providers";
import type { AgentDetail } from "@/config/types";
import type { AgentConfigInput } from "@/lib/agent-templates";

export const CUSTOM_MODEL_OPTION = "__custom__";
export const DEFAULT_MODEL_OPTION = "__default__";
export const CUSTOM_PROVIDER_OPTION = "__custom_provider__";
export const DEFAULT_PROVIDER_OPTION = "__default_provider__";

export type ModelSelection = {
  model: string;
  customModel: string;
};

export function modelSelectionFromId(
  providerId: string,
  modelId: string,
): ModelSelection {
  if (!modelId) return { model: "", customModel: "" };
  const knownModel = LLM_PROVIDERS[providerId]?.models?.includes(modelId);
  return knownModel
    ? { model: modelId, customModel: "" }
    : { model: CUSTOM_MODEL_OPTION, customModel: modelId };
}

export function resolvedModelId(model: string, customModel: string): string {
  if (model === CUSTOM_MODEL_OPTION) return customModel.trim();
  if (model === DEFAULT_MODEL_OPTION) return "";
  return model;
}

export function isAgentProviderReady(
  providerId: string,
  availableKeys: string[],
): boolean {
  if (
    providerId === CUSTOM_PROVIDER_OPTION ||
    providerId === DEFAULT_PROVIDER_OPTION
  ) return true;
  const provider = LLM_PROVIDERS[providerId];
  if (!provider) return false;
  return !provider.requiresKey || availableKeys.includes(provider.secretKey);
}

export function providerForOperation(llmOperation?: string): string {
  const match = Object.entries(LLM_PROVIDERS).find(
    ([, provider]) => provider.operation === llmOperation,
  );
  return match?.[0] ?? "anthropic";
}

export type AgentCreationSeed = {
  initialAgentName: string;
  initialSystemPrompt: string;
  initialProvider: string;
  initialModel: string;
  initialConfig: AgentConfigInput;
};

// Clone only the source's creation config. Runtime state, session history,
// pending tasks, timeline entries, status, and identity all deliberately stay
// behind with the source agent.
export function cloneSeedFromAgent(agent: AgentDetail): AgentCreationSeed {
  const config =
    agent.config && typeof agent.config === "object" ? agent.config : {};
  const {
    llmOperation,
    model,
    systemPrompt,
    ...initialConfig
  } = config;

  return {
    initialAgentName: `${agent.agentId} copy`,
    initialSystemPrompt:
      typeof systemPrompt === "string" ? systemPrompt : "",
    initialProvider: providerForOperation(
      typeof llmOperation === "string" ? llmOperation : undefined,
    ),
    initialModel: typeof model === "string" ? model : "",
    initialConfig,
  };
}
