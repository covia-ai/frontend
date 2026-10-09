import { act, renderHook } from "@testing-library/react";
import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { reportVenueAuthHealth, useVenueAuthHealth } from "@/hooks/use-venue-auth-health";
import { useVenues } from "@/hooks/use-venues";
import { useWriteAccess } from "@/hooks/use-write-access";

const VENUE = "did:key:z6MkVenue";
const account: VenueAuth = { type: "keypair", did: "did:key:z6MkUser", privateKeyHex: "00".repeat(32) };

function signIn() {
  act(() => {
    useVenues.setState({ selectedVenueId: VENUE });
    useAuthStore.setState({ authMap: { [VENUE]: account } });
  });
}

describe("useWriteAccess", () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState({ authMap: {} });
      useVenueAuthHealth.setState({ byVenue: {} });
    });
  });

  it("locks writes when signed out", () => {
    act(() => useVenues.setState({ selectedVenueId: VENUE }));
    const { result } = renderHook(() => useWriteAccess());
    expect(result.current.canWrite).toBe(false);
    expect(result.current.reason).toBe("signed-out");
    expect(result.current.lockedLabel("create")).toBe("Sign in to create");
  });

  it("allows writes for a signed-in account, including while its status is still being checked", () => {
    signIn();
    const { result } = renderHook(() => useWriteAccess());
    expect(result.current.canWrite).toBe(true);
    act(() => reportVenueAuthHealth(VENUE, account, { state: "accepted" }));
    expect(result.current.canWrite).toBe(true);
  });

  it("locks writes when the venue rejected the account", () => {
    signIn();
    act(() => reportVenueAuthHealth(VENUE, account, { state: "rejected", detail: "403", status: 403 }));
    const { result } = renderHook(() => useWriteAccess());
    expect(result.current.canWrite).toBe(false);
    expect(result.current.reason).toBe("not-admitted");
    expect(result.current.lockedLabel("create")).toBe("Account not admitted");
    expect(result.current.lockedTitle).toMatch(/hasn't admitted your account/);
  });

  it("ignores a rejection recorded for a different account", () => {
    signIn();
    act(() =>
      reportVenueAuthHealth(VENUE, { ...account, did: "did:key:z6MkOther" }, { state: "rejected", detail: "403" }),
    );
    const { result } = renderHook(() => useWriteAccess());
    expect(result.current.canWrite).toBe(true);
  });

  it("checks the venue it is given, with the caller's own sign-in state", () => {
    act(() => reportVenueAuthHealth("did:key:z6MkOtherVenue", account, { state: "rejected", detail: "403" }));
    act(() => useAuthStore.setState({ authMap: { "did:key:z6MkOtherVenue": account } }));
    const { result } = renderHook(() => useWriteAccess({ venueId: "did:key:z6MkOtherVenue", signedIn: true }));
    expect(result.current.reason).toBe("not-admitted");
  });
});
