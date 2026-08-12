import { act, renderHook } from "@testing-library/react";

const push = jest.fn();
const notifyError = jest.fn();
const notifyWarning = jest.fn();
const jobFailure = jest.fn((error: unknown) => ({ reason: error, jobHref: "/job/failed" }));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/lib/notify", () => ({ notifyError, notifyWarning, jobFailure }));

import { useJobExecution } from "@/hooks/use-job-execution";

const venue = {
  venueId: "did:web:venue.example",
  baseUrl: "https://venue.example",
} as any;

describe("useJobExecution", () => {
  beforeEach(() => jest.clearAllMocks());

  it("navigates every successful job action through the scoped job route", async () => {
    const { result } = renderHook(() => useJobExecution(venue));

    await act(async () => {
      await result.current.execute({
        action: async () => ({ id: "job-1" }),
        failureTitle: "Unable to run operation",
      });
    });

    expect(push).toHaveBeenCalledWith(
      `/venues/${encodeURIComponent(venue.venueId)}/jobs/job-1`,
    );
    expect(result.current.running).toBe(false);
  });

  it("uses one missing-job path and exposes the message inline", async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useJobExecution(venue));

    await act(async () => {
      await result.current.execute({
        action: async () => ({}),
        failureTitle: "Unable to run tool",
        missingJobMessage: "The tool completed without returning a job ID",
        onError,
      });
    });

    expect(notifyWarning).toHaveBeenCalledWith("The tool completed without returning a job ID");
    expect(onError).toHaveBeenCalledWith("The tool completed without returning a job ID");
    expect(push).not.toHaveBeenCalled();
  });

  it("logs failures with the venue and failed-job link", async () => {
    const failure = new Error("adapter failed");
    const onError = jest.fn();
    const { result } = renderHook(() => useJobExecution(venue));

    await act(async () => {
      await result.current.execute({
        action: async () => { throw failure; },
        failureTitle: "Unable to run operation",
        onError,
      });
    });

    expect(jobFailure).toHaveBeenCalledWith(failure, venue.venueId);
    expect(notifyError).toHaveBeenCalledWith(
      "Unable to run operation",
      failure,
      venue.baseUrl,
      "/job/failed",
    );
    expect(onError).toHaveBeenCalledWith("adapter failed");
    expect(result.current.running).toBe(false);
  });
});
