"use client";

import { useEffect, useState } from "react";
import { Venue } from "@covia/covia-sdk";
import { createAuthProvider } from "@/lib/auth-provider";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { copyDataToClipBoard, listMcpTools } from "@/lib/utils";
import { Copy, Play, Wrench } from "lucide-react";
import { toast } from "sonner";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface McpToolsListProps {
  venueId: string;
}

export function McpToolsList({ venueId }: McpToolsListProps) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArgs, setToolArgs] = useState("{}");
  const [running, setRunning] = useState(false);

  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const { venues, addVenue } = useVenues();
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);
  const router = useRouter();

  useEffect(() => {
    const authData = getAuthForVenue(venueId ?? venueObj?.venueId ?? "");
    const authOption = createAuthProvider(authData);

    if (venueId && venueId !== venueObj?.venueId) {
      const found = venues.find((v) => v.venueId === venueId);
      if (found) {
        setVenue(new Venue({ baseUrl: found.baseUrl, venueId: found.venueId, name: found.metadata.name, auth: authOption }));
      } else {
        Venue.connect(decodeURIComponent(venueId), authOption).then((v) => {
          addVenue(v);
          setVenue(v);
        });
      }
    } else if (venueObj) {
      setVenue(new Venue({ baseUrl: venueObj.baseUrl, venueId: venueObj.venueId, name: venueObj.metadata.name, auth: authOption }));
    }
  }, [venueId, authMap, venueObj, venues, getAuthForVenue]);

  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    listMcpTools(venue.baseUrl)
      .then((tools) => setTools(tools))
      .catch(() => {
        toast("Unable to load MCP tools");
        setTools([]);
      })
      .finally(() => setLoading(false));
  }, [venue]);

  const handleRunTool = () => {
    if (!venue || !selectedTool) return;
    let args: any;
    try {
      args = JSON.parse(toolArgs);
    } catch {
      toast("Arguments must be valid JSON");
      return;
    }
    setRunning(true);
    venue.operations
      .run("v/ops/mcp/tools-call", { server: venue.baseUrl, toolName: selectedTool.name, arguments: args })
      .then((res: any) => {
        if (res?.id) {
          router.push(`/venues/${encodeURIComponent(venue.venueId)}/jobs/${res.id}`);
        } else {
          toast("Tool ran but returned no job ID");
        }
      })
      .catch(() => toast("Tool call failed"))
      .finally(() => setRunning(false));
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

  return (
    <ContentLayout>
      <TopBar venueName={venue?.metadata.name} />

      <div className="flex flex-col gap-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-vlight p-3 rounded-lg">
                <Wrench size={28} className="text-primary" />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tools table */}
          <div className="lg:col-span-2">
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
                              onClick={() => {
                                setSelectedTool(tool);
                                const defaults = tool.inputSchema?.properties
                                  ? Object.fromEntries(
                                      Object.keys(tool.inputSchema.properties).map((k) => [k, ""])
                                    )
                                  : {};
                                setToolArgs(JSON.stringify(defaults, null, 2));
                              }}
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

          {/* Test panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Play size={15} /> Test Tool
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {!selectedTool ? (
                  <p className="text-sm text-muted-foreground">
                    Select a tool from the catalog and click <strong>Test Tool</strong> to invoke it here.
                  </p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Selected tool</p>
                      <p className="font-mono text-sm font-semibold">{selectedTool.name}</p>
                      {selectedTool.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedTool.description}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Arguments (JSON)</p>
                      <Textarea
                        className="font-mono text-xs"
                        rows={8}
                        value={toolArgs}
                        onChange={(e) => setToolArgs(e.target.value)}
                        placeholder="{}"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleRunTool}
                        disabled={running}
                      >
                        {running ? "Running…" : "Run"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setSelectedTool(null); setToolArgs("{}"); }}
                      >
                        Clear
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ContentLayout>
  );
}
