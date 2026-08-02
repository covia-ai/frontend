"use client";

import { useState } from "react";
import Link from "next/link";
import type { Venue } from "@covia/covia-sdk";
import { Hammer, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  SeedItemResult,
  useAdaptiveRiskConfig,
} from "@/hooks/use-adaptive-risk-config";
import { AdaptiveRiskAddresses } from "./fixtures";
import { seedAdaptiveRisk, teardownAdaptiveRisk } from "./seed";

// The seeding step: every address is on the table, editable, BEFORE anything
// is registered — a user can point the whole demo at operations they already
// run. Results list exactly what was created, with addresses, and failures
// carry the venue's own error string verbatim.

const ADDRESS_FIELDS: Array<{
  key: keyof AdaptiveRiskAddresses;
  label: string;
  hint?: string;
}> = [
  { key: "root", label: "Data root", hint: "applications, signals, flags, decisions, windows live under here" },
  { key: "limitGate", label: "Limit gate operation" },
  { key: "issueLimit", label: "Issue-limit operation" },
  {
    key: "policyAsset",
    label: "Policy operation (content-addressed)",
    hint: "left empty, seeding registers the starter-card policy and fills this in — or paste your own",
  },
  { key: "sentinelAgent", label: "Fraud agent id" },
  { key: "assessorAgent", label: "Credit agent id" },
  { key: "monitorAgent", label: "Drift monitor agent id" },
  { key: "llmOperation", label: "LLM provider operation", hint: "the venue needs this provider's API key in Secrets" },
  { key: "model", label: "Model", hint: "empty = provider default" },
];

export function SetupPanel({
  venue,
  isAuthenticated,
}: {
  venue: Venue | null;
  isAuthenticated: boolean;
}) {
  const { addresses, reports, setAddresses, resetAddresses, setReport } =
    useAdaptiveRiskConfig();
  const [running, setRunning] = useState<"seed" | "teardown" | null>(null);
  const [liveItems, setLiveItems] = useState<SeedItemResult[] | null>(null);

  const report = venue ? reports[venue.venueId] : undefined;
  const items = liveItems ?? report?.items ?? null;
  const canRun = !!venue && isAuthenticated && !running;

  const runSeed = async () => {
    if (!venue) return;
    setRunning("seed");
    setLiveItems([]);
    try {
      const outcome = await seedAdaptiveRisk(venue, addresses, (item) =>
        setLiveItems((prev) => [...(prev ?? []), item]),
      );
      setReport(venue.venueId, outcome.report);
      if (outcome.ok) {
        if (outcome.policyRef && outcome.policyRef !== addresses.policyAsset) {
          setAddresses({ policyAsset: outcome.policyRef });
        }
        notifySuccess("Demo seeded", {
          description: `${outcome.report.items.filter((i) => i.status === "created").length} created, ${outcome.report.items.filter((i) => i.status === "existing").length} already present.`,
        });
      } else {
        notifyError("Unable to seed the demo", new Error(outcome.report.items.at(-1)?.error ?? "seed failed"), venue.baseUrl);
      }
    } catch (err) {
      notifyError("Unable to seed the demo", err, venue.baseUrl);
    } finally {
      setLiveItems(null);
      setRunning(null);
    }
  };

  const runTeardown = async () => {
    if (!venue) return;
    setRunning("teardown");
    try {
      const result = await teardownAdaptiveRisk(venue, addresses);
      setLiveItems(result.items);
      if (result.ok) {
        setReport(venue.venueId, null);
        notifySuccess("Demo torn down", {
          description:
            "Named paths and agents removed. The content-addressed policy asset is immutable and remains, inert.",
        });
      } else {
        notifyError("Unable to tear down the demo", new Error(result.items.find((i) => i.status === "failed")?.error ?? "teardown failed"), venue.baseUrl);
      }
    } catch (err) {
      notifyError("Unable to tear down the demo", err, venue.baseUrl);
    } finally {
      setRunning(null);
    }
  };

  return (
    <section aria-label="Set up this demo" data-testid="ar-setup" className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold mb-1">Set up this demo</h3>
        <p className="text-sm text-muted-foreground">
          Seeding registers the policy, the gate, the decision operation, twelve
          synthetic applications, two cohort windows and three agents on the
          selected venue — under your identity, at the addresses below. Edit any
          address first to use operations you already run. Re-running is a
          no-op; nothing is duplicated.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" data-testid="ar-setup-form">
        {ADDRESS_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <Label htmlFor={`ar-addr-${field.key}`} className="text-xs">
              {field.label}
            </Label>
            <Input
              id={`ar-addr-${field.key}`}
              data-testid={`ar-addr-${field.key}`}
              className="font-mono text-xs"
              value={addresses[field.key]}
              disabled={!!running}
              onChange={(event) => setAddresses({ [field.key]: event.target.value })}
            />
            {field.hint && (
              <p className="text-[11px] text-muted-foreground">{field.hint}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button data-testid="ar-setup-run" onClick={runSeed} disabled={!canRun}>
          {running === "seed" ? <Spinner variant="ellipsis" /> : <Hammer className="size-4" />}
          Run setup
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAddresses} disabled={!!running}>
          <RotateCcw className="size-4" /> Reset addresses
        </Button>
        {report && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                data-testid="ar-setup-teardown"
                disabled={!canRun}
              >
                {running === "teardown" ? <Spinner variant="ellipsis" /> : <Trash2 className="size-4" />}
                Tear down
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tear down the demo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Removes the demo&apos;s data subtree ({addresses.root}), the gate and
                  issue-limit operations, and the three agents from this venue. Job
                  records stay — they are the audit trail. The content-addressed
                  policy asset is immutable and remains, inert.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runTeardown}>Tear down</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground">Sign in to run setup.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        The agents call the model through{" "}
        <code className="font-mono">{addresses.llmOperation}</code>; the venue
        needs that provider&apos;s API key —{" "}
        <Link href="/secrets" className="underline underline-offset-2">
          manage Secrets
        </Link>
        .
      </p>

      {items && items.length > 0 && (
        <ol className="flex flex-col gap-1" data-testid="ar-seed-items">
          {items.map((item, index) => (
            <li
              key={`${item.address}-${index}`}
              className="flex flex-col gap-1 rounded border px-3 py-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>{item.label}</span>
                <span className="flex items-center gap-2 min-w-0">
                  <code className="font-mono text-xs text-muted-foreground truncate max-w-64">
                    {item.address}
                  </code>
                  <Badge
                    variant={
                      item.status === "failed"
                        ? "destructive"
                        : item.status === "created"
                          ? "default"
                          : "outline"
                    }
                  >
                    {item.status}
                  </Badge>
                </span>
              </div>
              {item.error && (
                <pre
                  data-testid="ar-seed-error"
                  className="text-xs text-destructive whitespace-pre-wrap break-all bg-muted rounded p-2"
                >
                  {item.error}
                </pre>
              )}
            </li>
          ))}
        </ol>
      )}
      {report && !running && (
        <p className="text-xs text-muted-foreground" data-testid="ar-seed-summary">
          Seeded on this venue {new Date(report.seededAt).toLocaleString()}. If a
          write was refused above, the message is the venue&apos;s own — you need a
          venue you can write to (a local one works).
        </p>
      )}
    </section>
  );
}
