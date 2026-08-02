"use client";

import { useState } from "react";
import { Landmark, ShieldAlert } from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useAdaptiveRiskConfig } from "@/hooks/use-adaptive-risk-config";
import { ADAPTIVE_RISK_BEATS } from "./story";
import { SetupPanel } from "./SetupPanel";
import { BeatCard } from "./BeatCard";
import { LedgerPanel } from "./LedgerPanel";
import { DecisionsPanel } from "./DecisionsPanel";
import { runBeat1, runAssessorBeat } from "./beats";
import { APPLICANTS, STARTER_CARD_LIMIT } from "./fixtures";

// Adaptive Risk: a guided walkthrough over real venue calls. Fictional issuer
// Meridian Bank Singapore, thin-file starter card, base limit S$500, twelve
// synthetic applicants. Three agents and one gate, created by the seeding
// step; every beat runs a real job on the selected venue and renders the real
// record — a failed call is shown as a failure, never animated over.
export function AdaptiveRiskDemo() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const { addresses, reports } = useAdaptiveRiskConfig();
  const [ledgerRefresh, setLedgerRefresh] = useState(0);
  const [decisionsRefresh, setDecisionsRefresh] = useState(0);

  // Beat 2's clean applicant: asks for exactly the base limit on a device
  // nobody else shares, so the gate has nothing to object to.
  const clean = APPLICANTS.find(
    (a) =>
      a.requestedAmount <= STARTER_CARD_LIMIT &&
      APPLICANTS.filter((other) => other.device === a.device).length === 1,
  )!;

  const seeded = !!venue && !!reports[venue.venueId];
  const beatHint = !venue
    ? "Select a venue first."
    : !isAuthenticated
      ? "Sign in first."
      : "Run setup above first — the beats need the seeded agents and fixtures.";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <ScenarioIntro />
      <HonestyPanel />

      {!venue && (
        <p className="text-sm text-muted-foreground" data-testid="ar-no-venue">
          Select a venue to run this demo.
        </p>
      )}
      {venue && !isAuthenticated && (
        <p className="text-sm text-muted-foreground" data-testid="ar-no-auth">
          Sign in to run this demo — seeding registers agents and fixtures under
          your own identity, and the Inbox beat needs you to answer as yourself.
        </p>
      )}

      <SetupPanel venue={venue} isAuthenticated={isAuthenticated} />

      <section aria-label="Beats" className="flex flex-col gap-3">
        <ol className="flex flex-col gap-3">
          {ADAPTIVE_RISK_BEATS.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              venue={venue}
              enabled={seeded}
              disabledHint={beatHint}
              run={
                beat.id === "silos"
                  ? (v) => runBeat1(v, addresses)
                  : beat.id === "clean-approval"
                    ? (v) =>
                        runAssessorBeat(
                          v,
                          addresses,
                          clean.id,
                          clean.requestedAmount,
                          clean.device,
                        )
                    : undefined
              }
              onSettled={
                beat.id === "silos"
                  ? () => setLedgerRefresh((token) => token + 1)
                  : beat.id === "clean-approval"
                    ? () => setDecisionsRefresh((token) => token + 1)
                    : undefined
              }
            >
              {beat.id === "silos" && (
                <LedgerPanel
                  venue={venue}
                  addresses={addresses}
                  refreshToken={ledgerRefresh}
                />
              )}
              {beat.id === "clean-approval" && (
                <DecisionsPanel
                  venue={venue}
                  addresses={addresses}
                  refreshToken={decisionsRefresh}
                />
              )}
            </BeatCard>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ScenarioIntro() {
  return (
    <div className="flex items-start gap-3">
      <Landmark className="size-5 mt-0.5 text-primary shrink-0" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Meridian Bank Singapore — a fictional issuer — runs a thin-file starter
        card with a base limit of S$500. A fraud agent, a credit agent and a
        drift monitor share one venue. The credit agent cannot issue a limit
        unless the fraud agent&apos;s signals pass a policy gate: the two are not
        integrated by a model, they are joined at the execution layer, and the
        join is enforced.
      </p>
    </div>
  );
}

// The honesty panel is a permanent part of the page, not a dismissible note:
// a reviewer who catches an unlabelled simulation discards everything else.
function HonestyPanel() {
  return (
    <aside
      role="note"
      aria-label="What is real in this demo"
      data-testid="ar-honesty"
      className="rounded-lg border bg-muted/40 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">What is real here, and what is not</h3>
      </div>
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li>
          All data is synthetic: twelve applicants, one fictional bank. Nothing
          here describes a real person or a real lender.
        </li>
        <li>
          Covia has no training loop, model registry or drift metric. The drift
          event in beat 4 is a fixture swap and the threshold breach is
          scripted. The escalation, the ask, the approval, the minted grant and
          the resumed job are real venue operations.
        </li>
        <li>
          The agents are LLM components executing policy, not trained
          scorecards.
        </li>
        <li>
          If your venue runs <code className="font-mono text-xs">auth.public.caps: &quot;unrestricted&quot;</code>{" "}
          so seeding can write, that widens the anonymous caller only —
          per-agent capability scopes, the gate and the grants in this demo are
          still enforced per agent.
        </li>
      </ul>
    </aside>
  );
}
