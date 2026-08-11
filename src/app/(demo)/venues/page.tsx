
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { VenueCard } from "@/components/VenueCard";
import { PaginationHeader } from "@/components/PaginationHeader";
import { Input } from "@/components/ui/input";
import { useVenues } from "@/hooks/use-venues";
import { useClientPagination } from "@/hooks/use-pagination";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { TopBar } from "@/components/admin-panel/TopBar";
import { AddNewVenueModal } from "@/components/AddNewVenueModal";
import { ListToolbar } from "@/components/ListToolbar";

export default function VenuesPage() {
  const { venues } = useVenues();
  const searchParams = useSearchParams()
  const router = useRouter();
  const pathname = usePathname();

  const itemsPerPage = 12
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? "");

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!value) router.replace(pathname);
  }

  const filteredVenues = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return venues;
    return venues.filter((venue) =>
      (venue.metadata.name ?? "").toLowerCase().includes(term) || venue.venueId.toLowerCase().includes(term));
  }, [venues, searchInput]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems,
  } = useClientPagination({
    items: filteredVenues,
    pageSize: itemsPerPage,
    resetKey: searchInput,
  });

  return (
    <ContentLayout>
      <TopBar />

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
              <AddNewVenueModal/>
            </>
          }
          summary={`Page ${currentPage} : Showing ${pageItems.length} of ${filteredVenues.length}`}
          pagination={<PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}></PaginationHeader>}
        />

        <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 items-stretch justify-center gap-4 my-4">
          {pageItems.map((venue) => (
            <VenueCard key={venue.venueId} venue={venue} compact={true} />
          ))}
        </div>

        <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}></PaginationHeader>
      </div>
    </ContentLayout>
  );
}
