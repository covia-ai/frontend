import { readSuspension } from "@/lib/agent-suspension";

describe("readSuspension (covia#590)", () => {
  it("reads who stopped the agent, when and why", () => {
    expect(
      readSuspension({ suspension: { by: "did:key:z6MkA", ts: 1_793_090_082_343, reason: " Rotating its key " } }),
    ).toEqual({ by: "did:key:z6MkA", ts: 1_793_090_082_343, reason: "Rotating its key" });
  });

  it("keeps a record with no reason or time", () => {
    expect(readSuspension({ suspension: { by: "did:key:z6MkA" } })).toEqual({ by: "did:key:z6MkA" });
    expect(readSuspension({ suspension: { by: "did:key:z6MkA", reason: "  ", ts: "soon" } })).toEqual({
      by: "did:key:z6MkA",
    });
  });

  it("is undefined for a fault, a venue before 0.10, or a malformed record", () => {
    expect(readSuspension({ status: "SUSPENDED", error: "boom" })).toBeUndefined();
    expect(readSuspension(undefined)).toBeUndefined();
    expect(readSuspension(null)).toBeUndefined();
    expect(readSuspension({ suspension: "yes" })).toBeUndefined();
    expect(readSuspension({ suspension: { ts: 1, reason: "x" } })).toBeUndefined();
    expect(readSuspension({ suspension: { by: "" } })).toBeUndefined();
  });
});
