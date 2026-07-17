import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useRef, useState }from "react";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { Job, JobMetadata, RunStatus }from "@covia/covia-sdk";
import { getExecutionTime, formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { PaginationHeader } from "@/components/PaginationHeader";
import { MultiSelectFilterDropdown } from "@/components/MultiSelectFilterDropdown";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { Activity, ArrowUpDown, ArrowUp, ArrowDown, Search, ListFilter, CalendarDays } from "lucide-react";
import { TopBar } from "./admin-panel/TopBar";
import { Spinner } from "@/components/ui/shadcn-io/spinner";

const TERMINAL_STATUSES = new Set([
  RunStatus.COMPLETE, RunStatus.FAILED, RunStatus.CANCELLED, RunStatus.REJECTED, RunStatus.TIMEOUT,
]);

const ACTIVE_STATUSES = new Set([RunStatus.PENDING, RunStatus.STARTED, RunStatus.PAUSED]);

const STATUS_OPTIONS = [
  RunStatus.PENDING, RunStatus.STARTED, RunStatus.PAUSED, RunStatus.CANCELLED, RunStatus.TIMEOUT,
  RunStatus.REJECTED, RunStatus.AUTH_REQUIRED, RunStatus.INPUT_REQUIRED, RunStatus.COMPLETE, RunStatus.FAILED,
].map((s) => ({ value: s, label: s }));

const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This week" },
  { value: "lastWeek", label: "Last week" },
];

interface JobListProps {
  venueId?: string;
}

