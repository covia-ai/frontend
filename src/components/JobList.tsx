import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useMemo, useRef, useState }from "react";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { JobMetadata, RunStatus }from "@covia/covia-sdk";
import { formatDateTime, getExecutionTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { PaginationHeader } from "@/components/PaginationHeader";
import { FiltersSheet } from "@/components/FiltersSheet";
import { ListToolbar } from "@/components/ListToolbar";
import { StatTile } from "@/components/StatTile";
import { TONE_STYLES } from "@/lib/status";
import { Activity, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Clock, Layers } from "lucide-react";
import { TopBar } from "./admin-panel/TopBar";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { revalidateVenueOnFailure } from "@/hooks/use-authenticated-venue";
import { usePageNumber } from "@/hooks/use-pagination";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import {
  jobRecordsFromSlice,
  sliceJobWindow,
} from "@/lib/job-history";

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

const ITEMS_PER_PAGE = 10;
const FILTER_WINDOW = 100;
const EMPTY_JOB_QUERY = { records: [] as JobMetadata[], totalCount: 0 };

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
  const [refreshTick, setRefreshTick] = useState(0);
  const {
    data: pageData,
    loading: pageLoading,
    error: pageError,
    run: runPageQuery,
    reset: resetPageQuery,
  } = useLatestQuery(EMPTY_JOB_QUERY);
  const {
    data: recentData,
    loading: recentLoading,
    error: recentError,
    run: runRecentQuery,
    reset: resetRecentQuery,
  } = useLatestQuery(EMPTY_JOB_QUERY);
  const resolvedVenue = useResolvedVenueContext(venueId);
  const { descriptor: venueObj, venue, auth, isAuthenticated } = resolvedVenue;
  const venueStatus = resolvedVenue.status ?? (venue ? "ready" : "absent");
  const router = useRouter();
  const prevVenueId = useRef<string | undefined>(undefined);
  const venueKey = venueObj?.venueId ?? "";
  // Last authoritative job count per venue: slice responses carry the live
  // count, so pagination and refresh can skip the list() count probe — the
  // window self-corrects (sliceJobWindow) if the index moved meanwhile.
  const countRef = useRef<{ venueId: string; count: number } | null>(null);
  // Read through a ref so the fetch callbacks don't depend on the auth
  // object's identity — it's only consulted when a fetch fails.
  const authRef = useRef(auth);
  authRef.current = auth;

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
  // One page of the full history: ranks [(page-1)*size, page*size) from the end.
  //
  // The window is positions-from-the-end, which needs a total count up front —
  // but `workspace.list("j", 1)` (for the count) and `workspace.slice("j", ...)`
  // (for the page) are two separate round trips, not one atomic read. If the
  // index grows between them the window is computed against a stale count and
  // silently comes out wrong (covia-ai/frontend#193: the newest job landed on
  // page 2 while page 1 still showed days-old entries). `slice`'s own response
  // carries the collection's count as read at slice time (CoviaAdapter.java
  // handleSlice computes `total` from the same live value it pages), so it's
  // authoritative for that specific read — if it disagrees with the count used
  // to pick the window, recompute against it and slice once more.
  const fetchPage = useCallback(async (page: number) => {
    if (!venue || venueStatus !== "ready") {
      resetPageQuery();
      return;
    }
    await runPageQuery(
      async () => {
        try {
          const cached = countRef.current;
          const guessCount = cached?.venueId === venueKey
            ? cached.count
            : (await venue.workspace.list("j", 1)).count ?? 0;
          const windowFor = (count: number) => {
            const end = Math.max(
              0,
              count - (page - 1) * ITEMS_PER_PAGE,
            );
            return {
              start: Math.max(0, end - ITEMS_PER_PAGE),
              end,
            };
          };
          const { count, values } = await sliceJobWindow(
            venue,
            windowFor,
            guessCount,
          );
          countRef.current = { venueId: venueKey, count };
          return {
            totalCount: count,
            records: jobRecordsFromSlice(values),
          };
        } catch (error) {
          revalidateVenueOnFailure(venue, authRef.current, error);
          throw error;
        }
      },
    );
  }, [venue, venueKey, venueStatus, resetPageQuery, runPageQuery]);

  // Filter mode: one slice of the newest FILTER_WINDOW records, filtered and
  // paged client-side. Filters only ever see this recent window — same
  // semantics as before, when the window was 100 individual per-job GETs.
  const fetchWindow = useCallback(async () => {
    if (!venue || venueStatus !== "ready") {
      resetRecentQuery();
      return;
    }
    await runRecentQuery(
      async () => {
        try {
          const cached = countRef.current;
          const guessCount = cached?.venueId === venueKey
            ? cached.count
            : (await venue.workspace.list("j", 1)).count ?? 0;
          const windowFor = (count: number) => ({
            start: Math.max(0, count - FILTER_WINDOW),
            end: count,
          });
          const { count, values } = await sliceJobWindow(
            venue,
            windowFor,
            guessCount,
          );
          countRef.current = { venueId: venueKey, count };
          return {
            totalCount: count,
            records: jobRecordsFromSlice(values),
          };
        } catch (error) {
          revalidateVenueOnFailure(venue, authRef.current, error);
          throw error;
        }
      },
    );
  }, [venue, venueKey, venueStatus, resetRecentQuery, runRecentQuery]);

  // Debounce free-text search so typing doesn't fire a fresh window fetch
  // on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const hasFilters = statusFilter.length > 0 || dateFilter.length > 0 || debouncedQuery.trim().length > 0;
  const windowRecords = recentData.records;

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
  const totalCount = hasFilters
    ? recentData.totalCount
    : pageData.totalCount || recentData.totalCount;
  const matchTotal = filteredRecords ? filteredRecords.length : totalCount;
  const {
    currentPage,
    setCurrentPage,
    totalPages,
  } = usePageNumber({
    totalItems: matchTotal,
    pageSize: ITEMS_PER_PAGE,
    resetKey: `${venueObj?.venueId ?? ""}\u0000${statusFilter.join(
      "\u0000",
    )}\u0000${dateFilter.join("\u0000")}\u0000${debouncedQuery}`,
  });
  const pageRecords = filteredRecords
    ? filteredRecords.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
      )
    : pageData.records;

  // Headline stats for the tile row — scoped to just the records shown on
  // the current page, so the numbers always match the table below instead
  // of summarizing a separate FILTER_WINDOW behind the scenes.
  const jobStats = useMemo(() => {
    const terminal = pageRecords.filter(j => TERMINAL_STATUSES.has(j.status as RunStatus));
    const completed = terminal.filter(j => j.status === RunStatus.COMPLETE);
    const successRate = terminal.length > 0 ? (completed.length / terminal.length) * 100 : null;
    const durationsMs = terminal
      .filter(j => j.created && j.updated)
      .map(j => new Date(j.updated as string).getTime() - new Date(j.created as string).getTime());
    const avgDurationMs = durationsMs.length > 0
      ? durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length
      : null;
    return { successRate, avgDurationMs, sampleSize: pageRecords.length };
  }, [pageRecords]);

  const loading = hasFilters ? recentLoading : pageLoading;
  const loadError = hasFilters ? recentError : pageError ?? recentError;

  // On venue change, reset view state and cached data BEFORE the fetch
  // effects below run (effect order matters: fetches keep stale data visible
  // during refresh, which must not leak across venues).
  useEffect(() => {
    if (!venueObj) return;
    if (prevVenueId.current !== venueObj.venueId) {
      setStatusFilter([]);
      setDateFilter([]);
      setSearchQuery("");
      setDebouncedQuery("");
      countRef.current = null;
      resetPageQuery();
      resetRecentQuery();
      prevVenueId.current = venueObj.venueId;
    }
  }, [venueObj, resetPageQuery, resetRecentQuery]);

  // Default mode: one windowed slice per page.
  useEffect(() => {
    if (!hasFilters) fetchPage(currentPage);
  }, [fetchPage, currentPage, hasFilters, refreshTick]);

  // Filter mode only: the 100-record window is a heavy read (full job
  // records, several hundred KB on busy venues), so it is fetched when
  // filters are first used — never on plain page loads or poll ticks.
  useEffect(() => {
    if (hasFilters) fetchWindow();
  }, [fetchWindow, hasFilters, refreshTick]);

  // Poll every 5 s when there are active jobs on the current page.
  useEffect(() => {
    const hasActive = pageRecords.some(j => ACTIVE_STATUSES.has(j.status as RunStatus));
    if (!hasActive || !venueObj) return;
    const id = setInterval(() => setRefreshTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, [pageRecords, venueObj]);

  if (venueStatus !== "ready")
    return (
      <ContentLayout>
        <TopBar venueId={venueId} venueName={venueObj?.metadata.name} />
        <VenueResolutionState
          status={venueStatus}
          error={resolvedVenue.error}
          icon={Activity}
          subject="Jobs"
          venueId={venueId}
        />
      </ContentLayout>
  )

    const encodedPath = (jobId:string) => {
        // No routeVenueId means this list is rendered from the unscoped
        // /jobs route — link to the venue-less /job/{id} route (venue comes
        // from whichever one is globally selected) instead of embedding the
        // venue slug, matching AssetCard's `scoped` behavior for assets and
        // operations.
        if (!venueId) return "/job/"+jobId;
        return "/venues/"+encodeURIComponent(venueObj?.venueId || "")+"/jobs/"+jobId;

    };

  return (
    <ContentLayout >
      <TopBar venueId={venueId} venueName={venueObj?.metadata.name}/>
      {/* Full-height column so the stat tiles pin to the viewport bottom via
          mt-auto: they hold position across pagination/refresh (short pages
          and the loading state leave slack instead of pulling them up) and
          scroll off naturally when the table outgrows the viewport. */}
      <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center mt-2 bg-background">
        <ListToolbar
          className="mt-4"
          actions={
            <FiltersSheet
              search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search by id, operation, or name..." }}
              groups={[
                { label: "Status", options: STATUS_OPTIONS, selected: statusFilter, onChange: setStatusFilter },
                { label: "Date", options: DATE_OPTIONS, selected: dateFilter, onChange: setDateFilter },
              ]}
            />
          }
          summary={
            <>
              Page {currentPage} : Showing {pageRecords.length} of {matchTotal}
              {hasFilters && matchTotal === 0 && !loading && (
                <span className="ml-2 text-muted-foreground">— no jobs match this filter</span>
              )}
            </>
          }
          pagination={
            <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={loading}></PaginationHeader>
          }
        />
        {loadError && <ErrorDisplay error={loadError} className="mb-4 w-full" />}
        {/* The table box and pagination stay mounted while loading, and
            refreshes keep the previous rows visible (stale-while-refresh) —
            the spinner only appears when there is nothing to show yet — so
            pagination and the poll never collapse or shift the layout. */}
        <div className="w-full min-h-[45vh] border border-border rounded-lg shadow-md overflow-hidden">
        {loading && pageRecords.length === 0 ? (
          <div className="flex items-center justify-center min-h-[45vh] w-full">
            <Spinner variant="ellipsis" className="text-primary" size={40} />
          </div>
        ) : (
        <Table>
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

          <TableBody className="[&_tr:last-child]:border-b!">
            {pageRecords.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-[38vh] text-center text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : [...pageRecords]
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
                  {job.created ? formatDateTime(job.created) : "--"}
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
        </Table>
        )}
        </div>
        <PaginationHeader currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={loading}></PaginationHeader>

        <div className="grid grid-cols-3 gap-4 w-full mt-auto pt-4">
          <StatTile
            icon={Layers}
            label="Total Jobs"
            value={totalCount.toLocaleString()}
            caption={isAuthenticated ? "for this user" : "across this venue"}
          />
          <StatTile
            icon={CheckCircle2}
            label="Success Rate"
            value={jobStats.successRate != null ? `${Math.round(jobStats.successRate)}%` : "–"}
            caption={jobStats.sampleSize > 0 ? `of ${jobStats.sampleSize} jobs on this page` : undefined}
            iconClassName={TONE_STYLES.success.text}
          />
          <StatTile
            icon={Clock}
            label="Avg Duration"
            value={jobStats.avgDurationMs != null
              ? getExecutionTime("1970-01-01T00:00:00.000Z", new Date(jobStats.avgDurationMs).toISOString())
              : "–"}
            caption={jobStats.sampleSize > 0 ? `of ${jobStats.sampleSize} jobs on this page` : undefined}
          />
        </div>
      </div>
    </ContentLayout>
);
}
