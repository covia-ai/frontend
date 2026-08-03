'use client'

import React from "react";
import { Asset, Venue } from "@covia/covia-sdk";
import { Calendar, Copyright, Cpu, Download, FileJson, FileText, InfoIcon, Layers, LogIn, LogOut, MessageSquareText, Puzzle, Tag, User, Workflow, Wrench }from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "./ui/dialog";
import { LucideIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatLabel } from "@/lib/utils";
import { getAssetKind } from "@/lib/asset-kind";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import dynamic from "next/dynamic";
const JsonEditor = dynamic(
  () => import("json-edit-react").then((module) => module.JsonEditor),
  { ssr: false },
);
const JsonViewer = dynamic(
  () => import("./JSONViewer").then((module) => module.JsonViewer),
  { ssr: false },
);
const XmlViewer = dynamic(() => import("./XmlViewer").then(mod => mod.XmlViewer), { ssr: false });
const DocumentViewer = dynamic(() => import("./DocumentViewer").then(mod => mod.DocumentViewer), { ssr: false });

const XML_CONTENT_TYPES = ["text/xml", "application/xml"];
interface MetadataViewerProps {
  asset: Asset;
  venue?: Venue;
}

interface MetadataFieldConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  renderValue?: (value: any) => React.ReactNode;
}

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const METADATA_FIELDS: MetadataFieldConfig[] = [
  {
    key: 'creator',
    label: 'Creator:',
    icon: User,
    path: 'metadata.creator'
  },
  {
    key: 'license',
    label: 'License:',
    icon: Copyright,
    path: 'metadata.license',
    renderValue: (value) => (
      <Link className="hover:text-secondary hover:underline" href={value?.url}>
        {value?.name}
      </Link>
    )
  },
  {
    key: 'dateCreated',
    label: 'Created on:',
    icon: Calendar,
    path: 'metadata.dateCreated',
    renderValue: (value) => formatDate(value)
  },
  {
    key: 'dateModified',
    label: 'Modified on:',
    icon: Calendar,
    path: 'metadata.dateModified',
    renderValue: (value) => formatDate(value)
  },
  {
    key: 'keywords',
    label: 'Keywords:',
    icon: Tag,
    path: 'metadata.keywords',
    renderValue: (value) => (
      <div className="flex space-x-1">
        {value?.map((keyword: string) => (
          <Badge variant="secondary" className="text-secondary-foreground" key={keyword}>{keyword}</Badge>
        ))}
      </div>
    )
  },
  {
    key: 'notes',
    label: 'Comment:',
    icon: InfoIcon,
    path: 'metadata.additionalInformation.notes'
  }
];

