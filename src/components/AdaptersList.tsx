"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AdapterInfo } from "@covia/covia-sdk";
import { useResolvedVenue } from "@/hooks/use-resolved-venue";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Plug, Search } from "lucide-react";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

type SortCol = "name" | "ops";

interface AdaptersListProps {
  venueId: string;
}

export function AdaptersList({ venueId }: AdaptersListProps) {
  const venue = useResolvedVenue(venueId);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "name", dir: "asc" });
  // Single-expand, like the accordion this replaced — only one adapter's
  // operations are shown at a time.
  const [expandedAdapter, setExpandedAdapter] = useState<string | null>(null);
  const router = useRouter();

  const toggleSort = (col: SortCol) =>
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));

  useEffect(() => {
    if (!venue) return;
    let ignore = false;
    setLoading(true);
    // Job-free: reads straight from the lattice (v/info/adapters), so it
    // includes adapters with zero catalog operations — unlike inferring
    // adapter names from metadata.operation.adapter on the operations list.
    venue.adapters
      .list()
      .then((result) => { if (!ignore) setAdapters(result); })
      .catch((err) => {
        if (!ignore) {
          notifyError("Unable to load adapters", err, venue.baseUrl);
          setAdapters([]);
        }
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [venue]);

  const filteredAdapters = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? adapters.filter(
          (a) =>
            a.name.toLowerCase().includes(term) ||
            (a.description ?? "").toLowerCase().includes(term)
        )
      : adapters;
    const dirMul = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) =>
      sort.col === "name"
        ? a.name.localeCompare(b.name) * dirMul
        : (a.operations.length - b.operations.length) * dirMul
    );
  }, [adapters, search, sort]);

  const goToOperation = (path: string) => {
    if (!venue) return;
    const segments = path.split("/").map(encodeURIComponent).join("/");
    router.push(`/venues/${encodeURIComponent(venue.venueId)}/operations/${segments}`);
  };

  return (
    <ContentLayout>
      <TopBar venueName={venue?.metadata.name} />

      <div className="flex flex-col gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-vlight p-3 rounded-lg">
                <Plug size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-thin">Adapters</h1>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Loading…" : `${adapters.length} adapter${adapters.length !== 1 ? "s" : ""} registered`}
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter adapters…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </Card>

        <Card>
          {/* px-2 lines up with the table's own TableCell padding below,
              instead of the Card default's wider px-6 pushing the title
              in further than the table content it labels. */}
          <CardHeader className="px-2">
            <CardTitle className="text-base font-medium">Adapter Catalog</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Spinner variant="ellipsis" className="text-primary" size={48} />
              </div>
            )}

            {!loading && filteredAdapters.length === 0 && (
              <p className="text-sm text-muted-foreground px-6 py-10 text-center">
                {adapters.length === 0 ? "No adapters registered on this venue." : "No adapters match your filter."}
              </p>
            )}

            {!loading && filteredAdapters.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary hover:bg-secondary text-secondary-foreground">
                    <TableCell className="text-left">
                      <button
                        onClick={() => toggleSort("name")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Adapter
                        {sort.col === "name" ? (
                          sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-left">Description</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => toggleSort("ops")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                      >
                        Operations
                        {sort.col === "ops" ? (
                          sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdapters.map((adapter) => {
                    const isExpanded = expandedAdapter === adapter.name;
                    return (
                      <Fragment key={adapter.name}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedAdapter(isExpanded ? null : adapter.name)
                          }
                        >
                          <TableCell className="font-mono font-semibold whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <ChevronRight
                                size={14}
                                className={cn(
                                  "shrink-0 text-muted-foreground transition-transform",
                                  isExpanded && "rotate-90",
                                )}
                              />
                              {adapter.name}
                            </span>
                          </TableCell>
                          <TableCell
                            className="max-w-0 w-full truncate text-muted-foreground"
                            title={adapter.description}
                          >
                            {adapter.description}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Badge variant="outline">
                              {adapter.operations.length} op{adapter.operations.length !== 1 ? "s" : ""}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableCell colSpan={3} className="whitespace-normal py-3">
                              {adapter.operations.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No catalog operations for this adapter.
                                </p>
                              ) : (
                                <ul className="flex flex-col gap-1">
                                  {adapter.operations.map((path) => (
                                    <li key={path}>
                                      <button
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          goToOperation(path);
                                        }}
                                        className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline text-left"
                                      >
                                        {path}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
