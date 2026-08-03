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
  const { start, end } = windowFor(guessCount);
  let response =
    end > start
      ? await venue.workspace.slice("j", start, end - start)
      : { values: [], count: guessCount };
  const freshCount = response.count ?? guessCount;

  if (freshCount !== guessCount) {
    const corrected = windowFor(freshCount);
    response =
      corrected.end > corrected.start
        ? await venue.workspace.slice(
            "j",
            corrected.start,
            corrected.end - corrected.start,
          )
        : { values: [], count: freshCount };
  }

  return {
    count: response.count ?? freshCount,
    values: (response.values as unknown[]) ?? [],
  };
}
