"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Asset, Operation }from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { OperationCard } from "./OperationCard";
import { adapterLook } from "./operation-display";
import { PaginationHeader } from "./PaginationHeader";
import { cn } from "@/lib/utils";
import { PlayCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { listCatalogOperations } from "@/lib/operations-catalog";
import { useGridPageSize } from "@/hooks/use-grid-page-size";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { useClientPagination } from "@/hooks/use-pagination";
// A roomier grid than the shared 14rem density: operation cards now carry a
// signature block, so they need width to breathe (concept-fidelity catalogue).
const OPS_GRID_CLASS =
  "w-full grid grid-cols-[repeat(auto-fill,minmax(min(22rem,100%),1fr))] items-stretch gap-4";
import { FiltersSheet } from "./FiltersSheet";
import { ListToolbar } from "./ListToolbar";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { VenueResolutionState } from "@/components/VenueResolutionState";

interface OperationsListProps {
  venueId?: string;
}

export function OperationsList({ venueId }: OperationsListProps = {}) {
  const searchParams = useSearchParams()
  const {
    data: assetsMetadata,
    loading: isLoading,
    error: loadError,
    run: runOperationsQuery,
    reset: resetOperationsQuery,
    invalidate: invalidateOperationsQuery,
  } = useLatestQuery<Asset[]>([], { initialLoading: true });
  const router = useRouter();

  // A fixed 12 wasted whatever the window actually offered — three rows on a
  // wide screen, two on a very wide one, and no more on a tall one. Size the
  // page from the grid itself: columns it renders, times rows that fit below.
  const { ref: gridRef, pageSize: itemsPerPage } = useGridPageSize();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? "");
  const pathname = usePathname();

  const resolvedVenue = useResolvedVenueContext(venueId);
  const {
    descriptor: venueObj,
    venue,
    isAuthenticated,
  } = resolvedVenue;
  const venueStatus = resolvedVenue.status ?? (venue ? "ready" : "absent");

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  }
  // Fetches the full catalog once per venue — search text only filters
  // client-side (see filteredAssets) so typing never triggers a refetch.
  useEffect(() => {
     if (!venue || venueStatus !== "ready") {
       resetOperationsQuery();
       return invalidateOperationsQuery;
     }
     void runOperationsQuery(
       async () => {
          // Discover ops from the venue catalog (v/ops + v/test/ops), plus the
          // signed-in user's own w/ops, by path — one read per tree, no
          // per-asset round trip. Each op keeps its resolvable catalog path as
          // its id (drives the URL).
          const ops = await listCatalogOperations(venue, { includeUserOps: isAuthenticated });
          const sorted = [...ops].sort((a, b) =>
            (a.metadata?.name ?? a.path).localeCompare(b.metadata?.name ?? b.path));
          return sorted.map(op => new Operation(op.path, venue, op.metadata));
       },
       { clear: true },
     );
     return invalidateOperationsQuery;
  }, [
    venue,
    venueStatus,
    isAuthenticated,
    runOperationsQuery,
    resetOperationsQuery,
    invalidateOperationsQuery,
  ]);

  const adapterOptions = useMemo(() => {
    const names = assetsMetadata
      .map(a => (a.metadata?.operation?.adapter as string | undefined)?.split(':')[0])
      .filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  }, [assetsMetadata]);

  const keywordOptions = useMemo(() => {
    const all = assetsMetadata.flatMap(a => Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : []);
    return [...new Set(all)].sort();
  }, [assetsMetadata]);

  const tagOptions = useMemo(() => [
    // Adapter rows carry the same glyph the adapter wears as a facet pill, so a
    // pill and its sheet row read 1:1. Keywords are free-form (no concept
    // backing), so they stay icon-less rather than fall back to a generic mark.
    ...adapterOptions.map((a) => ({ value: a, label: a, groupTag: "Adapter", icon: adapterLook(a).Icon })),
    ...keywordOptions.map((k) => ({ value: k, label: k, groupTag: "Keyword" })),
  ], [adapterOptions, keywordOptions]);

  // Venue-wide, catalog-derived counts — a header that frames the whole set
  // instead of the page-scoped "showing x of y". Composite = ops built from
  // steps; Yours = the signed-in user's own w/ops.
  const stats = useMemo(() => ({
    total: assetsMetadata.length,
    adapters: adapterOptions.length,
    composite: assetsMetadata.filter((a) => {
      const steps = (a.metadata?.operation as { steps?: unknown } | undefined)?.steps;
      return Array.isArray(steps) && steps.length > 0;
    }).length,
    yours: assetsMetadata.filter((a) => (a.id ?? "").startsWith("w/ops")).length,
  }), [assetsMetadata, adapterOptions]);

  const statTiles = [
    { label: "Operations", value: stats.total },
    { label: "Adapters", value: stats.adapters },
    { label: "Composite", value: stats.composite },
    ...(isAuthenticated ? [{ label: "Yours", value: stats.yours }] : []),
  ];

  // Adapter facet chips — the most common adapters as one-click filters,
  // sharing the selectedTags state with the Filters sheet (which still holds
  // the full adapter + keyword set). Capped so the row stays a glanceable band.
  const adapterFacets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assetsMetadata) {
      const ad = (a.metadata?.operation?.adapter as string | undefined)?.split(":")[0];
      if (ad) counts.set(ad, (counts.get(ad) ?? 0) + 1);
    }
    return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12);
  }, [assetsMetadata]);

  const adapterSet = useMemo(() => new Set(adapterOptions), [adapterOptions]);
  const anyAdapterActive = selectedTags.some((t) => adapterSet.has(t));
  const toggleAdapter = (ad: string) =>
    setSelectedTags((prev) => (prev.includes(ad) ? prev.filter((t) => t !== ad) : [...prev, ad]));
  const clearAdapters = () => setSelectedTags((prev) => prev.filter((t) => !adapterSet.has(t)));
  const facetCls = (on: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      on
        ? "border-transparent bg-primary text-primary-foreground"
        : "bg-card text-muted-foreground hover:border-accent hover:text-foreground",
    );

  const filteredAssets = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    return assetsMetadata.filter(a => {
      if (selectedTags.length > 0) {
        const adapter = (a.metadata?.operation?.adapter as string | undefined)?.split(':')[0];
        const keywords: string[] = Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : [];
        if (!selectedTags.some(tag => tag === adapter || keywords.includes(tag))) return false;
      }
      if (!term) return true;
      return (a.metadata?.name ?? "").toLowerCase().includes(term)
        || (a.id ?? "").toLowerCase().includes(term)
        || (a.metadata?.description ?? "").toLowerCase().includes(term);
    });
  }, [assetsMetadata, selectedTags, searchInput]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems,
  } = useClientPagination({
    items: filteredAssets,
    pageSize: itemsPerPage,
    resetKey: `${searchInput}\u0000${selectedTags.join("\u0000")}`,
  });

  if (venueStatus !== "ready") {
     return (
      <ContentLayout>
        <TopBar venueId={venueId} venueName={venueObj?.metadata.name} />
        <VenueResolutionState
          status={venueStatus}
          error={resolvedVenue.error}
          icon={PlayCircle}
          subject="Operations"
          venueId={venueId}
        />
      </ContentLayout>
     )
  }

  return (
    <ContentLayout>
      <TopBar venueId={venueId} venueName={venueObj?.metadata.name}/>
      <div className="flex flex-col items-center justify-center">
        {!isLoading && assetsMetadata.length > 0 && (
          <div
            data-testid="operations-stats"
            className={cn(
              "mt-4 grid w-full grid-cols-2 gap-3",
              statTiles.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
            )}
          >
            {statTiles.map((t) => (
              <div key={t.label} className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div className="text-xs font-medium text-muted-foreground">{t.label}</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                  {t.value}
                </div>
              </div>
            ))}
          </div>
        )}
        <ListToolbar
          className="mt-4"
          actions={
            <>
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Type keyword to search…"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
              <FiltersSheet
                title="Filter Operations"
                description="Narrow down operations by tag."
                groups={tagOptions.length > 0 ? [{ label: "Tags", options: tagOptions, selected: selectedTags, onChange: setSelectedTags }] : []}
              />
            </>
          }
          summary={!isLoading && `Page ${currentPage} : Showing ${pageItems.length} of ${filteredAssets.length}`}
          pagination={<PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>}
        />

        {!isLoading && adapterFacets.length > 0 && (
          <div data-testid="operation-facets" className="mt-3 flex w-full flex-wrap items-center gap-2">
            <button type="button" onClick={clearAdapters} className={facetCls(!anyAdapterActive)}>
              All
              <span className={cn("font-mono text-[10px]", !anyAdapterActive ? "opacity-80" : "text-muted-foreground")}>
                {stats.total}
              </span>
            </button>
            {adapterFacets.map(([ad, count]) => {
              const on = selectedTags.includes(ad);
              const { Icon } = adapterLook(ad);
              return (
                <button key={ad} type="button" onClick={() => toggleAdapter(ad)} className={facetCls(on)}>
                  <Icon size={13} strokeWidth={1.9} />
                  {ad}
                  <span className={cn("font-mono text-[10px]", on ? "opacity-80" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {loadError && <ErrorDisplay error={loadError} className="mb-4 w-full" />}

        {isLoading ? (
          <div className="flex flex-row items-center justify-center w-full h-100">
            <Spinner variant="ellipsis" className="text-primary" size={64}/>
          </div>
        ) : (
          <div ref={gridRef} className={cn(OPS_GRID_CLASS, "mt-5")}>
            {
            pageItems.map((asset) => (
              <OperationCard key={asset.id} asset={asset} venue={venue ?? undefined} scoped={!!venueId}/>
            ))}
          </div>
        )}

        <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isLoading}></PaginationHeader>
      </div>
      
    </ContentLayout>
  );
}
