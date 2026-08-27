"use client";

import { useEffect, useState } from "react";
import { AgentStatus } from "@covia/covia-sdk";
import { Loader2 } from "lucide-react";

import { AgentChat } from "@/components/agent-chat/AgentChat";
import { AIPrompt } from "@/components/AIPrompt";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { normalizeAgentEntries } from "@/lib/agent-list";

type AssistantAvailability = "checking" | "ready" | "needs-setup";

export function DefaultAssistantHome() {
  const venue = useAuthenticatedVenue();
  const [availability, setAvailability] =
    useState<AssistantAvailability>("checking");

  useEffect(() => {
    let active = true;

    if (!venue) {
      setAvailability("needs-setup");
      return () => {
        active = false;
      };
    }

    setAvailability("checking");
    void venue.agents
      .list(true)
      .then(({ agents }) => {
        if (!active) return;
        const assistant = normalizeAgentEntries(agents).find(
          (agent) => agent.agentId === DEFAULT_AGENT_ID,
        );
        setAvailability(
          assistant && assistant.status !== AgentStatus.TERMINATED
            ? "ready"
            : "needs-setup",
        );
      })
      .catch(() => {
        if (active) setAvailability("needs-setup");
      });

    return () => {
      active = false;
    };
  }, [venue]);

  if (availability === "checking") {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center" role="status">
        <Loader2 className="animate-spin text-primary" size={24} />
        <span className="sr-only">Opening assistant</span>
      </div>
    );
  }

  if (availability === "ready") {
    return <AgentChat initialAgentId={DEFAULT_AGENT_ID} fixedAgent />;
  }

  return (
    <AIPrompt
      fixedAgentId={DEFAULT_AGENT_ID}
      onChatStarted={() => setAvailability("ready")}
    />
  );
}
