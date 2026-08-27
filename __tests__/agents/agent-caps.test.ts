import { cleanCaps, emptyCap, isAgentCap } from "@/lib/agent-caps";

describe("agent-caps", () => {
  it("emptyCap starts with blank fields", () => {
    expect(emptyCap()).toEqual({ with: "", can: "" });
  });

  it("isAgentCap validates the {with, can} shape", () => {
    expect(isAgentCap({ with: "w/", can: "crud/read" })).toBe(true);
    expect(isAgentCap({ with: "w/" })).toBe(false);
    expect(isAgentCap("w/")).toBe(false);
    expect(isAgentCap(null)).toBe(false);
  });

  it("cleanCaps drops rows where both fields are blank", () => {
    expect(
      cleanCaps([
        { with: "w/", can: "crud/read" },
        { with: "", can: "" },
        { with: "  ", can: "" },
        { with: "", can: "agent/message" },
      ]),
    ).toEqual([
      { with: "w/", can: "crud/read" },
      { with: "", can: "agent/message" },
    ]);
  });
});
