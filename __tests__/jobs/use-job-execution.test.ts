import { act, renderHook } from "@testing-library/react";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("@/lib/notify", () => ({
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  jobFailure: jest.fn((error: unknown) => ({ reason: error, jobHref: "/job/failed" })),
}));
const mockWatch = jest.fn();
jest.mock("@/hooks/use-watched-jobs", () => ({
  useWatchedJobs: { getState: () => ({ watch: mockWatch }) },
}));

import { useJobExecution } from "@/hooks/use-job-execution";
import { useRouter } from "next/navigation";
import { jobFailure, notifyError, notifyWarning } from "@/lib/notify";

const push = jest.fn();
const mockUseRouter = jest.mocked(useRouter);

const venue = {
  venueId: "did:web:venue.example",
  baseUrl: "https://venue.example",
} as any;

describe("useJobExecution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });

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

  it("registers the new job for ambient completion tracking (#241)", async () => {
    const { result } = renderHook(() => useJobExecution(venue));

    await act(async () => {
      await result.current.execute({
        action: async () => ({ id: "job-1" }),
        failureTitle: "Unable to run operation",
      });
    });

    expect(mockWatch).toHaveBeenCalledWith(venue.venueId, "job-1");
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
