const mockConnect = jest.fn();
const mockVenueConstructor = jest.fn();

jest.mock("@covia/covia-sdk", () => ({
  Venue: class {
    static connect = mockConnect;
    constructor(options: unknown) {
      mockVenueConstructor(options);
      return { options };
    }
  },
  BearerAuth: class {},
  Ed25519Auth: { fromHex: jest.fn(() => ({})) },
}));

import {
  adoptVenueInstance,
  connectVenue,
  evictVenueInstances,
  getVenueFor,
} from "@/lib/venue-registry";

const descriptor = {
  venueId: "did:web:venue.example",
  baseUrl: "https://venue.example",
  metadata: { name: "Venue" },
};

describe("venue registry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    evictVenueInstances(descriptor.venueId);
  });

  it("keeps a distinct reusable instance per auth object", () => {
    const authA = { type: "bearer", did: "did:key:a", token: "a" } as const;
    const authB = { type: "bearer", did: "did:key:b", token: "b" } as const;

    const firstA = getVenueFor(descriptor, authA);
    expect(getVenueFor(descriptor, authA)).toBe(firstA);
    expect(getVenueFor(descriptor, authB)).not.toBe(firstA);
    expect(getVenueFor(descriptor, null)).not.toBe(firstA);
    expect(mockVenueConstructor).toHaveBeenCalledTimes(3);
  });

  it("adopts a connected instance for later consumers", () => {
    const connected = { ...descriptor } as any;
    adoptVenueInstance(connected);

    expect(getVenueFor(descriptor, null)).toBe(connected);
    expect(mockVenueConstructor).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent connects and adopts their result", async () => {
    let resolveConnect!: (venue: unknown) => void;
    mockConnect.mockReturnValue(new Promise((resolve) => {
      resolveConnect = resolve;
    }));
    const connected = { ...descriptor } as any;

    const first = connectVenue(descriptor.venueId, null, 1_000);
    const second = connectVenue(descriptor.venueId, null, 1_000);
    expect(second).toBe(first);
    expect(mockConnect).toHaveBeenCalledTimes(1);

    resolveConnect(connected);
    await expect(first).resolves.toBe(connected);
    expect(getVenueFor(descriptor, null)).toBe(connected);
  });
});
