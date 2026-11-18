import { getParsedAssetId } from "@covia/covia-sdk";

export const TOP_LEVEL_INPUT_KEY = "__top__";

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

/**
 * A boolean field's text: "true" or "false", or "" for not set. Undefined
 * means the field is left out of the payload, so the operation's own default
 * applies (frontend#553: booleans used to be sent as the string "true").
 */
function parseBoolean(rawValue: string): boolean | undefined {
  const text = rawValue.trim().toLowerCase();
  if (text === "") return undefined;
  if (text === "true") return true;
  if (text === "false") return false;
  throw new Error(`Expected true or false, got "${rawValue}"`);
}

export function parseOperationInput(rawValue: string, type: string): unknown {
  if (type === "boolean") return parseBoolean(rawValue);
  if (JSON_TYPES.has(type)) return JSON.parse(rawValue);
  if (type === "number") return Number(rawValue);
  if (type === "integer") {
    // Same defect class as #553: JSON Schema's `integer` was sent as a string.
    const value = Number(rawValue);
    if (!Number.isInteger(value)) throw new Error(`Expected a whole number, got "${rawValue}"`);
    return value;
  }
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

  if (type === "number" || type === "integer") {
    return typeof value === "object" ? "0" : String(value || 0);
  }

  if (type === "boolean") {
    return value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : "";
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
