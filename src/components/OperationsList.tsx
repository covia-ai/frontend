"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Asset, Operation, Venue } from "@covia/covia-sdk";
import { createAuthProvider } from "@/lib/auth-provider";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "./admin-panel/TopBar";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { AssetCard } from "./AssetCard";
import { PaginationHeader } from "./PaginationHeader";
import { Input } from "@/components/ui/input";
import { PlayCircle, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCatalogOperations } from "@/lib/operations-catalog";



export function OperationsList() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();

  const itemsPerPage = 12
  const offset = 0;
  const limit = itemsPerPage;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [adapterFilter, setAdapterFilter] = useState("All");
  const [searchInput, setSearchInput] = useState(search ?? "");
  const pathname = usePathname();

  const { venues } = useVenues();
  const venueObj = useStore(useVenue, (x) => x.currentVenue);
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);

  const nextPage = (page: number) => {
    setCurrentPage(page)
  }
  const prevPage = (page: number) => {
    setCurrentPage(page)
  }
  if(venues.length == 0 ) {
     return (
      <ContentLayout>
      <TopBar/>
      <div className="flex flex-col items-center justify-center">
        <div className="flex gap-2 items-center w-full mt-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Type keyword to search…" className="pl-8" disabled />
          </div>
        </div>
      </div>
       <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
            <PlayCircle size={64} className="text-primary"></PlayCircle>
            <div className="text-primary text-lg">Get Started with Operations</div>
            <div className="text-card-foreground text-sm">Connect to a venue to get started and see the available operations</div>

        </div>
      </ContentLayout>
     ) 
  }
  
  useEffect(() => {
     const authData = getAuthForVenue(venueObj?.venueId ?? '');
     const venue = new Venue({baseUrl:venueObj?.baseUrl, venueId:venueObj?.venueId, name:venueObj?.metadata.name, auth: createAuthProvider(authData)})
     async function fetchAssets() {
        setLoading(true);
        setAssetsMetadata([]);
        try {
          // Discover ops from the venue catalog (v/ops + v/test/ops) by path —
          // one read per tree, no per-asset round trip. Each op keeps its
          // resolvable catalog path as its id (drives the URL).
          const ops = await listCatalogOperations(venue);
          const term = search?.toLowerCase() ?? "";
          const matched = term.length > 0
            ? ops.filter(op =>
                op.metadata?.name?.toLowerCase().includes(term) ||
                op.path.toLowerCase().includes(term))
            : ops;
          matched.sort((a, b) =>
            (a.metadata?.name ?? a.path).localeCompare(b.metadata?.name ?? b.path));
          setAssetsMetadata(matched.map(op => new Operation(op.path, venue, op.metadata)));
        } catch (error) {
          console.error('Error fetching operations:', error);
        } finally {
          setLoading(false);
        }
      }
     if(venueObj != null)
        fetchAssets();
  }, [search, venueObj, authMap, getAuthForVenue]);

  const adapterOptions = useMemo(() => {
    const names = assetsMetadata
      .map(a => (a.metadata?.operation?.adapter as string | undefined)?.split(':')[0])
      .filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  }, [assetsMetadata]);

  const filteredAssets = useMemo(() => {
    if (adapterFilter === "All") return assetsMetadata;
    return assetsMetadata.filter(
      a => (a.metadata?.operation?.adapter as string | undefined)?.split(':')[0] === adapterFilter
    );
  }, [assetsMetadata, adapterFilter]);

  useEffect(() => {
    setTotalItems(filteredAssets.length);
    setTotalPages(Math.ceil(filteredAssets.length / itemsPerPage));
    setCurrentPage(1);
  }, [filteredAssets]);

  return (
    <ContentLayout>
      <TopBar venueName={venueObj?.metadata.name}/>
      <div className="flex flex-col items-center justify-center">
        <div className="flex gap-2 items-center w-full mt-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Type keyword to search…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  window.location.href = pathname + "?search=" + searchInput;
              }}
              className="pl-8"
            />
          </div>
          <Select value={adapterFilter} onValueChange={(v) => { setAdapterFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-44 shrink-0">
              <SelectValue placeholder="All adapters" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="All">All adapters</SelectItem>
                {adapterOptions.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {!isLoading &&
        <>
          <div className="text-card-foreground text-xs flex flex-row my-2">Page {currentPage} : Showing {filteredAssets.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).length} of {filteredAssets.length} </div>
          <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
          <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-stretch justify-center gap-4">
            {
            filteredAssets.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage).map((asset, index) => (
              <AssetCard key={index} asset={asset} type="operations" compact={true}/>
            ))}
          </div>
          <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
        </>
         }
        {isLoading && 
          <div className="flex flex-row items-center justify-center w-full h-100">
            <Spinner variant="ellipsis" className="text-primary" size={64}/>
          </div>
        }
      </div>
      
    </ContentLayout>
  );
} 