import { normalizeAgentEntries } from "@/lib/agent-list";
import { DEFAULT_AGENT_ID } from "@/config/agents";

describe("normalizeAgentEntries", () => {
  it("normalizes bare id strings into objects", () => {
    expect(normalizeAgentEntries(["agent-1", "agent-2"])).toEqual([
      { agentId: "agent-1" },
      { agentId: "agent-2" },
    ]);
  });

  it("drops malformed entries", () => {
    expect(normalizeAgentEntries([null, undefined, {}, { agentId: "ok" }])).toEqual([
      { agentId: "ok" },
    ]);
  });

  it("sorts the reserved assistant first regardless of its position in the source list", () => {
    const result = normalizeAgentEntries([
      { agentId: "agent-1", status: "SLEEPING" },
      { agentId: DEFAULT_AGENT_ID, status: "SLEEPING" },
      { agentId: "agent-2", status: "SLEEPING" },
    ]);
    expect(result.map((a) => a.agentId)).toEqual([
      DEFAULT_AGENT_ID,
      "agent-1",
      "agent-2",
    ]);
  });

  it("keeps every other agent's relative order unchanged (stable sort)", () => {
    const result = normalizeAgentEntries([
      { agentId: "zeta" },
      { agentId: "alpha" },
      { agentId: "mid" },
    ]);
    expect(result.map((a) => a.agentId)).toEqual(["zeta", "alpha", "mid"]);
  });

  it("is a no-op ordering-wise when the assistant is absent", () => {
    const result = normalizeAgentEntries(["b", "a", "c"]);
    expect(result.map((a) => a.agentId)).toEqual(["b", "a", "c"]);
  });
});
