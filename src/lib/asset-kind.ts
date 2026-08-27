import { isAgentTemplateMetadata } from "@/lib/agent-templates";

export type AssetKind = "operation" | "agent-template" | "skill" | "artifact" | "reference";

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  operation: "Operation",
  "agent-template": "Agent Template",
  skill: "Skill",
  artifact: "Content Artifact",
  reference: "Reference",
};

// Root CLAUDE.md's asset taxonomy (operation / artifact / reference), plus two
// kinds this app renders distinctly: agent templates (v/agents/templates/*,
// see AgentTemplate in use-agent-templates.ts) and skills (assets that expose
// `skill.tools` — a curated tool list plus doc body, e.g. v/skills/*). Mirrors
// the field checks MetadataViewer already made per-kind, so the badge
// AssetHeader shows always agrees with what MetadataViewer actually renders
// for the same asset.
export function getAssetKind(metadata: any): AssetKind {
  const operation = metadata?.operation;
  const hasOperationSchema =
    operation != null &&
    typeof operation === "object" &&
    (typeof operation.adapter === "string" ||
      Boolean(operation.input?.properties && Object.keys(operation.input.properties).length > 0) ||
      Boolean(operation.output?.properties && Object.keys(operation.output.properties).length > 0) ||
      (Array.isArray(operation.steps) && operation.steps.length > 0));
  if (hasOperationSchema) return "operation";

  // Canonical templates have an `agent.config` facet; legacy workspace
  // templates expose their config fields at the top level.
  if (isAgentTemplateMetadata(metadata)) return "agent-template";

  // A skill names the tools it grants (metadata.skill.tools), distinct from
  // an agent template's own `skills` list (the templates that *use* skills).
  const hasSkillTools = Array.isArray(metadata?.skill?.tools) && metadata.skill.tools.length > 0;
  if (hasSkillTools) return "skill";

  if (metadata?.content !== undefined) return "artifact";

  return "reference";
}
