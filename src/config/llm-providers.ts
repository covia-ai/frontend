export interface LLMProvider {
  label: string;
  secretKey: string;
  operation: string;
  requiresKey: boolean;
}

export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  anthropic: { label: "Anthropic (Claude)", secretKey: "ANTHROPIC_API_KEY", operation: "v/ops/langchain/anthropic", requiresKey: true },
  openai:    { label: "OpenAI",             secretKey: "OPENAI_API_KEY",    operation: "v/ops/langchain/openai",    requiresKey: true },
  gemini:    { label: "Google Gemini",      secretKey: "GOOGLE_API_KEY",    operation: "v/ops/langchain/gemini",    requiresKey: true },
  xai:       { label: "xAI (Grok)",        secretKey: "XAI_API_KEY",       operation: "v/ops/langchain/xai",       requiresKey: true },
  deepseek:  { label: "DeepSeek",          secretKey: "DEEPSEEK_API_KEY",  operation: "v/ops/langchain/deepseek",  requiresKey: true },
  ollama:    { label: "Ollama (local)",     secretKey: "",                  operation: "v/ops/langchain/ollama",    requiresKey: false },
};

/** Map of secret key name → display label, for use in AIPrompt */
export const KNOWN_LLM_KEYS: Record<string, string> = Object.fromEntries(
  Object.values(LLM_PROVIDERS)
    .filter((p) => p.requiresKey)
    .map((p) => [p.secretKey, p.label])
);
