"use client";

import type { Venue } from "@covia/covia-sdk";
import { useVenueRead } from "@/hooks/use-venue-read";
import { mcpToolsByOperation } from "@/lib/mcp-exposure";

const NONE: ReadonlyMap<string, string> = new Map();

/**
 * Which of `venue`'s operations it also serves as MCP tools, by operation path
 * (see lib/mcp-exposure). One job-free read of the native `tools/list` per
 * venue, held with the venue it answers for. Quiet on failure: an empty map
 * only means no chip is shown.
 */
export function useMcpExposure(
  venue: Venue | null | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): ReadonlyMap<string, string> {
  const { data } = useVenueRead<ReadonlyMap<string, string>>({
    venue,
    enabled,
    initial: NONE,
    notify: false,
    failureTitle: "Unable to list MCP tools",
    load: async (target) => mcpToolsByOperation(await target.mcp.listAllTools()),
  });
  return data;
}
