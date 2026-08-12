import { StrictMode, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { GridError, type Venue } from "@covia/covia-sdk";
import { useValidateVenue } from "@/hooks/use-authenticated-venue";
import { useVenueAuthHealth } from "@/hooks/use-venue-auth-health";
import { useVenueHealth } from "@/hooks/use-venue-health";
import type { VenueAuth } from "@/hooks/use-auth";

const VENUE_ID = "did:web:venue.example";
const BASE_URL = "https://venue.example";
const AUTH: VenueAuth = {
  type: "keypair",
  did: "did:key:account",
  privateKeyHex: "abc",
};

describe("useValidateVenue", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    useVenueAuthHealth.setState({ byVenue: {} });
    useVenueHealth.setState({ byUrl: {} });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("accepts an account through the job-free agents endpoint", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ agents: [] }),
    });
    const apply = jest.fn((headers: Record<string, string>) => {
      headers.Authorization = "Bearer account-token";
    });
    const venue = {
      venueId: VENUE_ID,
      baseUrl: BASE_URL,
      auth: { apply },
      status: jest.fn().mockResolvedValue({ version: "1.0.0" }),
    } as unknown as Venue;

    renderHook(() => useValidateVenue(venue, AUTH), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <StrictMode>{children}</StrictMode>
      ),
    });

    await waitFor(() => {
      expect(useVenueAuthHealth.getState().byVenue[VENUE_ID]?.state).toBe(
        "accepted",
      );
    });
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/agents?includeTerminated=false`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer account-token",
        },
      },
    );
    expect(apply).toHaveBeenCalledWith(expect.any(Object), VENUE_ID);
    expect(useVenueHealth.getState().byUrl[BASE_URL]?.state).toBe("connected");
  });

  it("records an auth-gated venue as reachable but not public", async () => {
    global.fetch = jest.fn();
    const venue = {
      venueId: VENUE_ID,
      baseUrl: BASE_URL,
      auth: { apply: jest.fn() },
      status: jest.fn().mockRejectedValue(new GridError(403, "Sign in required")),
    } as unknown as Venue;

    renderHook(() => useValidateVenue(venue));

    await waitFor(() => {
      expect(useVenueHealth.getState().byUrl[BASE_URL]).toMatchObject({
        state: "connected",
        publicAccess: false,
      });
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
