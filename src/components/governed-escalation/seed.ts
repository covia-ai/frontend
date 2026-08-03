import type { Venue } from "@covia/covia-sdk";
import { SeedRun, teardown, type SeedProgress, type SeedReport } from "@/components/demo-kit/seeding";
import {
  EscalationAddresses,
  VENUE_HITL_SKILL,
  WEEK_ONE,
  WEEK_TWO,
  driftPaths,
  monitorConfig,
} from "./fixtures";

export async function seedEscalation(
  venue: Venue,
  addresses: EscalationAddresses,
  onItem?: SeedProgress,
): Promise<{ report: SeedReport; ok: boolean }> {
  const run = new SeedRun(onItem);
  const paths = driftPaths(addresses.root);

  await run.ensureValue(venue, { kind: "value", label: "Cohort window week-1", address: `${paths.windows}/week-1` }, WEEK_ONE);
  await run.ensureValue(venue, { kind: "value", label: "Cohort window week-2", address: `${paths.windows}/week-2` }, WEEK_TWO);
  await run.ensureValue(venue, { kind: "value", label: "Current window pointer", address: paths.window }, WEEK_ONE.window);

  // The venue's HITL skill, shadowed into the caller's own namespace.
  // hitl:request is reachable only through the skill, loading a skill pins
  // crud/read on its source, and a capped agent's bare paths canonicalise
  // against its OWNER's DID — so the venue-global v/skills is out of reach for
  // a scoped grant. A user's own copy shadows it, keeping the agent capped
  // rather than unrestricted.
  const skillItem = {
    kind: "value" as const,
    label: "HITL skill (shadowed into your namespace)",
    address: `${addresses.skillsPath}/hitl`,
  };
  if (!run.failed) {
    try {
      const source = await venue.workspace.read(VENUE_HITL_SKILL);
      if (!source.exists) throw new Error(`No HITL skill at ${VENUE_HITL_SKILL} on this venue`);
      await run.ensureValue(venue, skillItem, source.value);
    } catch (err) {
      run.fail(skillItem, err);
    }
  }

  await run.ensureAgent(venue, addresses.monitorAgent, monitorConfig(addresses));

  return { report: run.report(), ok: !run.failed };
}

export function teardownEscalation(venue: Venue, addresses: EscalationAddresses) {
  return teardown(
    venue,
    [{ kind: "value", label: "Demo data subtree", address: addresses.root }],
    [addresses.monitorAgent],
  );
}
