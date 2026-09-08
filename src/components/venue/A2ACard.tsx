"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/CopyField";
import { Copy, ChevronDown, ChevronUp, Bot } from "lucide-react";
import type { Venue, AgentCard as AgentCardData } from "@covia/covia-sdk";
import { copyDataToClipBoard } from "@/lib/utils";

interface A2ACardProps {
  venue: Venue;
}

// The venue's A2A agent-card handle (#258) — a venue that doesn't run the
// A2A adapter simply has no `.well-known/agent-card.json`, which is a normal
// state (not an error), so a failed fetch renders a quiet fallback rather
// than a toast.
export function A2ACard({ venue }: A2ACardProps) {
  const [agentCard, setAgentCard] = useState<AgentCardData | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCard = async () => {
      try {
        const response = await fetch(`${venue.baseUrl}/.well-known/agent-card.json`);
        if (!response.ok) throw new Error(`A2A card fetch failed: ${response.status}`);
        const body = await response.json();
        if (cancelled) return;
        setAgentCard(body);
        setAvailable(true);
      } catch {
        if (cancelled) return;
        setAgentCard(null);
        setAvailable(false);
      }
    };
    fetchCard();
    return () => {
      cancelled = true;
    };
  }, [venue]);

  const endpointUrl = agentCard?.supportedInterfaces?.[0]?.url ?? agentCard?.url;
  const capabilities = agentCard?.capabilities ?? {};
  const capabilityEntries = Object.entries(capabilities).filter(([, v]) => typeof v === "boolean");
  const skills = agentCard?.skills ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary-vlight p-2 rounded-lg">
          <Bot size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-medium">A2A Agent Card</h2>
          <p className="text-sm text-muted-foreground">
            {available ? "This venue's front-door Agent-to-Agent card" : "Discovering this venue's A2A support…"}
          </p>
        </div>
      </div>

      {available === false && (
        <p className="text-sm text-muted-foreground">A2A is not available on this venue.</p>
      )}

      {available && agentCard && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">{agentCard.name}</h3>
            {agentCard.description && (
              <p className="text-sm text-muted-foreground mt-1">{agentCard.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {agentCard.version && <Badge variant="outline">v{agentCard.version}</Badge>}
              {agentCard.provider?.organization && (
                agentCard.provider?.url ? (
                  <Badge variant="outline" asChild>
                    <a href={agentCard.provider.url} target="_blank" rel="noreferrer">
                      {agentCard.provider.organization}
                    </a>
                  </Badge>
                ) : (
                  <Badge variant="outline">{agentCard.provider.organization}</Badge>
                )
              )}
            </div>
          </div>

          {capabilityEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {capabilityEntries.map(([key, value]) => (
                <Badge key={key} variant={value ? "default" : "secondary"}>
                  {key}: {value ? "on" : "off"}
                </Badge>
              ))}
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {skills.length > 0 ? "Skills" : "No skills declared"}
            </p>
            {skills.length > 0 && (
              <ul className="space-y-1">
                {skills.map((skill, i) => (
                  <li key={skill.id ?? skill.name ?? i} className="text-sm">
                    <span className="font-mono text-xs">{skill.name ?? skill.id}</span>
                    {skill.description && (
                      <span className="text-muted-foreground"> — {skill.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {endpointUrl ? (
            <CopyField label="A2A JSON-RPC Endpoint" value={endpointUrl} href={endpointUrl} />
          ) : (
            <p className="text-sm text-muted-foreground">No supported interface published.</p>
          )}

          <div>
            <button
              className="flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={() => setShowRaw((v) => !v)}
            >
              {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              View raw agent card
            </button>
            {showRaw && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Full <code>agent-card.json</code></p>
                  <button
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                    onClick={() => copyDataToClipBoard(JSON.stringify(agentCard, null, 2), "Agent card copied")}
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>
                <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(agentCard, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
