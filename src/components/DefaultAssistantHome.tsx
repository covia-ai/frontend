"use client";

import { AIPrompt } from "@/components/AIPrompt";
import { DEFAULT_AGENT_ID } from "@/config/agents";

// Home always stays the "start something new" surface — sending a message
// hands off to AIPrompt's own navigation (to /agents/chat), it never swaps
// itself out for the chat view in place. Resuming or browsing existing
// conversations happens on the dedicated Chat page (sidebar: /agents/chat).
export function DefaultAssistantHome() {
  return <AIPrompt fixedAgentId={DEFAULT_AGENT_ID} />;
}
