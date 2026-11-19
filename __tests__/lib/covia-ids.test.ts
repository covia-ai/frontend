import { normalizeCoviaId, sameCoviaId } from "@/lib/covia-ids";

describe("Covia IDs across venue versions", () => {
  it.each(["ab12", "AB12", "0xab12", "0XAB12"])("matches %s to the same bare ID", (id) => {
    expect(normalizeCoviaId(id)).toBe("ab12");
    expect(sameCoviaId(id, "0xab12")).toBe(true);
    expect(sameCoviaId(id, "ab13")).toBe(false);
  });

  it.each(["Task-A", "0xremote-id", "session-123", " ab12", "ab12 ", "0x"])("preserves opaque or malformed ID %s", (id) => {
    expect(normalizeCoviaId(id)).toBe(id);
  });

  it("does not conflate absent selections, opaque IDs or padded inputs with a hex ID", () => {
    expect(sameCoviaId(null, "ab12")).toBe(false);
    expect(sameCoviaId("Task-A", "task-a")).toBe(false);
    expect(sameCoviaId(" ab12", "ab12")).toBe(false);
  });
});
