import { RunStatus, isJobFinished, isJobPaused, type JobMetadata, type Venue } from "@covia/covia-sdk";

export type JobWindow = {
  count: number;
  values: unknown[];
};

// "Finished" is the SDK's isJobFinished everywhere. The two predicates below
// are the only other status groupings the jobs UI needs, kept here so the
// list, its rows and the row actions cannot drift apart again.

// Live: can change without anyone acting, so the list streams and polls it.
// INPUT_REQUIRED / AUTH_REQUIRED are deliberately excluded — they wait on a
// person, possibly for days, and an SSE stream per waiting row would eat the
// browser's per-host connection budget for nothing.
const LIVE_STATUSES: ReadonlySet<string> = new Set([
  RunStatus.PENDING, RunStatus.STARTED, RunStatus.PAUSED,
]);

export function isJobLive(status?: string): boolean {
  return !!status && LIVE_STATUSES.has(status);
}

// Cancellable: every unfinished state, so also the jobs waiting on a person —
// exactly the ones a user most often wants to abandon.
export function isJobCancellable(status?: string): boolean {
  return isJobLive(status) || isJobPaused(status as RunStatus);
}

export function jobRecordsFromSlice(values: unknown[]): JobMetadata[] {
  const records: JobMetadata[] = [];
  for (const entry of values ?? []) {
    const record = entry as {
      key?: unknown;
      value?: JobMetadata;
    };
    if (!record.value) continue;
    records.push({
      ...record.value,
      id: record.value.id ?? `0x${String(record.key ?? "")}`,
    });
  }
  return records.reverse();
}

const MAX_SLICE_LIMIT = 100;

// The venue caps a single values response (~1MB) and rejects an oversize
// slice with an "exceeds maxSize" error. Job records embed their full
// inputs/outputs, so a window of fat jobs can trip the cap at modest limits.
function isSliceCapError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("exceeds maxSize");
}

/**
 * Read job-index ranks [start, end) in cap-aware chunks: halve the chunk on
 * an oversize response and skip a record that is individually oversize, so
 * one fat job degrades the window by one row instead of failing the read.
 */
async function readJobRange(
  venue: Venue,
  start: number,
  end: number,
): Promise<{ count?: number; values: unknown[] }> {
  const values: unknown[] = [];
  let count: number | undefined;
  let pos = start;
  let chunk = MAX_SLICE_LIMIT;
  while (pos < end) {
    const limit = Math.min(chunk, end - pos);
    try {
      const response = await venue.workspace.slice("j", pos, limit);
      count = response.count ?? count;
      const got = (response.values as unknown[]) ?? [];
      values.push(...got);
      if (got.length < limit) break; // index shrank mid-read
      pos += got.length;
    } catch (error) {
      if (!isSliceCapError(error)) throw error;
      if (limit > 1) {
        chunk = Math.max(1, Math.floor(limit / 2));
        continue;
      }
      pos += 1;
    }
  }
  return { count, values };
}

/**
 * Reads a job-index window and corrects it once if the collection grew between
 * the preliminary count and the slice. The slice count is authoritative for
 * the data returned by that read.
 */
export async function sliceJobWindow(
  venue: Venue,
  windowFor: (count: number) => { start: number; end: number },
  guessCount: number,
): Promise<JobWindow> {
  const read = async ({ start, end }: { start: number; end: number }) =>
    end > start
      ? readJobRange(venue, start, end)
      : { count: undefined, values: [] as unknown[] };

  let response = await read(windowFor(guessCount));
  const freshCount = response.count ?? guessCount;

  if (freshCount !== guessCount) {
    response = await read(windowFor(freshCount));
  }

  return {
    count: response.count ?? freshCount,
    values: response.values,
  };
}

export interface TrendPoint {
  label: string;
  value: number | null;
}

export interface JobTrend {
  successRate: TrendPoint[];
  avgDurationMs: TrendPoint[];
}

// Below this many terminal-status records, a per-record trend line is noise,
// not signal — StatTile falls back to its plain no-sparkline layout instead.
const MIN_RECORDS_FOR_TREND = 4;

const bucketLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * Derives Jobs-page trend sparkline data from the records the page already
 * holds for its headline stats (JobList's STATS_WINDOW read) — no fetch of its
 * own. Two different aggregations per metric, chosen because a raw per-job
 * success/fail (0/100) reads as an illegible zigzag at this sample size:
 *
 * - avgDurationMs: one point per terminal record, chronological — each job's
 *   own duration, no smoothing needed.
 * - successRate: a *cumulative* running rate (point i = success rate of the
 *   first i terminal jobs so far) — the standard technique for a readable
 *   rate trend from a small binary-outcome sample.
 */
export function jobTrendFromRecords(records: JobMetadata[]): JobTrend | null {
  const terminal = records
    .filter((j) => j.created && isJobFinished(j.status as RunStatus))
    .sort((a, b) => new Date(a.created as string).getTime() - new Date(b.created as string).getTime());

  if (terminal.length < MIN_RECORDS_FOR_TREND) return null;

  const successRate: TrendPoint[] = [];
  const avgDurationMs: TrendPoint[] = [];
  let successCount = 0;

  terminal.forEach((job, i) => {
    const label = bucketLabelFormatter.format(new Date(job.created as string));
    if (job.status === RunStatus.COMPLETE) successCount += 1;
    successRate.push({ label, value: (successCount / (i + 1)) * 100 });

    const hasDuration = Boolean(job.created && job.updated);
    avgDurationMs.push({
      label,
      value: hasDuration
        ? new Date(job.updated as string).getTime() - new Date(job.created as string).getTime()
        : null,
    });
  });

  return { successRate, avgDurationMs };
}
