import { renderHook } from "@testing-library/react";

jest.mock("@/hooks/use-venue-health", () => ({
  useVenueHealth: jest.fn(),
}));
jest.mock("@/hooks/use-venue-auth-health", () => ({
  useVenueAccessState: jest.fn(),
}));

import { useVenueAccess } from "@/hooks/use-venue-access";
import { useVenueHealth } from "@/hooks/use-venue-health";
import { useVenueAccessState } from "@/hooks/use-venue-auth-health";

const healthMock = useVenueHealth as unknown as jest.Mock;
const accessMock = useVenueAccessState as unknown as jest.Mock;

const BASE = "https://venue.test";
const VENUE = "did:key:z6MkVenue";

/** The transport is up; `publicAccess` is what the status read has established. */
function reachable(publicAccess: boolean | undefined) {
  healthMock.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ byUrl: { [BASE]: { state: "connected", publicAccess } } }),
  );
}

const state = () => renderHook(() => useVenueAccess(BASE, VENUE)).result.current.state;

beforeEach(() => {
  healthMock.mockReset();
  accessMock.mockReset();
});

describe("useVenueAccess — signed out", () => {
  it("waits rather than claiming \"Sign in\" before the venue's status is known", () => {
    // The status read has not returned, so publicAccess is undefined. Saying
    // "signed-out" here is a claim about the venue we have not established,
    // and it also gates surfaces that branch on it (#419).
    accessMock.mockReturnValue({ state: "signed-out" });
    reachable(undefined);

    expect(state()).toBe("auth-checking");
  });

  it("reports public once the venue says anonymous reads are allowed", () => {
    accessMock.mockReturnValue({ state: "signed-out" });
    reachable(true);

    expect(state()).toBe("public");
  });

  it("reports signed-out once the venue says anonymous reads are not allowed", () => {
    accessMock.mockReturnValue({ state: "signed-out" });
    reachable(false);

    expect(state()).toBe("signed-out");
  });
});

describe("useVenueAccess — other states are untouched", () => {
  it("an accepted account is connected", () => {
    accessMock.mockReturnValue({ state: "accepted" });
    reachable(undefined);
    expect(state()).toBe("connected");
  });

  it("a rejected account surfaces as auth-rejected with its detail", () => {
    accessMock.mockReturnValue({ state: "rejected", detail: "403" });
    reachable(undefined);
    const { result } = renderHook(() => useVenueAccess(BASE, VENUE));
    expect(result.current.state).toBe("auth-rejected");
    expect(result.current.detail).toBe("403");
  });

  it("an unconfirmed account surfaces as auth-unverified", () => {
    accessMock.mockReturnValue({ state: "unverified", detail: "timed out" });
    reachable(undefined);
    expect(state()).toBe("auth-unverified");
  });

  it("a signed-in account still checking surfaces as auth-checking", () => {
    accessMock.mockReturnValue({ state: "checking" });
    reachable(undefined);
    expect(state()).toBe("auth-checking");
  });

  it("transport trouble wins over account state", () => {
    accessMock.mockReturnValue({ state: "signed-out" });
    healthMock.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ byUrl: { [BASE]: { state: "unreachable", detail: "ENOTFOUND" } } }),
    );
    const { result } = renderHook(() => useVenueAccess(BASE, VENUE));
    expect(result.current.state).toBe("unreachable");
    expect(result.current.detail).toBe("ENOTFOUND");
  });

  it("an unprobed venue is unknown, not signed-out", () => {
    accessMock.mockReturnValue({ state: "signed-out" });
    healthMock.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ byUrl: {} }),
    );
    expect(state()).toBe("unknown");
  });
});
