import { parseOpMetadata } from "@/lib/diagramutils";

// `parseOpMetadata` turns an orchestration operation's metadata into the
// ReactFlow graph DiagramViewer renders. The shapes below mirror the venue's
// own orchestration examples (venue/src/main/resources/asset-examples/*.json):
// `result` maps each output name to ["input", <field>], [<stepIndex>] or
// [<stepIndex>, <field>].

type Step = { op: string; name?: string; id?: string; input: unknown };

function metadata({
  inputs = ["query"],
  outputs = ["search-results"],
  steps = [] as Step[],
  result = {} as Record<string, unknown[]>,
}: {
  inputs?: string[];
  outputs?: string[];
  steps?: Step[];
  result?: Record<string, unknown[]>;
} = {}) {
  const asProperties = (names: string[]) =>
    Object.fromEntries(names.map((n) => [n, { type: "string" }]));
  return {
    operation: {
      adapter: "orchestrator",
      input: { type: "object", properties: asProperties(inputs) },
      output: { type: "object", properties: asProperties(outputs) },
      steps,
      result,
    },
  };
}

const nodeById = (nodes: any[], id: string) => nodes.find((n) => n.id === id);
const edgesInto = (edges: any[], target: string) =>
  edges.filter((e) => e.target === target);

describe("parseOpMetadata", () => {
  it("returns a [nodes, edges] pair", () => {
    const [nodes, edges] = parseOpMetadata(metadata());
    expect(Array.isArray(nodes)).toBe(true);
    expect(Array.isArray(edges)).toBe(true);
  });

  it("builds a single input node carrying every declared input property", () => {
    const [nodes] = parseOpMetadata(metadata({ inputs: ["query", "limit"] }));
    const input = nodeById(nodes, "0");
    expect(input).toMatchObject({
      id: "0",
      type: "InputNode",
      data: { nodeLabel: "Inputs", inputs: ["query", "limit"] },
      position: { x: 100, y: 200 },
    });
    expect(nodes.filter((n) => n.type === "InputNode")).toHaveLength(1);
  });

  it("builds a single output node carrying every declared output property", () => {
    const [nodes] = parseOpMetadata(
      metadata({ outputs: ["search-results", "status-code"] }),
    );
    const outputs = nodes.filter((n) => n.type === "OutputNode");
    expect(outputs).toHaveLength(1);
    expect(outputs[0].data).toEqual({
      nodeLabel: "Outputs",
      outputs: ["search-results", "status-code"],
    });
  });
});

describe("parseOpMetadata — map-form step inputs", () => {
  it("wires an `input` reference back to the input node, naming the field as the source handle", () => {
    const [, edges] = parseOpMetadata(
      metadata({
        steps: [{ op: "v/ops/http/get", name: "Fetch", input: { url: ["input", "query"] } }],
      }),
    );
    expect(edgesInto(edges, "1")).toEqual([
      expect.objectContaining({
        source: "0",
        target: "1",
        sourceHandle: "query",
        targetHandle: "url",
        type: "customEdge",
        animated: true,
      }),
    ]);
  });

  it("falls back to the `input` handle when the reference names no field", () => {
    const [, edges] = parseOpMetadata(
      metadata({
        steps: [{ op: "v/ops/http/get", name: "Fetch", input: { url: ["input"] } }],
      }),
    );
    expect(edgesInto(edges, "1")[0]).toMatchObject({
      source: "0",
      sourceHandle: "input",
      targetHandle: "url",
    });
  });

  it("wires a numeric step reference to that step's task node", () => {
    const [, edges] = parseOpMetadata(
      metadata({
        steps: [
          { op: "v/ops/http/get", name: "Fetch", input: { url: ["input", "query"] } },
          { op: "v/ops/json/parse", name: "Parse", input: { body: [0, "body"] } },
        ],
      }),
    );
    // Step 0 is node "1", so a reference to step 0 sources from "1".
    expect(edgesInto(edges, "2")).toEqual([
      expect.objectContaining({
        source: "1",
        target: "2",
        sourceHandle: "body",
        targetHandle: "body",
      }),
    ]);
  });

  it("materialises a const input as its own node wired into the step", () => {
    // The const node's x offset is randomised, so pin Math.random for the assertion.
    const random = jest.spyOn(Math, "random").mockReturnValue(0);
    try {
      const [nodes, edges] = parseOpMetadata(
        metadata({
          steps: [
            { op: "v/ops/http/get", name: "Fetch", input: { url: ["const", "https://example.com"] } },
          ],
        }),
      );
      expect(nodeById(nodes, "1curl")).toMatchObject({
        type: "ConstNode",
        data: { id: "0c", nodeLabel: JSON.stringify("https://example.com") },
      });
      expect(edgesInto(edges, "1")).toEqual([
        expect.objectContaining({
          source: "1curl",
          target: "1",
          targetHandle: "url",
          type: "customEdge",
        }),
      ]);
    } finally {
      random.mockRestore();
    }
  });

  it("gives the task node the step's own identity and input keys", () => {
    const [nodes] = parseOpMetadata(
      metadata({
        steps: [
          {
            op: "v/ops/http/get",
            name: "Fetch",
            id: "fetch-1",
            input: { url: ["input", "query"], method: ["const", "GET"] },
          },
        ],
        result: { "search-results": [0] },
      }),
    );
    expect(nodeById(nodes, "1")).toMatchObject({
      type: "TaskNode",
      data: {
        taskId: "fetch-1",
        nodeLabel: "Fetch",
        op: "v/ops/http/get",
        inputs: ["url", "method"],
        outputs: ["search-results"],
      },
    });
  });

  it("emits no edge for an input reference it cannot classify", () => {
    const [, edges] = parseOpMetadata(
      metadata({
        steps: [{ op: "v/ops/http/get", name: "Fetch", input: { url: ["nonsense", "x"] } }],
      }),
    );
    expect(edgesInto(edges, "1")).toHaveLength(0);
  });
});

