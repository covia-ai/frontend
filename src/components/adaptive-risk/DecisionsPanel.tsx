"use client";

import { useCallback, useEffect, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyError } from "@/lib/notify";
import { AdaptiveRiskAddresses } from "./fixtures";
import { DecisionSnapshot, readDecisions } from "./beats";

// The decision ledger, read job-free. Beat 2 proves the gate is not merely a
// blocker (a clean case flows through it to a written decision); beat 3 uses
// the same panel to prove the opposite — the refused applicant is absent.
export function DecisionsPanel({
  venue,
  addresses,
  refreshToken,
  absenceOf,
}: {
  venue: Venue | null;
  addresses: AdaptiveRiskAddresses;
  refreshToken: number;
  /** When set, call out that this applicant has NO decision record. */
  absenceOf?: string;
}) {
  const [snapshot, setSnapshot] = useState<DecisionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!venue) return;
    setLoading(true);
    try {
      setSnapshot(await readDecisions(venue, addresses));
    } catch (err) {
      notifyError("Unable to read the decision ledger", err, venue.baseUrl);
    } finally {
      setLoading(false);
    }
  }, [venue, addresses]);

  useEffect(() => {
    if (refreshToken > 0) void refresh();
  }, [refreshToken, refresh]);

  if (!snapshot) return null;

  const missing = absenceOf && !snapshot.applicants.includes(absenceOf);

  return (
    <div className="rounded border p-3 flex flex-col gap-2" data-testid="ar-decisions">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Decision ledger{" "}
          <span className="text-muted-foreground font-normal">
            ({snapshot.applicants.length} decision
            {snapshot.applicants.length === 1 ? "" : "s"})
          </span>
        </p>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading || !venue}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
        </Button>
      </div>
      {snapshot.records.map((entry) => (
        <pre
          key={entry.applicant}
          data-testid={`ar-decision-${entry.applicant}`}
          className="text-xs whitespace-pre-wrap break-all bg-muted rounded p-2"
        >
          {JSON.stringify(entry.record)}
        </pre>
      ))}
      {snapshot.applicants.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Empty — no decision has been written.
        </p>
      )}
      {absenceOf && (
        <p
          className={missing ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
          data-testid="ar-decisions-absence"
        >
          {missing
            ? `No decision record exists for ${absenceOf} — the write never happened.`
            : `A decision record exists for ${absenceOf}.`}
        </p>
      )}
    </div>
  );
}
