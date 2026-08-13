import { LLM_PROVIDERS } from "@/config/llm-providers";
import type { AgentDetail } from "@/config/types";

export interface AgentTemplateConfig extends Record<string, unknown> {
  operation?: string;
  skills?: string[];
  tools?: string[];
  defaultTools?: boolean;
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
  initialConfig: AgentTemplateConfig;
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
