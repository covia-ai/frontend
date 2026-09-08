import { renderHook, waitFor } from "@testing-library/react";
import { useAssetDetails } from "@/hooks/use-asset-details";

const HASH = "00393d79504cd8d3b97c53968356611b32f68dbd3950fadbcf12c460e974e5d5";
const VENUE_DID = "did:key:z6MkVenue";

function makeVenue(getAsset: jest.Mock) {
  return { venueId: VENUE_DID, getAsset } as never;
}

describe("useAssetDetails — hash qualification (frontend#341)", () => {
  it("qualifies a bare hash with the venue's DID before calling getAsset", async () => {
    const getAsset = jest.fn(async (id: string) => ({ id }));
    const venue = makeVenue(getAsset);

    renderHook(() => useAssetDetails(venue, HASH));

    await waitFor(() => expect(getAsset).toHaveBeenCalledWith(`${VENUE_DID}/a/${HASH}`));
  });

  it("passes an already DID-qualified id through unchanged", async () => {
    const getAsset = jest.fn(async (id: string) => ({ id }));
    const venue = makeVenue(getAsset);
    const fullId = `${VENUE_DID}/a/${HASH}`;

    renderHook(() => useAssetDetails(venue, fullId));

    await waitFor(() => expect(getAsset).toHaveBeenCalledWith(fullId));
  });

  it("leaves a mutable lattice path (not a hash) unchanged", async () => {
    const getAsset = jest.fn(async (id: string) => ({ id }));
    const venue = makeVenue(getAsset);

    renderHook(() => useAssetDetails(venue, "w/foo/bar"));

    await waitFor(() => expect(getAsset).toHaveBeenCalledWith("w/foo/bar"));
  });
});
