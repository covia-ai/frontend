import { Operation, Venue } from "@covia/covia-sdk";

// An operation discovered in the venue catalog, identified by its resolvable
// catalog path (e.g. "v/ops/agent/suspend"), not a content hash.
export type CatalogOp = { path: string; metadata: any };

// The catalog already contains each operation's complete inline metadata.
// Keep it on the shared authenticated Venue instance so navigating from the
// list to a detail page does not immediately read the same value again.
const operationMetadataCache = new WeakMap<Venue, Map<string, any>>();

// Job-free read of a lattice path. `venue.workspace.read` routes through the
// venue's GET /api/v1/values/read (no Job persisted) and, in the SDK, falls
// back to the invoke-based covia:read only on pre-0.3 venues that lack the
// route. Venue-version accommodation lives in the SDK, not here.
async function readValue(venue: Venue, path: string): Promise<any> {
  return (await venue.workspace.read(path)).value;
}

// Read a whole catalog sub-tree in a single covia:read and flatten it to
// {path, metadata} entries. Catalog entries are full inline asset metadata
// (see OPERATIONS.md §5), so one read returns paths + metadata together —
// no per-op round trip.
//
// Operations are matched by shape — any node carrying an `operation` field —
// rather than at a fixed depth. Venues mix depths: most ops are
// v/ops/<adapter>/<op>, but some (v/ops/skills, v/ops/memory) sit directly
// under the root, and the previous hard-coded depth silently dropped those.
// An operation node is a leaf and is never descended into, so its own
// input/output schemas can't be mistaken for nested entries.
async function readCatalog(venue: Venue, base: string): Promise<CatalogOp[]> {
  let tree: any;
  try {
    tree = await readValue(venue, base);
  } catch {
    return [];
  }
  if (!tree || typeof tree !== "object") return [];

  const out: CatalogOp[] = [];
  const walk = (node: any, path: string) => {
    if (!node || typeof node !== "object") return;
    if (node.operation) {
      out.push({ path, metadata: node });
      return;
    }
    for (const key of Object.keys(node)) walk(node[key], `${path}/${key}`);
  };
  walk(tree, base);
  return out;
}

// List every operation available to the caller, by catalog path, preserving
// the namespace-explicit path as the operation's identity. Always reads the
// venue catalogs (v/ops, v/test/ops); when the caller is signed in it also
// reads w/ops — the current user's own operations. w/ops is namespace-relative,
// so it resolves to the authenticated DID; a signed-out caller has no DID for
// it to resolve against, so that read is skipped rather than left to fail.
export async function listCatalogOperations(
  venue: Venue,
  options: { includeUserOps?: boolean } = {},
): Promise<CatalogOp[]> {
  const bases = ["v/ops", "v/test/ops"];
  if (options.includeUserOps) bases.push("w/ops");
  const trees = await Promise.all(bases.map((base) => readCatalog(venue, base)));
  const operations = trees.flat();
  operationMetadataCache.set(
    venue,
    new Map(operations.map((operation) => [operation.path, operation.metadata])),
  );
  return operations;
}

// Resolve an operation from its namespace-explicit URL address:
//  - "a/<hash>"  → content-addressed asset (getAsset; hash also resolvable directly)
//  - "v/ops/...", "v/test/ops/...", "o/..."  → catalog/workspace path via covia:read
// Returns an Operation whose id is the address it was resolved from.
export async function resolveOperationByAddress(venue: Venue, address: string): Promise<Operation> {
  if (address.startsWith("a/")) {
    return (await venue.getAsset(address.slice(2))) as Operation;
  }
  let meta = operationMetadataCache.get(venue)?.get(address);
  if (!meta) {
    meta = await readValue(venue, address);
    if (meta?.operation) {
      const cache = operationMetadataCache.get(venue) ?? new Map<string, any>();
      cache.set(address, meta);
      operationMetadataCache.set(venue, cache);
    }
  }
  if (!meta || !meta.operation) {
    throw new Error(`No operation found at ${address}`);
  }
  return new Operation(address, venue, meta);
}
