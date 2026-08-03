"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useDemoConfig, useDemoAddresses } from "@/hooks/use-demo-config";
import { BeatCard, type BeatJobState } from "@/components/demo-kit/BeatCard";
import { SetupPanel } from "@/components/demo-kit/SetupPanel";
import { HonestyPanel } from "@/components/demo-kit/HonestyPanel";
import { ADAPTIVE_RISK_BEATS } from "./story";
import {
  ADDRESS_FIELDS,
  APPLICANTS,
  DEFAULT_ADDRESSES,
  STARTER_CARD_LIMIT,
} from "./fixtures";
import { seedAdaptiveRisk, teardownAdaptiveRisk } from "./seed";
import { runBeat1, runAssessorBeat } from "./beats";
import { LedgerPanel } from "./LedgerPanel";
import { DecisionsPanel } from "./DecisionsPanel";
import { PolicyLinks } from "./PolicyLinks";
import { RefusalPanel } from "./RefusalPanel";
import { ReconstructionPanel } from "./ReconstructionPanel";

export const DEMO_ID = "adaptive-risk";

// Adaptive Risk makes ONE claim: a credit agent cannot issue a limit unless a
// fraud agent's signals pass a policy gate — the two are joined at the
// execution layer, and the join is enforced. Four beats: the fraud agent
// writes (1), a clean case flows through the gate (2), a bad one is refused
// (3), and the refusal is read back off the record (4).
//
// Human-in-the-loop escalation is a different claim and has its own demo.
export function AdaptiveRiskDemo() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const { addresses, setAddresses, reset } = useDemoAddresses(DEMO_ID, DEFAULT_ADDRESSES);
  const report = useDemoConfig((s) => (venue ? s.reports[DEMO_ID]?.[venue.venueId] : undefined));
  const memos = useDemoConfig((s) => (venue ? s.memos[DEMO_ID]?.[venue.venueId] : undefined));
  const setMemo = useDemoConfig((s) => s.setMemo);

  const [ledgerRefresh, setLedgerRefresh] = useState(0);
  const [decisionsRefresh, setDecisionsRefresh] = useState(0);
  const [refusalState, setRefusalState] = useState<BeatJobState | null>(null);

  // Beat 2's applicant asks for exactly the base limit on a device nobody
  // shares, so the gate has nothing to object to. Beat 3's is wrong twice:
  // over the limit AND sharing a device. Both are derived from the fixture
  // data rather than hardcoded, so editing the data cannot desync the story.
  const clean = APPLICANTS.find(
    (a) =>
      a.requestedAmount <= STARTER_CARD_LIMIT &&
      APPLICANTS.filter((o) => o.device === a.device).length === 1,
  )!;
  const planted = APPLICANTS.find(
    (a) =>
      a.requestedAmount > STARTER_CARD_LIMIT &&
      APPLICANTS.filter((o) => o.device === a.device).length > 1,
  )!;

  const seeded = !!venue && !!report;
  const hint = !venue
    ? "Select a venue first."
    : !isAuthenticated
      ? "Sign in first."
      : "Run setup above first — the beats need the seeded agents and fixtures.";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Landmark className="size-5 mt-0.5 text-primary shrink-0" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Meridian Bank Singapore — a fictional issuer — runs a thin-file starter
          card with a base limit of S${STARTER_CARD_LIMIT}. A fraud agent and a
          credit agent share one venue. The credit agent cannot issue a limit
          unless the fraud agent&apos;s signals pass a policy gate: the two are not
          integrated by a model, they are joined at the execution layer, and the
          join is enforced.
        </p>
      </div>

      <HonestyPanel
        points={[
          "All data is synthetic: twelve applicants, one fictional bank. Nothing here describes a real person or a real lender.",
          "The agents are LLM components executing policy, not trained scorecards. The policy is a content-addressed operation whose output schema IS the rule.",
          "Every beat is a real job on the venue you have selected. A failure is shown as a failure, with the venue's own error string.",
          'If your venue runs auth.public.caps: "unrestricted" so seeding can write, that widens the anonymous caller only — per-agent capability scopes and the gate are still enforced per agent.',
        ]}
      />

      {!venue && (
        <p className="text-sm text-muted-foreground" data-testid="ar-no-venue">
          Select a venue to run this demo.
        </p>
      )}
      {venue && !isAuthenticated && (
        <p className="text-sm text-muted-foreground" data-testid="ar-no-auth">
          Sign in to run this demo — seeding registers agents and fixtures under
          your own identity.
        </p>
      )}

      <SetupPanel
        demoId={DEMO_ID}
        venue={venue}
        isAuthenticated={isAuthenticated}
        fields={ADDRESS_FIELDS}
        addresses={addresses}
        setAddresses={setAddresses}
        resetAddresses={reset}
        llmField="llmOperation"
        blurb={`Registers the policy, the gate, the decision operation, ${APPLICANTS.length} synthetic applications and two agents on the selected venue — under your identity. Re-running is a no-op; nothing is duplicated.`}
        teardownDescription={`Removes the demo's data subtree (${addresses.root}), the gate and issue-limit operations, and the two agents. Job records stay — they are the audit trail. The content-addressed policy asset is immutable and remains, inert.`}
        seed={async (v, onItem) => {
          const outcome = await seedAdaptiveRisk(v, addresses, onItem);
          if (outcome.ok && outcome.policyRef && outcome.policyRef !== addresses.policyAsset) {
            setAddresses({ policyAsset: outcome.policyRef });
          }
          return outcome;
        }}
        teardown={(v) => teardownAdaptiveRisk(v, addresses)}
      />

      <section aria-label="Beats">
        <ol className="flex flex-col gap-3">
          {ADAPTIVE_RISK_BEATS.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              venue={venue}
              enabled={seeded}
              disabledHint={hint}
              run={
                beat.id === "silos"
                  ? (v) => runBeat1(v, addresses)
                  : beat.id === "clean-approval"
                    ? (v) =>
                        runAssessorBeat(v, addresses, clean.id, clean.requestedAmount, clean.device)
                    : beat.id === "refusal"
                      ? (v) => {
                          setRefusalState(null);
                          return runAssessorBeat(
                            v,
                            addresses,
                            planted.id,
                            planted.requestedAmount,
                            planted.device,
                          );
                        }
                      : undefined
              }
              onSettled={
                beat.id === "silos"
                  ? () => setLedgerRefresh((t) => t + 1)
                  : beat.id === "clean-approval"
                    ? () => setDecisionsRefresh((t) => t + 1)
                    : beat.id === "refusal"
                      ? (state) => {
                          setRefusalState(state);
                          setDecisionsRefresh((t) => t + 1);
                          // Beat 4 reads this exact record back, so the id has
                          // to outlive the page.
                          if (venue && state.jobId) {
                            setMemo(DEMO_ID, venue.venueId, "refusalJobId", state.jobId);
                          }
                        }
                      : undefined
              }
            >
              {beat.id === "silos" && (
                <LedgerPanel venue={venue} addresses={addresses} refreshToken={ledgerRefresh} />
              )}
              {beat.id === "clean-approval" && (
                <DecisionsPanel
                  venue={venue}
                  addresses={addresses}
                  refreshToken={decisionsRefresh}
                />
              )}
              {beat.id === "refusal" && (
                <>
                  <RefusalPanel state={refusalState} />
                  <PolicyLinks venue={venue} addresses={addresses} />
                  <DecisionsPanel
                    venue={venue}
                    addresses={addresses}
                    refreshToken={decisionsRefresh}
                    absenceOf={planted.id}
                  />
                </>
              )}
              {beat.id === "reconstruction" && (
                <ReconstructionPanel
                  venue={venue}
                  jobId={memos?.refusalJobId ?? null}
                  label={`the ${planted.id} refusal`}
                />
              )}
            </BeatCard>
          ))}
        </ol>
      </section>
    </div>
  );
}
