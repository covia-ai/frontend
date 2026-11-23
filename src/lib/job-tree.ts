import type { JobMetadata, Venue } from "@covia/covia-sdk";

// A job's parent/child tree. The venue stores only the up-link: each record
// carries `parent`, the nearest *recorded* job it was dispatched inside
// (covia#500). There is no root field, children list or children query, so
// the tree is rebuilt client-side:
//
//   1. walk `parent` up from the viewed job to its root (job-free GETs);
//   2. scan the caller's job index newest-first for records whose parent
//      chain reaches that root, projecting only the few fields a node needs
//      (`listFields`, so no inputs/outputs come over the wire).
//
// A child is dispatched while its parent runs, so it is never older than the
// root. The scan therefore stops at the first record created before the root,
// or at the root itself. SCAN_LIMIT bounds the work when the root is old and
// many unrelated jobs have run since; the result then says it is incomplete.

/** One job in the tree: just what a node renders and links to. */
export interface JobTreeNode {
  /** Bare lowercase hex, the job index key (no `0x`). */
  id: string;
  name?: string;
  status?: string;
  op?: string;
  /** Epoch ms. */
  created?: number;
  children: JobTreeNode[];
}

export interface JobTree {
  root: JobTreeNode;
  /** Total jobs in the tree, root included. */
  size: number;
  /** False when the scan stopped at SCAN_LIMIT before reaching the root, so
   *  some descendants may be missing. */
  complete: boolean;
  /** True when the root's own `parent` could not be read (deleted, or not
   *  visible to this caller), so the tree shown starts below the real root. */
  truncatedAbove: boolean;
}

/** A record as the scan sees it, before the tree is assembled. */
export interface JobTreeRecord {
  id: string;
  parent?: string;
  name?: string;
  status?: string;
  op?: string;
  created?: number;
}

const TREE_FIELDS = ["parent", "status", "created", "name", "op"];
const PAGE_SIZE = 200;
export const SCAN_LIMIT = 2000;
const MAX_DEPTH = 32;

/** Index keys are bare hex; `parent` and record ids may carry `0x`. */
export function normalizeJobId(id: unknown): string {
  if (typeof id !== "string") return "";
  const lower = id.trim().toLowerCase();
  return lower.startsWith("0x") ? lower.slice(2) : lower;
}

function toMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = /^\d+$/.test(value) ? Number(value) : Date.parse(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

const asString = (value: unknown) => (typeof value === "string" ? value : undefined);

export function recordFromMetadata(meta: JobMetadata, fallbackId?: string): JobTreeRecord {
  return {
    id: normalizeJobId(meta.id ?? fallbackId),
    parent: normalizeJobId(meta.parent) || undefined,
    name: asString(meta.name),
    status: asString(meta.status),
    op: asString(meta.op),
    created: toMs(meta.created),
  };
}

/**
 * Assembles the tree under `root` from scanned records. Records whose parent
 * chain doesn't reach the root are ignored, and a `seen` guard keeps a
 * malformed cyclic link from looping. Siblings are ordered oldest-first, the
 * order they were dispatched in.
 */
export function buildJobTree(root: JobTreeRecord, records: JobTreeRecord[]): { node: JobTreeNode; size: number } {
  const childrenOf = new Map<string, JobTreeRecord[]>();
  for (const record of records) {
    if (!record.parent || record.id === root.id) continue;
    const siblings = childrenOf.get(record.parent) ?? [];
    siblings.push(record);
    childrenOf.set(record.parent, siblings);
  }

  const seen = new Set<string>();
  let size = 0;
  const build = (record: JobTreeRecord): JobTreeNode => {
    seen.add(record.id);
    size += 1;
    const children = (childrenOf.get(record.id) ?? [])
      .filter((child) => !seen.has(child.id))
      .sort((a, b) => (a.created ?? 0) - (b.created ?? 0))
      .map(build);
    const { id, name, status, op, created } = record;
    return { id, name, status, op, created, children };
  };
  return { node: build(root), size };
}

/**
 * Follows `parent` links up from `job` to the root of its tree. Every hop is a
 * job-free GET. Stops at a record with no parent, at a parent that can't be
 * read, or at MAX_DEPTH.
 */
export async function findTreeRoot(
  venue: Venue,
  job: JobMetadata,
): Promise<{ root: JobTreeRecord; truncatedAbove: boolean }> {
  let current = recordFromMetadata(job);
  const seen = new Set([current.id]);
  for (let depth = 0; depth < MAX_DEPTH && current.parent && !seen.has(current.parent); depth++) {
    try {
      const parent = await venue.jobs.get(current.parent);
      seen.add(current.parent);
      current = recordFromMetadata(parent.metadata, current.parent);
    } catch {
      return { root: current, truncatedAbove: true };
    }
  }
  return { root: current, truncatedAbove: false };
}

/**
 * Reads job-index records newest-first until it passes the root, returning
 * every record newer than it. `complete` is false when SCAN_LIMIT ran out
 * first.
 */
export async function scanJobsSince(
  venue: Venue,
  root: JobTreeRecord,
): Promise<{ records: JobTreeRecord[]; complete: boolean }> {
  const total = (await venue.workspace.list("j", 1)).count ?? 0;
  const records: JobTreeRecord[] = [];
  let end = total;
  let scanned = 0;
  let reachedRoot = false;

  while (end > 0 && scanned < SCAN_LIMIT && !reachedRoot) {
    const start = Math.max(0, end - PAGE_SIZE);
    const page = await venue.workspace.listFields("j", TREE_FIELDS, { offset: start, limit: end - start });
    for (const [key, fields] of Object.entries(page.values ?? {})) {
      const id = normalizeJobId(key);
      const created = toMs(fields.created?.value);
      if (id === root.id || (created != null && root.created != null && created < root.created)) {
        reachedRoot = true;
        continue;
      }
      records.push({
        id,
        parent: normalizeJobId(fields.parent?.value) || undefined,
        name: asString(fields.name?.value),
        status: asString(fields.status?.value),
        op: asString(fields.op?.value),
        created,
      });
    }
    scanned += end - start;
    end = start;
  }
  return { records, complete: reachedRoot || end === 0 };
}

/** The whole tree the viewed job belongs to. */
export async function loadJobTree(venue: Venue, job: JobMetadata): Promise<JobTree> {
  const { root, truncatedAbove } = await findTreeRoot(venue, job);
  const { records, complete } = await scanJobsSince(venue, root);
  const { node, size } = buildJobTree(root, records);
  return { root: node, size, complete, truncatedAbove };
}
