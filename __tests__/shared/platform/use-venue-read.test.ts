import { act, renderHook, waitFor } from "@testing-library/react";
import type { Venue } from "@covia/covia-sdk";

jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
jest.mock("@/hooks/use-authenticated-venue", () =>
  require("@test/use-authenticated-venue").venueMock);

import { useVenueRead } from "@/hooks/use-venue-read";
import { useAuthStore } from "@/hooks/use-auth";
import { revalidateVenueOnFailure } from "@/hooks/use-authenticated-venue";
import { notifyError } from "@/lib/notify";

const venueA = { venueId: "did:web:a.example", baseUrl: "https://a.example" } as Venue;
const venueB = { venueId: "did:web:b.example", baseUrl: "https://b.example" } as Venue;
const AUTH = { type: "keypair", did: "did:key:z6MkAccount", privateKeyHex: "00" } as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

type Props = { venue: Venue | undefined; enabled?: boolean };

const renderRead = (load: (venue: Venue) => Promise<string[]>, initialProps: Props) =>
  renderHook(
    ({ venue, enabled }: Props) =>
      useVenueRead<string[]>({
        venue,
        auth: AUTH,
        enabled,
        initial: [],
        failureTitle: "Unable to load things",
        load,
      }),
    { initialProps },
  );

describe("useVenueRead", () => {
  beforeEach(() => jest.clearAllMocks());

  it("is loading from the first render, then settles with the data", async () => {
    const { result } = renderRead(async () => ["one"], { venue: venueA });

    // Never an empty, not-loading frame before the read has started.
    expect(result.current).toMatchObject({ loading: true, data: [], error: null });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ data: ["one"], error: null });
  });

  it("reports a failure as an error — distinct from an empty result — and rechecks the venue", async () => {
    const failure = new Error("HTTP 503");
    const { result } = renderRead(() => Promise.reject(failure), { venue: venueA });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ data: [], error: "HTTP 503" });
    expect(notifyError).toHaveBeenCalledWith("Unable to load things", failure, venueA.baseUrl);
    expect(revalidateVenueOnFailure).toHaveBeenCalledWith(venueA, AUTH, failure);
  });

  it("never lets a slow reply from the previous venue land on the current one", async () => {
    const slowA = deferred<string[]>();
    const load = jest.fn((venue: Venue) =>
      venue === venueA ? slowA.promise : Promise.resolve(["from-b"]));
    const { result, rerender } = renderRead(load, { venue: venueA });

    rerender({ venue: venueB });
    await waitFor(() => expect(result.current.data).toEqual(["from-b"]));

    await act(async () => { slowA.resolve(["from-a"]); });
    expect(result.current.data).toEqual(["from-b"]);
  });

  it("hides the previous venue's rows the moment the venue changes", async () => {
    const pendingB = deferred<string[]>();
    const load = (venue: Venue) =>
      venue === venueA ? Promise.resolve(["from-a"]) : pendingB.promise;
    const { result, rerender } = renderRead(load, { venue: venueA });
    await waitFor(() => expect(result.current.data).toEqual(["from-a"]));

    rerender({ venue: venueB });
    expect(result.current).toMatchObject({ data: [], loading: true });
  });

  it("does not read, or claim to be loading, without a venue or while disabled", () => {
    const load = jest.fn(async () => ["one"]);

    const noVenue = renderRead(load, { venue: undefined });
    expect(noVenue.result.current.loading).toBe(false);

    const disabled = renderRead(load, { venue: venueA, enabled: false });
    expect(disabled.result.current.loading).toBe(false);

    expect(load).not.toHaveBeenCalled();
  });

  it("rechecks the venue with the account stored for it when no auth is given", async () => {
    const failure = new Error("HTTP 401");
    act(() => useAuthStore.setState({ authMap: { [venueA.venueId]: AUTH } }));
    const { result } = renderHook(() =>
      useVenueRead<string[]>({
        venue: venueA,
        initial: [],
        failureTitle: "Unable to load things",
        load: () => Promise.reject(failure),
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(revalidateVenueOnFailure).toHaveBeenCalledWith(venueA, AUTH, failure);
  });

  it("can fail quietly for reads that have their own fallback", async () => {
    const failure = new Error("HTTP 503");
    const { result } = renderHook(() =>
      useVenueRead<number>({
        venue: venueA,
        auth: AUTH,
        initial: 0,
        failureTitle: "Unable to count things",
        notify: false,
        load: () => Promise.reject(failure),
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ data: 0, error: "HTTP 503" });
    expect(notifyError).not.toHaveBeenCalled();
    // Quiet is about the toast, not the health check.
    expect(revalidateVenueOnFailure).toHaveBeenCalledWith(venueA, AUTH, failure);
  });

  it("reload re-reads the same venue", async () => {
    const load = jest.fn(async () => ["one"]);
    const { result } = renderRead(load, { venue: venueA });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.reload());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
});
