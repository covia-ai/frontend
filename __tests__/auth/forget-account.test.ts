import { act } from "@testing-library/react";

jest.mock("@/lib/analytics", () => ({ resetIdentity: jest.fn() }));

import { resetIdentity } from "@/lib/analytics";
import { useAuthStore } from "@/hooks/use-auth";
import { useWatchedJobs } from "@/hooks/use-watched-jobs";
import { useNotificationLog } from "@/hooks/use-notification-log";
import { forgetAccountOnDevice, venuesForgottenWith } from "@/lib/forget-account";
import { getVenueFor } from "@/lib/venue-registry";

const KEY = "0101010101010101010101010101010101010101010101010101010101010101";
const OTHER_KEY = "0202020202020202020202020202020202020202020202020202020202020202";
const DID = "did:key:z6MkForgotten";
const OTHER_DID = "did:key:z6MkKept";
const VENUE_A = "did:web:venue-a.example.com";
const VENUE_B = "did:web:venue-b.example.com";
const VENUE_C = "did:web:venue-c.example.com";

const keyAuth = { type: "keypair" as const, privateKeyHex: KEY, did: DID };
const otherAuth = { type: "keypair" as const, privateKeyHex: OTHER_KEY, did: OTHER_DID };

const entry = (id: number, venueId?: string) => ({
  id,
  kind: "success" as const,
  title: `entry ${id}`,
  at: 0,
  read: false,
  venueId,
});

describe("forgetAccountOnDevice", () => {
  beforeEach(() => {
    jest.mocked(resetIdentity).mockClear();
    sessionStorage.clear();
    localStorage.clear();
    act(() => {
      useAuthStore.setState({
        // The key is active on A and stored (inactive) on B; C uses another key.
        authMap: { [VENUE_A]: keyAuth, [VENUE_C]: otherAuth },
        accountsMap: {
          [VENUE_A]: [keyAuth],
          [VENUE_B]: [keyAuth],
          [VENUE_C]: [otherAuth],
        },
        deviceKeyHex: KEY,
        deviceKeys: [KEY, OTHER_KEY],
      });
      useWatchedJobs.setState({
        jobs: [
          { venueId: VENUE_A, jobId: "a1", addedAt: Date.now() },
          { venueId: VENUE_C, jobId: "c1", addedAt: Date.now() },
        ],
      });
      useNotificationLog.setState({
        entries: [entry(3, VENUE_A), entry(2, VENUE_B), entry(1, VENUE_C), entry(0)],
      });
    });
    sessionStorage.setItem(`operation_input_${VENUE_A}_op1`, '{"input":{"token":"x"}}');
    sessionStorage.setItem(`operation_input_${VENUE_C}_op1`, '{"input":{}}');
  });

  it("lists every venue that used the key", () => {
    expect(venuesForgottenWith(VENUE_A, keyAuth).sort()).toEqual([VENUE_A, VENUE_B]);
  });

  it("removes the key and every account that used it, on every venue", () => {
    act(() => {
      forgetAccountOnDevice(VENUE_A);
    });
    const state = useAuthStore.getState();
    expect(state.deviceKeys).toEqual([OTHER_KEY]);
    expect(state.deviceKeyHex).toBe(OTHER_KEY);
    expect(state.authMap).toEqual({ [VENUE_C]: otherAuth });
    expect(state.accountsMap).toEqual({ [VENUE_C]: [otherAuth] });
    // Nothing of the key is left in what persist writes to localStorage.
    expect(localStorage.getItem("venue-auth") ?? "").not.toContain(KEY);
  });

  it("clears watched jobs, notifications and drafts for the affected venues only", () => {
    act(() => {
      forgetAccountOnDevice(VENUE_A);
    });
    expect(useWatchedJobs.getState().jobs.map((j) => j.jobId)).toEqual(["c1"]);
    expect(useNotificationLog.getState().entries.map((e) => e.id)).toEqual([1, 0]);
    expect(sessionStorage.getItem(`operation_input_${VENUE_A}_op1`)).toBeNull();
    expect(sessionStorage.getItem(`operation_input_${VENUE_C}_op1`)).not.toBeNull();
    expect(resetIdentity).toHaveBeenCalled();
  });

  it("drops cached SDK clients that hold the key", () => {
    const descriptor = { venueId: VENUE_A, baseUrl: "https://venue-a.example.com" };
    const before = getVenueFor(descriptor, keyAuth);
    expect(getVenueFor(descriptor, keyAuth)).toBe(before);
    act(() => {
      forgetAccountOnDevice(VENUE_A);
    });
    expect(getVenueFor(descriptor, keyAuth)).not.toBe(before);
  });

  it("forgets a bearer on its own venue without touching device keys", () => {
    const bearer = { type: "bearer" as const, token: "t", did: "did:web:user" };
    act(() => {
      useAuthStore.setState((s) => ({
        authMap: { ...s.authMap, [VENUE_B]: bearer },
        accountsMap: { ...s.accountsMap, [VENUE_B]: [bearer, keyAuth] },
      }));
    });
    act(() => {
      forgetAccountOnDevice(VENUE_B);
    });
    const state = useAuthStore.getState();
    expect(state.authMap[VENUE_B]).toBeUndefined();
    expect(state.accountsMap[VENUE_B]).toEqual([keyAuth]);
    expect(state.deviceKeys).toEqual([KEY, OTHER_KEY]);
    expect(useNotificationLog.getState().entries.map((e) => e.id)).toEqual([3, 1, 0]);
  });

  it("does nothing when the venue has no active account", () => {
    expect(forgetAccountOnDevice(VENUE_B)).toEqual([]);
    expect(useAuthStore.getState().deviceKeys).toEqual([KEY, OTHER_KEY]);
  });
});
