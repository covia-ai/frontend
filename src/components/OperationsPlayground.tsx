"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { OperationRunResult } from "@/components/execution/OperationRunResult";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useStoredValue } from "@/hooks/use-stored-value";
import { resolveOperationByAddress } from "@/lib/operations-catalog";
import { notifyError } from "@/lib/notify";

type PlaygroundTab = "schema" | "json" | "test";

type OpDef = {
  value: string;
  label: string;
  address: string;
  placeholder: unknown;
};

// Deliberately narrower than the server's full set (schema/validate-all,
// json/assoc, json/cond, test/ops/pause exist too) — wave-1 scope for #159
// dropped those explicitly.
const TAB_OPS: Record<PlaygroundTab, OpDef[]> = {
  schema: [
    { value: "infer", label: "Infer", address: "v/ops/schema/infer", placeholder: { value: { hello: "world" } } },
    { value: "validate", label: "Validate", address: "v/ops/schema/validate", placeholder: { schema: { type: "string" }, value: "hello" } },
    { value: "coerce", label: "Coerce", address: "v/ops/schema/coerce", placeholder: { schema: { type: "number" }, value: "42" } },
  ],
  json: [
    { value: "merge", label: "Merge", address: "v/ops/json/merge", placeholder: { values: [{ a: 1 }, { b: 2 }] } },
    { value: "select", label: "Select", address: "v/ops/json/select", placeholder: { key: "a", cases: { a: 1, b: 2 }, default: null } },
  ],
  test: [
    { value: "echo", label: "Echo", address: "v/test/ops/echo", placeholder: { message: "hello" } },
    { value: "delay", label: "Delay", address: "v/test/ops/delay", placeholder: { operation: "v/test/ops/echo", delay: 1000, input: { message: "hello" } } },
    { value: "error", label: "Error", address: "v/test/ops/error", placeholder: {} },
  ],
};

const TAB_LABELS: Record<PlaygroundTab, string> = { schema: "Schema", json: "JSON", test: "Test ops" };
const TABS = Object.keys(TAB_OPS) as PlaygroundTab[];

function isPlaygroundTab(value: string | null): value is PlaygroundTab {
  return value === "schema" || value === "json" || value === "test";
}

function findOp(tab: PlaygroundTab, opValue: string): OpDef {
  return TAB_OPS[tab].find((op) => op.value === opValue) ?? TAB_OPS[tab][0];
}

type PlaygroundState = { tab: PlaygroundTab; opValue: string; inputText: string };

const placeholderText = (tab: PlaygroundTab, opValue: string) =>
  JSON.stringify(findOp(tab, opValue).placeholder, null, 2);

/** The tab, operation and input a shared link carries; defaults without one. */
function restoreFromSearch(search: string | undefined): PlaygroundState {
  const params = new URLSearchParams(search ?? "");
  const tab = isPlaygroundTab(params.get("tab")) ? (params.get("tab") as PlaygroundTab) : "schema";
  const urlOp = params.get("op");
  const opValue = urlOp && TAB_OPS[tab].some((op) => op.value === urlOp) ? urlOp : TAB_OPS[tab][0].value;
  let inputText = placeholderText(tab, opValue);
  const urlInput = params.get("input");
  if (urlInput) {
    try {
      inputText = JSON.stringify(JSON.parse(urlInput), null, 2);
    } catch {
      // Fall back to the sub-op's placeholder rather than a broken link.
    }
  }
  return { tab, opValue, inputText };
}

const readSearch = () => window.location.search;

export function OperationsPlayground() {
  // The share link's state, read as the browser state it is: undefined on the
  // server and during hydration, then the query string. window.location rather
  // than useSearchParams keeps this route static — same rationale as JobList's
  // ?tab= restore.
  const [search] = useStoredValue(readSearch);
  const restored = useMemo(() => restoreFromSearch(search), [search]);

  // Until the URL is known the form runs on defaults; once it is, the form
  // remounts seeded from the link — once, at hydration, before anything can
  // have been typed. Later URL writes come from the form itself.
  return (
    <PlaygroundForm
      key={search === undefined ? "defaults" : "restored"}
      initial={restored}
      hydrated={search !== undefined}
    />
  );
}

function PlaygroundForm({ initial, hydrated }: { initial: PlaygroundState; hydrated: boolean }) {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const pathname = usePathname();

  const [tab, setTab] = useState<PlaygroundTab>(initial.tab);
  const [opValue, setOpValue] = useState<string>(initial.opValue);
  const [inputText, setInputText] = useState<string>(initial.inputText);
  const [inputError, setInputError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [invoking, setInvoking] = useState(false);

  function writeUrl(nextTab: PlaygroundTab, nextOp: string, nextInputText: string) {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    params.set("op", nextOp);
    try {
      params.set("input", JSON.stringify(JSON.parse(nextInputText)));
    } catch {
      // Leave the input param off rather than share unparseable JSON.
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleTabChange(nextTabValue: string) {
    if (!isPlaygroundTab(nextTabValue)) return;
    const nextOp = TAB_OPS[nextTabValue][0];
    const nextInputText = placeholderText(nextTabValue, nextOp.value);
    setTab(nextTabValue);
    setOpValue(nextOp.value);
    setInputText(nextInputText);
    setInputError(null);
    setJobId(null);
    if (hydrated) writeUrl(nextTabValue, nextOp.value, nextInputText);
  }

  function handleOpChange(nextOpValue: string) {
    const nextInputText = placeholderText(tab, nextOpValue);
    setOpValue(nextOpValue);
    setInputText(nextInputText);
    setInputError(null);
    setJobId(null);
    if (hydrated) writeUrl(tab, nextOpValue, nextInputText);
  }

  async function handleRun() {
    if (!venue || !isAuthenticated) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(inputText);
    } catch (err) {
      setInputError(err instanceof Error ? err.message : "Invalid JSON");
      return;
    }
    setInputError(null);
    setInvoking(true);
    setJobId(null);
    const op = findOp(tab, opValue);
    try {
      const operation = await resolveOperationByAddress(venue, op.address);
      const job = await operation.invoke(parsed as Record<string, unknown>);
      setJobId(job.id);
      writeUrl(tab, opValue, inputText);
    } catch (err) {
      notifyError(`Unable to run ${op.label}`, err);
    } finally {
      setInvoking(false);
    }
  }

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-2" size="sm" align="left" text="Operations" highlight="playground" />
        <p className="text-sm text-muted-foreground mb-6">
          Run built-in schema, JSON and test operations directly against the current venue.
        </p>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            {/* Locked while a run is being submitted, like the operation picker
                below: switching clears the result pane, and the in-flight
                invoke would then fill it under the wrong operation. */}
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} disabled={invoking}>{TAB_LABELS[t]}</TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t} value={t}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Select value={opValue} onValueChange={handleOpChange} disabled={invoking}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAB_OPS[t].map((op) => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                      data-testid="playground-input"
                    />
                    {inputError && <ErrorDisplay error={inputError} />}
                    {isAuthenticated ? (
                      <Button onClick={() => void handleRun()} disabled={!venue || invoking} data-testid="playground-run">
                        {invoking ? "Running…" : "Run"}
                      </Button>
                    ) : (
                      <Button variant="outline" disabled className="gap-2 text-muted-foreground">
                        <Lock size={14} />
                        Sign in to run operations
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card className="min-h-[240px]">
                  <CardContent className="pt-6">
                    {jobId && venue ? (
                      <OperationRunResult jobId={jobId} venueId={venue.venueId} />
                    ) : (
                      <p className="text-sm text-muted-foreground">Run an operation to see the result here.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </ContentLayout>
  );
}
