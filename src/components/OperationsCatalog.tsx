"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useVenueAccess } from "@/hooks/use-venue-access";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { ChromeSignInButton } from "@/components/admin-panel/signin-button";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { adapterOf, listCatalogOperations, resolveOperationByAddress, type CatalogOp } from "@/lib/operations-catalog";
import { PlayCircle, RefreshCw, Search } from "lucide-react";
import { notifyError, notifyWarning } from "@/lib/notify";
import { useJobExecution } from "@/hooks/use-job-execution";

function defaultsFromSchema(schema: any): string {
  const props = schema?.properties;
  if (!props) return "{}";
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(props as Record<string, any>)) {
    if (v.default !== undefined) out[k] = v.default;
    else if (v.type === "string") out[k] = "";
    else if (v.type === "number") out[k] = 0;
    else if (v.type === "boolean") out[k] = false;
    else out[k] = null;
  }
  return JSON.stringify(out, null, 2);
}

export function OperationsCatalog() {
  const venue = useAuthenticatedVenue();
  const isAuthenticated = useIsAuthenticated();
  const access = useVenueAccess(venue?.baseUrl, venue?.venueId);
  const canRead = access.state === "connected" || access.state === "public";
  const needsAuth =
    access.state === "signed-out" || access.state === "auth-rejected" || access.state === "auth-unverified";
  // Bumped by the refresh control so ops registered after page load show up
  // without a reload — the catalog is otherwise fetched once per venue.
  const [refreshTick, setRefreshTick] = useState(0);
  const [ops, setOps] = useState<CatalogOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAdapter, setFilterAdapter] = useState("");
  const [selectedOp, setSelectedOp] = useState<CatalogOp | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [runInput, setRunInput] = useState("{}");
  const { execute: executeJob, running } = useJobExecution(venue);

  useEffect(() => {
    if (!venue || !canRead) {
      setOps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listCatalogOperations(venue, { includeUserOps: isAuthenticated })
      .then((list) => setOps(list))
      .catch((err) => notifyError("Unable to load operation catalog", err, venue.baseUrl))
      .finally(() => setLoading(false));
  }, [venue, canRead, isAuthenticated, refreshTick]);

  const adapters = useMemo(
    () => Array.from(new Set(ops.map((op) => adapterOf(op.path)))).sort(),
    [ops]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return ops.filter((op) => {
      const matchSearch =
        !term ||
        op.path.toLowerCase().includes(term) ||
        (op.metadata?.name ?? "").toLowerCase().includes(term) ||
        (op.metadata?.description ?? "").toLowerCase().includes(term);
      const matchAdapter = !filterAdapter || adapterOf(op.path) === filterAdapter;
      return matchSearch && matchAdapter;
    });
  }, [ops, search, filterAdapter]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogOp[]>();
    for (const op of filtered) {
      const a = adapterOf(op.path);
      if (!map.has(a)) map.set(a, []);
      map.get(a)!.push(op);
    }
    for (const list of map.values()) list.sort((a, b) => a.path.localeCompare(b.path));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function openRunSheet(op: CatalogOp) {
    setSelectedOp(op);
    setRunInput(defaultsFromSchema(op.metadata?.operation?.input));
    setSheetOpen(true);
  }

  async function handleRun() {
    if (!venue || !selectedOp) return;
    let input: any;
    try {
      input = JSON.parse(runInput);
    } catch {
      notifyWarning("Input must be valid JSON");
      return;
    }
    await executeJob({
      failureTitle: "Unable to run operation",
      onSuccess: () => setSheetOpen(false),
      action: async () => {
      const op = await resolveOperationByAddress(venue, selectedOp.path);
        return op.invoke(input);
      },
    });
  }

  if (venue && needsAuth) {
    return (
      <ContentLayout>
        <TopBar />
        <div
          className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-8 text-center"
          data-testid="operations-catalog-auth-required"
        >
          <Lock size={40} className="text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Sign in to view operations</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This venue doesn&apos;t allow anonymous reads. Sign in with an account this venue admits to see its operation catalog.
            </p>
          </div>
          <ChromeSignInButton venueId={venue.venueId} />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <TopBar />

      <div className="flex flex-col gap-4">
        {/* Search + adapter dropdown — one line */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search operations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={filterAdapter || "_all_"}
            onValueChange={(v) => setFilterAdapter(v === "_all_" ? "" : v)}
          >
            <SelectTrigger className="w-44 shrink-0">
              <SelectValue placeholder="All adapters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All adapters</SelectItem>
              {adapters.map((a) => (
                <SelectItem key={a} value={a} className="font-mono">{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loading && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} ops · {grouped.length} adapters
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                data-testid="refresh-catalog"
                aria-label="Refresh operation catalog"
                disabled={loading}
                onClick={() => setRefreshTick((t) => t + 1)}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : undefined} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh operation catalog</TooltipContent>
          </Tooltip>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Spinner variant="ellipsis" className="text-primary" size={48} />
          </div>
        )}

        {!loading && (
          // Outer accordion — groups collapsed when "All", open when a specific adapter is selected
          <Accordion
            type="multiple"
            key={filterAdapter}
            defaultValue={filterAdapter ? [filterAdapter] : []}
            className="flex flex-col gap-3"
          >
            {grouped.map(([adapter, adapterOps]) => (
              <AccordionItem
                key={adapter}
                value={adapter}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Group header — clicking expands/collapses the whole adapter group */}
                <AccordionTrigger className="px-4 py-2.5 bg-muted/50 hover:bg-muted/70 hover:no-underline border-b border-border data-[state=closed]:border-b-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs px-2 py-0">
                      {adapter}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {adapterOps.length} op{adapterOps.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </AccordionTrigger>

                {/* Operations list for this adapter */}
                <AccordionContent className="p-0">
                  <Accordion type="multiple">
                    {adapterOps.map((op) => {
                      const name =
                        op.metadata?.name ?? op.path.split("/").pop() ?? op.path;
                      const desc = op.metadata?.description ?? "";
                      const inputSchema = op.metadata?.operation?.input;
                      const outputSchema = op.metadata?.operation?.output;

                      return (
                        <AccordionItem
                          key={op.path}
                          value={op.path}
                          className="border-b last:border-b-0"
                        >
                          <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-muted/40">
                            <span className="font-mono text-sm font-medium text-left flex-1 mr-4">{name}</span>
                          </AccordionTrigger>

                          <AccordionContent className="px-4 pb-4 border-t border-border/50">
                            <div className="flex items-center justify-between gap-2 pt-3 pb-2">
                              <p className="font-mono text-xs text-muted-foreground">{op.path}</p>
                              <Button size="sm" className="shrink-0" onClick={() => openRunSheet(op)}>
                                <PlayCircle size={13} className="mr-1" /> Run
                              </Button>
                            </div>

                            {desc && (
                              <p className="text-sm text-muted-foreground mb-3">{desc}</p>
                            )}

                            {(inputSchema || outputSchema) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {inputSchema && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Input</p>
                                    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                                      {JSON.stringify(inputSchema, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {outputSchema && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Output</p>
                                    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                                      {JSON.stringify(outputSchema, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <PlayCircle size={40} />
            <p className="text-sm">
              {ops.length === 0
                ? "No operations found — connect to a venue first."
                : "No operations match the current filter."}
            </p>
          </div>
        )}
      </div>

      {/* Run sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-mono text-sm break-all">
              {selectedOp?.metadata?.name ?? selectedOp?.path}
            </SheetTitle>
            <SheetDescription className="font-mono text-xs">
              {selectedOp?.path}
            </SheetDescription>
            {selectedOp?.metadata?.description && (
              <p className="text-sm text-foreground pt-1">
                {selectedOp.metadata.description}
              </p>
            )}
          </SheetHeader>

          <div className="flex flex-col gap-3 px-4 flex-1">
            {selectedOp?.metadata?.operation?.input && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Input Schema
                </p>
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                  {JSON.stringify(selectedOp.metadata.operation.input, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                Input (JSON)
              </p>
              <Textarea
                className="font-mono text-xs"
                rows={12}
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder="{}"
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={handleRun}
              disabled={running || !venue}
              className="w-full"
            >
              {running ? "Running…" : "Run"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </ContentLayout>
  );
}
