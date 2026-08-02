import type { Venue } from "@covia/covia-sdk";
import type { SeedItemResult, SeedReport } from "@/hooks/use-adaptive-risk-config";
import {
  AdaptiveRiskAddresses,
  APPLICANTS,
  WEEK_ONE,
  WEEK_TWO,
  agentConfigs,
  issueLimitMetadata,
  limitGateMetadata,
  policyCheckMetadata,
  riskPaths,
} from "./fixtures";

// Seeding for the Adaptive Risk demo. Every step is user-driven (the Run
// setup button), so writes may mint jobs; existence checks stay on job-free
// reads. Idempotent by checking before creating: values and operations are
// skipped when their address already holds a value, the policy asset is
// content-addressed (same metadata → same id), and agent creation is checked
// via the job-free agent info GET.
//
// Errors are reported with the venue's own message, verbatim — never
// paraphrased, never silently recovered from.

export type SeedProgress = (item: SeedItemResult) => void;

export type SeedOutcome = {
  report: SeedReport;
  /** The content-addressed policy op the gate references (existing or newly registered). */
  policyRef: string;
  ok: boolean;
};

// The venue's own message: GridError.message carries the response error
// string; JobFailedError carries it on jobData.error. Deliberately NOT
// friendlyError() — the point of this demo is the venue's exact words.
export function verbatimVenueError(err: unknown): string {
  if (err && typeof err === "object") {
    const jobData = (err as { jobData?: { error?: string } }).jobData;
    if (jobData?.error) return jobData.error;
    if (err instanceof Error && err.message) return err.message;
  }
  return String(err);
}

async function pathExists(venue: Venue, path: string): Promise<boolean> {
  const result = await venue.workspace.read(path);
  return !!result.exists;
}

async function agentExists(venue: Venue, agentId: string): Promise<boolean> {
  try {
    const info = await venue.agents.info(agentId);
    return !info?.error;
  } catch {
    return false;
  }
}

type PlannedValue = { label: string; address: string; value: unknown };

function plannedValues(addresses: AdaptiveRiskAddresses): PlannedValue[] {
  const paths = riskPaths(addresses.root);
  return [
    ...APPLICANTS.map((applicant) => ({
      label: `Application ${applicant.id}`,
      address: `${paths.applications}/${applicant.id}`,
      value: applicant,
    })),
    { label: "Cohort window week-1", address: `${paths.windows}/week-1`, value: WEEK_ONE },
    { label: "Cohort window week-2", address: `${paths.windows}/week-2`, value: WEEK_TWO },
    { label: "Current window pointer", address: paths.window, value: WEEK_ONE.window },
  ];
}

export async function seedAdaptiveRisk(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
  onItem?: SeedProgress,
): Promise<SeedOutcome> {
  const items: SeedItemResult[] = [];
  const push = (item: SeedItemResult) => {
    items.push(item);
    onItem?.(item);
  };
  const fail = (item: Omit<SeedItemResult, "status">, err: unknown): SeedOutcome => {
    push({ ...item, status: "failed", error: verbatimVenueError(err) });
    return { report: { seededAt: Date.now(), items }, policyRef: "", ok: false };
  };

  // 1. The content-addressed policy operation. A user-supplied address is
  // used as-is (their own policy); otherwise register ours — same metadata
  // always hashes to the same asset id, so re-seeding is a no-op.
  let policyRef = addresses.policyAsset.trim();
  const policyItem = { kind: "policy-asset" as const, label: "Starter Card Policy (content-addressed)" };
  if (policyRef) {
    try {
      await venue.assets.getMetadata(policyRef);
      push({ ...policyItem, address: policyRef, status: "existing" });
    } catch (err) {
      return fail({ ...policyItem, address: policyRef }, err);
    }
  } else {
    try {
      const asset = await venue.assets.register(policyCheckMetadata());
      policyRef = asset.id;
      push({ ...policyItem, address: policyRef, status: "created" });
    } catch (err) {
      return fail({ ...policyItem, address: "(register new)" }, err);
    }
  }

  // 2. The gate and the decision op, at their (editable) lattice addresses.
  const operations = [
    { label: "Risk Limit Gate", address: addresses.limitGate, value: limitGateMetadata(policyRef, addresses) },
    { label: "Issue Credit Limit", address: addresses.issueLimit, value: issueLimitMetadata(addresses) },
  ];
  for (const op of operations) {
    const item = { kind: "operation" as const, label: op.label, address: op.address };
    try {
      if (await pathExists(venue, op.address)) {
        push({ ...item, status: "existing" });
      } else {
        await venue.workspace.write(op.address, op.value);
        push({ ...item, status: "created" });
      }
    } catch (err) {
      return fail(item, err);
    }
  }

  // 3. Fixture values: applications, cohort windows, current-window pointer.
  for (const planned of plannedValues(addresses)) {
    const item = { kind: "value" as const, label: planned.label, address: planned.address };
    try {
      if (await pathExists(venue, planned.address)) {
        push({ ...item, status: "existing" });
      } else {
        await venue.workspace.write(planned.address, planned.value);
        push({ ...item, status: "created" });
      }
    } catch (err) {
      return fail(item, err);
    }
  }

  // 4. The three agents. agent:create without overwrite is a no-op on an
  // occupied slot, but the job-free info check keeps the report honest about
  // what already existed.
  const agents = agentConfigs({ ...addresses, policyAsset: policyRef });
  for (const agent of [agents.sentinel, agents.assessor, agents.monitor]) {
    const item = { kind: "agent" as const, label: `Agent ${agent.agentId}`, address: `g/${agent.agentId}` };
    try {
      if (await agentExists(venue, agent.agentId)) {
        push({ ...item, status: "existing" });
      } else {
        await venue.agents.create(agent);
        push({ ...item, status: "created" });
      }
    } catch (err) {
      return fail(item, err);
    }
  }

  return { report: { seededAt: Date.now(), items }, policyRef, ok: true };
}

// Teardown removes everything seeding named: the demo's data subtree, the two
// operation addresses, and the agents. The content-addressed policy asset is
// immutable and cannot be deleted — it remains on the venue, inert.
export async function teardownAdaptiveRisk(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<{ items: SeedItemResult[]; ok: boolean }> {
  const items: SeedItemResult[] = [];
  const targets = [
    { kind: "value" as const, label: "Demo data subtree", address: addresses.root },
    { kind: "operation" as const, label: "Risk Limit Gate", address: addresses.limitGate },
    { kind: "operation" as const, label: "Issue Credit Limit", address: addresses.issueLimit },
  ];
  let ok = true;
  for (const target of targets) {
    try {
      await venue.workspace.delete(target.address);
      items.push({ ...target, status: "removed" });
    } catch (err) {
      ok = false;
      items.push({ ...target, status: "failed", error: verbatimVenueError(err) });
    }
  }
  for (const agentId of [addresses.sentinelAgent, addresses.assessorAgent, addresses.monitorAgent]) {
    const item = { kind: "agent" as const, label: `Agent ${agentId}`, address: `g/${agentId}` };
    try {
      if (await agentExists(venue, agentId)) {
        await venue.agents.delete(agentId, true);
      }
      items.push({ ...item, status: "removed" });
    } catch (err) {
      ok = false;
      items.push({ ...item, status: "failed", error: verbatimVenueError(err) });
    }
  }
  return { items, ok };
}
