import { act, renderHook, waitFor } from "@testing-library/react";
import { notifyMock } from "@test/notify";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenueForRoute } from "@/hooks/use-venue-for-route";
import { useVenues } from "@/hooks/use-venues";
import { connectVenue } from "@/lib/venue-registry";

jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
jest.mock("@/lib/venue-registry", () => ({ connectVenue: jest.fn() }));

const connect = connectVenue as jest.Mock;
const KNOWN = { venueId: "did:web:known.example", baseUrl: "https://known.example", metadata: {} };
const ROUTED = "did:web:routed.example";
const ROUTED_URL = "https://routed.example";
// connectVenue resolves whichever identifier the route used to the canonical
// did:key the store is keyed by.
const CANONICAL = "did:key:z6MkqBTxiqjs9eNhvS9qY8B3HhgnYfKgAYqPy8X3MDqUJnmT";
const connected = (venueId: string, baseUrl = ROUTED_URL) => ({
  venueId,
  baseUrl,
  metadata: { name: "Routed" },
  lastKnownStatus: { version: "1.0" },
});
const storedIds = () => useVenues.getState().venues.map((v) => v.venueId);

describe("useVenueForRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useVenues.setState({ venues: [KNOWN], selectedVenueId: KNOWN.venueId });
      useAuthStore.setState({ authMap: {}, accountsMap: {}, deviceKeyHex: null, deviceKeys: [] });
    });
  });

  it("uses the selected venue when the route names none", () => {
    const { result } = renderHook(() => useVenueForRoute());

    expect(result.current).toEqual({ descriptor: KNOWN, status: "ready", error: null });
    expect(connect).not.toHaveBeenCalled();
  });

  it("resolves immediately when the route uses the stored id", () => {
    const { result } = renderHook(() => useVenueForRoute(KNOWN.venueId));

    expect(result.current).toEqual({ descriptor: KNOWN, status: "ready", error: null });
    expect(connect).not.toHaveBeenCalled();
  });

  it("connects to a routed venue it does not know yet, then resolves to it", async () => {
    connect.mockResolvedValue(connected(ROUTED));
    const { result } = renderHook(() => useVenueForRoute(ROUTED));

    expect(result.current.status).toBe("connecting");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.descriptor?.venueId).toBe(ROUTED);
    // Viewing a venue never reassigns the global selection (#199).
    expect(useVenues.getState().selectedVenueId).toBe(KNOWN.venueId);
  });

  // did:web encodes a port as %3A by specification; the page has already
  // decoded the URL segment once, so this id must reach connect() untouched.
  it("connects with the id exactly as given, preserving a did:web port", async () => {
    const withPort = "did:web:localhost%3A8080";
    connect.mockResolvedValue(connected(withPort));
    renderHook(() => useVenueForRoute(withPort));

    await waitFor(() => expect(connect).toHaveBeenCalled());
    expect(connect.mock.calls[0][0]).toBe(withPort);
  });

  it("reports an unreachable venue once, without retrying in a loop", async () => {
    connect.mockRejectedValue(new Error("connection refused"));
    const { result, rerender } = renderHook(() => useVenueForRoute(ROUTED));

    await waitFor(() => expect(result.current.status).toBe("unreachable"));
    rerender();

    expect(result.current.error).toBe("connection refused");
    expect(connect).toHaveBeenCalledTimes(1);
    expect(notifyMock.notifyError).toHaveBeenCalledTimes(1);
  });

  it("retries a failed connect after a fresh sign-in, even for the same account", async () => {
    connect.mockRejectedValueOnce(new Error("401")).mockResolvedValue(connected(ROUTED));
    act(() => useAuthStore.getState().loginWithToken(ROUTED, "expired-token", "did:me"));
    const { result } = renderHook(() => useVenueForRoute(ROUTED));
    await waitFor(() => expect(result.current.status).toBe("unreachable"));

    act(() => useAuthStore.getState().loginWithToken(ROUTED, "renewed-token", "did:me"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(connect.mock.calls[1][1]).toMatchObject({ token: "renewed-token" });
  });

  // #428: connectVenue resolves the canonical identity, so the descriptor is
  // stored under the did:key — never under the did:web or URL the route asked
  // for. Matching only on the route string left these routes "connecting"
  // forever.
  describe("a route addressed by an alias", () => {
    it.each([
      ["did:web", ROUTED],
      ["base-URL", ROUTED_URL],
    ])("resolves a %s route onto the canonical entry it connected to", async (_kind, routeId) => {
      connect.mockResolvedValue(connected(CANONICAL));
      const { result, rerender } = renderHook(() => useVenueForRoute(routeId));

      expect(result.current.status).toBe("connecting");
      await waitFor(() => expect(result.current.status).toBe("ready"));
      expect(result.current.descriptor?.venueId).toBe(CANONICAL);
      expect(result.current.error).toBeNull();

      // Stored once, under the canonical id only — and settled, not looping.
      rerender();
      rerender();
      expect(connect).toHaveBeenCalledTimes(1);
      expect(storedIds()).toHaveLength(2);
      expect(storedIds()).toContain(CANONICAL);
      expect(storedIds()).not.toContain(routeId);
    });

    it("keeps aliases separate — a second route does not inherit the first's mapping", async () => {
      connect.mockResolvedValue(connected(CANONICAL));
      const { result, rerender } = renderHook(
        ({ id }: { id: string }) => useVenueForRoute(id),
        { initialProps: { id: ROUTED } },
      );
      await waitFor(() => expect(result.current.status).toBe("ready"));

      connect.mockResolvedValue(connected("did:key:zOther", "https://other.example"));
      rerender({ id: "did:web:other.example" });

      await waitFor(() => expect(result.current.descriptor?.venueId).toBe("did:key:zOther"));
    });

    // The invariant the bug broke: "connecting" must be a state the hook can
    // leave. A connect that yields no identity has to end as an error, not as
    // silence.
    it("fails rather than hanging when a connect reports no venue identity", async () => {
      connect.mockResolvedValue(connected(""));
      const { result } = renderHook(() => useVenueForRoute(ROUTED));

      await waitFor(() => expect(result.current.status).toBe("unreachable"));
      expect(result.current.error).toMatch(/no venue identity/i);
      expect(storedIds()).toEqual([KNOWN.venueId]);
      expect(notifyMock.notifyError).toHaveBeenCalledTimes(1);
    });
  });
});
