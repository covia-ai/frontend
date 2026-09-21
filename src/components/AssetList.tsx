"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useRouter } from "next/navigation";
import { useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo, useState } from "react";

import { DataAsset, type Venue }from "@covia/covia-sdk";
import { getAssetKind } from "@/lib/asset-kind";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { Button } from "./ui/button";
import { useAssetCatalog } from "@/hooks/use-asset-catalog";
import { CARD_GRID_CLASS } from "@/lib/grid";
import { FileKey, Search }from "lucide-react";
import { CreateAssetComponent } from "./CreateAssetComponent";
import { TopBar } from "./admin-panel/TopBar";
import { FiltersSheet } from "./FiltersSheet";
import { ListToolbar } from "./ListToolbar";
import { Input } from "./ui/input";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { VenueResolutionState } from "@/components/VenueResolutionState";


interface AssetListProps {
  venueId?: string;
}

// The venue rejects a limit above 1000 and silently caps a limit-less listing
// at the same number, so this is the largest page it will serve. Asking for the
// cap means a catalogue that still fits costs exactly one request, as before.
const CATALOG_PAGE = 1000;

export function AssetList({ venueId }: AssetListProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // venue.listAssets() is a hash-only CAS scan (GET /api/v1/assets) — it has no
  // path field, so anything catalog-owned that ends up here can only be shown at
  // a bare /a/<hash>, which misdisplays venue-catalog content as the caller's
  // own pinned asset (covia#390). Operations, agent templates, and skills are
  // catalog content with their own path-first views, so they're excluded here;
  // what's left is genuinely CAS-only content, correctly hash-addressed.
  // expand: 'metadata' inlines every item's metadata into the listing call, so
  // there's no per-id hydration pass.
  const fetchCatalog = useCallback(
    async (venue: Venue, publish: (assets: DataAsset[]) => void) => {
      const artifacts: DataAsset[] = [];
      let offset = 0;
      let total = Number.POSITIVE_INFINITY;
      // The catalogue is read in pages. A single unbounded read looks like it
      // works — every venue here still fits — but the venue caps a limit-less
      // listing at CATALOG_PAGE and reports the real count in `total`, so a
      // catalogue past the cap would be silently truncated and the grid would
      // say "End of results" over assets it never asked for. Paging to `total`
      // is what makes the list complete rather than merely plausible.
      while (offset < total) {
        const page = await venue.listAssets({
          expand: "metadata",
          offset,
          limit: CATALOG_PAGE,
        });
        total = page.total;
        // Defensive: a page that returns nothing would otherwise spin forever.
        if (page.items.length === 0) break;
        for (const entry of page.items) {
          if (entry.metadata.name == undefined) continue;
          const kind = getAssetKind(entry.metadata);
          if (kind === "operation" || kind === "agent-template" || kind === "skill") continue;
          artifacts.push(new DataAsset(entry.id, venue, entry.metadata));
        }
        offset += page.items.length;
        // Show what has arrived rather than holding the grid blank until the
        // last page; on a one-page catalogue this is a single publish.
        if (offset < total) publish([...artifacts]);
      }
      return artifacts;
    },
    [],
  );

  const {
    assets,
    isLoading,
    loadError,
    resolvedVenue,
    venue,
    venueObj,
    venueStatus,
    searchInput,
    setSearchInput,
    filteredAssets,
    visibleItems,
    hasMore,
    loadMore,
    sentinelRef,
  } = useAssetCatalog({
    venueId,
    fetchAssets: fetchCatalog,
    initialSearch: searchParams.get("search") ?? "",
    selectedTags,
  });
  const isAuthenticated = resolvedVenue.isAuthenticated;

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  };

  const keywordOptions = useMemo(() => {
    const all = assets.flatMap((a) => (Array.isArray(a.metadata?.keywords) ? a.metadata.keywords : []));
    return [...new Set(all)].sort();
  }, [assets]);
  const tagOptions = useMemo(
    () => keywordOptions.map((k) => ({ value: k, label: k, groupTag: "Keyword" })),
    [keywordOptions],
  );

  if (venueStatus !== "ready") {
     return (
      <ContentLayout>
        <TopBar venueId={venueId} venueName={venueObj?.metadata.name} />
        <VenueResolutionState
          status={venueStatus}
          error={resolvedVenue.error}
          icon={FileKey}
          subject="Assets"
          venueId={venueId}
        />
      </ContentLayout>
     )
  }

  return (
    <ContentLayout>
        <TopBar venueId={venueId} venueName={venueObj?.metadata.name}/>

        <div className="flex flex-col items-center justify-center">
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
                {isAuthenticated && (
                  <CreateAssetComponent venue={venue ?? undefined}></CreateAssetComponent>
                )}
                <FiltersSheet
                  title="Filter Assets"
                  description="Narrow down assets by tag."
                  groups={tagOptions.length > 0 ? [{ label: "Tags", options: tagOptions, selected: selectedTags, onChange: setSelectedTags }] : []}
                />
              </>
            }
            summary={!isLoading && `Showing ${visibleItems.length} of ${filteredAssets.length}`}
          />

          {loadError && <ErrorDisplay error={loadError} className="mb-4 w-full" />}

          {/* Spinner only until the first page lands. A multi-page catalogue
              then fills in as the rest arrive; the summary above stays hidden
              until the read settles, because a running total is not the total. */}
          {isLoading && assets.length === 0 ? (
            <div className="flex flex-row items-center justify-center w-full h-100">
              <Spinner variant="ellipsis" className="text-primary" size={64}/>
            </div>
          ) : (
            <>
              <div className={CARD_GRID_CLASS}>
                {visibleItems.map((asset) =>
                  <AssetCard key={asset.id} asset={asset} type="assets" compact={true} venue={venue ?? undefined} scoped={!!venueId}/>
                )}
              </div>

              {/* Infinite scroll: the sentinel reveals the next batch; the button
                  is a manual fallback (and covers no-IntersectionObserver envs). */}
              <div className="flex w-full items-center justify-center py-6">
                {hasMore ? (
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={loadMore}>
                    Load more assets
                  </Button>
                ) : isLoading ? (
                  <span className="text-xs text-muted-foreground">Loading more assets…</span>
                ) : filteredAssets.length > 0 ? (
                  <span className="text-xs text-muted-foreground">End of results</span>
                ) : null}
                <div ref={sentinelRef} className="h-px w-px" aria-hidden />
              </div>
            </>
          )}

        </div>
      </ContentLayout>
  );
}
