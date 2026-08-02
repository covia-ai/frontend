import type { Job, Venue } from "@covia/covia-sdk";
import { resolveOperationByAddress } from "@/lib/operations-catalog";
import { AdaptiveRiskAddresses, riskPaths } from "./fixtures";

// Beat runners. Each beat is ONE real job on the venue: the agent:request
// invocation, whose record adopts the task outcome (verified live — a failed
// transition surfaces as this job FAILED with the venue's error). The demo
// renders that record and never animates anything over it.

export const AGENT_REQUEST_OP = "v/ops/agent/request";

function sentinelTask(addresses: AdaptiveRiskAddresses): string {
  const paths = riskPaths(addresses.root);
  return (
    `Scan this week's starter-card applications under ${paths.applications} ` +
    `(twelve records, APP-1060 to APP-1071). Write one signal record per applicant to ` +
    `${paths.signals}/<applicant-id> and, where two or more applications share a ` +
    `device id, a flag record at ${paths.flags}/<device-id> with the sharing ` +
    `applicant ids under sharedWith. When the ledger is written, complete the task ` +
    `with a one-line summary of what you flagged.`
  );
}

// A failed task leaves an agent SUSPENDED with the old failure as its
// reason; resume is idempotent, so always clear that before dispatching —
// otherwise every retry reports the stale error instead of trying again.
async function resumeIfSuspended(venue: Venue, agentId: string): Promise<void> {
  try {
    const info = await venue.agents.info(agentId);
    if (info?.status === "SUSPENDED") await venue.agents.resume(agentId);
  } catch {
    // Missing agent surfaces properly on the request itself.
  }
}

export async function runBeat1(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<Job> {
  await resumeIfSuspended(venue, addresses.sentinelAgent);
  const op = await resolveOperationByAddress(venue, AGENT_REQUEST_OP);
  return op.invoke({
    agentId: addresses.sentinelAgent,
    input: { task: sentinelTask(addresses) },
    wait: true,
  });
}

// Job-free ledger snapshot for the beat-1 effect panel: what the sentinel
// actually wrote, read straight off the lattice.
export type LedgerSnapshot = {
  signalCount: number;
  signalKeys: string[];
  flags: Array<{ device: string; record: unknown }>;
};

export async function readLedger(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<LedgerSnapshot> {
  const paths = riskPaths(addresses.root);
  const signals = await venue.workspace.list(paths.signals);
  const signalKeys = (signals.exists ? (signals.keys ?? []) : []).map(String);
  const flagsList = await venue.workspace.list(paths.flags);
  const flagKeys = (flagsList.exists ? (flagsList.keys ?? []) : []).map(String);
  const flags = await Promise.all(
    flagKeys.map(async (device) => ({
      device,
      record: (await venue.workspace.read(`${paths.flags}/${device}`)).value,
    })),
  );
  return { signalCount: signalKeys.length, signalKeys, flags };
}
