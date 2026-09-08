import type { OperationInputSchema } from "@/lib/operation-input";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function placeholderForType(type?: string): unknown {
  switch (type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
    case "json":
      return {};
    default:
      return "";
  }
}

// Secret-marked fields must never carry a real value into a shareable
// snippet — even one the user already typed into the input form — so they
// always resolve to a placeholder, ahead of any live/example/default value.
export function buildSnippetInput(
  schema: OperationInputSchema | undefined,
  liveInput: unknown,
): Record<string, unknown> {
  const properties = schema?.properties;
  if (!properties) {
    return isRecord(liveInput) ? liveInput : {};
  }

  const result: Record<string, unknown> = {};
  for (const [key, property] of Object.entries(properties)) {
    if (property.secret) {
      result[key] = `<${key}>`;
      continue;
    }
    const live = isRecord(liveInput) ? liveInput[key] : undefined;
    if (live !== undefined && live !== "") {
      result[key] = live;
      continue;
    }
    if (property.examples !== undefined) {
      result[key] = Array.isArray(property.examples) ? property.examples[0] : property.examples;
      continue;
    }
    if (property.default !== undefined) {
      result[key] = property.default;
      continue;
    }
    result[key] = placeholderForType(property.type);
  }
  return result;
}

export function curlSnippet(
  baseUrl: string,
  assetId: string,
  input: Record<string, unknown>,
): string {
  const body = JSON.stringify({ operation: assetId, input }, null, 2);
  return [
    `curl -X POST "${baseUrl}/api/v1/invoke" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${body}'`,
  ].join("\n");
}

export function typescriptSnippet(
  baseUrl: string,
  assetId: string,
  input: Record<string, unknown>,
): string {
  return [
    `import { Grid } from "@covia/covia-sdk";`,
    ``,
    `const venue = await Grid.connect("${baseUrl}");`,
    `const result = await venue.operations.run(${JSON.stringify(assetId)}, ${JSON.stringify(input, null, 2)});`,
    `console.log(result);`,
  ].join("\n");
}

// A minimal JSON-value -> Python-literal renderer (True/False/None; strings
// as JSON-compatible double-quoted literals, which Python accepts as-is).
function toPythonLiteral(value: unknown, indent: number): string {
  const pad = "    ".repeat(indent);
  const childPad = "    ".repeat(indent + 1);

  if (value === null || value === undefined) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value
      .map((item) => `${childPad}${toPythonLiteral(item, indent + 1)}`)
      .join(",\n");
    return `[\n${items},\n${pad}]`;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const items = entries
      .map(([key, item]) => `${childPad}${JSON.stringify(key)}: ${toPythonLiteral(item, indent + 1)}`)
      .join(",\n");
    return `{\n${items},\n${pad}}`;
  }

  return "None";
}

export function pythonSnippet(
  baseUrl: string,
  assetId: string,
  input: Record<string, unknown>,
): string {
  const inputLiteral = toPythonLiteral(input, 1);
  return [
    `from covia import Grid`,
    ``,
    `with Grid.connect("${baseUrl}") as venue:`,
    `    result = venue.run(${JSON.stringify(assetId)}, ${inputLiteral}, timeout=60)`,
    `    print(result)`,
  ].join("\n");
}
