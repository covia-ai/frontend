import {
  buildSnippetInput,
  curlSnippet,
  pythonSnippet,
  typescriptSnippet,
} from "@/lib/operation-snippets";
import type { OperationInputSchema } from "@/lib/operation-input";

describe("buildSnippetInput", () => {
  it("prefers a live (already-typed) value over examples and defaults", () => {
    const schema: OperationInputSchema = {
      properties: {
        length: { type: "string", default: "10", examples: ["5"] },
      },
    };
    expect(buildSnippetInput(schema, { length: "42" })).toEqual({ length: "42" });
  });

  it("falls back to examples, then default, then a type placeholder", () => {
    const schema: OperationInputSchema = {
      properties: {
        withExample: { type: "string", examples: ["from-example"] },
        withDefault: { type: "number", default: 7 },
        withNeither: { type: "boolean" },
      },
    };
    expect(buildSnippetInput(schema, {})).toEqual({
      withExample: "from-example",
      withDefault: 7,
      withNeither: false,
    });
  });

  it("takes the first entry when examples is an array", () => {
    const schema: OperationInputSchema = {
      properties: { tag: { type: "string", examples: ["first", "second"] } },
    };
    expect(buildSnippetInput(schema, {})).toEqual({ tag: "first" });
  });

  it("always placeholders a secret field, even when the live input has a real value", () => {
    const schema: OperationInputSchema = {
      properties: {
        apiKey: { type: "string", secret: true },
      },
    };
    expect(buildSnippetInput(schema, { apiKey: "sk-super-secret-value" })).toEqual({
      apiKey: "<apiKey>",
    });
  });

  it("falls back to the raw live input when the schema has no properties", () => {
    expect(buildSnippetInput(undefined, { a: 1 })).toEqual({ a: 1 });
    expect(buildSnippetInput({}, { a: 1 })).toEqual({ a: 1 });
  });

  it("returns an empty object when there is no schema and no usable live input", () => {
    expect(buildSnippetInput(undefined, undefined)).toEqual({});
    expect(buildSnippetInput(undefined, "not an object")).toEqual({});
  });
});

describe("curlSnippet", () => {
  it("posts to /api/v1/invoke with the operation and input as JSON", () => {
    const snippet = curlSnippet("https://venue.example", "v/ops/test/echo", { message: "hi" });
    expect(snippet).toContain(`curl -X POST "https://venue.example/api/v1/invoke"`);
    expect(snippet).toContain(`-H "Content-Type: application/json"`);
    expect(snippet).toContain(`"operation": "v/ops/test/echo"`);
    expect(snippet).toContain(`"message": "hi"`);
  });
});

describe("typescriptSnippet", () => {
  it("connects via Grid and calls venue.operations.run with the given input", () => {
    const snippet = typescriptSnippet("https://venue.example", "v/ops/test/echo", { message: "hi" });
    expect(snippet).toContain(`import { Grid } from "@covia/covia-sdk";`);
    expect(snippet).toContain(`Grid.connect("https://venue.example")`);
    expect(snippet).toContain(`venue.operations.run("v/ops/test/echo",`);
    expect(snippet).toContain(`"message": "hi"`);
  });
});

describe("pythonSnippet", () => {
  it("connects via Grid and calls venue.run with a Python dict literal", () => {
    const snippet = pythonSnippet("https://venue.example", "v/ops/test/echo", {
      message: "hi",
      count: 3,
      enabled: true,
      missing: null,
    });
    expect(snippet).toContain(`from covia import Grid`);
    expect(snippet).toContain(`Grid.connect("https://venue.example")`);
    expect(snippet).toContain(`venue.run("v/ops/test/echo",`);
    expect(snippet).toContain(`"message": "hi"`);
    expect(snippet).toContain(`"count": 3`);
    // Python literals, not JSON's true/false/null.
    expect(snippet).toContain("True");
    expect(snippet).toContain("None");
    expect(snippet).not.toContain(": true");
    expect(snippet).not.toContain(": null");
  });

  it("renders an empty input as {}", () => {
    const snippet = pythonSnippet("https://venue.example", "v/ops/test/echo", {});
    expect(snippet).toContain(`venue.run("v/ops/test/echo", {}, timeout=60)`);
  });
});
