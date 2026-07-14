"use client";

import { useEffect, useMemo, useState } from "react";
import { Venue, AdapterInfo } from "@covia/covia-sdk";
import { createAuthProvider } from "@/lib/auth-provider";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { Plug, Search } from "lucide-react";
import { toast } from "sonner";

interface AdaptersListProps {
  venueId: string;
}

export function AdaptersList({ venueId }: AdaptersListProps) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const { venues, addVenue } = useVenues();
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);

  useEffect(() => {
    const authData = getAuthForVenue(venueId ?? venueObj?.venueId ?? "");
    const authOption = createAuthProvider(authData);

    if (venueId && venueId !== venueObj?.venueId) {
      const found = venues.find((v) => v.venueId === venueId);
      if (found) {
        setVenue(getVenueFor(found, authData));
      } else {
        Venue.connect(decodeURIComponent(venueId), authOption).then((v) => {
          addVenue(v);
          setVenue(v);
        });
      }
    } else if (venueObj) {
      setVenue(getVenueFor(venueObj, authData));
    }
  }, [venueId, authMap, venueObj, venues, getAuthForVenue]);

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
      .catch(() => {
        if (!ignore) {
          toast("Unable to load adapters");
          setAdapters([]);
        }
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [venue]);

  const filteredAdapters = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...adapters].sort((a, b) => a.name.localeCompare(b.name));
    if (!term) return sorted;
    return sorted.filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        (a.description ?? "").toLowerCase().includes(term)
    );
  }, [adapters, search]);

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
          <CardHeader>
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
              <Accordion type="single" collapsible className="px-4">
                {filteredAdapters.map((adapter) => (
                  <AccordionItem key={adapter.name} value={adapter.name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                        <div className="flex flex-col items-start gap-1 text-left">
                          <span className="font-mono text-sm font-semibold">{adapter.name}</span>
                          {adapter.description && (
                            <span className="text-xs text-muted-foreground font-normal">{adapter.description}</span>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {adapter.operations.length} op{adapter.operations.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {adapter.operations.length === 0 ? (
                        <p className="text-xs text-muted-foreground pb-2">
                          No catalog operations for this adapter.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-1 pb-2">
                          {adapter.operations.map((path) => (
                            <li key={path}>
                              <button
                                onClick={() => goToOperation(path)}
                                className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline text-left"
                              >
                                {path}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
