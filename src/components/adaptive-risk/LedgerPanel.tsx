"use client";

import { useCallback, useEffect, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyError } from "@/lib/notify";
import { AdaptiveRiskAddresses } from "./fixtures";
import { LedgerSnapshot, readLedger } from "./beats";

// The shared signal ledger, read job-free off the lattice (workspace.list /
// read — no job minted by looking). This is the beat-1 effect: the fraud
// agent wrote here, and the credit agent will read from here, without either
// knowing the other exists.
export function LedgerPanel({
  venue,
  addresses,
  refreshToken,
}: {
  venue: Venue | null;
  addresses: AdaptiveRiskAddresses;
  refreshToken: number;
}) {
  const [snapshot, setSnapshot] = useState<LedgerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!venue) return;
    setLoading(true);
    try {
      setSnapshot(await readLedger(venue, addresses));
    } catch (err) {
      notifyError("Unable to read the signal ledger", err, venue.baseUrl);
    } finally {
      setLoading(false);
    }
  }, [venue, addresses]);

  useEffect(() => {
    if (refreshToken > 0) void refresh();
  }, [refreshToken, refresh]);

  if (!snapshot) return null;

  return (
    <div className="rounded border p-3 flex flex-col gap-2" data-testid="ar-ledger">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Signal ledger{" "}
          <span className="text-muted-foreground font-normal">
            ({snapshot.signalCount} signal record{snapshot.signalCount === 1 ? "" : "s"},{" "}
            {snapshot.flags.length} flagged device{snapshot.flags.length === 1 ? "" : "s"})
          </span>
        </p>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading || !venue}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
        </Button>
      </div>
      {snapshot.signalCount > 0 && (
        <p className="text-xs text-muted-foreground font-mono break-all">
          {snapshot.signalKeys.join(" · ")}
        </p>
      )}
      {snapshot.flags.map((flag) => (
        <pre
          key={flag.device}
          data-testid={`ar-flag-${flag.device}`}
          className="text-xs whitespace-pre-wrap break-all bg-muted rounded p-2"
        >
          {`${flag.device}: ${JSON.stringify(flag.record)}`}
        </pre>
      ))}
      {snapshot.signalCount === 0 && snapshot.flags.length === 0 && (
        <p className="text-xs text-muted-foreground">Empty — run the beat above.</p>
      )}
    </div>
  );
}
