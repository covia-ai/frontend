import { renderHook, waitFor } from "@testing-library/react";

// The hook composes a zustand store, the connection registry and the health
// reporter. Each is mocked so the test states exactly one thing: which
// identifier the route asked for, and what identity the venue answers with.

const CANONICAL = "did:key:z6MkqBTxiqjs9eNhvS9qY8B3HhgnYfKgAYqPy8X3MDqUJnmT";
const DID_WEB = "did:web:venue-3.covia.ai";
const BASE_URL = "https://venue-3.covia.ai";

let storedVenues: { venueId: string; baseUrl: string; metadata: { name?: string } }[] = [];
const addVenue = jest.fn((d: { venueId: string; baseUrl: string }) => {
  storedVenues = [
    ...storedVenues.filter((v) => v.venueId !== d.venueId),
    d as (typeof storedVenues)[number],
  ];
});

jest.mock("@/hooks/use-venues", () => ({
  useVenues: (selector: (s: unknown) => unknown) =>
    selector({ venues: storedVenues, selectedVenueId: null, addVenue }),
  toVenueDescriptor: (v: { venueId: string; baseUrl: string; metadata?: { name?: string } }) => ({
    venueId: v.venueId,
    baseUrl: v.baseUrl,
    metadata: { name: v.metadata?.name, description: undefined },
  }),
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ getAuthForVenue: () => null, authMap: {} }),
}));

const connectVenue = jest.fn();
jest.mock("@/lib/venue-registry", () => ({
  connectVenue: (...args: unknown[]) => connectVenue(...args),
}));

const reportVenueHealth = jest.fn();
jest.mock("@/hooks/use-venue-health", () => ({
  reportVenueHealth: (...args: unknown[]) => reportVenueHealth(...args),
}));

const notifyError = jest.fn();
jest.mock("@/lib/notify", () => ({ notifyError: (...a: unknown[]) => notifyError(...a) }));

import { useVenueForRoute } from "@/hooks/use-venue-for-route";

/** A venue that answers with its canonical did:key, whatever it was asked by. */
const venueAnswering = (venueId: string) => ({
  venueId,
  baseUrl: BASE_URL,
  metadata: { name: "Covia Venue (EC2)" },
  lastKnownStatus: { version: "0.9.8" },
});

beforeEach(() => {
  jest.clearAllMocks();
  storedVenues = [];
});

describe("useVenueForRoute", () => {
  it("resolves immediately when the route uses the stored canonical id", async () => {
    storedVenues = [{ venueId: CANONICAL, baseUrl: BASE_URL, metadata: {} }];

    const { result } = renderHook(() => useVenueForRoute(CANONICAL));

    expect(result.current.status).toBe("ready");
    expect(result.current.descriptor?.venueId).toBe(CANONICAL);
    expect(connectVenue).not.toHaveBeenCalled();
  });

  // #428: connectVenue resolves the canonical identity, so the descriptor is
  // stored under the did:key — never under the did:web the route asked for.
  // Matching only on the route string leaves this waiting forever.
  it("resolves a did:web route onto the canonical entry it connected to", async () => {
    connectVenue.mockResolvedValue(venueAnswering(CANONICAL));

    const { result } = renderHook(() => useVenueForRoute(DID_WEB));

    expect(result.current.status).toBe("connecting");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.descriptor?.venueId).toBe(CANONICAL);
    expect(result.current.error).toBeNull();
  });

  it("resolves a base-URL route the same way", async () => {
    connectVenue.mockResolvedValue(venueAnswering(CANONICAL));

    const { result } = renderHook(() => useVenueForRoute(BASE_URL));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.descriptor?.venueId).toBe(CANONICAL);
  });

  it("connects once for an alias route — it does not retry in a loop", async () => {
    connectVenue.mockResolvedValue(venueAnswering(CANONICAL));

    const { result, rerender } = renderHook(() => useVenueForRoute(DID_WEB));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender();
    rerender();

    expect(connectVenue).toHaveBeenCalledTimes(1);
  });

  it("stores the venue under its canonical id, not the alias", async () => {
    connectVenue.mockResolvedValue(venueAnswering(CANONICAL));

    const { result } = renderHook(() => useVenueForRoute(DID_WEB));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(addVenue).toHaveBeenCalledTimes(1);
    expect(addVenue.mock.calls[0][0].venueId).toBe(CANONICAL);
    expect(storedVenues.map((v) => v.venueId)).toEqual([CANONICAL]);
  });

  // The invariant the bug broke: "connecting" must be a state the hook can
  // leave. A connect that yields no identity has to end as an error, not as
  // silence.
  it("fails rather than hanging when a connect reports no venue identity", async () => {
    connectVenue.mockResolvedValue(venueAnswering(""));

    const { result } = renderHook(() => useVenueForRoute(DID_WEB));

    await waitFor(() => expect(result.current.status).toBe("unreachable"));
    expect(result.current.error).toMatch(/no venue identity/i);
    expect(addVenue).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalled();
  });

  it("still reports an unreachable venue as an error", async () => {
    connectVenue.mockRejectedValue(new Error("ECONNREFUSED"));

    const { result } = renderHook(() => useVenueForRoute(DID_WEB));

    await waitFor(() => expect(result.current.status).toBe("unreachable"));
    expect(result.current.error).toContain("ECONNREFUSED");
    expect(reportVenueHealth).toHaveBeenCalledWith(
      DID_WEB,
      expect.objectContaining({ state: "unreachable" }),
    );
  });

  it("keeps aliases separate — a second route does not inherit the first's mapping", async () => {
    connectVenue.mockResolvedValue(venueAnswering(CANONICAL));
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useVenueForRoute(id),
      { initialProps: { id: DID_WEB } },
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));

    const OTHER = "did:web:venue-4.covia.ai";
    connectVenue.mockResolvedValue(venueAnswering("did:key:zOther"));
    rerender({ id: OTHER });

    await waitFor(() => expect(result.current.descriptor?.venueId).toBe("did:key:zOther"));
  });
});
