import { isAgentTemplateMetadata } from "@/lib/agent-templates";

export type AssetKind = "operation" | "agent-template" | "artifact" | "reference";

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  operation: "Operation",
  "agent-template": "Agent Template",
  artifact: "Artifact",
  reference: "Reference",
};

// Root CLAUDE.md's asset taxonomy (operation / artifact / reference), plus a
// fourth kind this app renders distinctly: agent templates (v/agents/templates/*,
// see AgentTemplate in use-agent-templates.ts). Mirrors the field checks
// MetadataViewer already made per-kind, so the badge AssetHeader shows always
// agrees with what MetadataViewer actually renders for the same asset.
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

  if (metadata?.content !== undefined) return "artifact";

  return "reference";
}