describe("parseOpMetadata — array-form step inputs", () => {
  it("materialises a whole-input const array as a single const node", () => {
    const [nodes, edges] = parseOpMetadata(
      metadata({
        steps: [{ op: "v/ops/json/merge", name: "Merge", input: ["const", { a: 1 }] }],
      }),
    );
    expect(nodeById(nodes, "1c")).toMatchObject({
      type: "ConstNode",
      data: { nodeLabel: JSON.stringify({ a: 1 }) },
    });
    expect(nodeById(nodes, "1")).toMatchObject({ type: "TaskNode", data: { inputs: [] } });
    expect(edgesInto(edges, "1")).toEqual([
      expect.objectContaining({ source: "1c", targetHandle: "taskinput" }),
    ]);
  });

  it("chains a ['0'] step to the preceding step on its result handle", () => {
    const [, edges] = parseOpMetadata(
      metadata({
        steps: [
          { op: "v/ops/http/get", name: "Fetch", input: { url: ["input", "query"] } },
          { op: "v/ops/json/parse", name: "Parse", input: ["0"] },
        ],
        // Names the handle produced by step 0, which the chain edge reuses.
        result: { body: [0, "body"] },
      }),
    );
    expect(edgesInto(edges, "2")).toEqual([
      expect.objectContaining({
        source: "1",
        target: "2",
        sourceHandle: "body",
        targetHandle: "body",
      }),
    ]);
  });
});

describe("parseOpMetadata — result wiring", () => {
  it("wires an output declared as a bare step reference, deriving the handle from that step's result", () => {
    const [nodes, edges] = parseOpMetadata(
      metadata({
        outputs: ["search-results"],
        steps: [{ op: "v/ops/http/get", name: "Fetch", input: { url: ["input", "query"] } }],
        result: { "search-results": [0] },
      }),
    );
    const output = nodes.find((n) => n.type === "OutputNode");
    expect(edgesInto(edges, output.id)).toEqual([
      expect.objectContaining({
        source: "1",
        sourceHandle: "search-results",
        targetHandle: "search-results",
      }),
    ]);
  });

  it("uses the explicit field when the result names one", () => {
    const [nodes, edges] = parseOpMetadata(
      metadata({
        outputs: ["status-code"],
        steps: [{ op: "v/ops/http/get", name: "Fetch", input: { url: ["input", "query"] } }],
        result: { "status-code": [0, "status"] },
      }),
    );
    const output = nodes.find((n) => n.type === "OutputNode");
    expect(edgesInto(edges, output.id)[0]).toMatchObject({
      source: "1",
      sourceHandle: "status",
      targetHandle: "status-code",
    });
  });

  it("wires an output that passes an operation input straight through", () => {
    const [nodes, edges] = parseOpMetadata(
      metadata({
        outputs: ["search-query"],
        result: { "search-query": ["input", "query"] },
      }),
    );
    const output = nodes.find((n) => n.type === "OutputNode");
    expect(edgesInto(edges, output.id)).toEqual([
      expect.objectContaining({
        source: "0",
        sourceHandle: "query",
        targetHandle: "search-query",
      }),
    ]);
  });

  it("falls back to the `input` handle for a pass-through output naming no field", () => {
    const [nodes, edges] = parseOpMetadata(
      metadata({ outputs: ["echo"], result: { echo: ["input"] } }),
    );
    const output = nodes.find((n) => n.type === "OutputNode");
    expect(edgesInto(edges, output.id)[0]).toMatchObject({
      source: "0",
      sourceHandle: "input",
      targetHandle: "echo",
    });
  });

  it("leaves an output unwired when nothing produces it", () => {
    const [nodes, edges] = parseOpMetadata(
      metadata({ outputs: ["orphan"], result: {} }),
    );
    const output = nodes.find((n) => n.type === "OutputNode");
    expect(edgesInto(edges, output.id)).toHaveLength(0);
  });
});

describe("parseOpMetadata — whole graphs", () => {
  it("handles an operation with no steps at all", () => {
    const [nodes, edges] = parseOpMetadata(metadata({ steps: [] }));
    expect(nodes.map((n) => n.type)).toEqual(["InputNode", "OutputNode"]);
    expect(edges).toHaveLength(0);
  });

  it("builds one task node per step and keeps every edge endpoint resolvable", () => {
    const [nodes, edges] = parseOpMetadata(
      metadata({
        inputs: ["query"],
        outputs: ["search-query", "search-results", "status-code"],
        steps: [
          { op: "v/ops/http/get", name: "Fetch", input: { url: ["input", "query"] } },
          { op: "v/ops/json/parse", name: "Parse", input: { body: [0, "body"] } },
          { op: "v/ops/json/merge", name: "Merge", input: ["const", { wrap: true }] },
        ],
        result: {
          "search-query": ["input", "query"],
          "search-results": [1, "parsed"],
          "status-code": [0, "status"],
        },
      }),
    );

    expect(nodes.filter((n) => n.type === "TaskNode")).toHaveLength(3);
    expect(nodes.filter((n) => n.type === "InputNode")).toHaveLength(1);
    expect(nodes.filter((n) => n.type === "OutputNode")).toHaveLength(1);

    // A dangling endpoint renders as an invisible edge, so assert the graph closes.
    const ids = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(ids).toContain(edge.source);
      expect(ids).toContain(edge.target);
    }
    expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);
  });
});
