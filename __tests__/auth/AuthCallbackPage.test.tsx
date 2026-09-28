import React from "react";
import { act, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { notifyMock } from "@test/notify";
import AuthCallback from "@/app/auth/callback/page";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { oauthState } from "@/lib/oauth";

jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
jest.mock("@/lib/analytics", () => ({
  identify: jest.fn(() => Promise.resolve()),
  resetIdentity: jest.fn(),
}));
jest.mock("@/lib/utils", () => ({ gtmEvent: { signUp: jest.fn() } }));

const replace = jest.fn();
let query = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => query,
}));

const VENUE = { venueId: "did:web:venue.example", baseUrl: "https://venue.example", metadata: {} };
const USER = "did:key:z6MkUser";
const token = `h.${Buffer.from(JSON.stringify({ sub: USER, iss: VENUE.venueId })).toString("base64url")}.s`;

const arrive = (params: Record<string, string>) => {
  query = new URLSearchParams(params);
  window.history.replaceState(null, "", `/auth/callback?${query}`);
  return render(<AuthCallback />);
};

describe("/auth/callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    act(() => {
      useVenues.setState({ venues: [VENUE], selectedVenueId: VENUE.venueId });
      useAuthStore.setState({ authMap: {}, accountsMap: {}, deviceKeyHex: null, deviceKeys: [] });
    });
  });

  it("signs in and returns to where the sign-in started", () => {
    arrive({ token, did: USER, venueId: VENUE.venueId, returnTo: "/jobs", state: oauthState() });

    expect(useAuthStore.getState().getAuthForVenue(VENUE.venueId)).toEqual({
      type: "bearer",
      token,
      did: USER,
    });
    expect(replace).toHaveBeenCalledWith("/jobs");
  });

  it("strips the token-bearing query from the address bar", () => {
    arrive({ token, did: USER, venueId: VENUE.venueId, state: oauthState() });

    expect(window.location.search).toBe("");
  });

  it("does not sign in from a link this tab never asked for", () => {
    arrive({ token, did: USER, venueId: VENUE.venueId, state: "f".repeat(32) });

    expect(useAuthStore.getState().getAuthForVenue(VENUE.venueId)).toBeNull();
    expect(notifyMock.notifyError).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/signUp");
  });

  it("sends a visitor with no token to sign-in without raising an error", () => {
    arrive({});

    expect(notifyMock.notifyError).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/signUp");
  });

  // Clearing the URL updates useSearchParams; the effect must not run again
  // and replace the successful redirect with one to /signUp.
  it("redirects exactly once even when the search params change afterwards", () => {
    const view = arrive({ token, did: USER, venueId: VENUE.venueId, returnTo: "/jobs", state: oauthState() });

    query = new URLSearchParams();
    view.rerender(<AuthCallback />);

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/jobs");
  });
});
