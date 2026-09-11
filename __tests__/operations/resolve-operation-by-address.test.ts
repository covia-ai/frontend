import { resolveOperationByAddress } from "@/lib/operations-catalog";

describe("resolveOperationByAddress — hash-addressed operations (frontend#341)", () => {
  it("qualifies a bare 'a/<hash>' address with the venue's DID before calling getAsset", async () => {
    const getAsset = jest.fn(async (id: string) => ({ id }));
    const venue = { venueId: "did:key:z6MkVenue", getAsset } as never;

    const op = await resolveOperationByAddress(
      venue,
      "a/00393d79504cd8d3b97c53968356611b32f68dbd3950fadbcf12c460e974e5d5",
    );

    // GET /api/v1/assets/<id> 404s on live venues for a bare hash or a bare
    // "a/<hash>" — only the fully DID-qualified form resolves.
    expect(getAsset).toHaveBeenCalledWith(
      "did:key:z6MkVenue/a/00393d79504cd8d3b97c53968356611b32f68dbd3950fadbcf12c460e974e5d5",
    );
    expect((op as unknown as { id: string }).id).toBe(
      "did:key:z6MkVenue/a/00393d79504cd8d3b97c53968356611b32f68dbd3950fadbcf12c460e974e5d5",
    );
  });
});

// A job record's `op` is the reference that was invoked, which is a bare hash
// when the caller pinned a definition and on every record a venue wrote before
// 0.9.9 (covia#499). Those read as assets, not catalog paths.
describe("resolveOperationByAddress — a job record's bare-hash op (covia#499)", () => {
  const HASH = "00393d79504cd8d3b97c53968356611b32f68dbd3950fadbcf12c460e974e5d5";

  it("resolves a bare hash as an asset, DID-qualified like the a/ form", async () => {
    const getAsset = jest.fn(async (id: string) => ({ id }));
    const venue = { venueId: "did:key:z6MkVenue", getAsset } as never;

    await resolveOperationByAddress(venue, HASH);

    expect(getAsset).toHaveBeenCalledWith(`did:key:z6MkVenue/a/${HASH}`);
  });

  it("strips a 0x prefix before qualifying", async () => {
    const getAsset = jest.fn(async (id: string) => ({ id }));
    const venue = { venueId: "did:key:z6MkVenue", getAsset } as never;

    await resolveOperationByAddress(venue, `0x${HASH}`);

    expect(getAsset).toHaveBeenCalledWith(`did:key:z6MkVenue/a/${HASH}`);
  });

  it("leaves a catalog path alone — it is not hash-shaped", async () => {
    const getAsset = jest.fn(async (id: string) => ({ id }));
    const venue = { venueId: "did:key:z6MkVenue", getAsset } as never;

    await expect(resolveOperationByAddress(venue, "v/ops/json/merge")).rejects.toThrow();
    expect(getAsset).not.toHaveBeenCalled();
  });
});
