import type { JobMetadata, Venue } from "@covia/covia-sdk";

export type JobWindow = {
  count: number;
  values: unknown[];
};

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
