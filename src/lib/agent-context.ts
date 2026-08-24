// Helpers for config.context entries (venue/docs/AGENT_CONTEXT.md §6) — a map
// entry with `op` invokes a grid operation fresh every inference and injects
// its output. Scoped here to exactly the one entry #163 needs (User Memory);
// arbitrary context editing is out of scope.

export const MEMORY_CONTEXT_OP = "v/ops/memory";

// `command: "recall"` is required — memory.json's op has no schema default
// for `command`, so an entry with no input fails every cycle with a visible
// "memory requires command: ..." error instead of rendering the list.
export const MEMORY_CONTEXT_ENTRY = {
  op: MEMORY_CONTEXT_OP,
  input: { command: "recall" },
  label: "User Memory",
};

export function isMemoryContextEntry(entry: unknown): boolean {
  return (
    !!entry &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    (entry as { op?: unknown }).op === MEMORY_CONTEXT_OP
  );
}

export function withMemoryContextToggled(context: unknown[], attached: boolean): unknown[] {
  const next = context.filter((entry) => !isMemoryContextEntry(entry));
  return attached ? [...next, MEMORY_CONTEXT_ENTRY] : next;
}
