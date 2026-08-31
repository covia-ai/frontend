// Shape classification for a task/job's declared JSON Schema (covia#376's
// `responseSchema`) — picks which typed renderer fits, so callers don't
// hand-roll object/array checks per call site.

export type ResponseShape = "table" | "card" | "unknown";

type JsonSchema = {
  type?: string;
  properties?: Record<string, unknown>;
  items?: JsonSchema;
};

function isJsonSchema(value: unknown): value is JsonSchema {
  return typeof value === "object" && value !== null;
}

export function classifyResponseShape(schema: unknown): ResponseShape {
  if (!isJsonSchema(schema)) return "unknown";
  if (schema.type === "array" && isJsonSchema(schema.items) && schema.items.type === "object") {
    return "table";
  }
  if (schema.type === "object" && schema.properties) return "card";
  return "unknown";
}

// Column keys for a "table" shape — prefer the schema's own declared
// properties (stable, ordered, includes fields no row happens to fill), and
// fall back to whatever keys the data actually carries when the schema
// doesn't enumerate them (e.g. `items: {type: "object"}` with no properties).
export function getTableColumns(schema: unknown, rows: unknown[]): string[] {
  if (isJsonSchema(schema) && isJsonSchema(schema.items) && schema.items.properties) {
    return Object.keys(schema.items.properties);
  }
  const keys = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    if (typeof row === "object" && row !== null) {
      for (const key of Object.keys(row)) keys.add(key);
    }
  }
  return Array.from(keys);
}
