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

// A failed transition suspends the agent on purpose: it accepts no new work
// and names its cause and remedy ("fix the cause, then use agent:resume"),
// so a broken agent cannot burn through queued tasks. Clearing that is the
// operator's call — here the Run click IS that decision, which is why resume
// happens per run rather than automatically in the background. Same pattern
// as AIPrompt's dispatch path.
async function resumeIfSuspended(venue: Venue, agentId: string): Promise<void> {
  let suspended = false;
  try {
    const info = await venue.agents.info(agentId);
    suspended = info?.status === "SUSPENDED";
  } catch {
    // A missing or unreadable agent surfaces on the request itself, with the
    // venue's own message — nothing useful to add here.
    return;
  }
  if (!suspended) return;
  // A failed resume must not be swallowed: the request below would then fail
  // with the stale suspension reason and hide the real cause.
  await venue.agents.resume(agentId);
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

function assessorTask(
  addresses: AdaptiveRiskAddresses,
  applicant: string,
  amount: number,
  device: string,
): string {
  const paths = riskPaths(addresses.root);
  return (
    `Assess starter-card applicant ${applicant}. Read their application at ` +
    `${paths.applications}/${applicant} and the fraud signal ledger under ` +
    `${paths.signals}. Then issue the decision by invoking ${addresses.issueLimit} ` +
    `with exactly {"applicant": "${applicant}", "amount": ${amount}, "device": "${device}"}. ` +
    `Issue exactly that amount — the runtime enforces policy, not you. If the ` +
    `invocation fails, report the error you received word for word and stop.`
  );
}

/**
 * Beats 2 and 3 are the same call with different inputs — that is the point:
 * nothing about the assessor changes between the approval and the refusal,
 * only what it is asked to issue. The gate decides.
 */
export async function runAssessorBeat(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
  applicant: string,
  amount: number,
  device: string,
): Promise<Job> {
  await resumeIfSuspended(venue, addresses.assessorAgent);
  const op = await resolveOperationByAddress(venue, AGENT_REQUEST_OP);
  return op.invoke({
    agentId: addresses.assessorAgent,
    input: { task: assessorTask(addresses, applicant, amount, device) },
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

// The decision ledger, read job-free. Beat 2's effect (a decision written)
// and beat 3's non-effect (nothing written for the refused applicant) are
// both read from here — the refusal is proved by absence.
export type DecisionSnapshot = {
  applicants: string[];
  records: Array<{ applicant: string; record: unknown }>;
};

export async function readDecisions(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<DecisionSnapshot> {
  const paths = riskPaths(addresses.root);
  const listed = await venue.workspace.list(paths.decisions);
  const applicants = (listed.exists ? (listed.keys ?? []) : []).map(String);
  const records = await Promise.all(
    applicants.map(async (applicant) => ({
      applicant,
      record: (await venue.workspace.read(`${paths.decisions}/${applicant}`)).value,
    })),
  );
  return { applicants, records };
}
