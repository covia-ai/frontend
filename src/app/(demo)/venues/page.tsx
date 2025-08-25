
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Search } from "@/components/search";
import { VenueCard } from "@/components/VenueCard";
import { useVenues } from "@/hooks/use-venues";

export default function VenuesPage() {
  const { venues } = useVenues();

  return (
    <ContentLayout title="Venues">
      <SmartBreadcrumb />

      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-evenly w-full space-x-2">
          <Search></Search>
        </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch justify-center gap-4">
          {venues.map((venue) => (
            <VenueCard key={venue.venueId} venue={venue} />
          ))}
        </div>
      </div>
    </ContentLayout>
  );
}
