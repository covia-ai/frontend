"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { listCatalogOperations, resolveOperationByAddress, type CatalogOp } from "@/lib/operations-catalog";
import { useRouter } from "next/navigation";
import { PlayCircle, Search } from "lucide-react";
import { toast } from "sonner";

function adapterOf(path: string): string {
  const parts = path.split("/");
  if (parts[0] === "v" && parts[1] === "test") return "test";
  if (parts[0] === "v" && parts[1] === "ops" && parts[2]) return parts[2];
  return parts[0] ?? "other";
}

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
  const [ops, setOps] = useState<CatalogOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAdapter, setFilterAdapter] = useState("");
  const [selectedOp, setSelectedOp] = useState<CatalogOp | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [runInput, setRunInput] = useState("{}");
  const [running, setRunning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!venue) return;
    setLoading(true);
    listCatalogOperations(venue)
      .then((list) => setOps(list))
      .catch(() => toast("Failed to load operation catalog"))
      .finally(() => setLoading(false));
  }, [venue]);

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
      toast("Input must be valid JSON");
      return;
    }
    setRunning(true);
    try {
      const op = await resolveOperationByAddress(venue, selectedOp.path);
      const res = (await op.invoke(input)) as any;
      if (res?.id) {
        setSheetOpen(false);
        router.push(`/venues/${encodeURIComponent(venue.venueId)}/jobs/${res.id}`);
      } else {
        toast("Operation returned no job ID");
      }
    } catch (e: any) {
      toast(e?.message || "Run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <ContentLayout>
      <TopBar />

      <div className="flex flex-col gap-4">
        {/* Search + adapter filter */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, path, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {adapters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={filterAdapter === "" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setFilterAdapter("")}
              >
                All
              </Button>
              {adapters.map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={filterAdapter === a ? "default" : "outline"}
                  className="h-7 text-xs font-mono"
                  onClick={() => setFilterAdapter(filterAdapter === a ? "" : a)}
                >
                  {a}
                </Button>
              ))}
            </div>
          )}
        </div>

        {!loading && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {ops.length} operations · {grouped.length} adapter
            {grouped.length !== 1 ? "s" : ""}
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Spinner variant="ellipsis" className="text-primary" size={48} />
          </div>
        )}

        {!loading &&
          grouped.map(([adapter, adapterOps]) => (
            <div key={adapter}>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                  {adapter}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {adapterOps.length} op{adapterOps.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="border border-border rounded-lg overflow-hidden mb-4">
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
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-baseline gap-3 text-left flex-1 mr-4 min-w-0">
                            <span className="font-mono text-sm font-semibold shrink-0">
                              {name}
                            </span>
                            {desc && (
                              <span className="text-xs text-muted-foreground truncate">
                                {desc}
                              </span>
                            )}
                            <span className="ml-auto font-mono text-xs text-muted-foreground hidden lg:block shrink-0">
                              {op.path}
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-4 pb-4">
                          <div className="flex flex-col gap-3">
                            <p className="font-mono text-xs text-muted-foreground">
                              {op.path}
                            </p>
                            {desc && <p className="text-sm">{desc}</p>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {inputSchema && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    Input Schema
                                  </p>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                                    {JSON.stringify(inputSchema, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {outputSchema && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    Output Schema
                                  </p>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                                    {JSON.stringify(outputSchema, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>

                            <Button
                              size="sm"
                              className="w-fit"
                              onClick={() => openRunSheet(op)}
                            >
                              <PlayCircle size={14} className="mr-1" /> Run
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          ))}

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
