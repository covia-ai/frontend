
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { VenueCard } from "@/components/VenueCard";
import { PaginationHeader } from "@/components/PaginationHeader";
import { FiltersSheet } from "@/components/FiltersSheet";
import { useVenues } from "@/hooks/use-venues";

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

  useEffect(() => {
    setTotalPages(Math.ceil(filteredVenues.length / itemsPerPage))
    setCurrentPage(1)
  }, [filteredVenues]);

  return (
    <ContentLayout>
      <TopBar />

      <div className="flex flex-col items-center justify-center">
        <div className="flex gap-2 items-center w-full mt-4 justify-end">
          <AddNewVenueModal/>
          <FiltersSheet
            title="Filter Venues"
            description="Search for a venue by name or id."
            search={{ value: searchInput, onChange: handleSearchChange, placeholder: "Type keyword to search…" }}
            groups={[]}
          />
        </div>

        <div className="flex flex-row flex-nowrap items-center justify-between w-full my-2 gap-4">
          <div className="text-card-foreground text-xs whitespace-nowrap">
            {`Page ${currentPage} : Showing ${filteredVenues.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of ${filteredVenues.length}`}
          </div>
          <div className="shrink-0">
            <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 items-stretch justify-center gap-4 my-4">
          {filteredVenues.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((venue) => (
            <VenueCard key={venue.venueId} venue={venue} compact={true} />
          ))}
        </div>

        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
      </div>
    </ContentLayout>
  );
}
