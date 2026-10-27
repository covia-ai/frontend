import { wakeTargetAgent } from "@/lib/schedules";

describe("wakeTargetAgent", () => {
  it("reads the agent from an agent:trigger wake, in either operation form", () => {
    expect(wakeTargetAgent({ op: "agent:trigger", input: { agentId: "reporter" } })).toBe("reporter");
    expect(wakeTargetAgent({ op: "v/ops/agent/trigger", input: { agentId: "reporter" } })).toBe("reporter");
  });

  it("is null for any other operation", () => {
    expect(wakeTargetAgent({ op: "v/ops/http/get", input: { agentId: "reporter" } })).toBeNull();
  });

  it("is null without a bare agent id: venues before 0.10 list no input", () => {
    expect(wakeTargetAgent({ op: "agent:trigger" })).toBeNull();
    expect(wakeTargetAgent({ op: "agent:trigger", input: { agentId: "" } })).toBeNull();
    expect(wakeTargetAgent({ op: "agent:trigger", input: { agentId: 42 } })).toBeNull();
    // Another principal's agent, or a g/ path: not one the agent pages open.
    expect(wakeTargetAgent({ op: "agent:trigger", input: { agentId: "did:key:z6Mk/g/reporter" } })).toBeNull();
    expect(wakeTargetAgent({ op: "agent:trigger", input: { agentId: "g/reporter" } })).toBeNull();
  });
});
