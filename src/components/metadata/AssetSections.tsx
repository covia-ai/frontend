import React from "react";
import Link from "next/link";
import type { Asset } from "@covia/covia-sdk";
import {
  Calendar, Copy, Copyright, Cpu, FileText, InfoIcon, Layers, LogIn, LogOut,
  MessageSquareText, Puzzle, Tag, User, Workflow, Wrench, type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { copyDataToClipBoard, formatDateTime, formatLabel } from "@/lib/utils";
import { getAssetKind } from "@/lib/asset-kind";
import { agentConfigPreviewFromMetadata } from "@/lib/agent-templates";

// The per-kind content sections that make up an asset's detail body, split out
// of the old 515-line MetadataViewer (W3 3B). Each section is self-contained:
// it inspects the asset, and renders its block or nothing. MetadataViewer is now
// a thin router that composes these plus ProvenancePanel and AssetActions. Every
// data-testid is preserved so the #163/#209 regression contracts still hold.

type OperationSchema = {
  adapter?: string;
  input?: { properties?: Record<string, { type?: string; description?: string }>; required?: string[] };
  output?: { properties?: Record<string, { type?: string; description?: string }> };
  steps?: unknown[];
};

// The shape published at v/agents/templates/<key> (see AgentTemplate in
// use-agent-templates.ts) — a fourth asset kind alongside operation/artifact/
// reference, with none of the fields any of those check for.
type AgentTemplateSchema = {
  systemPrompt?: string;
  llmOperation?: string;
  model?: string;
  tools?: string[];
  skills?: string[];
  defaultTools?: boolean;
};

const getNestedValue = (obj: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], obj);

