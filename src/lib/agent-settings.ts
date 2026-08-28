import { LLM_PROVIDERS } from "@/config/llm-providers";
import {
  CUSTOM_PROVIDER_OPTION,
  DEFAULT_PROVIDER_OPTION,
  modelSelectionFromId,
  resolvedModelId,
} from "@/lib/agent-config";
import { cleanCaps, isAgentCap, type AgentCap } from "@/lib/agent-caps";

export type AgentSettingsDraft = {
  systemPrompt: string;
  providerId: string;
  customProviderOperation: string;
  model: string;
  customModel: string;
  toolsJson: string;
  skillsJson: string;
  capsEnabled: boolean;
  caps: AgentCap[];
  contextJson: string;
  defaultTools: boolean;
  advancedJson: string;
};

export type AgentSettingsResult =
  | { config: Record<string, unknown>; error: null }
  | { config: null; error: string };

// Result of an agent:update save attempt (see use-agent-explorer.ts's
// updateAgentConfig). "conflict" carries the freshly re-fetched config that
// caused the rejection so the caller can rebase its editor onto it — reading
// the `agent` prop after the fact isn't safe, since a React state update
// (setSelectedAgentDetail) isn't guaranteed visible in the same closure the
// save was called from.
export type AgentConfigSaveOutcome =
  | { status: "saved" }
  | { status: "conflict"; freshConfig: Record<string, unknown> }
  | { status: "failed" };

const MANAGED_FIELDS = new Set([
  "systemPrompt",
  "llmOperation",
  "model",
  "tools",
  "skills",
  "caps",
  "context",
  "defaultTools",
]);

function prettyJson(value: unknown): string {
  return value === undefined ? "" : JSON.stringify(value, null, 2);
}

function providerSelection(operation: unknown): {
  providerId: string;
  customProviderOperation: string;
} {
  if (typeof operation !== "string" || !operation) {
    return { providerId: DEFAULT_PROVIDER_OPTION, customProviderOperation: "" };
  }
  const known = Object.entries(LLM_PROVIDERS).find(
    ([, provider]) => provider.operation === operation,
  );
  return known
    ? { providerId: known[0], customProviderOperation: "" }
    : { providerId: CUSTOM_PROVIDER_OPTION, customProviderOperation: operation };
}

export function createAgentSettingsDraft(
  config: Record<string, unknown> = {},
): AgentSettingsDraft {
  const provider = providerSelection(config.llmOperation);
  const model = modelSelectionFromId(
    provider.providerId,
    typeof config.model === "string" ? config.model : "",
  );
  const advanced = Object.fromEntries(
    Object.entries(config).filter(([key]) => !MANAGED_FIELDS.has(key)),
  );

  return {
    systemPrompt:
      typeof config.systemPrompt === "string" ? config.systemPrompt : "",
    ...provider,
    ...model,
    toolsJson: prettyJson(config.tools),
    skillsJson: prettyJson(config.skills),
    capsEnabled: Array.isArray(config.caps),
    caps: Array.isArray(config.caps) ? config.caps.filter(isAgentCap) : [],
    contextJson: prettyJson(config.context),
    defaultTools: config.defaultTools === true,
    advancedJson: prettyJson(advanced) || "{}",
  };
}

function parseJson(
  label: string,
  text: string,
  expected: "array" | "object",
): { value: unknown; error: null } | { value: null; error: string } {
  try {
    const value = JSON.parse(text);
    const valid = expected === "array"
      ? Array.isArray(value)
      : value !== null && typeof value === "object" && !Array.isArray(value);
    return valid
      ? { value, error: null }
      : { value: null, error: `${label} must be a JSON ${expected}.` };
  } catch {
    return { value: null, error: `${label} contains invalid JSON.` };
  }
}

export function configFromAgentSettingsDraft(
  draft: AgentSettingsDraft,
  originalConfig: Record<string, unknown> = {},
): AgentSettingsResult {
  const advanced = parseJson("Additional configuration", draft.advancedJson, "object");
  if (advanced.error) return { config: null, error: advanced.error };
  const config = { ...(advanced.value as Record<string, unknown>) };
  const forbidden = Object.keys(config).find((key) => MANAGED_FIELDS.has(key));
  if (forbidden) {
    return {
      config: null,
      error: `${forbidden} has its own field. Remove it from Additional configuration.`,
    };
  }

  const operation = draft.providerId === CUSTOM_PROVIDER_OPTION
    ? draft.customProviderOperation.trim()
    : LLM_PROVIDERS[draft.providerId]?.operation;
  if (draft.providerId !== DEFAULT_PROVIDER_OPTION) {
    if (!operation) return { config: null, error: "Choose an LLM provider operation." };
    config.llmOperation = operation;
  }

  const prompt = draft.systemPrompt.trim();
  if (prompt) config.systemPrompt = prompt;
  const model = resolvedModelId(draft.model, draft.customModel);
  if (model) config.model = model;

  for (const [key, label, text] of [
    ["tools", "Tools", draft.toolsJson],
    ["skills", "Skills", draft.skillsJson],
    ["context", "Context", draft.contextJson],
  ] as const) {
    if (!text.trim()) continue;
    const parsed = parseJson(label, text, "array");
    if (parsed.error) return { config: null, error: parsed.error };
    config[key] = parsed.value;
  }

  if (draft.capsEnabled) config.caps = cleanCaps(draft.caps);

  if (draft.defaultTools || Object.hasOwn(originalConfig, "defaultTools")) {
    config.defaultTools = draft.defaultTools;
  }
  return { config, error: null };
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stable(child)]),
    );
  }
  return value;
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

// Order-independent deep equality for agent config objects — used both to
// compute the update patch below and, in use-agent-explorer.ts, to detect a
// concurrent edit by comparing a freshly re-fetched config against the one
// this editing session started from (see covia-ai/frontend#161).
export const agentConfigsEqual = equal;

/**
 * agent:update recursively merges maps, replaces arrays/scalars, and accepts
 * null as an explicit clear. Send only changed top-level fields so background
 * config additions are not overwritten by an older settings form.
 */
export function agentConfigUpdatePatch(
  original: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(original), ...Object.keys(next)])) {
    if (!Object.hasOwn(next, key)) {
      patch[key] = null;
    } else if (!equal(original[key], next[key])) {
      patch[key] = next[key];
    }
  }
  return patch;
}
