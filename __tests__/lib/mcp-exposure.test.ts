import type { MCPTool } from "@covia/covia-sdk";
import { MCP_OPERATION_META, mcpToolsByOperation } from "@/lib/mcp-exposure";

const tool = (name: string, meta?: unknown): MCPTool => ({
  name,
  inputSchema: {},
  ...(meta === undefined ? {} : { _meta: meta }),
});

describe("mcpToolsByOperation (frontend#361, covia#558)", () => {
  it("maps each operation path to the tool that serves it", () => {
    const byOperation = mcpToolsByOperation([
      tool("agent_create", { [MCP_OPERATION_META]: "v/ops/agent/create" }),
      tool("http_get", { [MCP_OPERATION_META]: "v/ops/http/get", other: 1 }),
    ]);
    expect([...byOperation]).toEqual([
      ["v/ops/agent/create", "agent_create"],
      ["v/ops/http/get", "http_get"],
    ]);
  });

  it("leaves out tools that name no operation, as on venues before 0.10", () => {
    const byOperation = mcpToolsByOperation([
      tool("bridged"),
      tool("no_ref", {}),
      tool("bad_ref", { [MCP_OPERATION_META]: 42 }),
      tool("empty_ref", { [MCP_OPERATION_META]: "" }),
    ]);
    expect(byOperation.size).toBe(0);
  });

  it("keeps the first tool when two name the same operation", () => {
    const byOperation = mcpToolsByOperation([
      tool("first", { [MCP_OPERATION_META]: "v/ops/test/echo" }),
      tool("second", { [MCP_OPERATION_META]: "v/ops/test/echo" }),
    ]);
    expect(byOperation.get("v/ops/test/echo")).toBe("first");
  });
});
