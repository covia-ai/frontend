import { notifyMock } from "@test/notify";
import { authMock } from "@test/use-auth";
import { venueMock } from "@test/use-authenticated-venue";

// Guards the shared doubles in __tests__/support against the drift that made
// them worth having: every hand-written mock of these modules declared only
// the two or three exports its own suite happened to need, so a component
// reaching for any other one found `undefined` and died with "is not a
// function". A double that covers the whole module surface cannot do that —
// but only while it *stays* complete, which is what these tests enforce. When
// one fails, add the new export to the double rather than relaxing the test.

const publicExports = (mod: object) =>
  Object.keys(mod)
    .filter((key) => key !== "default" && key !== "__esModule")
    .sort();

describe("shared test doubles cover their real module", () => {
  it("@test/notify covers @/lib/notify", () => {
    const real = jest.requireActual("@/lib/notify");
    expect(publicExports(notifyMock)).toEqual(
      expect.arrayContaining(publicExports(real)),
    );
  });

  it("@test/use-auth covers @/hooks/use-auth", () => {
    const real = jest.requireActual("@/hooks/use-auth");
    expect(publicExports(authMock)).toEqual(
      expect.arrayContaining(publicExports(real)),
    );
  });

  it("@test/use-authenticated-venue covers @/hooks/use-authenticated-venue", () => {
    const real = jest.requireActual("@/hooks/use-authenticated-venue");
    expect(publicExports(venueMock)).toEqual(
      expect.arrayContaining(publicExports(real)),
    );
  });
});

describe("shared test doubles are callable stand-ins", () => {
  it("exposes every notifier as a jest mock", () => {
    for (const key of publicExports(notifyMock)) {
      expect(jest.isMockFunction((notifyMock as never)[key])).toBe(true);
    }
  });

  it("returns a job-failure pair shaped like the real helper", () => {
    const err = new Error("boom");
    expect(notifyMock.jobFailure(err)).toEqual({ reason: err, jobHref: undefined });
  });

  it("keeps useCurrentAuth and useIsAuthenticated consistent", () => {
    // Nothing mocks @test/use-auth here, so the imported handles are the same
    // instances setCurrentAuth writes to.
    const { setCurrentAuth, sampleKeypairAuth, resetAuthMock } =
      jest.requireActual("@test/use-auth") as typeof import("@test/use-auth");

    setCurrentAuth(sampleKeypairAuth);
    expect(authMock.useCurrentAuth()).toEqual(sampleKeypairAuth);
    expect(authMock.useIsAuthenticated()).toBe(true);

    setCurrentAuth(null);
    expect(authMock.useCurrentAuth()).toBeNull();
    expect(authMock.useIsAuthenticated()).toBe(false);

    resetAuthMock();
  });

  it("gives every venue manager a default so an unstubbed read resolves empty", async () => {
    const venue = venueMock.useAuthenticatedVenue();
    await expect(venue!.assets.list()).resolves.toEqual([]);
    await expect(venue!.jobs.list()).resolves.toEqual([]);
  });

  it("merges a setVenue override without dropping the other managers", async () => {
    const { setVenue, resetVenueMock } = jest.requireActual(
      "@test/use-authenticated-venue",
    ) as typeof import("@test/use-authenticated-venue");

    const venue = setVenue({ assets: { list: jest.fn().mockResolvedValue(["a"]) } });
    await expect(venue!.assets.list()).resolves.toEqual(["a"]);
    // Untouched siblings survive the merge.
    await expect(venue!.assets.getAsset()).resolves.toBeNull();
    await expect(venue!.jobs.list()).resolves.toEqual([]);

    expect(setVenue(null)).toBeNull();
    resetVenueMock();
  });
});
