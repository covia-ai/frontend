import { venueDisplayName } from "@/lib/venue-display";

const venue = (
  name?: string,
  baseUrl = "https://venue-test.covia.ai",
  venueId = "did:web:venue-test.covia.ai",
) => ({ venueId, baseUrl, metadata: { name } });

describe("venueDisplayName", () => {
  it("prefers a configured human-readable name", () => {
    expect(venueDisplayName(venue("Test Venue"))).toBe("Test Venue");
  });

  it("uses the host when metadata repeats the venue DID", () => {
    expect(venueDisplayName(venue("did:web:venue-test.covia.ai"))).toBe(
      "venue-test.covia.ai",
    );
  });

  it("uses the host when a venue has no name", () => {
    expect(venueDisplayName(venue(undefined, "http://127.0.0.1:8080"))).toBe(
      "127.0.0.1:8080",
    );
  });

  it("turns a did:web fallback into a readable host", () => {
    expect(
      venueDisplayName(undefined, "did:web:venue.example:servers:primary"),
    ).toBe("venue.example");
  });

  it("abbreviates non-web DIDs when no better label is available", () => {
    const did = "did:key:z6MkhK66YbPRiRuQAmM6KsZh7a7jWbkzp2HnkV2QyrPdTkBR";
    expect(venueDisplayName(undefined, did)).toBe("did:key:z6MkhK66…TkBR");
  });
});
