"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { VenueCard } from "@/components/VenueCard";
import { PaginationHeader } from "@/components/PaginationHeader";
import { Input } from "@/components/ui/input";
import { useVenues } from "@/hooks/use-venues";
import { useVenueHealth } from "@/hooks/use-venue-health";
import { useClientPagination } from "@/hooks/use-pagination";

import { LayoutGrid, MapPinned, Network, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { TopBar } from "@/components/admin-panel/TopBar";
import { AddNewVenueModal } from "@/components/AddNewVenueModal";
import { ListToolbar } from "@/components/ListToolbar";
import { VenueNetworkMap } from "@/components/VenueNetworkMap";
import { venueDisplayName } from "@/lib/venue-display";
import { cn } from "@/lib/utils";

export default function VenuesPage() {
  const { venues, selectedVenueId } = useVenues();
  const healthByUrl = useVenueHealth((x) => x.byUrl);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const itemsPerPage = 12;
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  // Grid (default) vs the federation Map — an optional network view of the same
  // venues; the grid stays the source of truth.
  const [view, setView] = useState<"grid" | "map">("grid");

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  };

  const filteredVenues = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return venues;
    return venues.filter(
      (venue) =>
        (venue.metadata.name ?? "").toLowerCase().includes(term) ||
        venue.venueId.toLowerCase().includes(term),
    );
  }, [venues, searchInput]);

  // Federation-wide figures for the network header — all from state already in
  // memory (no new fetch): how many venues, how many are transport-reachable
  // (the health store, populated as each card validates), and your default.
  const reachable = useMemo(
    () => venues.filter((v) => healthByUrl[v.baseUrl]?.state === "connected").length,
    [venues, healthByUrl],
  );
  const defaultVenue = useMemo(
    () => venues.find((v) => v.venueId === selectedVenueId),
    [venues, selectedVenueId],
  );

  const { currentPage, setCurrentPage, totalPages, pageItems } = useClientPagination({
    items: filteredVenues,
    pageSize: itemsPerPage,
    resetKey: searchInput,
  });

  return (
    <ContentLayout>
      <TopBar />

      <div className="flex flex-col items-center justify-center">
        {venues.length === 0 ? (
          <div className="mt-16 flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPinned size={22} />
            </span>
            <h2 className="text-lg font-semibold">No venues connected</h2>
            <p className="text-sm text-muted-foreground">
              A venue is a Covia node — its own assets, operations and agents. Connect one to get started.
            </p>
            <div className="mt-1">
              <AddNewVenueModal />
            </div>
          </div>
        ) : (
          <>
            {/* Network header — your federation at a glance */}
            <div
              data-testid="venues-network-bar"
              className="mt-4 flex w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-gradient-to-b from-muted/40 px-5 py-3"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-primary">{venues.length}</span>
                <span className="text-sm text-muted-foreground">
                  {venues.length === 1 ? "venue" : "venues"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-foreground">{reachable}</span>
                <span className="text-sm text-muted-foreground">reachable</span>
              </div>
              {defaultVenue && (
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">default</span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {venueDisplayName(defaultVenue)}
                  </span>
                </div>
              )}
            </div>

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
                  <AddNewVenueModal />
                </>
              }
              summary={`Page ${currentPage} : Showing ${pageItems.length} of ${filteredVenues.length}`}
              pagination={
                <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              }
            />

            {/* Grid / Map view toggle */}
            <div className="mt-3 flex w-full justify-end">
              <div className="inline-flex rounded-lg border bg-card p-0.5">
                {([
                  { key: "grid", label: "Grid", Icon: LayoutGrid },
                  { key: "map", label: "Map", Icon: Network },
                ] as const).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`venues-view-${key}`}
                    aria-pressed={view === key}
                    onClick={() => setView(key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {view === "map" ? (
              <VenueNetworkMap venues={filteredVenues} selectedVenueId={selectedVenueId} />
            ) : (
              <>
                <div className="my-4 grid w-full grid-cols-1 items-stretch justify-center gap-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5">
                  {pageItems.map((venue) => (
                    <VenueCard key={venue.venueId} venue={venue} compact={true} />
                  ))}
                </div>

                <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </>
            )}
          </>
        )}
      </div>
    </ContentLayout>
  );
}
