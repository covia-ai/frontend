// Complete double for `@/hooks/use-authenticated-venue`.
//
//   import { venueMock, setVenue } from "@test/use-authenticated-venue";
//   jest.mock("@/hooks/use-authenticated-venue", () =>
//     require("@test/use-authenticated-venue").venueMock);
//
// The real hook returns the SDK `Venue` instance every feature reads through,
// so tests supply only the managers they exercise. `setVenue` deep-merges onto
// a baseline whose managers all resolve empty, so a component that lists
// something the test did not stub gets an empty list rather than a crash on
// `undefined.list`.

export type MockVenue = Record<string, any>;

export const VENUE_ID = "did:key:z6MkTestVenue";
export const VENUE_BASE_URL = "https://venue.test";

/** Managers resolve empty; override only what a test actually asserts on. */
function baselineVenue(): MockVenue {
  return {
    venueId: VENUE_ID,
    baseUrl: VENUE_BASE_URL,
    assets: {
      list: jest.fn().mockResolvedValue([]),
      listAssets: jest.fn().mockResolvedValue([]),
      getAsset: jest.fn().mockResolvedValue(null),
    },
    jobs: {
      list: jest.fn().mockResolvedValue([]),
      getJob: jest.fn().mockResolvedValue(null),
    },
    operations: { list: jest.fn().mockResolvedValue([]) },
    agents: { list: jest.fn().mockResolvedValue([]) },
    secrets: { list: jest.fn().mockResolvedValue([]) },
    workspace: { read: jest.fn().mockResolvedValue(null) },
    status: jest.fn().mockResolvedValue({ version: "test" }),
  };
}

let venue: MockVenue | null = baselineVenue();

export const venueMock = {
  useAuthenticatedVenue: jest.fn<MockVenue | null, []>(() => venue),
  useValidateVenue: jest.fn(),
  useValidateVenueById: jest.fn(),
  revalidateVenueOnFailure: jest.fn(),
  evictVenueInstances: jest.fn(),
  getVenueFor: jest.fn(() => venue),
};

/**
 * Overrides part of the venue for one test. Pass `null` for the signed-out
 * case, where the real hook also returns null.
 */
export function setVenue(overrides: MockVenue | null): MockVenue | null {
  venue = overrides === null ? null : mergeVenue(baselineVenue(), overrides);
  return venue;
}

/** One level deep — enough to replace a single manager method. */
function mergeVenue(base: MockVenue, overrides: MockVenue): MockVenue {
  const merged: MockVenue = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const existing = merged[key];
    merged[key] =
      value && typeof value === "object" && !Array.isArray(value) &&
      typeof value !== "function" &&
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...existing, ...value }
        : value;
  }
  return merged;
}

export function resetVenueMock(): void {
  venue = baselineVenue();
  venueMock.useAuthenticatedVenue.mockReset();
  venueMock.useAuthenticatedVenue.mockImplementation(() => venue);
  venueMock.getVenueFor.mockReset();
  venueMock.getVenueFor.mockImplementation(() => venue);
  venueMock.useValidateVenue.mockClear();
  venueMock.useValidateVenueById.mockClear();
  venueMock.revalidateVenueOnFailure.mockClear();
  venueMock.evictVenueInstances.mockClear();
}
