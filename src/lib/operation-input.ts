import { getParsedAssetId } from "@covia/covia-sdk";

export const TOP_LEVEL_INPUT_KEY = "__top__";

export type OperationInputType =
  | "string"
  | "number"
  | "json"
  | "object"
  | "any"
  | "asset"
  | "array";

export type OperationInputProperty = {
  type?: string;
  default?: unknown;
  description?: string;
  examples?: unknown[] | unknown;
  secret?: boolean;
};

export type OperationInputSchema = OperationInputProperty & {
  properties?: Record<string, OperationInputProperty>;
  required?: string[];
};

export type OperationInputDefaults = {
  input: Record<string, unknown>;
  types: Record<string, string>;
};

const JSON_TYPES = new Set(["json", "object", "any", "array"]);

export function parseOperationInput(rawValue: string, type: string): unknown {
  if (JSON_TYPES.has(type)) return JSON.parse(rawValue);
  if (type === "number") return Number(rawValue);
  if (type === "asset") return getParsedAssetId(rawValue);
  return rawValue;
}

export function printOperationInput(value: unknown, type: string): string {
  if (JSON_TYPES.has(type)) {
    if (value !== undefined && value !== null && value !== "") {
      return JSON.stringify(value, null, 2);
    }
    return type === "array" ? "[]" : "{}";
  }

  if (type === "number") {
    return typeof value === "object" ? "0" : String(value || 0);
  }

  return typeof value === "object" ? "" : String(value ?? "");
}

export function defaultsFromOperationSchema(
  schema?: OperationInputSchema,
): OperationInputDefaults {
  const input: Record<string, unknown> = {};
  const types: Record<string, string> = {};

  for (const [key, property] of Object.entries(schema?.properties ?? {})) {
    if (property.default !== undefined) input[key] = property.default;
    if (property.type !== undefined) types[key] = property.type;
  }

  return { input, types };
}

export function validateOperationInput(
  input: unknown,
  schema?: OperationInputSchema,
): string | null {
  const requiredKeys = schema?.required ?? [];
  const isEmptyObject =
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    Object.keys(input).length === 0;
  // `{}` is a complete, valid value for an object schema with no required
  // fields. This includes unconstrained `{}` schemas and objects whose listed
  // properties are all optional.
  const acceptsEmptyObject =
    isEmptyObject &&
    requiredKeys.length === 0 &&
    (schema?.type === "object" ||
      schema?.properties !== undefined ||
      (schema !== undefined && Object.keys(schema).length === 0));
  const hasInput =
    input !== null &&
    input !== undefined &&
    (typeof input === "object"
      ? Object.keys(input).length > 0
      : input !== "");

  if (!hasInput && !acceptsEmptyObject) {
    return "No inputs provided for the operation, please verify before running the operation";
  }

  if (typeof input === "object" && input !== null) {
    for (const key of requiredKeys) {
      if (!(key in input)) {
        return `The input "${key}" is expected as per the operation schema. please verify before running the operation`;
      }
    }
  }

  return null;
}
