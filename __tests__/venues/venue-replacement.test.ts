import { applyVenueReplacement } from "@/lib/venue-replacement";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore } from "@/hooks/use-auth";

const OLD = "did:key:z6MkOldIdentity";
const NEW = "did:key:z6MkFreshIdentity";
const URL = "http://127.0.0.1:8080";

describe("applyVenueReplacement", () => {
  beforeEach(() => {
    useVenues.setState({
      venues: [
        { venueId: OLD, baseUrl: URL, metadata: { name: "Local" } },
        { venueId: "did:key:z6MkOther", baseUrl: "https://other.example", metadata: {} },
      ],
      selectedVenueId: OLD,
    });
    useAuthStore.setState({
      authMap: { [OLD]: { type: "bearer", token: "t", did: "did:me" } },
      accountsMap: { [OLD]: [{ type: "bearer", token: "t", did: "did:me" }] },
    } as never);
  });

  it("swaps the stored identity, migrates the selection, and purges dead credentials", () => {
    applyVenueReplacement({ oldId: OLD, newId: NEW, baseUrl: URL, name: "Local" });

    const state = useVenues.getState();
    expect(state.venues.map((v) => v.venueId)).toEqual(
      expect.arrayContaining([NEW, "did:key:z6MkOther"]),
    );
    expect(state.venues.some((v) => v.venueId === OLD)).toBe(false);
    expect(state.selectedVenueId).toBe(NEW);
    // Credentials scoped to the dead identity can never be valid again.
    expect(useAuthStore.getState().authMap[OLD]).toBeUndefined();
    expect(useAuthStore.getState().accountsMap[OLD]).toBeUndefined();
  });

  it("keeps an unrelated selection and is a no-op when the old id is already gone", () => {
    useVenues.setState({ selectedVenueId: "did:key:z6MkOther" });

    applyVenueReplacement({ oldId: OLD, newId: NEW, baseUrl: URL });
    expect(useVenues.getState().selectedVenueId).toBe("did:key:z6MkOther");

    const before = useVenues.getState().venues;
    applyVenueReplacement({ oldId: OLD, newId: NEW, baseUrl: URL });
    expect(useVenues.getState().venues).toBe(before);
  });
});
