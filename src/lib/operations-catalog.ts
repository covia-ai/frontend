import { Operation, Venue } from "@covia/covia-sdk";

// An operation discovered in the venue catalog, identified by its resolvable
// catalog path (e.g. "v/ops/agent/suspend"), not a content hash.
export type CatalogOp = { path: string; metadata: any };

// Job-free read of a lattice path via GET /api/v1/values/read (covia ≥ 0.3).
// Reads must not create jobs; the invoke-based covia:read is kept only as a
// fallback for venues without the route (pre-0.3 fleet) or paths the
// unauthenticated GET cannot see.
export async function readValue(venue: Venue, path: string): Promise<any> {
  try {
    const res = await fetch(`${venue.baseUrl}/api/v1/values/read?path=${encodeURIComponent(path)}`);
    if (res.ok) return (await res.json())?.value;
  } catch { /* network failure — fall through to invoke */ }
  const res = await venue.operations.run("v/ops/covia/read", { path });
  return (res as any)?.value;
}

// Read a whole catalog sub-tree in a single covia:read and flatten it to
// {path, metadata} entries. Catalog entries are full inline asset metadata
// (see OPERATIONS.md §5), so one read returns paths + metadata together —
// no per-op round trip. `depth` is how many key levels sit above each entry:
// v/ops/<adapter>/<op> = 2, v/test/ops/<op> = 1.
async function readCatalog(venue: Venue, base: string, depth: number): Promise<CatalogOp[]> {
  let tree: any;
  try {
    tree = await readValue(venue, base);
  } catch {
    return [];
  }
  if (!tree || typeof tree !== "object") return [];

  const out: CatalogOp[] = [];
  const walk = (node: any, prefix: string, level: number) => {
    if (!node || typeof node !== "object") return;
    for (const key of Object.keys(node)) {
      const child = node[key];
      const path = `${prefix}/${key}`;
      if (level + 1 >= depth) {
        if (child?.operation) out.push({ path, metadata: child });
      } else {
        walk(child, path, level + 1);
      }
    }
  };
  walk(tree, base, 0);
  return out;
}

// List every operation the venue offers, by catalog path. Reads v/ops and
// v/test/ops (two calls total), preserving the namespace-explicit path as the
// operation's identity.
export async function listCatalogOperations(venue: Venue): Promise<CatalogOp[]> {
  const [ops, testOps] = await Promise.all([
    readCatalog(venue, "v/ops", 2),
    readCatalog(venue, "v/test/ops", 1),
  ]);
  return [...ops, ...testOps];
}

// Resolve an operation from its namespace-explicit URL address:
//  - "a/<hash>"  → content-addressed asset (getAsset; hash also resolvable directly)
//  - "v/ops/...", "v/test/ops/...", "o/..."  → catalog/workspace path via covia:read
// Returns an Operation whose id is the address it was resolved from.
export async function resolveOperationByAddress(venue: Venue, address: string): Promise<Operation> {
  if (address.startsWith("a/")) {
    return (await venue.getAsset(address.slice(2))) as Operation;
  }
  const meta = await readValue(venue, address);
  if (!meta || !meta.operation) {
    throw new Error(`No operation found at ${address}`);
  }
  return new Operation(address, venue, meta);
}
