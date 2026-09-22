"use client";

import { useEffect, useState } from "react";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { copyDataToClipBoard } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Copy, Play, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { McpGlyph } from "@/components/adapter-glyphs";
import { notifyError, notifyWarning } from "@/lib/notify";
import { useJobExecution } from "@/hooks/use-job-execution";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface McpToolsListProps {
  venueId: string;
}

// Seed a JSON-Schema property with a type-appropriate empty value, so the test
// panel starts with args that are valid for the tool's schema instead of every
// field being an empty string (W4 4D).
function seedArgValue(prop: any): unknown {
  const type = Array.isArray(prop?.type) ? prop.type[0] : prop?.type;
  switch (type) {
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

function seedArgs(inputSchema: any): Record<string, unknown> {
  const properties = inputSchema?.properties;
  if (!properties) return {};
  return Object.fromEntries(Object.keys(properties).map((key) => [key, seedArgValue(properties[key])]));
}

export function McpToolsList({ venueId }: McpToolsListProps) {
  // Take the whole resolution, not just the Venue: a definitive failure must
  // be shown, not swallowed into an endless "Loading…" (#428).
  const resolution = useResolvedVenueContext(venueId);
  const venue = resolution.venue;
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArgs, setToolArgs] = useState("{}");
  // The most recent run, shown inline so you can invoke a tool and reach its
  // result without leaving the catalogue (W4 4D — Run used to navigate away).
  const [lastRun, setLastRun] = useState<{ tool: string; jobId: string } | null>(null);
  const { execute: executeJob, running } = useJobExecution(venue);

  // Picking a tool opens the test drawer (a right-side Sheet) with its args
  // seeded by type — visible in place at any width, no page scroll.
  const selectTool = (tool: McpTool) => {
    setSelectedTool(tool);
    setToolArgs(JSON.stringify(seedArgs(tool.inputSchema), null, 2));
    setLastRun(null);
  };

  const closeTestPanel = () => {
    setSelectedTool(null);
    setToolArgs("{}");
    setLastRun(null);
  };

  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    // venue.mcp.listTools() is the SDK's job-free native read (covia-sdk#23);
    // the invoke-based v/ops/mcp/tools-list would persist a job per page load.
    venue.mcp.listTools()
      .then((page) => setTools(page.tools))
      .catch((err) => {
        notifyError("Unable to load MCP tools", err, venue.baseUrl);
        setTools([]);
      })
      .finally(() => setLoading(false));
  }, [venue]);

  const handleRunTool = async () => {
    if (!venue || !selectedTool) return;
    let args: any;
    try {
      args = JSON.parse(toolArgs);
    } catch {
      notifyWarning("Arguments must be valid JSON");
      return;
    }
    setLastRun(null);
    const jobId = await executeJob({
      // Tracked on purpose: this is a user-driven run, and the Job is what the
      // result link below points at. `server` defaults to this venue, so the
      // caller no longer needs to know the catalog path or the loopback trick.
      action: () => venue.mcp.callToolTracked(selectedTool.name, args),
      failureTitle: "Unable to run tool",
      missingJobMessage: "The tool completed without returning a job ID",
      // Stay on the catalogue and surface the result inline + a job link,
      // instead of navigating away (the job is watched either way).
      navigate: false,
    });
    if (jobId) setLastRun({ tool: selectedTool.name, jobId });
  };

  const mcpUrl = venue ? `${venue.baseUrl}/mcp` : "";

  const rpcSnippet = (tool: McpTool) =>
    JSON.stringify(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: tool.name, arguments: {} },
      },
      null,
      2
    );

  if (resolution.status !== "ready")
    return (
      <ContentLayout>
        <TopBar venueId={venueId} venueName={resolution.descriptor?.metadata.name} />
        <VenueResolutionState
          status={resolution.status}
          error={resolution.error}
          icon={McpGlyph as unknown as LucideIcon}
          subject="MCP Tools"
          venueId={venueId}
        />
      </ContentLayout>
    );

  return (
    <ContentLayout>
      <TopBar venueId={venueId} venueName={venue?.metadata.name} />

      <div className="flex flex-col gap-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-vlight p-3 rounded-lg">
                <McpGlyph size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-thin">MCP Tools</h1>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Loading…" : `${tools.length} tool${tools.length !== 1 ? "s" : ""} available`}
                </p>
              </div>
            </div>
            {mcpUrl && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => copyDataToClipBoard(mcpUrl, "MCP URL copied")}
              >
                <Copy size={14} />
                Copy MCP URL
              </Button>
            )}
          </div>
        </Card>

        {/* Tool catalog — full width; testing a tool opens in a right drawer. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Tool Catalog</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
                {loading && (
                  <div className="flex items-center justify-center py-16">
                    <Spinner variant="ellipsis" className="text-primary" size={48} />
                  </div>
                )}

                {!loading && tools.length === 0 && (
                  <p className="text-sm text-muted-foreground px-6 py-10 text-center">
                    No MCP tools found on this venue.
                  </p>
                )}

                {!loading && tools.length > 0 && (
                  <Accordion type="single" collapsible className="px-4">
                    {tools.map((tool) => (
                      <AccordionItem key={tool.name} value={tool.name}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex flex-col items-start gap-1 text-left">
                            <span className="font-mono text-sm font-semibold">{tool.name}</span>
                            {tool.description && (
                              <span className="text-xs text-muted-foreground font-normal">{tool.description}</span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col gap-3 pb-2">
                            {/* Input schema */}
                            {tool.inputSchema && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Input Schema</p>
                                <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                                  {JSON.stringify(tool.inputSchema, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* JSON-RPC snippet */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-muted-foreground">JSON-RPC Snippet</p>
                                <button
                                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                                  onClick={() => copyDataToClipBoard(rpcSnippet(tool), "Snippet copied")}
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              </div>
                              <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                                {rpcSnippet(tool)}
                              </pre>
                            </div>

                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-fit"
                              onClick={() => selectTool(tool)}
                            >
                              <Play size={13} className="mr-1" /> Test Tool
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
        </Card>
      </div>

      {/* Test drawer — opens on "Test Tool" at any width; no page scroll, and
          the tool you clicked stays in context behind it. */}
      <Sheet open={!!selectedTool} onOpenChange={(open) => { if (!open) closeTestPanel(); }}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Play size={16} /> Test Tool
            </SheetTitle>
            {selectedTool && (
              <SheetDescription className="font-mono text-foreground">{selectedTool.name}</SheetDescription>
            )}
          </SheetHeader>
          {selectedTool && (
            <div className="flex flex-col gap-4 px-4 pb-6">
              {selectedTool.description && (
                <p className="text-xs text-muted-foreground">{selectedTool.description}</p>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Arguments (JSON)</p>
                <Textarea
                  className="font-mono text-xs"
                  rows={10}
                  value={toolArgs}
                  onChange={(e) => setToolArgs(e.target.value)}
                  placeholder="{}"
                />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleRunTool} disabled={running}>
                  {running ? "Running…" : "Run"}
                </Button>
                <Button variant="ghost" onClick={closeTestPanel}>Clear</Button>
              </div>

              {/* Inline run result — the job link opens the full output. */}
              {lastRun && venue && (
                <div className="rounded-lg border border-border bg-muted/40 p-3" data-testid="mcp-run-result">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 size={15} className="shrink-0 text-primary" /> Run started
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">{lastRun.tool}</span> created job{" "}
                    <span className="font-mono">{lastRun.jobId.slice(0, 12)}…</span>
                  </p>
                  <Link
                    href={`/venues/${encodeURIComponent(venue.venueId)}/jobs/${lastRun.jobId}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    View job <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </ContentLayout>
  );
}
