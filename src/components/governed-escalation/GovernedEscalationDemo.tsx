"use client";

import { useState } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useDemoConfig, useDemoAddresses } from "@/hooks/use-demo-config";
import { BeatCard, type BeatJobState } from "@/components/demo-kit/BeatCard";
import { SetupPanel } from "@/components/demo-kit/SetupPanel";
import { HonestyPanel } from "@/components/demo-kit/HonestyPanel";
import { ESCALATION_BEATS } from "./story";
import { ADDRESS_FIELDS, DEFAULT_ADDRESSES, GRANT_LIFETIME_DAYS } from "./fixtures";
import { seedEscalation, teardownEscalation } from "./seed";
import { runEscalation, swapToWeekTwo } from "./beats";
import { EscalationPanel } from "./EscalationPanel";

export const DEMO_ID = "governed-escalation";

// Governed Escalation makes ONE claim: when an agent reaches the edge of its
// authority the decision goes to a human, and what the human grants is a real
// expiring capability. Two beats — the escalation parks (1), the human decides
// and the job resumes (2).
export function GovernedEscalationDemo() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const { addresses, setAddresses, reset } = useDemoAddresses(DEMO_ID, DEFAULT_ADDRESSES);
  const report = useDemoConfig((s) => (venue ? s.reports[DEMO_ID]?.[venue.venueId] : undefined));
  const memos = useDemoConfig((s) => (venue ? s.memos[DEMO_ID]?.[venue.venueId] : undefined));
  const setMemo = useDemoConfig((s) => s.setMemo);

  const [askState, setAskState] = useState<BeatJobState | null>(null);
  const [analysis, setAnalysis] = useState<BeatJobState | null>(null);

  const seeded = !!venue && !!report;
  const hint = !venue
    ? "Select a venue first."
    : !isAuthenticated
      ? "Sign in first."
      : "Run setup above first — the beats need the seeded agent and cohort windows.";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Radar className="size-5 mt-0.5 text-primary shrink-0" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          A drift monitor watches a cohort metric. When it breaches its
          threshold the monitor does not change policy and does not ask another
          agent — it escalates to a person, and its work stops until that person
          decides. What they grant is a capability with a real expiry, signed
          with their own key.
        </p>
      </div>

      <HonestyPanel
        points={[
          "The cohort numbers are synthetic and the breach is scripted — Covia has no drift metric, and moving to week two is a fixture swap. The page labels it as such.",
          "Everything after the monitor reads those numbers is real: the escalation, the parked job, your answer in the Inbox, the signed capability and the resumption.",
          `The grant confers write on the reviewed-limit record for up to ${GRANT_LIFETIME_DAYS} days. It does not widen any agent's authority by itself, and applying a reviewed limit to a live policy is an operator action outside this demo.`,
          "This venue cannot root-sign a grant over a self-sovereign holder's namespace, and says so — you sign it yourself, and the venue only transports and verifies it.",
        ]}
      />

      {!venue && (
        <p className="text-sm text-muted-foreground" data-testid="ge-no-venue">
          Select a venue to run this demo.
        </p>
      )}
      {venue && !isAuthenticated && (
        <p className="text-sm text-muted-foreground" data-testid="ge-no-auth">
          Sign in to run this demo — the ask lands in your own Inbox, and only
          you can sign the grant.
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
        blurb="Registers two cohort windows, a window pointer, a copy of the venue's HITL skill and one monitor agent — under your identity. Re-running is a no-op; nothing is duplicated."
        teardownDescription={`Removes the demo's data subtree (${addresses.root}) and the monitor agent. Job records and answered Inbox entries stay — they are the audit trail, and inbox records are framework-managed and cannot be deleted.`}
        seed={(v, onItem) => seedEscalation(v, addresses, onItem)}
        teardown={(v) => teardownEscalation(v, addresses)}
      />

      <section aria-label="Beats">
        <ol className="flex flex-col gap-3">
          {ESCALATION_BEATS.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              venue={venue}
              enabled={seeded}
              disabledHint={hint}
              run={
                beat.id === "escalate"
                  ? async (v) => {
                      setAskState(null);
                      setAnalysis(null);
                      // The drift IS this fixture swap — labelled on screen,
                      // not smuggled in as a metric.
                      await swapToWeekTwo(v, addresses);
                      const { analysis: a, ask } = await runEscalation(v, addresses);
                      // Persist before returning: the viewer is about to leave
                      // for the Inbox, and React state will not survive that.
                      setMemo(DEMO_ID, v.venueId, "askJobId", ask.id);
                      setAnalysis({
                        jobId: a.id,
                        status: a.metadata?.status ?? null,
                        error: a.metadata?.error ?? null,
                        output: a.isComplete ? a.output : null,
                      });
                      return ask; // The ask is the job that parks.
                    }
                  : undefined
              }
              onSettled={beat.id === "escalate" ? (s) => setAskState(s) : undefined}
            >
              {beat.id === "decide" && (
                <EscalationPanel
                  venue={venue}
                  state={askState}
                  analysis={analysis}
                  escalation={
                    memos?.askJobId
                      ? { analysisJobId: null, askJobId: memos.askJobId }
                      : null
                  }
                />
              )}
            </BeatCard>
          ))}
        </ol>
      </section>
      <p className="text-xs text-muted-foreground">
        Looking for how the runtime refuses an agent outright, rather than
        pausing for a human? That is the{" "}
        <Link href="/demos/adaptive-risk" className="underline underline-offset-2">
          Adaptive Risk
        </Link>{" "}
        demo — a policy gate that denies before execution.
      </p>
    </div>
  );
}