// Utility function to get nested object values by path
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Utility function to render metadata fields
const renderMetadataFields = (asset: Asset, fields: MetadataFieldConfig[]) => {
  const validFields = fields.filter((field) => {
    const value = getNestedValue(asset, field.path);
    return value;
  });

  if (validFields.length === 0) return null;

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      {validFields.map((field) => {
        const value = getNestedValue(asset, field.path);
        const IconComponent = field.icon;
         
        return (
          <React.Fragment key={field.key}>
            <div className="flex items-center space-x-2">
              <IconComponent size={18} />
              <span data-testid={field.key+"_label"} className="whitespace-nowrap text-md">{field.label}</span>
            </div>
            <div className="text-card-foreground" data-testid={field.key+"_value"}>
              {field.renderValue ? field.renderValue(value) : value}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

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

// Renders a JSON-schema `properties` map as a label/description table —
// the same shape AssetInfoSheet uses for its input/output preview.
const renderSchemaProperties = (
  properties: Record<string, { type?: string; description?: string }> | undefined,
  required: string[] = [],
) => {
  const keys = properties ? Object.keys(properties) : [];
  if (keys.length === 0) return null;

  return (
    <Table>
      <TableBody>
        {keys.map((key) => (
          <TableRow key={key}>
            <TableCell className="whitespace-nowrap align-top">
              {formatLabel(key)}
              {required.includes(key) && <span className="text-red-400"> *</span>}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {properties?.[key]?.description ?? properties?.[key]?.type ?? ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const MetadataViewer = ({ asset, venue }: MetadataViewerProps) => {
  // Skills and other inline assets carry their body in `content.inline`, with
  // no separate blob — the content endpoint 500s for them. Render the inline
  // text directly and never point Download at a URL that doesn't exist.
  const inlineContent =
    typeof asset.metadata?.content?.inline === "string" ? asset.metadata.content.inline : null;
  const contentType = asset.metadata?.content?.contentType?.split(";")[0];
  const skillTools: string[] = Array.isArray(asset.metadata?.skill?.tools)
    ? asset.metadata.skill.tools
    : [];
  // Operation, artifact, reference (root CLAUDE.md's asset taxonomy), plus
  // agent template as a fourth kind this app renders distinctly — one shared
  // classifier (also used for AssetHeader's kind badge) decides which of the
  // sections below apply.
  const kind = getAssetKind(asset.metadata);
  const operation = asset.metadata?.operation as OperationSchema | undefined;
  const isOperation = kind === "operation";
  const hasAdapter = typeof operation?.adapter === "string" && operation.adapter.length > 0;
  const hasOperationInput = Boolean(operation?.input?.properties && Object.keys(operation.input.properties).length > 0);
  const hasOperationOutput = Boolean(operation?.output?.properties && Object.keys(operation.output.properties).length > 0);
  const hasSteps = Array.isArray(operation?.steps) && operation.steps.length > 0;
  const hasOperationFields = isOperation && (hasAdapter || hasOperationInput || hasOperationOutput || hasSteps);

  const agentTemplate = asset.metadata as AgentTemplateSchema | undefined;
  const isAgentTemplate = kind === "agent-template";
  const hasModel = typeof agentTemplate?.llmOperation === "string" || typeof agentTemplate?.model === "string";
  const templateTools = Array.isArray(agentTemplate?.tools) ? agentTemplate.tools : [];
  const templateSkills = Array.isArray(agentTemplate?.skills) ? agentTemplate.skills : [];
  const hasSystemPrompt = typeof agentTemplate?.systemPrompt === "string" && agentTemplate.systemPrompt.length > 0;
  const hasAgentTemplateFields =
    isAgentTemplate && (hasModel || templateTools.length > 0 || templateSkills.length > 0);

  // A "Download" link only makes sense for a genuine artifact — a bare
  // reference asset (no `content`, no `operation`) has nothing at that URL to
  // fetch (covia-ai/frontend#209 follow-up).
  const hasBlobContent = kind === "artifact" && inlineContent === null;
  const contentURL = hasBlobContent ? asset.getContentURL() : null;
  // Collapsed by default only for a genuine invokable operation — a template
  // that merely names a transition op (e.g. "goaltree") isn't one.
  const defaultValue = hasOperationFields ? undefined : "metadata";

  const genericFields = renderMetadataFields(asset, METADATA_FIELDS);
  const hasKindFields = hasOperationFields || hasAgentTemplateFields;
  const hasLeftContent = hasKindFields || genericFields !== null;
  
  return (
     <Accordion
      type="single"
      collapsible
      className=" w-full "
      defaultValue={defaultValue}
    >
       <AccordionItem value="metadata">
         <AccordionTrigger className="py-1 px-2 bg-card rounded-none">Asset Metadata</AccordionTrigger>
         <AccordionContent>
              <div className="text-sm p-2 items-center justify-between min-w-lg w-full">
                <div className="flex flex-col md:flex-row lg:flex-row">
                  {hasLeftContent && (
                    <div className="flex flex-col flex-3 md:border-r-2 lg:border-r-2 border-border px-2 " data-testid="asset-fields">
                      {hasOperationFields && (
                        <div className="flex flex-col space-y-3 mb-3" data-testid="operation-fields">
                          {hasAdapter && (
                            <div className="flex items-center space-x-2">
                              <Puzzle size={18} />
                              <span className="text-md whitespace-nowrap">Adapter:</span>
                              <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                {operation?.adapter}
                              </Badge>
                            </div>
                          )}
                          {hasOperationInput && (
                            <div data-testid="operation-input">
                              <div className="flex items-center space-x-2 mb-1">
                                <LogIn size={18} />
                                <span className="text-md">Input:</span>
                              </div>
                              {renderSchemaProperties(operation?.input?.properties, operation?.input?.required)}
                            </div>
                          )}
                          {hasOperationOutput && (
                            <div data-testid="operation-output">
                              <div className="flex items-center space-x-2 mb-1">
                                <LogOut size={18} />
                                <span className="text-md">Output:</span>
                              </div>
                              {renderSchemaProperties(operation?.output?.properties)}
                            </div>
                          )}
                          {hasSteps && (
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground" data-testid="operation-steps">
                              <Workflow size={14} />
                              <span>
                                Composite operation — {operation?.steps?.length}{" "}
                                step{operation?.steps?.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {hasAgentTemplateFields && (
                        <div className="flex flex-col space-y-3 mb-3" data-testid="agent-template-fields">
                          {hasModel && (
                            <div className="flex items-center space-x-2">
                              <Cpu size={18} />
                              <span className="text-md whitespace-nowrap">Model:</span>
                              <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                {agentTemplate?.model ?? agentTemplate?.llmOperation}
                              </Badge>
                            </div>
                          )}
                          {templateTools.length > 0 && (
                            <div data-testid="agent-template-tools">
                              <div className="flex items-center space-x-2 mb-1">
                                <Wrench size={18} />
                                <span className="text-md">Tools:</span>
                                {agentTemplate?.defaultTools && (
                                  <span className="text-xs text-muted-foreground">(+ defaults)</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {templateTools.map((tool) => (
                                  <Badge key={tool} variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                    {tool}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {templateSkills.length > 0 && (
                            <div data-testid="agent-template-skills">
                              <div className="flex items-center space-x-2 mb-1">
                                <Layers size={18} />
                                <span className="text-md">Skills:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {templateSkills.map((skill) => (
                                  <Badge key={skill} variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {genericFields && (
                        // Kind-specific fields (adapter/schema, model/tools) are why
                        // you're looking at this asset; creator/license/keywords are
                        // provenance. De-emphasize the latter only when both are
                        // present, so the hierarchy matches what's actually load-bearing.
                        <div className={hasKindFields ? "pt-3 mt-1 border-t border-border/60 opacity-70" : undefined}>
                          {genericFields}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col flex-2 px-2 ">
                    {kind === "reference" && !hasLeftContent && (
                      <div className="my-2 text-muted-foreground" data-testid="reference-empty-note">
                        This asset has no content or schema of its own — it&apos;s a bare reference.
                      </div>
                    )}
                    {skillTools.length > 0 && (
                      <div className="my-2" data-testid="skill-tools">
                        <div className="flex flex-row items-center space-x-2">
                          <Wrench size={18} />
                          <span className="text-md">Skill tools:</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {skillTools.map((tool) => (
                            <Badge key={tool} variant="outline" className="font-mono text-[10px] text-muted-foreground">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {inlineContent != null && (
                      <div className="my-2" data-testid="inline-content">
                        <div className="flex flex-row items-center space-x-2">
                          <FileText size={18} />
                          <span className="text-md">Content{contentType ? ` (${contentType})` : ""}:</span>
                        </div>
                        {/* Fixed dark code-panel background (matches XmlViewer/
                            JsonViewer's preview) rather than the theme's bg-muted,
                            so this reads as a code/text panel in both themes. */}
                        <pre className="mt-1 max-h-96 overflow-auto rounded bg-[hsl(220,13%,18%)] text-gray-100 p-3 text-xs whitespace-pre-wrap break-words font-mono">
                          {inlineContent}
                        </pre>
                      </div>
                    )}
                    {hasSystemPrompt && (
                      <div className="my-2" data-testid="system-prompt">
                        <div className="flex flex-row items-center space-x-2">
                          <MessageSquareText size={18} />
                          <span className="text-md">System prompt:</span>
                        </div>
                        <pre className="mt-1 max-h-96 overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap break-words font-mono">
                          {agentTemplate?.systemPrompt}
                        </pre>
                      </div>
                    )}
                    {contentURL && (
                      <div className="flex flex-row flex-wrap items-center gap-2 my-2">
                        <Button asChild variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                          <Link href={contentURL} download>
                            <Download size={14} />
                            Download
                          </Link>
                        </Button>
                        {asset.metadata?.content?.contentType?.split(";")[0] == "application/json" && <JsonViewer assetId={asset.id} venue={venue} />}
                        {XML_CONTENT_TYPES.includes(asset.metadata?.content?.contentType?.split(";")[0]) && <XmlViewer assetId={asset.id} venue={venue} />}
                        {asset.metadata?.content?.contentType?.split(";")[0] != "application/json" && !XML_CONTENT_TYPES.includes(asset.metadata?.content?.contentType?.split(";")[0]) && (
                          <DocumentViewer contentUrl={contentURL} contentType={asset.metadata?.content?.contentType?.split(";")[0]} />
                        )}
                      </div>
                    )}
                    <div className="flex flex-row items-center mt-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                            <FileJson size={14} />
                            View metadata
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="h-11/12 min-w-10/12 bg-card text-card-foreground content-start overflow-y-auto">
                          <DialogTitle>Asset Metadata</DialogTitle>
                          <div className="rounded-lg bg-white p-3">
                            <JsonEditor
                              data={asset.metadata}
                              rootName="metadata"
                              rootFontSize="1em"
                              maxWidth="90vw"
                              restrictEdit={true}
                              restrictAdd={true}
                              restrictDelete={true}
                              collapse={3}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>
         
         </AccordionContent>
    </AccordionItem>
    </Accordion>
  );
};
