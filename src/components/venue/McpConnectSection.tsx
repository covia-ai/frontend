"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Copy, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import type { Venue } from "@covia/covia-sdk";
import { copyDataToClipBoard, listMcpTools } from "@/lib/utils";

interface McpConnectSectionProps {
  venue: Venue;
  slug: string;
}

// The MCP + Claude Desktop connect card — originally inline on the venue
// dashboard, extracted so both the dashboard and the venue Connect page
// (#258) render the same fetch/snippet logic without duplicating it.
export function McpConnectSection({ venue, slug }: McpConnectSectionProps) {
  const router = useRouter();
  const [venueMCPUrl, setVenueMCPURL] = useState("Not Found");
  const [mcpTools, setMcpTools] = useState<{ name: string }[]>([]);
  const [showClaudeSnippet, setShowClaudeSnippet] = useState(false);

  useEffect(() => {
    const fetchMCP = async () => {
      try {
        const response = await fetch(`${venue.baseUrl}/.well-known/mcp`);
        if (!response.ok) throw new Error(`MCP discovery failed: ${response.status}`);
        const body = await response.json();
        setVenueMCPURL(body?.error ? "Not Available" : body?.server_url ?? "Not Available");
      } catch {
        setVenueMCPURL("Not Available");
      }
    };
    const fetchMcpTools = async () => {
      try {
        setMcpTools(await listMcpTools(venue.baseUrl));
      } catch {
        /* non-fatal */
      }
    };
    fetchMCP();
    fetchMcpTools();
  }, [venue]);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary-vlight p-2 rounded-lg">
          <Wrench size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-medium">MCP Integration</h2>
          <p className="text-sm text-muted-foreground">
            {mcpTools.length > 0
              ? `${mcpTools.length} tool${mcpTools.length !== 1 ? "s" : ""} available as MCP tools`
              : "This venue exposes every operation as an MCP tool"}
          </p>
        </div>
      </div>

      {/* Top-5 preview */}
      {mcpTools.length > 0 && (
        <ul className="mb-4 space-y-1">
          {mcpTools.slice(0, 5).map((t) => (
            <li key={t.name} className="font-mono text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">
              {t.name}
            </li>
          ))}
          {mcpTools.length > 5 && (
            <li className="text-xs text-muted-foreground pl-2">
              +{mcpTools.length - 5} more…
            </li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <Button
          className="flex items-center gap-2"
          onClick={() => copyDataToClipBoard(venueMCPUrl, "MCP URL copied")}
          variant="default"
        >
          <Copy size={14} /> Copy MCP URL
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/venues/${slug}/mcp`)}
          className="flex items-center gap-2"
        >
          <Wrench size={14} /> MCP Tools
          <ArrowRight size={14} />
        </Button>
      </div>

      {/* Expandable Claude Desktop snippet */}
      <button
        className="flex items-center gap-1 text-sm text-primary hover:underline"
        onClick={() => setShowClaudeSnippet((v) => !v)}
      >
        {showClaudeSnippet ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Connect to Claude Desktop
      </button>
      {showClaudeSnippet && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Add to your Claude Desktop <code>claude_desktop_config.json</code></p>
            <button
              className="text-xs text-primary flex items-center gap-1 hover:underline"
              onClick={() => copyDataToClipBoard(
                JSON.stringify({ mcpServers: { covia: { command: "npx", args: ["-y", "mcp-remote", venueMCPUrl] } } }, null, 2),
                "Snippet copied"
              )}
            >
              <Copy size={11} /> Copy
            </button>
          </div>
          <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
{JSON.stringify({ mcpServers: { covia: { command: "npx", args: ["-y", "mcp-remote", venueMCPUrl] } } }, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}
