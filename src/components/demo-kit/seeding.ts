import type { Venue } from "@covia/covia-sdk";

// Seeding primitives shared by every demo that registers things on a venue.
//
// The rules, in one place so each demo does not restate them:
//   - existence is checked with job-free reads before anything is written
//   - a failure stops the run and reports the venue's own words, verbatim
//   - re-running is a no-op, not a duplicate

export type SeedItemStatus = "created" | "existing" | "removed" | "failed";

export type SeedItemResult = {
  kind: "value" | "operation" | "policy-asset" | "agent";
  label: string;
  address: string;
  status: SeedItemStatus;
  /** The venue's own error string, verbatim, when status is "failed". */
  error?: string;
};

export type SeedReport = { seededAt: number; items: SeedItemResult[] };

export type SeedProgress = (item: SeedItemResult) => void;

/**
 * The venue's own message. GridError carries it on `message`; a failed job
 * carries it on `jobData.error`. Deliberately NOT friendlyError(), which
 * rewrites denials to "Access denied" — the exact wording is the point.
 */
export function verbatimVenueError(err: unknown): string {
  if (err && typeof err === "object") {
    const jobData = (err as { jobData?: { error?: string } }).jobData;
    if (jobData?.error) return jobData.error;
    if (err instanceof Error && err.message) return err.message;
  }
  return String(err);
}

export async function pathExists(venue: Venue, path: string): Promise<boolean> {
  return !!(await venue.workspace.read(path)).exists;
}

export async function agentExists(venue: Venue, agentId: string): Promise<boolean> {
  try {
    const info = await venue.agents.info(agentId);
    return !info?.error;
  } catch {
    return false;
  }
}

/**
 * Collects results and stops at the first failure. Each demo describes WHAT
 * to seed; this runs it the same way every time.
 */
export class SeedRun {
  readonly items: SeedItemResult[] = [];
  failed = false;

  constructor(private readonly onItem?: SeedProgress) {}

  record(item: SeedItemResult) {
    this.items.push(item);
    this.onItem?.(item);
  }

  fail(item: Omit<SeedItemResult, "status">, err: unknown) {
    this.failed = true;
    this.record({ ...item, status: "failed", error: verbatimVenueError(err) });
  }

  /** Writes `value` at `address` unless something is already there. */
  async ensureValue(
    venue: Venue,
    item: Omit<SeedItemResult, "status">,
    value: unknown,
  ): Promise<boolean> {
    if (this.failed) return false;
    try {
      if (await pathExists(venue, item.address)) {
        this.record({ ...item, status: "existing" });
      } else {
        await venue.workspace.write(item.address, value);
        this.record({ ...item, status: "created" });
      }
      return true;
    } catch (err) {
      this.fail(item, err);
      return false;
    }
  }

  /** Creates an agent unless one already occupies the id. */
  async ensureAgent(
    venue: Venue,
    agentId: string,
    config: unknown,
  ): Promise<boolean> {
    if (this.failed) return false;
    const item = {
      kind: "agent" as const,
      label: `Agent ${agentId}`,
      address: `g/${agentId}`,
    };
    try {
      if (await agentExists(venue, agentId)) {
        this.record({ ...item, status: "existing" });
      } else {
        await venue.agents.create({ agentId, config } as never);
        this.record({ ...item, status: "created" });
      }
      return true;
    } catch (err) {
      this.fail(item, err);
      return false;
    }
  }

  report(): SeedReport {
    return { seededAt: Date.now(), items: this.items };
  }
}

/**
 * Removes named paths and agents. Content-addressed assets are immutable and
 * cannot be deleted; job records are the audit trail and are left alone.
 */
export async function teardown(
  venue: Venue,
  paths: Array<{ label: string; address: string; kind: SeedItemResult["kind"] }>,
  agentIds: string[],
): Promise<{ items: SeedItemResult[]; ok: boolean }> {
  const items: SeedItemResult[] = [];
  let ok = true;
  for (const target of paths) {
    try {
      await venue.workspace.delete(target.address);
      items.push({ ...target, status: "removed" });
    } catch (err) {
      ok = false;
      items.push({ ...target, status: "failed", error: verbatimVenueError(err) });
    }
  }
  for (const agentId of agentIds) {
    const item = {
      kind: "agent" as const,
      label: `Agent ${agentId}`,
      address: `g/${agentId}`,
    };
    try {
      if (await agentExists(venue, agentId)) await venue.agents.delete(agentId, true);
      items.push({ ...item, status: "removed" });
    } catch (err) {
      ok = false;
      items.push({ ...item, status: "failed", error: verbatimVenueError(err) });
    }
  }
  return { items, ok };
}
