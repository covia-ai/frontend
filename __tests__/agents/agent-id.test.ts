import { DEFAULT_AGENT_ID } from "@/config/agents";
import { isReservedAgentId, slugifyAgentId } from "@/lib/agent-id";

describe("slugifyAgentId", () => {
  it.each([
    ["Customer Support Agent", "customer-support-agent"],
    ["  Spaced   out  ", "spaced-out"],
    ["Réfund & Returns!", "rfund-returns"],
    ["--already--slugged--", "already-slugged"],
    ["", ""],
  ])("turns %p into %p", (name, id) => {
    expect(slugifyAgentId(name)).toBe(id);
  });
});

describe("isReservedAgentId", () => {
  it("reserves only the workspace prompt bar's agent", () => {
    expect(isReservedAgentId(DEFAULT_AGENT_ID)).toBe(true);
    expect(isReservedAgentId(`${DEFAULT_AGENT_ID}-2`)).toBe(false);
  });
});
