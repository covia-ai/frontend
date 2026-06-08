export interface LLMProvider {
  label: string;
  secretKey: string;
}

export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  anthropic: { label: "Anthropic (Claude)", secretKey: "ANTHROPIC_API_KEY" },
  openai:    { label: "OpenAI",             secretKey: "OPENAI_API_KEY" },
  google:    { label: "Google Gemini",      secretKey: "GOOGLE_API_KEY" },
  mistral:   { label: "Mistral",            secretKey: "MISTRAL_API_KEY" },
  groq:      { label: "Groq",              secretKey: "GROQ_API_KEY" },
  cohere:    { label: "Cohere",            secretKey: "COHERE_API_KEY" },
};

/** Map of secret key name → display label, for backwards compat with AIPrompt */
export const KNOWN_LLM_KEYS: Record<string, string> = Object.fromEntries(
  Object.values(LLM_PROVIDERS).map((p) => [p.secretKey, p.label])
);
