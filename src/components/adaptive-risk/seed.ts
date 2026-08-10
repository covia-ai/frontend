import type { Venue } from "@covia/covia-sdk";
import { SeedRun, teardown, type SeedProgress, type SeedReport } from "@/components/demo-kit/seeding";
import {
  AdaptiveRiskAddresses,
  APPLICANTS,
  agentConfigs,
  issueLimitMetadata,
  limitGateMetadata,
  policyCheckMetadata,
  riskPaths,
} from "./fixtures";

// What this demo puts on a venue: the policy, the gate, the decision op, the
// applications, and two agents. Nothing else. The mechanics of seeding —
// existence checks, verbatim errors, stop-on-failure — live in demo-kit.

export type SeedOutcome = {
  report: SeedReport;
  /** The content-addressed policy the gate references. */
  policyRef: string;
  ok: boolean;
};

export async function seedAdaptiveRisk(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
  onItem?: SeedProgress,
): Promise<SeedOutcome> {
  const run = new SeedRun(onItem);
  const paths = riskPaths(addresses.root);

  // 1. The policy, content-addressed. A caller-supplied address is used as-is
  // (their own policy); otherwise register ours — identical metadata always
  // hashes to the same asset id, so re-seeding creates nothing.
  let policyRef = addresses.policyAsset.trim();
  const policyItem = {
    kind: "policy-asset" as const,
    label: "Starter Card Policy (content-addressed)",
    address: policyRef || "(register new)",
  };
  try {
    if (policyRef) {
      await venue.assets.getMetadata(policyRef);
      run.record({ ...policyItem, status: "existing" });
    } else {
      const asset = await venue.assets.register(policyCheckMetadata());
      policyRef = asset.id;
      run.record({ ...policyItem, address: policyRef, status: "created" });
    }
  } catch (err) {
    run.fail(policyItem, err);
    return { report: run.report(), policyRef: "", ok: false };
  }

  // 2. The gate and the decision op.
  await run.ensureValue(
    venue,
    { kind: "operation", label: "Risk Limit Gate", address: addresses.limitGate },
    limitGateMetadata(policyRef, addresses),
  );
  await run.ensureValue(
    venue,
    { kind: "operation", label: "Issue Credit Limit", address: addresses.issueLimit },
    issueLimitMetadata(addresses),
  );

  // 3. The applications.
  for (const applicant of APPLICANTS) {
    await run.ensureValue(
      venue,
      {
        kind: "value",
        label: `Application ${applicant.id}`,
        address: `${paths.applications}/${applicant.id}`,
      },
      applicant,
    );
  }

  // 4. The two agents that carry the claim.
  const agents = agentConfigs({ ...addresses, policyAsset: policyRef });
  await run.ensureAgent(venue, agents.sentinel.agentId, agents.sentinel.config);
  await run.ensureAgent(venue, agents.assessor.agentId, agents.assessor.config);

  return { report: run.report(), policyRef, ok: !run.failed };
}

export function teardownAdaptiveRisk(venue: Venue, addresses: AdaptiveRiskAddresses) {
  return teardown(
    venue,
    [
      { kind: "value", label: "Demo data subtree", address: addresses.root },
      { kind: "operation", label: "Risk Limit Gate", address: addresses.limitGate },
      { kind: "operation", label: "Issue Credit Limit", address: addresses.issueLimit },
    ],
    [addresses.sentinelAgent, addresses.assessorAgent],
  );
}
