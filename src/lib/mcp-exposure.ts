import type { MCPTool } from "@covia/covia-sdk";

// Since covia 0.10 (covia#558), each tool in the venue's native MCP
// `tools/list` names the operation it dispatches to in
// `_meta["ai.covia/operation"]` — a catalogue path such as
// "v/ops/agent/create", the same id OperationsList gives the operation. That
// is the per-operation signal the call-surface chips needed (frontend#361).
export const MCP_OPERATION_META = "ai.covia/operation";

/** The operation a tool dispatches to, when the venue names one. */
export function mcpToolOperation(tool: MCPTool | null | undefined): string | undefined {
  const meta: unknown = tool?._meta;
  const ref = meta && typeof meta === "object" ? (meta as Record<string, unknown>)[MCP_OPERATION_META] : undefined;
  return typeof ref === "string" && ref ? ref : undefined;
}

/**
 * Operation path → the MCP tool name that exposes it. Tools without the
 * reference (venues before 0.10, or ones bridged from elsewhere) are left out,
 * so an operation missing from the map is unknown rather than known-hidden.
 */
export function mcpToolsByOperation(tools: readonly MCPTool[]): ReadonlyMap<string, string> {
  const byOperation = new Map<string, string>();
  for (const tool of tools) {
    const ref = mcpToolOperation(tool);
    if (ref && typeof tool.name === "string" && !byOperation.has(ref)) {
      byOperation.set(ref, tool.name);
    }
  }
  return byOperation;
}
