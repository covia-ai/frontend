import { ContentLayout } from "@/components/admin-panel/content-layout";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { useActiveJobsLive } from "@/hooks/use-active-jobs-live";
import { JobMetadata, RunStatus }from "@covia/covia-sdk";
import { cn, formatDateTime, getExecutionTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduledList } from "@/components/ScheduledList";
import { FiltersSheet } from "@/components/FiltersSheet";
import { ListToolbar } from "@/components/ListToolbar";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { JobRowActions } from "@/components/jobs/JobRowActions";
import { JobDetailDrawer } from "@/components/jobs/JobDetailDrawer";
import { TONE_STYLES, toneForRunStatus } from "@/lib/status";
import { operationVisual, abbreviateJobId, jobDurationMs, percentile, durationFillClass } from "@/lib/job-visuals";
import { useOperationAdapters } from "@/hooks/use-operation-adapters";
import { Activity, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Copy, Gauge, Layers } from "lucide-react";
import { TopBar } from "./admin-panel/TopBar";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { revalidateVenueOnFailure } from "@/hooks/use-authenticated-venue";
import { VenueResolutionState } from "@/components/VenueResolutionState";
import {
  jobRecordsFromSlice,
  sliceJobWindow,
  jobTrendFromRecords,
  TERMINAL_STATUSES,
} from "@/lib/job-history";

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
// Headline stats summarise the most recent STATS_WINDOW jobs (venue-wide, not
// the current page) so the success rate and latency are stable and honest as
// you paginate. A bounded window keeps it one cheap job-free slice.
const STATS_WINDOW = 50;
const EMPTY_JOB_QUERY = { records: [] as JobMetadata[], totalCount: 0 };

interface JobListProps {
  venueId?: string;
}

