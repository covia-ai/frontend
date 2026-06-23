import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Job, JobMetadata, RunStatus, Venue } from "@covia/covia-sdk";
import { createAuthProvider } from "@/lib/auth-provider";
import { colourForStatus, getExecutionTime } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { PaginationHeader } from "@/components/PaginationHeader";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { Activity } from "lucide-react";
import { TopBar } from "./admin-panel/TopBar";
import { Spinner } from "@/components/ui/shadcn-io/spinner";

const ACTIVE_STATUSES = new Set([RunStatus.PENDING, RunStatus.STARTED, RunStatus.PAUSED]);

export function JobList() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [allIds, setAllIds] = useState<string[]>([]);         // full ID list from venue
  const [jobsData, setJobsData] = useState<JobMetadata[]>([]); // metadata for current page
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { venues } = useVenues();
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);
  const prevVenueId = useRef<string | undefined>(undefined);

  const nextPage = (page: number) => { setCurrentPage(page); }
  const prevPage = (page: number) => { setCurrentPage(page); }

  function isInRange(date: string) {
    if (dateFilter === "today") {
      return new Date().toDateString() === new Date(date).toDateString();
    }
    return true;
  }

  // Step 1: fetch all IDs from the venue (one fast request).
  // IDs arrive newest-last so we reverse to show newest first.
  const fetchAllIds = useCallback(async () => {
    if (!venueObj) return;
    const authData = getAuthForVenue(venueObj.venueId);
    const venue = new Venue({ baseUrl: venueObj.baseUrl, venueId: venueObj.venueId, auth: createAuthProvider(authData) });
    try {
      const ids: string[] = await venue.jobs.list();
      setAllIds([...ids].reverse()); // newest first
      setCurrentPage(1);
    } catch {
      setAllIds([]);
    }
  }, [venueObj, authMap, getAuthForVenue]);

  // Step 2: for the current page, fetch only those job metadata records.
  const fetchPageMetadata = useCallback(async (ids: string[], page: number) => {
    if (!venueObj || ids.length === 0) { setJobsData([]); return; }
    const authData = getAuthForVenue(venueObj.venueId);
    const venue = new Venue({ baseUrl: venueObj.baseUrl, venueId: venueObj.venueId, auth: createAuthProvider(authData) });

    const pageIds = ids.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    setLoading(true);
    const results = await Promise.allSettled(pageIds.map(id => venue.jobs.get(id)));
    const metadata: JobMetadata[] = results
      .filter((r): r is PromiseFulfilledResult<Job> => r.status === 'fulfilled')
      .map(r => r.value.metadata);
    setJobsData(metadata);
    setLoading(false);
  }, [venueObj, authMap, getAuthForVenue]);

  // Filter IDs when a status filter is active. Since we only have IDs at this
  // stage, we batch-fetch a window of up to 100 jobs to determine their status,
  // then page through those. For "All" we page by ID directly.
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  useEffect(() => {
    if (statusFilter === 'All') {
      setFilteredIds(allIds);
      return;
    }
    if (allIds.length === 0) { setFilteredIds([]); return; }
    if (!venueObj) return;

    // Fetch the most recent 100 jobs to apply the status filter.
    const authData = getAuthForVenue(venueObj.venueId);
    const venue = new Venue({ baseUrl: venueObj.baseUrl, venueId: venueObj.venueId, auth: createAuthProvider(authData) });
    const sample = allIds.slice(0, 100);
    setLoading(true);
    Promise.allSettled(sample.map(id => venue.jobs.get(id)))
      .then(results => {
        const matched = results
          .filter((r): r is PromiseFulfilledResult<Job> => r.status === 'fulfilled')
          .map(r => r.value.metadata)
          .filter(m => m.status === statusFilter)
          .map(m => m.id);
        setFilteredIds(matched);
        setCurrentPage(1);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, allIds]);

  const totalPages = Math.max(1, Math.ceil(filteredIds.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // Re-fetch page metadata whenever filteredIds or currentPage changes.
  useEffect(() => {
    fetchPageMetadata(filteredIds, currentPage);
  }, [filteredIds, currentPage]);

  // On venue change, reload IDs.
  useEffect(() => {
    if (!venueObj) return;
    if (prevVenueId.current !== venueObj.venueId) {
      setStatusFilter("All");
      setAllIds([]);
      setJobsData([]);
      prevVenueId.current = venueObj.venueId;
    }
    fetchAllIds();
  }, [venueObj, authMap, getAuthForVenue]);

  // Poll every 5 s when there are active jobs on the current page.
  useEffect(() => {
    const hasActive = jobsData.some(j => ACTIVE_STATUSES.has(j.status as RunStatus));
    if (!hasActive || !venueObj) return;
    const id = setInterval(() => fetchPageMetadata(filteredIds, currentPage), 5000);
    return () => clearInterval(id);
  }, [jobsData, filteredIds, currentPage, venueObj]);

  if(venues.length == 0)
    return (
      <ContentLayout>
      <TopBar />
        <div className="flex flex-col items-center justify-center  mt-2 bg-background">
      <div className="flex flex-row w-full  items-start justify-start mt-4 space-x-4 ">
          <div className="flex flex-row items-center justify-start w-1/3  space-x-4">
            <Label>Job Status</Label>
            <Select onValueChange={value => setStatusFilter(value)} defaultValue="All">
            <SelectTrigger className="w-[180px] text-semibold">
              <SelectValue className="text-semibold" placeholder="Run Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value={RunStatus.PENDING}>{RunStatus.PENDING}</SelectItem>
                <SelectItem value={RunStatus.STARTED}>{RunStatus.STARTED}</SelectItem>
                <SelectItem value={RunStatus.PAUSED}>{RunStatus.PAUSED}</SelectItem>
                <SelectItem value={RunStatus.CANCELLED}>{RunStatus.CANCELLED}</SelectItem>
                <SelectItem value={RunStatus.TIMEOUT}>{RunStatus.TIMEOUT}</SelectItem>
                <SelectItem value={RunStatus.REJECTED}>{RunStatus.REJECTED}</SelectItem>
                <SelectItem value={RunStatus.AUTH_REQUIRED}>{RunStatus.AUTH_REQUIRED}</SelectItem>
                <SelectItem value={RunStatus.INPUT_REQUIRED}>{RunStatus.INPUT_REQUIRED}</SelectItem>
                <SelectItem value={RunStatus.COMPLETE}>{RunStatus.COMPLETE}</SelectItem>
                <SelectItem value={RunStatus.FAILED}>{RunStatus.FAILED}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
  <div className="flex flex-col items-center justify-center w-full h-100 space-y-2">
          <Activity size={64} className="text-primary"></Activity>
          <div className="text-primary text-lg">Get Started with Operations</div>
          <div className="text-card-foreground text-sm">Connect to a venue to get started and see the available operations</div>
      </div>
    </div>
      </ContentLayout>
  )

    const encodedPath = (jobId:string) => {
        return "/venues/"+encodeURIComponent(venueObj?.venueId || "")+"/jobs/"+jobId;
        
    };

    const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
   });
  return (
    <ContentLayout >
      <TopBar venueName={venueObj?.metadata.name}/>
      <div className="flex flex-col items-center justify-center  mt-2 bg-background">
        <div className="flex flex-row w-full  items-start justify-start mt-4 space-x-4 ">
            <div className="flex flex-row items-center justify-start w-1/3  space-x-4">
              <Label>Job Status</Label>
              <Select onValueChange={value => setStatusFilter(value)} defaultValue="All">
              <SelectTrigger className="w-[180px] text-semibold">
                <SelectValue className="text-semibold" placeholder="Run Status" />
              </SelectTrigger>    
              <SelectContent>
                <SelectGroup>
                  
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value={RunStatus.PENDING}>{RunStatus.PENDING}</SelectItem>
                  <SelectItem value={RunStatus.STARTED}>{RunStatus.STARTED}</SelectItem>
                  <SelectItem value={RunStatus.PAUSED}>{RunStatus.PAUSED}</SelectItem>
                  <SelectItem value={RunStatus.CANCELLED}>{RunStatus.CANCELLED}</SelectItem>
                  <SelectItem value={RunStatus.TIMEOUT}>{RunStatus.TIMEOUT}</SelectItem>
                  <SelectItem value={RunStatus.REJECTED}>{RunStatus.REJECTED}</SelectItem>
                  <SelectItem value={RunStatus.AUTH_REQUIRED}>{RunStatus.AUTH_REQUIRED}</SelectItem>
                  <SelectItem value={RunStatus.INPUT_REQUIRED}>{RunStatus.INPUT_REQUIRED}</SelectItem>
                  <SelectItem value={RunStatus.COMPLETE}>{RunStatus.COMPLETE}</SelectItem>
                  <SelectItem value={RunStatus.FAILED}>{RunStatus.FAILED}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-card-foreground text-xs flex flex-row my-2">
          Page {currentPage} : Showing {jobsData.length} of {filteredIds.length}
          {statusFilter !== 'All' && filteredIds.length === 0 && !loading && (
            <span className="ml-2 text-muted-foreground">— no jobs match this filter</span>
          )}
        </div>
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
        {loading && (
          <div className="flex items-center justify-center py-10 w-full">
            <Spinner variant="ellipsis" className="text-primary" size={40} />
          </div>
        )}
        {!loading && <Table className="  border border-border rounded-lg shadow-md">
          <TableHeader >
            <TableRow className="bg-secondary hover:bg-secondary rounded-full text-secondary-foreground ">
              <TableCell className="border border-border">Job Id</TableCell>
              <TableCell className="border border-border">Name</TableCell>
              <TableCell className="text-center border border-border">Created Date</TableCell>
              <TableCell className="text-center border border-border">Execution Time</TableCell>

              <TableCell className="text-center border border-border">Status</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {jobsData.filter(job => isInRange(job.created)).map((job, index) =>
              <TableRow key={index}>
                <TableCell><Link className="text-foreground font-mono underline" href={encodedPath(job.id)}>{job.id}</Link></TableCell>
                <TableCell>{job.name}</TableCell>
                <TableCell>{formatter.format(new Date(job.created))}</TableCell>
                {(job.status == RunStatus.COMPLETE || job.status == RunStatus.FAILED) ?
                 (<TableCell>{getExecutionTime(job.created, job.updated)}</TableCell>) :
                 (<TableCell>--</TableCell>)
                }
                <TableCell className={colourForStatus(job.status)}>{job.status}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>}
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage}></PaginationHeader>
      </div>
    </ContentLayout>
);
}
