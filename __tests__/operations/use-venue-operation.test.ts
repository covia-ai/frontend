import { renderHook, waitFor } from "@testing-library/react";

jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
jest.mock("@/hooks/use-authenticated-venue", () =>
  require("@test/use-authenticated-venue").venueMock);

import { resetVenueMock, setVenue } from "@test/use-authenticated-venue";
import { revalidateVenueOnFailure } from "@/hooks/use-authenticated-venue";
import { useVenueHasOperation } from "@/hooks/use-venue-operation";
import { notifyError } from "@/lib/notify";

const OP = "v/ops/agent/from-skills";

describe("useVenueHasOperation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetVenueMock();
  });

  it("is unknown until the registry has been read, then answers for the path", async () => {
    setVenue({ adapters: { list: jest.fn().mockResolvedValue([{ name: "agent", operations: [OP] }]) } });
    const { result } = renderHook(() => useVenueHasOperation(OP));

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("answers false only when a readable registry lacks the operation", async () => {
    setVenue({ adapters: { list: jest.fn().mockResolvedValue([{ name: "http", operations: ["v/ops/http/get"] }]) } });
    const { result } = renderHook(() => useVenueHasOperation(OP));

    await waitFor(() => expect(result.current).toBe(false));
  });

  it("re-answers for a new path from the registry already read", async () => {
    const list = jest.fn().mockResolvedValue([{ name: "agent", operations: [OP] }]);
    setVenue({ adapters: { list } });
    const { result, rerender } = renderHook(({ path }: { path: string }) => useVenueHasOperation(path), {
      initialProps: { path: OP },
    });
    await waitFor(() => expect(result.current).toBe(true));

    rerender({ path: "v/ops/agent/other" });

    expect(result.current).toBe(false);
    expect(list).toHaveBeenCalledTimes(1);
  });

  // An unreadable registry is not evidence of absence: callers treat unknown
  // as available, and a badge-level read must not toast.
  it("stays unknown, quietly, when the registry cannot be read", async () => {
    const failure = new Error("HTTP 503");
    setVenue({ adapters: { list: jest.fn().mockRejectedValue(failure) } });
    const { result } = renderHook(() => useVenueHasOperation(OP));

    await waitFor(() => expect(revalidateVenueOnFailure).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    expect(notifyError).not.toHaveBeenCalled();
  });
});
