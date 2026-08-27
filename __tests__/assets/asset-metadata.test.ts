import { loadAssetEntries } from "@/lib/asset-metadata";

// The venue has no bulk metadata read, so a cold cache pays one GET per id
// in batches — hydration order decides how fast the first screen paints.

const venueWith = (getAsset: jest.Mock) => ({ getAsset }) as never;

const asset = (id: string) => ({ id, metadata: { name: `asset ${id}` } });

describe("loadAssetEntries", () => {
  beforeEach(() => window.localStorage.clear());

  it("hydrates the leading priority ids before the rest of the catalog", async () => {
    const ids = Array.from({ length: 40 }, (_, i) => `id${String(i).padStart(2, "0")}`);
    const getAsset = jest.fn((id: string) => Promise.resolve(asset(id)));

    await loadAssetEntries(venueWith(getAsset), ids, undefined, 8);

    // Priority ids all requested before any non-priority id.
    const order = getAsset.mock.calls.map(([id]) => id);
    const lastPriority = Math.max(...ids.slice(0, 8).map((id) => order.indexOf(id)));
    const firstRest = Math.min(...ids.slice(8).map((id) => order.indexOf(id)));
    expect(lastPriority).toBeLessThan(firstRest);
  });

  it("serves cached ids without fetching and reports entries in input order", async () => {
    window.localStorage.setItem("asset-meta:idA", JSON.stringify({ name: "cached A" }));
    const getAsset = jest.fn((id: string) => Promise.resolve(asset(id)));

    const progress: string[][] = [];
    const entries = await loadAssetEntries(
      venueWith(getAsset),
      ["idA", "idB"],
      (snapshot) => progress.push(snapshot.map((e) => e.id)),
      2,
    );

    expect(getAsset).toHaveBeenCalledTimes(1);
    expect(getAsset).toHaveBeenCalledWith("idB");
    expect(entries.map((e) => e.id)).toEqual(["idA", "idB"]);
    // The cached tranche published immediately, before any fetch resolved.
    expect(progress[0]).toEqual(["idA"]);
  });

  it("skips ids whose fetch fails without failing the rest", async () => {
    const getAsset = jest.fn((id: string) =>
      id === "bad" ? Promise.reject(new Error("boom")) : Promise.resolve(asset(id)),
    );

    const entries = await loadAssetEntries(venueWith(getAsset), ["good", "bad"]);
    expect(entries.map((e) => e.id)).toEqual(["good"]);
  });
});
