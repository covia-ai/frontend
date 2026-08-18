import { sliceJobWindow, jobTrendFromRecords } from "@/lib/job-history";
import { RunStatus, type JobMetadata } from "@covia/covia-sdk";

// The venue rejects a single values response over ~1MB with this error shape;
// job records embed full inputs/outputs so real windows can trip it.
const capError = (bytes: number) =>
  new Error(`slice response ${bytes} bytes exceeds maxSize 1000000 — reduce limit`);

const venueWith = (slice: jest.Mock) => ({ workspace: { slice } }) as never;

const page = (offset: number, length: number, count: number) => ({
  exists: true,
  count,
  values: Array.from({ length }, (_, i) => ({
    key: String(offset + i),
    value: { id: `j${offset + i}` },
  })),
});

describe("sliceJobWindow read-cap handling", () => {
  it("halves the chunk when a slice exceeds the venue read cap", async () => {
    const slice = jest.fn((_p: string, offset: number, limit: number) =>
      limit > 50
        ? Promise.reject(capError(2_500_000))
        : Promise.resolve(page(offset, limit, 200)),
    );

    const { count, values } = await sliceJobWindow(
      venueWith(slice),
      (c) => ({ start: c - 100, end: c }),
      200,
    );

    expect(count).toBe(200);
    expect(values).toHaveLength(100);
    expect(slice.mock.calls.map(([, o, l]) => [o, l])).toEqual([
      [100, 100],
      [100, 50],
      [150, 50],
    ]);
  });

  it("skips a single oversize record instead of failing the whole window", async () => {
    const slice = jest.fn((_p: string, offset: number, limit: number) =>
      offset <= 5 && offset + limit > 5
        ? Promise.reject(capError(1_500_000))
        : Promise.resolve(page(offset, Math.min(limit, 10 - offset), 10)),
    );

    const { values } = await sliceJobWindow(
      venueWith(slice),
      () => ({ start: 0, end: 10 }),
      10,
    );

    expect(values).toHaveLength(9);
    expect(
      (values as Array<{ value: { id: string } }>).some((v) => v.value.id === "j5"),
    ).toBe(false);
  });

  it("propagates non-cap errors unchanged", async () => {
    const slice = jest.fn().mockRejectedValue(new Error("boom"));
    await expect(
      sliceJobWindow(venueWith(slice), () => ({ start: 0, end: 10 }), 10),
    ).rejects.toThrow("boom");
  });
});

// Minute offsets from a fixed base so records sort deterministically by
// `created` — the exact thing jobTrendFromRecords buckets on.
const BASE = Date.parse("2026-08-18T00:00:00.000Z");
function job(
  minutesAfterBase: number,
  status: RunStatus,
  durationMs?: number,
): JobMetadata {
  const created = new Date(BASE + minutesAfterBase * 60_000).toISOString();
  const updated = durationMs != null
    ? new Date(BASE + minutesAfterBase * 60_000 + durationMs).toISOString()
    : undefined;
  return { id: `j${minutesAfterBase}`, status, created, updated } as JobMetadata;
}

describe("jobTrendFromRecords", () => {
  it("returns null below the minimum sample size", () => {
    const records = [
      job(0, RunStatus.COMPLETE, 1000),
      job(1, RunStatus.COMPLETE, 1000),
      job(2, RunStatus.FAILED, 1000),
    ];
    expect(jobTrendFromRecords(records)).toBeNull();
  });

  it("excludes non-terminal and created-less records before bucketing", () => {
    const records = [
      job(0, RunStatus.COMPLETE, 1000),
      job(1, RunStatus.COMPLETE, 1000),
      job(2, RunStatus.FAILED, 1000),
      job(3, RunStatus.COMPLETE, 1000),
      { id: "pending", status: RunStatus.PENDING, created: undefined } as unknown as JobMetadata,
    ];
    const trend = jobTrendFromRecords(records);
    expect(trend).not.toBeNull();
    expect(trend!.successRate).toHaveLength(4);
    expect(trend!.avgDurationMs).toHaveLength(4);
  });

  it("computes a cumulative running success rate in chronological order", () => {
    // Shuffled input order — the function must sort by `created` itself.
    const records = [
      job(3, RunStatus.COMPLETE, 1000),
      job(0, RunStatus.COMPLETE, 1000),
      job(1, RunStatus.FAILED, 1000),
      job(2, RunStatus.COMPLETE, 1000),
    ];
    const trend = jobTrendFromRecords(records)!;
    // chronological: [COMPLETE, FAILED, COMPLETE, COMPLETE]
    expect(trend.successRate.map((p) => Math.round(p.value as number))).toEqual([
      100, // 1/1
      50, // 1/2
      67, // 2/3
      75, // 3/4
    ]);
  });

  it("uses each job's own duration for the avgDurationMs series, not an average", () => {
    const records = [
      job(0, RunStatus.COMPLETE, 1_000),
      job(1, RunStatus.COMPLETE, 5_000),
      job(2, RunStatus.COMPLETE, 2_000),
      job(3, RunStatus.FAILED, 3_000),
    ];
    const trend = jobTrendFromRecords(records)!;
    expect(trend.avgDurationMs.map((p) => p.value)).toEqual([1_000, 5_000, 2_000, 3_000]);
  });

  it("emits a null value for a bucket with no eligible duration", () => {
    const records = [
      job(0, RunStatus.COMPLETE, 1_000),
      job(1, RunStatus.COMPLETE, 1_000),
      job(2, RunStatus.COMPLETE, 1_000),
      { id: "no-updated", status: RunStatus.COMPLETE, created: new Date(BASE + 3 * 60_000).toISOString() } as JobMetadata,
    ];
    const trend = jobTrendFromRecords(records)!;
    expect(trend.avgDurationMs[3].value).toBeNull();
    // successRate still counts it — COMPLETE regardless of missing duration.
    expect(trend.successRate[3].value).toBe(100);
  });
});
