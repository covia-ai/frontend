import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useMemo, useRef, useState }from "react";
import { getVenueFor } from "@/hooks/use-authenticated-venue";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { JobMetadata, RunStatus }from "@covia/covia-sdk";
import { getExecutionTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { PaginationHeader } from "@/components/PaginationHeader";
import { FiltersSheet } from "@/components/FiltersSheet";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";
import { Activity, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
  const [jobsData, setJobsData] = useState<JobMetadata[]>([]);       // current page (no filters)
  const [windowRecords, setWindowRecords] = useState<JobMetadata[]>([]); // newest window (filter mode)
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const itemsPerPage = 10;
  const FILTER_WINDOW = 100;
  const { venues } = useVenues();
  const venueObj = useVenueForRoute(venueId);
  const router = useRouter();
  const authData = useAuthStore((x) =>
    venueObj ? x.authMap[venueObj.venueId] ?? null : null
  );
  const prevVenueId = useRef<string | undefined>(undefined);

  const nextPage = (page: number) => { setCurrentPage(page); }
  const prevPage = (page: number) => { setCurrentPage(page); }

  const isInRange = useCallback((date: string, ranges: string[]) => {
    if (ranges.length === 0) return true;
    const target = new Date(date);
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
  }, []);

  // The caller's job index lives at lattice path "j", and the values API
  // paginates it properly (offset/limit + total count) — one windowed slice
  // returns full job records. The REST /jobs route can't do this: it returns
  // every id and ignores limit/offset (covia#229), which is why this page
  // used to pull the full id list and then GET each job individually.
  // Records arrive oldest-first (time-ordered keys), so windows are computed
  // from the end and reversed for newest-first display.
  const recordsFromSlice = (values: unknown[]): JobMetadata[] =>
    (values ?? [])
      .map((e: any) => (e?.value ? { ...e.value, id: e.value.id ?? `0x${e.key}` } : null))
      .filter((m): m is JobMetadata => m != null)
      .reverse();

  // One page of the full history: ranks [(page-1)*size, page*size) from the end.
  const fetchPage = useCallback(async (page: number) => {
    if (!venueObj) return;
    const venue = getVenueFor(venueObj, authData);
    setLoading(true);
    try {
      const { count = 0 } = await venue.workspace.list("j", 1);
      const end = Math.max(0, count - (page - 1) * itemsPerPage);
      const start = Math.max(0, end - itemsPerPage);
      const res = end > start ? await venue.workspace.slice("j", start, end - start) : { values: [] };
      setTotalCount(count);
      setJobsData(recordsFromSlice((res.values as unknown[]) ?? []));
    } catch {
      setTotalCount(0);
      setJobsData([]);
    } finally {
      setLoading(false);
    }
  }, [venueObj, authData]);

  // Filter mode: one slice of the newest FILTER_WINDOW records, filtered and
  // paged client-side. Filters only ever see this recent window — same
  // semantics as before, when the window was 100 individual per-job GETs.
  const fetchWindow = useCallback(async () => {
    if (!venueObj) return;
    const venue = getVenueFor(venueObj, authData);
    setLoading(true);
    try {
      const { count = 0 } = await venue.workspace.list("j", 1);
      const start = Math.max(0, count - FILTER_WINDOW);
      const res = count > start ? await venue.workspace.slice("j", start, count - start) : { values: [] };
      setTotalCount(count);
      setWindowRecords(recordsFromSlice((res.values as unknown[]) ?? []));
    } catch {
      setTotalCount(0);
      setWindowRecords([]);
    } finally {
      setLoading(false);
    }
  }, [venueObj, authData]);

  // Debounce free-text search so typing doesn't fire a fresh window fetch
  // on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const hasFilters = statusFilter.length > 0 || dateFilter.length > 0 || debouncedQuery.trim().length > 0;

  // Client-side filtering over the fetched window (filter mode only).
  const filteredRecords = useMemo(() => {
    if (!hasFilters) return null;
    const q = debouncedQuery.trim().toLowerCase();
    return windowRecords
      .filter(m => statusFilter.length === 0 || statusFilter.includes(m.status ?? ""))
      .filter(m => dateFilter.length === 0 || isInRange(m.created ?? "", dateFilter))
      .filter(m => !q || [m.id, m.operation, m.name].some(v => v?.toLowerCase().includes(q)));
  }, [hasFilters, windowRecords, statusFilter, dateFilter, debouncedQuery, isInRange]);

  // What the table renders: the server-paged window, or a client-side page
  // of the filtered records.
  const matchTotal = filteredRecords ? filteredRecords.length : totalCount;
  const totalPages = Math.max(1, Math.ceil(matchTotal / itemsPerPage));
  const pageRecords = filteredRecords
    ? filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : jobsData;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // Default mode: one windowed slice per page.
  useEffect(() => {
    if (!hasFilters) fetchPage(currentPage);
  }, [fetchPage, currentPage, hasFilters, refreshTick]);

  // Filter mode: one window fetch per venue/filter change (or poll tick).
  useEffect(() => {
    if (hasFilters) fetchWindow();
  }, [fetchWindow, hasFilters, refreshTick]);

  // Back to page 1 when the filter set itself changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, debouncedQuery]);

  // On venue change, reset view state (the fetch effects re-run via fetchPage/
  // fetchWindow identity).
  useEffect(() => {
    if (!venueObj) return;
    if (prevVenueId.current !== venueObj.venueId) {
      setStatusFilter([]);
      setJobsData([]);
      setWindowRecords([]);
      setTotalCount(0);
      setCurrentPage(1);
      prevVenueId.current = venueObj.venueId;
    }
  }, [venueObj]);

  // Poll every 5 s when there are active jobs on the current page.
  useEffect(() => {
    const hasActive = pageRecords.some(j => ACTIVE_STATUSES.has(j.status as RunStatus));
    if (!hasActive || !venueObj) return;
    const id = setInterval(() => setRefreshTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, [pageRecords, venueObj]);

  if(venues.length == 0)
    return (
      <ContentLayout>
      <TopBar />
        <div className="flex flex-col items-center justify-center  mt-2 bg-background">
      <div className="flex flex-row w-full  items-center justify-end mt-4 gap-4">
          <FiltersSheet
            search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search by id, operation, or name..." }}
            groups={[
              { label: "Status", options: STATUS_OPTIONS, selected: statusFilter, onChange: setStatusFilter },
              { label: "Date", options: DATE_OPTIONS, selected: dateFilter, onChange: setDateFilter },
            ]}
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
        <div className="flex flex-row flex-wrap w-full items-center justify-end mt-4 gap-4">
          <FiltersSheet
            search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search by id, operation, or name..." }}
            groups={[
              { label: "Status", options: STATUS_OPTIONS, selected: statusFilter, onChange: setStatusFilter },
              { label: "Date", options: DATE_OPTIONS, selected: dateFilter, onChange: setDateFilter },
            ]}
          />
        </div>
        <div className="flex flex-row flex-nowrap items-center justify-between w-full my-2 gap-4">
          <div className="text-card-foreground text-xs whitespace-nowrap">
            Page {currentPage} : Showing {pageRecords.length} of {matchTotal}
            {hasFilters && matchTotal === 0 && !loading && (
              <span className="ml-2 text-muted-foreground">— no jobs match this filter</span>
            )}
          </div>
          <div className="shrink-0">
            <PaginationHeader currentPage={currentPage} totalPages={totalPages} nextPage={nextPage} prevPage={prevPage} disabled={loading}></PaginationHeader>
          </div>
        </div>
        {loading && (
          <div className="flex items-center justify-center py-10 w-full">
            <Spinner variant="ellipsis" className="text-primary" size={40} />
          </div>
        )}
        {!loading && <Table className="  border border-border rounded-lg shadow-md">
          <TableHeader >
            <TableRow className="bg-secondary hover:bg-secondary rounded-full text-secondary-foreground ">
              <TableCell className="text-left">
                <button onClick={() => toggleSort("id")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Job Id
                  {sort.col === "id" ? (sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                </button>
              </TableCell>
              <TableCell className="text-left">Name</TableCell>
              <TableCell className="text-left">
                <button onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Start Time
                  {sort.col === "date" ? (sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                </button>
              </TableCell>
              <TableCell className="text-left">Duration</TableCell>
              <TableCell className="text-left">
                <button onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Status
                  {sort.col === "status" ? (sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                </button>
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {[...pageRecords]
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
              <TableRow key={job.id} className="cursor-pointer" onClick={() => router.push(encodedPath(job.id ?? ""))}>
                <TableCell className="font-mono">{job.id}</TableCell>
                <TableCell>{job.name}</TableCell>
                <TableCell>
                  {job.created ? formatter.format(new Date(job.created)) : "--"}
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
