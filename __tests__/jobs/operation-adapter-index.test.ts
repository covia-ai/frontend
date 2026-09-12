import { buildOperationAdapterIndex, adapterForOp } from "@/lib/operations-catalog";

const DID = "did:key:z6MkTEST";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

// A venue mock exercising the real job-free reads buildOperationAdapterIndex
// uses: listCatalogOperations walks `workspace.read(<base>)`, and the hash map
// comes from `listAssets({ expand: "metadata" })`.
function mockVenue(overrides: Record<string, unknown> = {}) {
  const trees: Record<string, unknown> = {
    "v/ops": { http: { get: { operation: { adapter: "http:get" }, name: "HTTP GET" } } },
    "v/test/ops": { echo: { operation: { adapter: "test:echo" }, name: "Echo" } },
  };
  return {
    workspace: {
      read: jest.fn(async (path: string) => ({ value: trees[path] ?? null })),
    },
    listAssets: jest.fn(async () => ({
      items: [
        { id: `${DID}/a/${HASH_A}`, metadata: { operation: { adapter: "jvm:stringConcat" } } },
        { id: `${DID}/a/${HASH_B}`, metadata: { operation: { adapter: "covia:read" } } },
        // No operation facet — must not land in the hash map.
        { id: `${DID}/a/${"d".repeat(64)}`, metadata: { name: "plain asset" } },
      ],
    })),
    ...overrides,
  } as any;
}

describe("buildOperationAdapterIndex", () => {
  it("keys operation hashes and catalog paths to their adapter (job-free)", async () => {
    const venue = mockVenue();
    const index = await buildOperationAdapterIndex(venue);

    expect(index.byHash.get(HASH_A)).toBe("jvm:stringConcat");
    expect(index.byHash.get(HASH_B)).toBe("covia:read");
    expect(index.byHash.has("d".repeat(64))).toBe(false);
    expect(index.byPath.get("v/ops/http/get")).toBe("http:get");
    expect(index.byPath.get("v/test/ops/echo")).toBe("test:echo");

    // Neither read invokes an operation (would persist a job).
    expect(venue.listAssets).toHaveBeenCalledWith({ expand: "metadata" });
  });

  it("survives one read failing without losing the other", async () => {
    const venue = mockVenue({
      listAssets: jest.fn().mockRejectedValue(new Error("no assets")),
    });
    const index = await buildOperationAdapterIndex(venue);
    expect(index.byHash.size).toBe(0);
    expect(index.byPath.get("v/ops/http/get")).toBe("http:get");
  });
});

describe("adapterForOp", () => {
  const index = {
    byHash: new Map([[HASH_A, "jvm:stringConcat"]]),
    byPath: new Map([["v/ops/http/get", "http:get"]]),
  };

  it("resolves a bare hash op, tolerating a 0x prefix", () => {
    expect(adapterForOp(index, HASH_A)).toBe("jvm:stringConcat");
    expect(adapterForOp(index, "0x" + HASH_A)).toBe("jvm:stringConcat");
  });

  it("resolves a catalog-path op", () => {
    expect(adapterForOp(index, "v/ops/http/get")).toBe("http:get");
  });

  it("is undefined for an unknown op or a missing index", () => {
    expect(adapterForOp(index, "c".repeat(64))).toBeUndefined();
    expect(adapterForOp(index, "v/ops/nope/x")).toBeUndefined();
    expect(adapterForOp(null, HASH_A)).toBeUndefined();
    expect(adapterForOp(index, undefined)).toBeUndefined();
  });
});
