import { isMemoryContextEntry, withMemoryContextToggled, MEMORY_CONTEXT_ENTRY } from "@/lib/agent-context";

describe("agent-context memory entry", () => {
  it("identifies a memory context entry by its op", () => {
    expect(isMemoryContextEntry({ op: "v/ops/memory", input: { command: "recall" } })).toBe(true);
    expect(isMemoryContextEntry({ op: "v/ops/covia/read" })).toBe(false);
    expect(isMemoryContextEntry("w/notes")).toBe(false);
    expect(isMemoryContextEntry(null)).toBe(false);
  });

  it("appends the well-formed entry (with command: recall) when attaching", () => {
    expect(withMemoryContextToggled(["w/notes"], true)).toEqual(["w/notes", MEMORY_CONTEXT_ENTRY]);
  });

  it("is idempotent — attaching twice does not duplicate the entry", () => {
    const once = withMemoryContextToggled([], true);
    const twice = withMemoryContextToggled(once, true);
    expect(twice).toEqual([MEMORY_CONTEXT_ENTRY]);
  });

  it("removes only the memory entry when detaching", () => {
    const context = ["w/notes", MEMORY_CONTEXT_ENTRY, { op: "v/ops/covia/read" }];
    expect(withMemoryContextToggled(context, false)).toEqual(["w/notes", { op: "v/ops/covia/read" }]);
  });
});