// Renders a JSON-schema `properties` map as a label/description table — the
// same shape AssetInfoSheet uses for its input/output preview.
function renderSchemaProperties(
  properties: Record<string, { type?: string; description?: string }> | undefined,
  required: string[] = [],
) {
  const keys = properties ? Object.keys(properties) : [];
  if (keys.length === 0) return null;
  // shadcn Table already wraps itself in `w-full overflow-x-auto`; the fix for
  // mobile is to let the description cell WRAP (TableCell defaults to
  // whitespace-nowrap) so a long description reflows instead of forcing the
  // table wide and scrolling.
  return (
    <Table>
      <TableBody>
        {keys.map((key) => (
          <TableRow key={key}>
            <TableCell className="whitespace-nowrap align-top">
              {formatLabel(key)}
              {required.includes(key) && <span className="text-destructive"> *</span>}
            </TableCell>
            <TableCell className="whitespace-normal break-words align-top text-muted-foreground">
              {properties?.[key]?.description ?? properties?.[key]?.type ?? ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---- applicability predicates (shared with the router) ----

function operationFlags(asset: Asset) {
  const operation = asset.metadata?.operation as OperationSchema | undefined;
  const isOperation = getAssetKind(asset.metadata) === "operation";
  const hasAdapter = typeof operation?.adapter === "string" && operation.adapter.length > 0;
  const hasInput = Boolean(operation?.input?.properties && Object.keys(operation.input.properties).length > 0);
  const hasOutput = Boolean(operation?.output?.properties && Object.keys(operation.output.properties).length > 0);
  const hasSteps = Array.isArray(operation?.steps) && operation.steps.length > 0;
  return { operation, has: isOperation && (hasAdapter || hasInput || hasOutput || hasSteps), hasAdapter, hasInput, hasOutput, hasSteps };
}

function agentTemplateFlags(asset: Asset) {
  const t = agentConfigPreviewFromMetadata(asset.metadata) as AgentTemplateSchema;
  const isTemplate = getAssetKind(asset.metadata) === "agent-template";
  const hasModel = typeof t?.llmOperation === "string" || typeof t?.model === "string";
  const tools = Array.isArray(t?.tools) ? t.tools : [];
  const skills = Array.isArray(t?.skills) ? t.skills : [];
  const hasSystemPrompt = typeof t?.systemPrompt === "string" && t.systemPrompt.length > 0;
  return { t, isTemplate, hasModel, tools, skills, hasSystemPrompt, hasFields: isTemplate && (hasModel || tools.length > 0 || skills.length > 0) };
}

function skillTools(asset: Asset): string[] {
  return Array.isArray(asset.metadata?.skill?.tools) ? asset.metadata.skill.tools : [];
}
function inlineContentOf(asset: Asset): string | null {
  return typeof asset.metadata?.content?.inline === "string" ? asset.metadata.content.inline : null;
}

// Does the asset have any left-column content or provenance? Drives the
// reference empty-state note and the two-column layout decision.
export function assetHasLeftContent(asset: Asset): boolean {
  const op = operationFlags(asset).has;
  const at = agentTemplateFlags(asset);
  const contentItems = skillTools(asset).length > 0 || inlineContentOf(asset) != null || at.hasSystemPrompt;
  const provenance = METADATA_FIELDS.some((f) => getNestedValue(asset, f.path));
  return op || at.hasFields || contentItems || provenance;
}

// The kind-specific / content fields (what the asset *is*) — used to decide
// whether provenance is de-emphasised and whether the accordion opens.
export function assetHasLoadBearingContent(asset: Asset): boolean {
  const at = agentTemplateFlags(asset);
  const contentItems = skillTools(asset).length > 0 || inlineContentOf(asset) != null || at.hasSystemPrompt;
  return operationFlags(asset).has || at.hasFields || contentItems;
}

// ---- per-kind sections ----

export function OperationMeta({ asset }: { asset: Asset }) {
  const { operation, has, hasAdapter, hasInput, hasOutput, hasSteps } = operationFlags(asset);
  if (!has) return null;
  return (
    <div className="flex flex-col space-y-3 mb-3" data-testid="operation-fields">
      {hasAdapter && (
        <div className="flex items-center space-x-2">
          <Puzzle size={18} />
          <span className="text-md whitespace-nowrap">Adapter:</span>
          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">{operation?.adapter}</Badge>
        </div>
      )}
      {hasInput && (
        <div data-testid="operation-input">
          <div className="flex items-center space-x-2 mb-1"><LogIn size={18} /><span className="text-md">Input:</span></div>
          {renderSchemaProperties(operation?.input?.properties, operation?.input?.required)}
        </div>
      )}
      {hasOutput && (
        <div data-testid="operation-output">
          <div className="flex items-center space-x-2 mb-1"><LogOut size={18} /><span className="text-md">Output:</span></div>
          {renderSchemaProperties(operation?.output?.properties)}
        </div>
      )}
      {hasSteps && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground" data-testid="operation-steps">
          <Workflow size={14} />
          <span>Composite operation — {operation?.steps?.length} step{operation?.steps?.length === 1 ? "" : "s"}</span>
        </div>
      )}
    </div>
  );
}

export function AgentTemplateMeta({ asset }: { asset: Asset }) {
  const { t, hasModel, tools, skills, hasSystemPrompt, hasFields } = agentTemplateFlags(asset);
  if (!hasFields && !hasSystemPrompt) return null;
  return (
    <>
      {hasFields && (
        <div className="flex flex-col space-y-3 mb-3" data-testid="agent-template-fields">
          {hasModel && (
            <div className="flex items-center space-x-2">
              <Cpu size={18} />
              <span className="text-md whitespace-nowrap">Model:</span>
              <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">{t?.model ?? t?.llmOperation}</Badge>
            </div>
          )}
          {tools.length > 0 && (
            <div data-testid="agent-template-tools">
              <div className="flex items-center space-x-2 mb-1">
                <Wrench size={18} />
                <span className="text-md">Tools:</span>
                {t?.defaultTools && <span className="text-xs text-muted-foreground">(+ defaults)</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {tools.map((tool) => (
                  <Badge key={tool} variant="outline" className="font-mono text-[10px] text-muted-foreground">{tool}</Badge>
                ))}
              </div>
            </div>
          )}
          {skills.length > 0 && (
            <div data-testid="agent-template-skills">
              <div className="flex items-center space-x-2 mb-1"><Layers size={18} /><span className="text-md">Skills:</span></div>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="font-mono text-[10px] text-muted-foreground">{skill}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {hasSystemPrompt && (
        <div className="my-2" data-testid="system-prompt">
          <div className="flex flex-row items-center space-x-2"><MessageSquareText size={18} /><span className="text-md">System prompt:</span></div>
          <pre className="mt-1 max-h-96 overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap break-words font-mono">{t?.systemPrompt}</pre>
        </div>
      )}
    </>
  );
}

export function SkillMeta({ asset }: { asset: Asset }) {
  const tools = skillTools(asset);
  if (tools.length === 0) return null;
  return (
    <div className="my-2" data-testid="skill-tools">
      <div className="flex flex-row items-center space-x-2"><Wrench size={18} /><span className="text-md">Skill tools:</span></div>
      <div className="mt-1 flex flex-wrap gap-1">
        {tools.map((tool) => (
          <Badge key={tool} variant="outline" className="font-mono text-[10px] text-muted-foreground">{tool}</Badge>
        ))}
      </div>
    </div>
  );
}

export function ArtifactMeta({ asset }: { asset: Asset }) {
  const inlineContent = inlineContentOf(asset);
  if (inlineContent == null) return null;
  const contentType = asset.metadata?.content?.contentType?.split(";")[0];
  return (
    <div className="my-2" data-testid="inline-content">
      <div className="flex flex-row items-center justify-between space-x-2">
        <div className="flex flex-row items-center space-x-2">
          <FileText size={18} />
          <span className="text-md">Content{contentType ? ` (${contentType})` : ""}:</span>
        </div>
        <button
          type="button"
          aria-label="Copy content"
          data-testid="copy-inline-content"
          onClick={() => copyDataToClipBoard(inlineContent, "Content copied to clipboard")}
          className="text-muted-foreground hover:text-foreground"
        >
          <Copy size={14} />
        </button>
      </div>
      {/* Fixed dark code-panel background (matches XmlViewer/JsonViewer's
          preview) rather than the theme's bg-muted, so this reads as a code/text
          panel in both themes. */}
      <pre className="mt-1 max-h-96 overflow-auto rounded bg-[hsl(220,13%,18%)] text-gray-100 p-3 text-xs whitespace-pre-wrap break-words font-mono">
        {inlineContent}
      </pre>
    </div>
  );
}

export function ReferenceMeta({ asset }: { asset: Asset }) {
  if (getAssetKind(asset.metadata) !== "reference" || assetHasLeftContent(asset)) return null;
  return (
    <div className="my-2 text-muted-foreground" data-testid="reference-empty-note">
      This asset has no content or schema of its own — it&apos;s a bare reference.
    </div>
  );
}

// ---- provenance ----

interface MetadataFieldConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  renderValue?: (value: any) => React.ReactNode;
}

const METADATA_FIELDS: MetadataFieldConfig[] = [
  { key: "creator", label: "Creator:", icon: User, path: "metadata.creator" },
  {
    key: "license", label: "License:", icon: Copyright, path: "metadata.license",
    renderValue: (value) => (
      <Link className="hover:text-secondary hover:underline" href={value?.url}>{value?.name}</Link>
    ),
  },
  { key: "dateCreated", label: "Created on:", icon: Calendar, path: "metadata.dateCreated", renderValue: (value) => formatDateTime(value) },
  { key: "dateModified", label: "Modified on:", icon: Calendar, path: "metadata.dateModified", renderValue: (value) => formatDateTime(value) },
  {
    key: "keywords", label: "Keywords:", icon: Tag, path: "metadata.keywords",
    renderValue: (value) => (
      <div className="flex flex-wrap gap-1">
        {value?.map((keyword: string) => (
          <Badge variant="secondary" className="text-secondary-foreground" key={keyword}>{keyword}</Badge>
        ))}
      </div>
    ),
  },
  { key: "notes", label: "Comment:", icon: InfoIcon, path: "metadata.additionalInformation.notes" },
];

// Creator / license / dates / keywords / comment — provenance, shown when the
// asset carries any of it. De-emphasised (border + opacity) when load-bearing
// kind/content fields are also shown, so the hierarchy matches what matters.
export function ProvenancePanel({ asset, deEmphasize }: { asset: Asset; deEmphasize: boolean }) {
  const validFields = METADATA_FIELDS.filter((field) => getNestedValue(asset, field.path));
  if (validFields.length === 0) return null;
  return (
    <div className={deEmphasize ? "pt-3 mt-1 border-t border-border/60 opacity-70" : undefined}>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
        {validFields.map((field) => {
          const value = getNestedValue(asset, field.path);
          const IconComponent = field.icon;
          return (
            <React.Fragment key={field.key}>
              <div className="flex items-center space-x-2">
                <IconComponent size={18} className="shrink-0" />
                <span data-testid={field.key + "_label"} className="whitespace-nowrap text-md">{field.label}</span>
              </div>
              <div className="min-w-0 break-words text-card-foreground" data-testid={field.key + "_value"}>
                {field.renderValue ? field.renderValue(value) : (value as React.ReactNode)}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
