import "@testing-library/jest-dom";
import { act, renderHook } from "@testing-library/react";
import { useAuthStore, useCurrentAuth } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";

const MOCK_HEX = "0101010101010101010101010101010101010101010101010101010101010101";
const VENUE_A = "did:web:venue-a.example.com";
const VENUE_B = "did:web:venue-b.example.com";
const descriptor = (venueId: string) => ({
  venueId,
  baseUrl: `https://${venueId.slice("did:web:".length)}`,
  metadata: { name: venueId },
});

describe("useAuthStore", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({ authMap: {}, accountsMap: {}, deviceKeyHex: null, deviceKeys: [] });
      useVenues.setState({
        venues: [descriptor(VENUE_A), descriptor(VENUE_B)],
        selectedVenueId: VENUE_A,
      });
    });
  });

  it("stores keypair auth by venue", () => {
    act(() => {
      useAuthStore
        .getState()
        .loginWithKeypair(VENUE_A, "abc123", "did:key:z6Mk...");
    });

    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toEqual({
      type: "keypair",
      privateKeyHex: "abc123",
      did: "did:key:z6Mk...",
    });
  });

  it("stores bearer auth by venue", () => {
    act(() => {
      useAuthStore
        .getState()
        .loginWithToken(VENUE_A, "token123", "did:key:z6Mk...");
    });

    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toEqual({
      type: "bearer",
      token: "token123",
      did: "did:key:z6Mk...",
    });
  });

  it("derives current auth from the selected venue without duplicating it", () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, "tokenA", "did:a");
      useAuthStore.getState().loginWithToken(VENUE_B, "tokenB", "did:b");
    });
    const { result } = renderHook(() => useCurrentAuth());

    expect(result.current).toMatchObject({ token: "tokenA" });
    act(() => useVenues.getState().selectVenue(VENUE_B));
    expect(result.current).toMatchObject({ token: "tokenB" });
  });

  it("returns null for a venue with no stored auth", () => {
    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toBeNull();
  });

  it("logs out one venue and preserves other credentials and the device key", () => {
    act(() => {
      useAuthStore.getState().setDeviceKeyHex(MOCK_HEX);
      useAuthStore
        .getState()
        .loginWithKeypair(VENUE_A, MOCK_HEX, "did:key:z6Mk...");
      useAuthStore.getState().loginWithToken(VENUE_B, "tokenB", "did:b");
      useAuthStore.getState().logout(VENUE_A);
    });

    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toBeNull();
    expect(useAuthStore.getState().getAuthForVenue(VENUE_B)).toMatchObject({
      token: "tokenB",
    });
    expect(useAuthStore.getState().deviceKeyHex).toBe(MOCK_HEX);
  });

  it("stores and returns the reusable device key", () => {
    expect(useAuthStore.getState().getDeviceKeyHex()).toBeNull();
    act(() => useAuthStore.getState().setDeviceKeyHex(MOCK_HEX));
    expect(useAuthStore.getState().getDeviceKeyHex()).toBe(MOCK_HEX);
  });

  it("records every login in the venue's account history, most recent first", () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, "token1", "did:a1");
      useAuthStore.getState().loginWithKeypair(VENUE_A, MOCK_HEX, "did:a2");
    });

    const accounts = useAuthStore.getState().accountsMap[VENUE_A];
    expect(accounts.map((a) => a.did)).toEqual(["did:a2", "did:a1"]);
    // Active follows the latest login.
    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toMatchObject({ did: "did:a2" });
  });

  it("keeps the account choosable after logout and reactivates it via switchAccount", () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, "token1", "did:a1");
      useAuthStore.getState().logout(VENUE_A);
    });

    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toBeNull();
    expect(useAuthStore.getState().accountsMap[VENUE_A]).toHaveLength(1);

    act(() => useAuthStore.getState().switchAccount(VENUE_A, "did:a1"));
    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toMatchObject({
      did: "did:a1",
      token: "token1",
    });
  });

  it("switches between two accounts on the same venue and marks the chosen one last-used", () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, "token1", "did:a1");
      useAuthStore.getState().loginWithToken(VENUE_A, "token2", "did:a2");
      useAuthStore.getState().switchAccount(VENUE_A, "did:a1");
    });

    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toMatchObject({ did: "did:a1" });
    expect(useAuthStore.getState().accountsMap[VENUE_A].map((a) => a.did)).toEqual([
      "did:a1",
      "did:a2",
    ]);
  });

  it("re-login with the same identity dedups the history instead of growing it", () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, "old-token", "did:a1");
      useAuthStore.getState().loginWithToken(VENUE_A, "fresh-token", "did:a1");
    });

    const accounts = useAuthStore.getState().accountsMap[VENUE_A];
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ token: "fresh-token" });
  });

  it("removeAccount forgets the account and clears the active slot when it was active", () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, "token1", "did:a1");
      useAuthStore.getState().loginWithToken(VENUE_A, "token2", "did:a2");
      useAuthStore.getState().removeAccount(VENUE_A, "did:a2");
    });

    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toBeNull();
    expect(useAuthStore.getState().accountsMap[VENUE_A].map((a) => a.did)).toEqual(["did:a1"]);

    act(() => useAuthStore.getState().removeAccount(VENUE_A, "did:a1"));
    expect(useAuthStore.getState().accountsMap[VENUE_A]).toBeUndefined();
  });

  it("purgeVenueAuth drops both the active account and the history for one venue only", () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, "tokenA", "did:a");
      useAuthStore.getState().loginWithToken(VENUE_B, "tokenB", "did:b");
      useAuthStore.getState().purgeVenueAuth(VENUE_A);
    });

    expect(useAuthStore.getState().getAuthForVenue(VENUE_A)).toBeNull();
    expect(useAuthStore.getState().accountsMap[VENUE_A]).toBeUndefined();
    expect(useAuthStore.getState().getAuthForVenue(VENUE_B)).toMatchObject({ token: "tokenB" });
    expect(useAuthStore.getState().accountsMap[VENUE_B]).toHaveLength(1);
  });

  it("addDeviceKey dedups and makes the first key the default", () => {
    const KEY_B = "b".repeat(64);
    act(() => {
      useAuthStore.getState().addDeviceKey(MOCK_HEX);
      useAuthStore.getState().addDeviceKey(KEY_B);
      useAuthStore.getState().addDeviceKey(MOCK_HEX);
    });

    expect(useAuthStore.getState().deviceKeys).toEqual([MOCK_HEX, KEY_B]);
    expect(useAuthStore.getState().deviceKeyHex).toBe(MOCK_HEX);
  });

  it("removeDeviceKey promotes the next key to default when the default is removed", () => {
    const KEY_B = "b".repeat(64);
    act(() => {
      useAuthStore.getState().addDeviceKey(MOCK_HEX);
      useAuthStore.getState().addDeviceKey(KEY_B);
      useAuthStore.getState().removeDeviceKey(MOCK_HEX);
    });

    expect(useAuthStore.getState().deviceKeys).toEqual([KEY_B]);
    expect(useAuthStore.getState().deviceKeyHex).toBe(KEY_B);

    act(() => useAuthStore.getState().removeDeviceKey(KEY_B));
    expect(useAuthStore.getState().deviceKeyHex).toBeNull();
  });

  it("setDeviceKeyHex records the key in the known list", () => {
    act(() => useAuthStore.getState().setDeviceKeyHex(MOCK_HEX));
    expect(useAuthStore.getState().deviceKeys).toEqual([MOCK_HEX]);
  });

  it("switching the selected venue restores that venue's last-used account", () => {
    act(() => {
      useAuthStore.getState().loginWithToken(VENUE_A, "tokenA", "did:a");
      useAuthStore.getState().loginWithKeypair(VENUE_B, MOCK_HEX, "did:b");
    });
    const { result } = renderHook(() => useCurrentAuth());

    expect(result.current).toMatchObject({ did: "did:a", type: "bearer" });
    act(() => useVenues.getState().selectVenue(VENUE_B));
    expect(result.current).toMatchObject({ did: "did:b", type: "keypair" });
  });
});
