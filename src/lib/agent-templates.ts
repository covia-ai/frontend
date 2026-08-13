export type AgentConfigMap = Record<string, unknown>;
export type AgentConfigLayer = string | AgentConfigMap;
export type AgentConfigInput = AgentConfigLayer | AgentConfigLayer[];

export interface AgentTemplate {
  /** Directory key under v/agents/templates; this is the catalog identity. */
  key: string;
  name?: string;
  description?: string;
  /** Exact creation config, after lifting canonical agent.state into config. */
  config: AgentConfigInput;
  /** Best-effort merge of inline layers, used only to seed and describe the form. */
  preview: AgentConfigMap;
  systemPrompt?: string;
  llmOperation?: string;
  model?: string;
  operation?: string;
  skills?: string[];
  tools?: string[];
  defaultTools?: boolean;
}

export function isRecord(value: unknown): value is AgentConfigMap {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isConfigInput(value: unknown): value is AgentConfigInput {
  if (typeof value === "string" || isRecord(value)) return true;
  return Array.isArray(value) && value.every(
    (layer) => typeof layer === "string" || isRecord(layer),
  );
}

function mergeRecords(base: AgentConfigMap, next: AgentConfigMap): AgentConfigMap {
  const merged = { ...base };
  for (const [key, value] of Object.entries(next)) {
    const previous = merged[key];
    merged[key] = isRecord(previous) && isRecord(value)
      ? mergeRecords(previous, value)
      : value;
  }
  return merged;
}

/**
 * Resolves only inline layers for display. String references deliberately stay
 * unresolved: creation passes them through to the venue, which owns lattice
 * resolution and the authoritative recursive merge semantics.
 */
export function inlineAgentConfigPreview(config: AgentConfigInput): AgentConfigMap {
  const layers = Array.isArray(config) ? config : [config];
  return layers.reduce<AgentConfigMap>(
    (preview, layer) => isRecord(layer) ? mergeRecords(preview, layer) : preview,
    {},
  );
}

function withInitialState(config: AgentConfigInput, state: unknown): AgentConfigInput {
  if (isRecord(config)) return { ...config, state };
  return [...(Array.isArray(config) ? config : [config]), { state }];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

/** Normalize both legacy flat template maps and canonical agent facets. */
export function normalizeAgentTemplate(key: string, value: unknown): AgentTemplate | null {
  if (!isRecord(value)) return null;

  const facet = isRecord(value.agent) ? value.agent : null;
  let config: AgentConfigInput;
  if (facet) {
    if (facet.config === undefined) config = {};
    else if (isConfigInput(facet.config)) config = facet.config;
    else return null;
  } else {
    // Legacy workspace templates are themselves config maps.
    config = value;
  }
  if (facet && Object.prototype.hasOwnProperty.call(facet, "state")) {
    config = withInitialState(config, facet.state);
  }

  const preview = inlineAgentConfigPreview(config);
  const displayName = optionalString(value.name) ?? optionalString(preview.name);
  const displayDescription =
    optionalString(value.description) ?? optionalString(preview.description);

  return {
    key,
    name: displayName,
    description: displayDescription,
    config,
    preview,
    systemPrompt: optionalString(preview.systemPrompt),
    llmOperation: optionalString(preview.llmOperation),
    model: optionalString(preview.model),
    operation: optionalString(preview.operation),
    skills: optionalStringArray(preview.skills),
    tools: optionalStringArray(preview.tools),
    defaultTools:
      typeof preview.defaultTools === "boolean" ? preview.defaultTools : undefined,
  };
}

export function isAgentTemplateMetadata(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (isRecord(value.agent) && ("config" in value.agent || "state" in value.agent)) {
    return true;
  }
  return typeof value.llmOperation === "string" || Array.isArray(value.skills);
}

export function agentConfigPreviewFromMetadata(value: unknown): AgentConfigMap {
  return normalizeAgentTemplate("preview", value)?.preview ?? {};
}

/** Add final form overrides without flattening a reference or ordered stack. */
export function withAgentConfigOverrides(
  config: AgentConfigInput | undefined,
  overrides: AgentConfigMap,
): AgentConfigInput {
  if (config === undefined) return overrides;
  if (isRecord(config)) return { ...config, ...overrides };
  return [...(Array.isArray(config) ? config : [config]), overrides];
}

/** Remove editable inline fields before the form writes their final values. */
export function withoutAgentConfigFields(
  config: AgentConfigInput | undefined,
  fields: string[],
): AgentConfigInput | undefined {
  if (config === undefined) return undefined;
  const omit = (layer: AgentConfigLayer): AgentConfigLayer => {
    if (!isRecord(layer)) return layer;
    return Object.fromEntries(
      Object.entries(layer).filter(([key]) => !fields.includes(key)),
    );
  };
  return Array.isArray(config) ? config.map(omit) : omit(config);
}

/**
 * SDK 1.8's declaration still says config is map-only, while the updated
 * venue accepts references and ordered layers. Keep that declaration lag
 * contained at the call boundary until the SDK publishes the wider type.
 */
export function asSdkAgentConfig(config: AgentConfigInput): Record<string, unknown> {
  return config as unknown as Record<string, unknown>;
}
