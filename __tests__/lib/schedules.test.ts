import { isAdapterOnlyOperation, wakeTargetAgent } from "@/lib/schedules";

describe("isAdapterOnlyOperation", () => {
  it("flags an operation named by its adapter, which venues cannot resolve", () => {
    expect(isAdapterOnlyOperation("agent:trigger")).toBe(true);
    expect(isAdapterOnlyOperation("llmagent:chat")).toBe(true);
  });

  it("passes catalogue paths, asset ids and DID URLs", () => {
    expect(isAdapterOnlyOperation("v/ops/agent/trigger")).toBe(false);
    expect(isAdapterOnlyOperation("w/ops/mine")).toBe(false);
    expect(isAdapterOnlyOperation("a/0123abcd")).toBe(false);
    expect(isAdapterOnlyOperation("did:key:z6MkVenue/v/ops/http/get")).toBe(false);
  });
});

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
