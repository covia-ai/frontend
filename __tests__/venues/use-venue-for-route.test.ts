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
const connected = (venueId: string) => ({
  venueId,
  baseUrl: "https://routed.example",
  metadata: { name: "Routed" },
  lastKnownStatus: { version: "1.0" },
});

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
});
