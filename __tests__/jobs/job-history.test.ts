import { sliceJobWindow } from "@/lib/job-history";

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
