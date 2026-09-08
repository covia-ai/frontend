"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { RunStatus } from "@covia/covia-sdk";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { PageHeading } from "@/components/PageHeading";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { ExecutionDataTable } from "@/components/execution/ExecutionDataTable";
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
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useExecutionLifecycle } from "@/hooks/use-execution-lifecycle";
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

export function OperationsPlayground() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const pathname = usePathname();

  const [tab, setTab] = useState<PlaygroundTab>("schema");
  const [opValue, setOpValue] = useState<string>(TAB_OPS.schema[0].value);
  const [inputText, setInputText] = useState<string>(() => JSON.stringify(TAB_OPS.schema[0].placeholder, null, 2));
  const [inputError, setInputError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore tab/op/input from a shared link once on mount. Reading
  // window.location directly rather than useSearchParams keeps this route
  // static — same rationale as JobList's ?tab= restore.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restoredTab = isPlaygroundTab(params.get("tab")) ? (params.get("tab") as PlaygroundTab) : "schema";
    const urlOp = params.get("op");
    const restoredOp = urlOp && TAB_OPS[restoredTab].some((op) => op.value === urlOp)
      ? urlOp
      : TAB_OPS[restoredTab][0].value;
    const urlInput = params.get("input");
    let restoredInputText = JSON.stringify(findOp(restoredTab, restoredOp).placeholder, null, 2);
    if (urlInput) {
      try {
        restoredInputText = JSON.stringify(JSON.parse(urlInput), null, 2);
      } catch {
        // Fall back to the sub-op's placeholder rather than a broken link.
      }
    }
    setTab(restoredTab);
    setOpValue(restoredOp);
    setInputText(restoredInputText);
    setHydrated(true);
  }, []);

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
    const nextInputText = JSON.stringify(nextOp.placeholder, null, 2);
    setTab(nextTabValue);
    setOpValue(nextOp.value);
    setInputText(nextInputText);
    setInputError(null);
    setJobId(null);
    if (hydrated) writeUrl(nextTabValue, nextOp.value, nextInputText);
  }

  function handleOpChange(nextOpValue: string) {
    const nextOp = findOp(tab, nextOpValue);
    const nextInputText = JSON.stringify(nextOp.placeholder, null, 2);
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
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t}>{TAB_LABELS[t]}</TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t} value={t}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Select value={opValue} onValueChange={handleOpChange}>
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
                      <Button onClick={() => void handleRun()} disabled={!venue || invoking}>
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
                      <PlaygroundResult jobId={jobId} venueId={venue.venueId} />
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

// A trimmed-down sibling of ExecutionViewer's job-detail rendering — reuses
// the same lifecycle hook (polling/streaming) but skips ExecutionViewer's
// own TopBar/ExecutionHeader chrome, which assumes it owns the whole page
// rather than sitting inline in a split pane.
function PlaygroundResult({ jobId, venueId }: { jobId: string; venueId: string }) {
  const execution = useExecutionLifecycle({ jobId, venueId });
  const { job, operationAsset, loading, error, streaming } = execution;

  if (loading) {
    return (
      <div className="flex h-32 w-full items-center justify-center">
        <Spinner variant="ellipsis" className="text-primary" size={32} />
      </div>
    );
  }
  if (error) return <ErrorDisplay error={error} />;
  if (!job) return null;

  const operationSchema = operationAsset?.metadata?.operation;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StatusBadge status={job.status} kind="job" />
        {streaming && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Streaming
          </span>
        )}
      </div>

      {job.status === RunStatus.FAILED && job.error ? (
        <ErrorDisplay error={job.error} />
      ) : (
        <ExecutionDataTable value={job.output} schema={operationSchema?.output} direction="output" />
      )}
    </div>
  );
}