export function JobList({ venueId }: JobListProps = {}) {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<{ col: "id" | "date" | "status"; dir: "asc" | "desc" }>({ col: "date", dir: "desc" });

  const toggleSort = (col: "id" | "date" | "status") =>
    setSort(prev => prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
  const [allIds, setAllIds] = useState<string[]>([]);         // full ID list from venue
  const [jobsData, setJobsData] = useState<JobMetadata[]>([]); // metadata for current page
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { venues } = useVenues();
  const venueObj = useVenueForRoute(venueId);
  const getAuthForVenue = useAuthStore((x) => x.getAuthForVenue);
  const authMap = useAuthStore((x) => x.authMap);
  const prevVenueId = useRef<string | undefined>(undefined);

  const nextPage = (page: number) => { setCurrentPage(page); }
  const prevPage = (page: number) => { setCurrentPage(page); }

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function isInRange(date: string, ranges: string[]) {
    if (ranges.length === 0) return true;
    const target = new Date(date);
    const now = new Date();
    const startOfThisWeek = new Date(startOfDay(now));
    startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    return ranges.some((range) => {
      if (range === "today") return now.toDateString() === target.toDateString();
      if (range === "thisWeek") return target >= startOfThisWeek && target <= now;
      if (range === "lastWeek") return target >= startOfLastWeek && target < startOfThisWeek;
      return false;
    });
  }

  // Step 1: fetch all IDs from the venue (one fast request).
  // IDs arrive newest-last so we reverse to show newest first.
  const fetchAllIds = useCallback(async () => {
    if (!venueObj) return;
    const venue = getVenueFor(venueObj, getAuthForVenue(venueObj.venueId));
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
    const venue = getVenueFor(venueObj, getAuthForVenue(venueObj.venueId));

    const pageIds = ids.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    setLoading(true);
    const results = await Promise.allSettled(pageIds.map(id => venue.jobs.get(id)));
    const metadata: JobMetadata[] = results
      .filter((r): r is PromiseFulfilledResult<Job> => r.status === 'fulfilled')
      .map(r => r.value.metadata);
    setJobsData(metadata);
    setLoading(false);
  }, [venueObj, authMap, getAuthForVenue]);

  // Debounce free-text search so typing doesn't fire a fresh 100-job metadata
  // fetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Filter IDs when status, date, or search narrows the set. Since we only
  // have IDs at this stage, we batch-fetch a window of up to 100 recent jobs
  // to inspect their metadata, then page through those. With everything at
  // its default we page by ID directly with no extra fetch.
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  useEffect(() => {
    const hasSearch = debouncedQuery.trim().length > 0;
    const hasDateFilter = dateFilter.length > 0;
    const hasStatusFilter = statusFilter.length > 0;
    if (!hasStatusFilter && !hasDateFilter && !hasSearch) {
      setFilteredIds(allIds);
      return;
    }
    if (allIds.length === 0) { setFilteredIds([]); return; }
    if (!venueObj) return;

    // Fetch the most recent 100 jobs to apply status/date/search filters —
    // filters only ever see this recent window, not full history.
    const venue = getVenueFor(venueObj, getAuthForVenue(venueObj.venueId));
    const sample = allIds.slice(0, 100);
    const q = debouncedQuery.trim().toLowerCase();
    setLoading(true);
    Promise.allSettled(sample.map(id => venue.jobs.get(id)))
      .then(results => {
        const matched = results
          .filter((r): r is PromiseFulfilledResult<Job> => r.status === 'fulfilled')
          .map(r => r.value.metadata)
          .filter(m => !hasStatusFilter || statusFilter.includes(m.status ?? ""))
          .filter(m => !hasDateFilter || isInRange(m.created ?? "", dateFilter))
          .filter(m => !hasSearch || [m.id, m.operation, m.name].some(v => v?.toLowerCase().includes(q)))
          .map(m => m.id)
          .filter((id): id is string => id != null);
        setFilteredIds(matched);
        setCurrentPage(1);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, dateFilter, debouncedQuery, allIds]);

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
      setStatusFilter([]);
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
      <div className="flex flex-row w-full  items-center justify-start mt-4 gap-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by id, operation, or name..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <MultiSelectFilterDropdown
            label="Status"
            icon={ListFilter}
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
          <MultiSelectFilterDropdown
            label="Date"
            icon={CalendarDays}
            options={DATE_OPTIONS}
            selected={dateFilter}
            onChange={setDateFilter}
          />
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

    const formatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  return (
    <ContentLayout >
      <TopBar venueName={venueObj?.metadata.name}/>
      <div className="flex flex-col items-center justify-center  mt-2 bg-background">
        <div className="flex flex-row flex-wrap w-full items-center justify-start mt-4 gap-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by id, operation, or name..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <MultiSelectFilterDropdown
            label="Status"
            icon={ListFilter}
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
          <MultiSelectFilterDropdown
            label="Date"
            icon={CalendarDays}
            options={DATE_OPTIONS}
            selected={dateFilter}
            onChange={setDateFilter}
          />
        </div>
        <div className="text-card-foreground text-xs flex flex-row my-2">
          Page {currentPage} : Showing {jobsData.length} of {filteredIds.length}
          {(statusFilter.length > 0 || dateFilter.length > 0 || debouncedQuery.trim() !== '') && filteredIds.length === 0 && !loading && (
            <span className="ml-2 text-muted-foreground">— no jobs match this filter</span>
          )}
        </div>
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={loading}></PaginationHeader>
        {loading && (
          <div className="flex items-center justify-center py-10 w-full">
            <Spinner variant="ellipsis" className="text-primary" size={40} />
          </div>
        )}
        {!loading && <Table className="  border border-border rounded-lg shadow-md">
          <TableHeader >
            <TableRow className="bg-secondary hover:bg-secondary rounded-full text-secondary-foreground ">
              <TableCell className="border border-border">
                <button onClick={() => toggleSort("id")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Job Id
                  {sort.col === "id" ? (sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                </button>
              </TableCell>
              <TableCell className="border border-border">Name</TableCell>
              <TableCell className="text-center border border-border">
                <button onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Created Date
                  {sort.col === "date" ? (sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                </button>
              </TableCell>
              <TableCell className="text-center border border-border">Execution Time</TableCell>
              <TableCell className="text-center border border-border">
                <button onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Status
                  {sort.col === "status" ? (sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                </button>
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {[...jobsData]
              .sort((a, b) => {
                let cmp = 0;
                if (sort.col === "date") cmp = new Date(a.created ?? "").getTime() - new Date(b.created ?? "").getTime();
                else if (sort.col === "id") cmp = (a.id ?? "").localeCompare(b.id ?? "");
                else if (sort.col === "status") cmp = (a.status ?? "").localeCompare(b.status ?? "");
                return sort.dir === "asc" ? cmp : -cmp;
              })
              .map((job) => {
                const isTerminal = TERMINAL_STATUSES.has(job.status as RunStatus);
                return (
              <TableRow key={job.id}>
                <TableCell><Link className="text-foreground font-mono underline" href={encodedPath(job.id ?? "")}>{job.id}</Link></TableCell>
                <TableCell>{job.name}</TableCell>
                <TableCell>
                  {job.created ? (
                    <div className="flex flex-col leading-tight">
                      <span>{formatRelativeTime(job.created)}</span>
                      <span className="text-xs text-muted-foreground">{formatter.format(new Date(job.created))}</span>
                    </div>
                  ) : "--"}
                </TableCell>
                <TableCell>
                  {isTerminal && job.updated
                    ? getExecutionTime(job.created ?? "", job.updated)
                    : job.created
                      ? <span className="text-muted-foreground italic">{getExecutionTime(job.created, new Date().toISOString())} so far</span>
                      : "--"}
                </TableCell>
                <TableCell><StatusBadge status={job.status} kind="job" /></TableCell>
              </TableRow>
                );
              })}
          </TableBody>
        </Table>}
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={loading}></PaginationHeader>
      </div>
    </ContentLayout>
);
}