export function JobList({ venueId }: JobListProps = {}) {
  // Lets SchedulePickerDialog's "Schedule created" toast deep-link to
  // /jobs?tab=scheduled (#230). Read after mount rather than via
  // next/navigation's useSearchParams so this doesn't force the route out
  // of static rendering / require a Suspense boundary for what's a one-off
  // query param read.
  const [activeTab, setActiveTab] = useState("history");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "scheduled") {
      setActiveTab("scheduled");
    }
  }, []);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<{ col: "operation" | "date" | "status"; dir: "asc" | "desc" }>({ col: "date", dir: "desc" });

  const toggleSort = (col: "operation" | "date" | "status") =>
    setSort(prev => prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
  const [refreshTick, setRefreshTick] = useState(0);
  const [drawerJob, setDrawerJob] = useState<JobMetadata | null>(null);
  // Infinite scroll: how many of the newest jobs are currently shown. Grows in
  // ITEMS_PER_PAGE steps as the user scrolls the list; the unfiltered fetch
  // reads the newest `visibleCount` from the lattice, filter mode slices its
  // window client-side to the same count.
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  // Set the moment a grow is requested; cleared when the next fetch settles, so
  // a burst of scroll events can't stack multiple windows at once.
  const growingRef = useRef(false);
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
  const {
    data: statsData,
    run: runStatsQuery,
    reset: resetStatsQuery,
  } = useLatestQuery(EMPTY_JOB_QUERY);
  const resolvedVenue = useResolvedVenueContext(venueId);
  const { descriptor: venueObj, venue, auth, isAuthenticated } = resolvedVenue;
  // Resolves each row's true operation adapter from a catalogue index read once
  // per venue (job-free), so a job whose `op` is a content hash (most of them —
  // covia#322) still shows its real adapter icon instead of the generic tile.
  const operationAdapters = useOperationAdapters(venue, isAuthenticated);
  const venueStatus = resolvedVenue.status ?? (venue ? "ready" : "absent");
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
  const fetchFeed = useCallback(async () => {
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
          // Infinite scroll reads the newest `visibleCount` from the end of the
          // index and grows it on scroll. Reading a fresh window from the end
          // each time (rather than appending offset pages) keeps the #193
          // offset-race from ever mattering: there is no drifting anchor, and a
          // job completing mid-scroll simply appears in the next read.
          const windowFor = (count: number) => ({
            start: Math.max(0, count - visibleCount),
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
  }, [venue, venueKey, venueStatus, visibleCount, resetPageQuery, runPageQuery]);

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

  // Headline stats window: the newest STATS_WINDOW records, venue-wide, read
  // once per venue/refresh and independent of the table's page or filters, so
  // the success rate and latency describe recent venue activity rather than
  // whatever ten rows happen to be on screen.
  const fetchStats = useCallback(async () => {
    if (!venue || venueStatus !== "ready") {
      resetStatsQuery();
      return;
    }
    await runStatsQuery(
      async () => {
        try {
          const cached = countRef.current;
          const guessCount = cached?.venueId === venueKey
            ? cached.count
            : (await venue.workspace.list("j", 1)).count ?? 0;
          const windowFor = (count: number) => ({
            start: Math.max(0, count - STATS_WINDOW),
            end: count,
          });
          const { count, values } = await sliceJobWindow(venue, windowFor, guessCount);
          countRef.current = { venueId: venueKey, count };
          return { totalCount: count, records: jobRecordsFromSlice(values) };
        } catch (error) {
          revalidateVenueOnFailure(venue, authRef.current, error);
          throw error;
        }
      },
    );
  }, [venue, venueKey, venueStatus, resetStatsQuery, runStatsQuery]);

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
      .filter(m => !q || [m.id, m.op, m.name].some(v => v?.toLowerCase().includes(q)));
  }, [hasFilters, windowRecords, statusFilter, dateFilter, debouncedQuery, isInRange]);

  // What the table renders: the server-paged window, or a client-side page
  // of the filtered records.
  const totalCount = hasFilters
    ? recentData.totalCount
    : pageData.totalCount || recentData.totalCount;
  const matchTotal = filteredRecords ? filteredRecords.length : totalCount;
  const resetKey = `${venueObj?.venueId ?? ""} ${statusFilter.join(" ")} ${dateFilter.join(" ")} ${debouncedQuery}`;
  // Reset the window to the first page whenever the venue or filters change.
  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [resetKey]);

  const pageRecords = filteredRecords
    ? filteredRecords.slice(0, visibleCount)
    : pageData.records;
  // More to load? Unfiltered: older jobs remain beyond what we've read.
  // Filtered: more rows remain in the fetched (FILTER_WINDOW) snapshot.
  const hasMore = filteredRecords
    ? visibleCount < filteredRecords.length
    : (pageData.records?.length ?? 0) < totalCount;
  // Filter mode only ever sees the newest FILTER_WINDOW jobs; note that at the end.
  const filterWindowCapped = !!filteredRecords && !hasMore && totalCount > FILTER_WINDOW;

  // Headline stats over the recent venue-wide window (STATS_WINDOW), not the
  // current page, so success rate and latency stay stable as you paginate.
  // CANCELLED is user-initiated, not a failure, so it counts as neither.
  const venueStats = useMemo(() => {
    const terminal = statsData.records.filter(j => TERMINAL_STATUSES.has(j.status as RunStatus));
    const completed = terminal.filter(j => j.status === RunStatus.COMPLETE);
    const failed = terminal.filter(j =>
      j.status !== RunStatus.COMPLETE && j.status !== RunStatus.CANCELLED);
    const successRate = terminal.length > 0 ? (completed.length / terminal.length) * 100 : null;
    const durations = terminal
      .map(jobDurationMs)
      .filter((ms): ms is number => ms != null);
    return {
      successRate,
      failures: failed.length,
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      sampleSize: terminal.length,
    };
  }, [statsData.records]);

  // Trend sparklines (covia-ai/frontend#225) from the same stats window.
  const jobTrend = useMemo(() => jobTrendFromRecords(statsData.records), [statsData.records]);

  // Longest duration on the visible page, so the latency bars are comparable
  // within a page (a relative scale reads better than an absolute one here).
  const pageMaxMs = useMemo(() => {
    const ds = pageRecords.map(jobDurationMs).filter((ms): ms is number => ms != null);
    return ds.length ? Math.max(...ds) : 0;
  }, [pageRecords]);

  const statsWindowCaption = venueStats.sampleSize > 0
    ? `last ${venueStats.sampleSize} jobs`
    : undefined;

  // Sort once, shared by the desktop table and the mobile card list.
  const sortedRecords = useMemo(() => [...pageRecords].sort((a, b) => {
    let cmp = 0;
    if (sort.col === "date") cmp = new Date(a.created ?? "").getTime() - new Date(b.created ?? "").getTime();
    else if (sort.col === "operation") cmp = (a.name ?? "").localeCompare(b.name ?? "");
    else if (sort.col === "status") cmp = (a.status ?? "").localeCompare(b.status ?? "");
    return sort.dir === "asc" ? cmp : -cmp;
  }), [pageRecords, sort]);

  // Live-stream the active rows on this page so their status flips instantly
  // (the detail view already streams; this brings the list up to parity).
  const activeIds = useMemo(
    () => sortedRecords.filter(j => ACTIVE_STATUSES.has(j.status as RunStatus)).map(j => j.id ?? "").filter(Boolean),
    [sortedRecords],
  );
  const liveJobs = useActiveJobsLive(venue, activeIds);

  const loading = hasFilters ? recentLoading : pageLoading;
  const loadError = hasFilters ? recentError : pageError ?? recentError;

  // Grow the window by one page. Guarded so scroll bursts don't stack windows.
  const maybeLoadMore = useCallback(() => {
    if (!hasMore || loading || growingRef.current) return;
    growingRef.current = true;
    setVisibleCount((v) => v + ITEMS_PER_PAGE);
  }, [hasMore, loading]);

  // Clear the grow guard once a fetch settles (unfiltered) or immediately
  // (filtered has no fetch), so the next scroll can load again.
  useEffect(() => { if (!pageLoading) growingRef.current = false; }, [pageLoading, pageData]);

  const onBoxScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 250) maybeLoadMore();
  }, [maybeLoadMore]);

  // Also grow when the sentinel scrolls into view within the list box (covers a
  // tall viewport where the initial window doesn't fill the scroll area).
  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollBoxRef.current;
    if (!el || !root || !hasMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) maybeLoadMore(); },
      { root, rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, maybeLoadMore, pageRecords.length]);

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
      resetStatsQuery();
      prevVenueId.current = venueObj.venueId;
    }
  }, [venueObj, resetPageQuery, resetRecentQuery, resetStatsQuery]);

  // Default mode: one windowed slice per page.
  useEffect(() => {
    if (!hasFilters) fetchFeed();
  }, [fetchFeed, hasFilters, refreshTick]);

  // Headline stats: one recent-window read per venue, refreshed on the poll.
  // Gated on a known count so it reuses the page load's count probe (via
  // countRef) rather than firing a second list() of its own.
  useEffect(() => {
    if (totalCount > 0) fetchStats();
  }, [fetchStats, refreshTick, totalCount]);

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList data-testid="jobs-tabs">
          <TabsTrigger value="history" data-testid="jobs-tab-history">History</TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="jobs-tab-scheduled">Scheduled</TabsTrigger>
        </TabsList>
        <TabsContent value="scheduled">
          <ScheduledList venueId={venueId} />
        </TabsContent>
        <TabsContent value="history">
      {/* Full-height column so the stat tiles pin to the viewport bottom via
          mt-auto: they hold position across pagination/refresh (short pages
          and the loading state leave slack instead of pulling them up) and
          scroll off naturally when the table outgrows the viewport. */}
      <div className="flex h-[calc(100vh-6rem)] flex-col items-center mt-2 bg-background">
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
              Showing {pageRecords.length} of {matchTotal}
              {hasFilters && matchTotal === 0 && !loading && (
                <span className="ml-2 text-muted-foreground">— no jobs match this filter</span>
              )}
            </>
          }
        />
        {loadError && <ErrorDisplay error={loadError} className="mb-4 w-full" />}
        {/* The table box and pagination stay mounted while loading, and
            refreshes keep the previous rows visible (stale-while-refresh) —
            the spinner only appears when there is nothing to show yet — so
            pagination and the poll never collapse or shift the layout. */}
        <div
          ref={scrollBoxRef}
          onScroll={onBoxScroll}
          className="w-full flex-1 min-h-[45vh] border border-border rounded-lg shadow-md overflow-auto"
        >
        {loading && pageRecords.length === 0 ? (
          <div className="flex items-center justify-center min-h-[45vh] w-full">
            <Spinner variant="ellipsis" className="text-primary" size={40} />
          </div>
        ) : (
        <>
        <Table className="hidden md:table">
          <TableHeader >
            <TableRow className="bg-secondary hover:bg-secondary rounded-full text-secondary-foreground ">
              <TableCell className="text-left">
                <button onClick={() => toggleSort("operation")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Operation
                  {sort.col === "operation" ? (sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                </button>
              </TableCell>
              <TableCell className="text-left">
                <button onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Started
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
              <TableCell className="w-10 text-right"><span className="sr-only">Actions</span></TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="[&_tr:last-child]:border-b!">
            {pageRecords.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-[38vh] text-center text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : sortedRecords
              .map((job) => {
                const eff = liveJobs[job.id ?? ""] ? { ...job, ...liveJobs[job.id ?? ""] } : job;
                const isTerminal = TERMINAL_STATUSES.has(eff.status as RunStatus);
                const tone = toneForRunStatus(eff.status);
                const isLive = !!liveJobs[job.id ?? ""] && ACTIVE_STATUSES.has(eff.status as RunStatus);
                const rowTint =
                  tone === "failure" ? "bg-destructive/5 hover:bg-destructive/10"
                  : tone === "attention" ? "bg-amber-500/5 hover:bg-amber-500/10"
                  : "";
                const { Icon, className: opClass } = operationVisual(job, operationAdapters.adapterFor(job.op));
                return (
              <TableRow key={job.id} className={cn("cursor-pointer", rowTint)} onClick={() => setDrawerJob(job)}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", opClass)}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{job.name ?? "Operation"}</div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (job.id) navigator.clipboard?.writeText(job.id); }}
                        title={`${job.id ?? ""} — click to copy`}
                        className="group mt-0.5 inline-flex items-center gap-1 rounded font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary"
                      >
                        {abbreviateJobId(job.id)}
                        <Copy size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {job.created ? formatDateTime(job.created) : "--"}
                </TableCell>
                <TableCell>
                  <DurationCell job={eff} maxMs={pageMaxMs} isTerminal={isTerminal} />
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    {isLive && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" title="Live" />}
                    <StatusBadge status={eff.status} kind="job" />
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <JobRowActions job={job} onChanged={() => setRefreshTick(t => t + 1)} />
                </TableCell>
              </TableRow>
                );
              })}
          </TableBody>
        </Table>
        {/* Mobile: stacked cards so nothing hides behind a horizontal scroll. */}
        <div className="divide-y divide-border md:hidden">
          {sortedRecords.length === 0 ? (
            <div className="flex h-[38vh] items-center justify-center text-muted-foreground">No jobs found</div>
          ) : sortedRecords.map((job) => {
            const eff = liveJobs[job.id ?? ""] ? { ...job, ...liveJobs[job.id ?? ""] } : job;
            const isTerminal = TERMINAL_STATUSES.has(eff.status as RunStatus);
            const tone = toneForRunStatus(eff.status);
            const isLive = !!liveJobs[job.id ?? ""] && ACTIVE_STATUSES.has(eff.status as RunStatus);
            const rowTint = tone === "failure" ? "bg-destructive/5" : tone === "attention" ? "bg-amber-500/5" : "";
            const { Icon, className: opClass } = operationVisual(job);
            const openJob = () => setDrawerJob(job);
            return (
              <div
                key={job.id}
                role="button"
                tabIndex={0}
                onClick={openJob}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openJob(); } }}
                className={cn("flex w-full cursor-pointer items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50", rowTint)}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", opClass)}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-foreground">{job.name ?? "Operation"}</span>
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1.5">
                      {isLive && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" title="Live" />}
                      <StatusBadge status={eff.status} kind="job" />
                    </span>
                    <JobRowActions job={job} onChanged={() => setRefreshTick(t => t + 1)} />
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                    <span>{abbreviateJobId(job.id)}</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{job.created ? formatDateTime(job.created) : "--"}</span>
                  </div>
                  <DurationCell job={eff} maxMs={pageMaxMs} isTerminal={isTerminal} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Infinite scroll: reaching here loads the next window of older jobs. */}
        <div className="flex items-center justify-center py-3">
          {hasMore ? (
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={maybeLoadMore} disabled={loading}>
              {loading ? <Spinner variant="ellipsis" size={16} /> : null}
              Load older jobs
            </Button>
          ) : filterWindowCapped ? (
            <span className="text-xs text-muted-foreground">
              Showing the most recent {FILTER_WINDOW} jobs — deeper filtering isn&apos;t supported yet.
            </span>
          ) : pageRecords.length > 0 ? (
            <span className="text-xs text-muted-foreground">End of jobs</span>
          ) : null}
          <div ref={sentinelRef} className="h-px w-px" aria-hidden />
        </div>
        </>
        )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full shrink-0 pt-4">
          <StatTile
            icon={Layers}
            label="Total Jobs"
            value={totalCount.toLocaleString()}
            caption={isAuthenticated ? "for this user" : "across this venue"}
          />
          <StatTile
            icon={CheckCircle2}
            label="Success Rate"
            value={venueStats.successRate != null ? `${Math.round(venueStats.successRate)}%` : "–"}
            caption={statsWindowCaption}
            iconClassName={TONE_STYLES.success.text}
            trend={jobTrend ? {
              data: jobTrend.successRate,
              formatValue: (v) => `${Math.round(v)}%`,
            } : undefined}
          />
          <StatTile
            icon={Gauge}
            label="Latency (p50)"
            value={fmtDurationMs(venueStats.p50Ms)}
            caption={venueStats.p95Ms != null ? `p95 ${fmtDurationMs(venueStats.p95Ms)}` : statsWindowCaption}
            trend={jobTrend ? {
              data: jobTrend.avgDurationMs,
              formatValue: (v) => fmtDurationMs(v),
            } : undefined}
          />
          <StatTile
            icon={AlertTriangle}
            label="Failures"
            value={venueStats.failures.toLocaleString()}
            caption={statsWindowCaption}
            iconClassName={venueStats.failures > 0 ? TONE_STYLES.failure.text : TONE_STYLES.neutral.text}
          />
        </div>
      </div>
        </TabsContent>
      </Tabs>
      <JobDetailDrawer
        job={drawerJob}
        venueId={venueId}
        fullHref={drawerJob ? encodedPath(drawerJob.id ?? "") : undefined}
        onOpenChange={(open) => { if (!open) setDrawerJob(null); }}
        onChanged={() => setRefreshTick(t => t + 1)}
      />
    </ContentLayout>
);
}

/** Format a millisecond duration using the same helper as the table cells. */
function fmtDurationMs(ms: number | null): string {
  if (ms == null) return "–";
  return getExecutionTime("1970-01-01T00:00:00.000Z", new Date(ms).toISOString());
}

/**
 * Latency as a bar plus a value. Terminal jobs show a colour-graded fill
 * (green fast, amber/red slow) scaled to the page's longest run; a running
 * job shows an indeterminate pulse and its elapsed time so far.
 */
function DurationCell({ job, maxMs, isTerminal }: { job: JobMetadata; maxMs: number; isTerminal: boolean }) {
  if (!isTerminal) {
    return job.created ? (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400" />
        </div>
        <span className="text-xs italic text-muted-foreground">
          {getExecutionTime(job.created, new Date().toISOString())} so far
        </span>
      </div>
    ) : (
      <span className="text-muted-foreground">--</span>
    );
  }
  const ms = jobDurationMs(job);
  if (ms == null) return <span className="text-muted-foreground">--</span>;
  const pct = maxMs > 0 ? Math.max(6, Math.round((ms / maxMs) * 100)) : 100;
  return (
    <div className="flex items-center gap-2" title={`${ms} ms`}>
      <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", durationFillClass(ms))} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {getExecutionTime(job.created ?? "", job.updated ?? "")}
      </span>
    </div>
  );
}
