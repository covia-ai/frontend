// Shape classification for a task/job's declared JSON Schema (covia#376's
// `responseSchema`) — picks which typed renderer fits, so callers don't
// hand-roll object/array checks per call site.

export type ResponseShape = "table" | "card" | "unknown";

type JsonSchema = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: unknown;
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
    const declared = Object.keys(schema.items.properties);
    // A venue returns `properties` as a lattice map, alphabetised, but keeps
    // `required` in the order it was written: lead with those.
    const required = Array.isArray(schema.items.required)
      ? schema.items.required.filter((key): key is string => typeof key === "string" && declared.includes(key))
      : [];
    return [...new Set([...required, ...declared])];
  }
  const keys = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    if (typeof row === "object" && row !== null) {
      for (const key of Object.keys(row)) keys.add(key);
    }
  }
  return Array.from(keys);
}

export type DeclaredResponseSchema = {
  schema: Record<string, unknown>;
  strict: boolean;
};

// The contract an agent request declared (covia#376). The venue keeps it where
// the caller passed it, in the request job's input ({agentId, input,
// responseSchema?, strict?}): the job record has no top-level field for it.
// Null when the job is not a typed request.
export function declaredResponseSchema(jobInput: unknown): DeclaredResponseSchema | null {
  if (!isJsonSchema(jobInput)) return null;
  const { responseSchema, strict } = jobInput as { responseSchema?: unknown; strict?: unknown };
  if (!isJsonSchema(responseSchema) || Array.isArray(responseSchema)) return null;
  return { schema: responseSchema as Record<string, unknown>, strict: strict === true };
}

// Whether a value has the shape its schema was classified as: an agent can
// still end a task with a plain reply instead of the typed result, and a
// mismatched value must not be dressed up as a table or card.
export function valueFitsShape(shape: ResponseShape, value: unknown): boolean {
  if (shape === "table") return Array.isArray(value);
  if (shape === "card") return typeof value === "object" && value !== null && !Array.isArray(value);
  return false;
}

// The typed value an agent request settled with. The venue completes the
// request job with an envelope, {id, status: "COMPLETE", output, sessionId?}
// (covia AgentAdapter.completion), so the result the schema describes is its
// `output`. Undefined for anything else, e.g. a STARTED snapshot.
export function requestResultValue(jobOutput: unknown): unknown {
  if (!isJsonSchema(jobOutput) || Array.isArray(jobOutput)) return undefined;
  const envelope = jobOutput as { status?: unknown; output?: unknown };
  return envelope.status === "COMPLETE" ? envelope.output : undefined;
}
