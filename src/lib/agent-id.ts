import { DEFAULT_AGENT_ID } from "@/config/agents";

/** A display name as an agent id: lowercase, hyphen-separated, `[a-z0-9-]` only. */
export const slugifyAgentId = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** The workspace prompt bar owns this id, so no user-made agent may take it. */
export const isReservedAgentId = (agentId: string): boolean =>
  agentId === DEFAULT_AGENT_ID;
