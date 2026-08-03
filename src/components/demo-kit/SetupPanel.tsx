"use client";

import { useState } from "react";
import Link from "next/link";
import type { Venue } from "@covia/covia-sdk";
import { ChevronDown, Hammer, RotateCcw, Trash2 } from "lucide-react";
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
import { useDemoConfig } from "@/hooks/use-demo-config";
import type { SeedItemResult, SeedReport } from "./seeding";

// The setup step, shared by every demo: show the addresses BEFORE registering
// anything, seed idempotently, report exactly what was created, offer a
// teardown. Only the fields a demo marks `common` are shown up front — the
// rest sit behind Advanced, because most people never repoint them.

export type AddressField = {
  key: string;
  label: string;
  hint?: string;
  /** Shown without expanding Advanced. */
  common?: boolean;
};

export function SetupPanel({
  demoId,
  venue,
  isAuthenticated,
  fields,
  addresses,
  setAddresses,
  resetAddresses,
  blurb,
  teardownDescription,
  seed,
  teardown,
  llmField,
}: {
  demoId: string;
  venue: Venue | null;
  isAuthenticated: boolean;
  fields: AddressField[];
  addresses: Record<string, string>;
  setAddresses: (patch: Record<string, string>) => void;
  resetAddresses: () => void;
  blurb: string;
  teardownDescription: string;
  seed: (venue: Venue, onItem: (i: SeedItemResult) => void) => Promise<{ report: SeedReport; ok: boolean }>;
  teardown: (venue: Venue) => Promise<{ items: SeedItemResult[]; ok: boolean }>;
  /** Address key holding the LLM provider op, for the Secrets hint. */
  llmField?: string;
}) {
  const report = useDemoConfig((s) => (venue ? s.reports[demoId]?.[venue.venueId] : undefined));
  const setReport = useDemoConfig((s) => s.setReport);
  const [running, setRunning] = useState<"seed" | "teardown" | null>(null);
  const [live, setLive] = useState<SeedItemResult[] | null>(null);
  const [advanced, setAdvanced] = useState(false);

  const items = live ?? report?.items ?? null;
  const canRun = !!venue && isAuthenticated && !running;
  const shown = fields.filter((f) => advanced || f.common);

  const runSeed = async () => {
    if (!venue) return;
    setRunning("seed");
    setLive([]);
    try {
      const outcome = await seed(venue, (item) => setLive((prev) => [...(prev ?? []), item]));
      setReport(demoId, venue.venueId, outcome.report);
      if (outcome.ok) {
        const created = outcome.report.items.filter((i) => i.status === "created").length;
        notifySuccess("Demo seeded", {
          description: `${created} created, ${outcome.report.items.length - created} already present.`,
        });
      } else {
        const failure = outcome.report.items.find((i) => i.status === "failed");
        notifyError("Unable to seed the demo", new Error(failure?.error ?? "seed failed"), venue.baseUrl);
      }
    } catch (err) {
      notifyError("Unable to seed the demo", err, venue.baseUrl);
    } finally {
      setLive(null);
      setRunning(null);
    }
  };

  const runTeardown = async () => {
    if (!venue) return;
    setRunning("teardown");
    try {
      const result = await teardown(venue);
      setLive(result.items);
      if (result.ok) {
        setReport(demoId, venue.venueId, null);
        notifySuccess("Demo torn down", { description: teardownDescription });
      } else {
        const failure = result.items.find((i) => i.status === "failed");
        notifyError("Unable to tear down the demo", new Error(failure?.error ?? "teardown failed"), venue.baseUrl);
      }
    } catch (err) {
      notifyError("Unable to tear down the demo", err, venue.baseUrl);
    } finally {
      setRunning(null);
    }
  };

  return (
    <section aria-label="Set up this demo" data-testid="demo-setup" className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold mb-1">Set up this demo</h3>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" data-testid="demo-setup-form">
        {shown.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <Label htmlFor={`addr-${field.key}`} className="text-xs">{field.label}</Label>
            <Input
              id={`addr-${field.key}`}
              data-testid={`addr-${field.key}`}
              className="font-mono text-xs"
              value={addresses[field.key] ?? ""}
              disabled={!!running}
              onChange={(e) => setAddresses({ [field.key]: e.target.value })}
            />
            {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
          </div>
        ))}
      </div>

      {fields.some((f) => !f.common) && (
        <button
          type="button"
          data-testid="demo-setup-advanced"
          onClick={() => setAdvanced((v) => !v)}
          className="self-start text-xs text-muted-foreground inline-flex items-center gap-1 underline underline-offset-2"
        >
          <ChevronDown className={advanced ? "size-3 rotate-180 transition-transform" : "size-3 transition-transform"} />
          {advanced ? "Hide" : "Show"} every address ({fields.length}) — point the demo at operations you already run
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button data-testid="demo-setup-run" onClick={runSeed} disabled={!canRun}>
          {running === "seed" ? <Spinner variant="ellipsis" /> : <Hammer className="size-4" />}
          Run setup
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAddresses} disabled={!!running}>
          <RotateCcw className="size-4" /> Reset addresses
        </Button>
        {report && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="demo-setup-teardown" disabled={!canRun}>
                {running === "teardown" ? <Spinner variant="ellipsis" /> : <Trash2 className="size-4" />}
                Tear down
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tear down the demo?</AlertDialogTitle>
                <AlertDialogDescription>{teardownDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runTeardown}>Tear down</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {!isAuthenticated && <p className="text-xs text-muted-foreground">Sign in to run setup.</p>}
      </div>

      {llmField && addresses[llmField] && (
        <p className="text-xs text-muted-foreground">
          The agents call the model through <code className="font-mono">{addresses[llmField]}</code>; the venue needs
          that provider&apos;s API key — <Link href="/secrets" className="underline underline-offset-2">manage Secrets</Link>.
        </p>
      )}

      {items && items.length > 0 && (
        <ol className="flex flex-col gap-1" data-testid="demo-seed-items">
          {items.map((item, i) => (
            <li key={`${item.address}-${i}`} className="flex flex-col gap-1 rounded border px-3 py-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>{item.label}</span>
                <span className="flex items-center gap-2 min-w-0">
                  <code className="font-mono text-xs text-muted-foreground truncate max-w-64">{item.address}</code>
                  <Badge variant={item.status === "failed" ? "destructive" : item.status === "created" ? "default" : "outline"}>
                    {item.status}
                  </Badge>
                </span>
              </div>
              {item.error && (
                <pre data-testid="demo-seed-error" className="text-xs text-destructive whitespace-pre-wrap break-all bg-muted rounded p-2">
                  {item.error}
                </pre>
              )}
            </li>
          ))}
        </ol>
      )}
      {report && !running && (
        <p className="text-xs text-muted-foreground" data-testid="demo-seed-summary">
          Seeded on this venue {new Date(report.seededAt).toLocaleString()}. If a write was refused above, the message is
          the venue&apos;s own — you need a venue you can write to (a local one works).
        </p>
      )}
    </section>
  );
}
