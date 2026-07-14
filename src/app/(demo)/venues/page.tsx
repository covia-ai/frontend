
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Search, X } from "lucide-react";
import { VenueCard } from "@/components/VenueCard";
import { PaginationHeader } from "@/components/PaginationHeader";
import { useVenues } from "@/hooks/use-venues";

import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { TopBar } from "@/components/admin-panel/TopBar";
import { AddNewVenueModal } from "@/components/AddNewVenueModal";

export default function VenuesPage() {
  const { venues } = useVenues();
  const searchParams = useSearchParams()
  const router = useRouter();
  const pathname = usePathname();

  const itemsPerPage = 12
  const [totalPages, setTotalPages] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? "");

  const nextPage = (page: number) => {
    setCurrentPage(page)
  }
  const prevPage = (page: number) => {
    setCurrentPage(page)
  }
  const clearSearch = () => {
    setSearchInput("");
    router.replace(pathname);
  }

  const filteredVenues = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return venues;
    return venues.filter((venue) =>
      (venue.metadata.name ?? "").toLowerCase().includes(term) || venue.venueId.toLowerCase().includes(term));
  }, [venues, searchInput]);

  useEffect(() => {
    setTotalPages(Math.ceil(filteredVenues.length / itemsPerPage))
    setCurrentPage(1)
  }, [filteredVenues]);

  return (
    <ContentLayout>
      <TopBar />

      <div className="flex flex-col items-center justify-center">
        <div className="flex gap-2 items-center w-full mt-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Type keyword to search…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 pr-8"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="text-card-foreground text-xs flex flex-row my-2">
          {`Page ${currentPage} : Showing ${filteredVenues.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of ${filteredVenues.length}`}
        </div>
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>

        <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 items-stretch justify-center gap-4 my-4">
          {filteredVenues.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((venue) => (
            <VenueCard key={venue.venueId} venue={venue} compact={true} />
          ))}
        </div>

        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>

        <div className="h-48 flex flex-center items-center justify-center ">
           <AddNewVenueModal/>
        </div>
      </div>
    </ContentLayout>
  );
}
