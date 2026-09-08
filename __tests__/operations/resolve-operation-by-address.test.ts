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
