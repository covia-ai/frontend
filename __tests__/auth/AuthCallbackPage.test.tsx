import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { notifyMock } from "@test/notify";
import AuthCallback from "@/app/auth/callback/page";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { buildOAuthLoginUrl } from "@/lib/oauth";
import { webcrypto } from "node:crypto";

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
  const realCrypto = global.crypto;
  const realFetch = global.fetch;
  const fetchMock = jest.fn();
  beforeAll(() => Object.defineProperty(global, "crypto", { value: webcrypto, configurable: true }));
  afterAll(() => {
    Object.defineProperty(global, "crypto", { value: realCrypto, configurable: true });
    global.fetch = realFetch;
  });
  const start = async () => {
    const url = new URL(await buildOAuthLoginUrl({
      baseUrl: VENUE.baseUrl, provider: "google", frontendOrigin: window.location.origin,
      venueId: VENUE.venueId, returnTo: "/jobs",
    }));
    return { code: "one-use-code", state: url.searchParams.get("state")! };
  };
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    global.fetch = fetchMock.mockResolvedValue({ ok: true, json: async () => ({ token, did: USER }) });
    act(() => {
      useVenues.setState({ venues: [VENUE], selectedVenueId: VENUE.venueId });
      useAuthStore.setState({ authMap: {}, accountsMap: {}, deviceKeyHex: null, deviceKeys: [] });
    });
  });

  it("signs in and returns to where the sign-in started", async () => {
    arrive(await start());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/jobs"));
    expect(useAuthStore.getState().getAuthForVenue(VENUE.venueId)).toEqual({
      type: "bearer",
      token,
      did: USER,
    });
    expect(replace).toHaveBeenCalledWith("/jobs");
  });

  it("strips the code query from the address bar", async () => {
    arrive(await start());

    expect(window.location.search).toBe("");
  });

  it("does not sign in from a link this tab never asked for", async () => {
    arrive({ token, did: USER, venueId: VENUE.venueId, state: "f".repeat(32) });

    expect(useAuthStore.getState().getAuthForVenue(VENUE.venueId)).toBeNull();
    await waitFor(() => expect(notifyMock.notifyError).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith("/signUp");
  });

  it("sends a visitor with no code to sign-in without raising an error", async () => {
    arrive({});

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/signUp"));
    expect(notifyMock.notifyError).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/signUp");
  });

  // Clearing the URL updates useSearchParams; the effect must not run again
  // and replace the successful redirect with one to /signUp.
  it("redirects exactly once even when the search params change afterwards", async () => {
    const view = arrive(await start());

    query = new URLSearchParams();
    view.rerender(<AuthCallback />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/jobs"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/jobs");
  });
});
