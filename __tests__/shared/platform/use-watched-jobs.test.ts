import { act, renderHook } from "@testing-library/react";
import { useWatchedJobs, useWatchedJobsPoll } from "@/hooks/use-watched-jobs";
import { RunStatus } from "@covia/covia-sdk";

const mockJobsGet = jest.fn();
const mockGetVenueFor = jest.fn((..._args: unknown[]) => ({ jobs: { get: mockJobsGet } }));
const mockNotifySuccess = jest.fn((..._args: unknown[]) => {});
const mockNotifyError = jest.fn((..._args: unknown[]) => {});

jest.mock("@/lib/venue-registry", () => ({
  getVenueFor: (...args: unknown[]) => mockGetVenueFor(...args),
}));
jest.mock("@/lib/notify", () => ({
  notifySuccess: (...args: unknown[]) => mockNotifySuccess(...args),
  notifyError: (...args: unknown[]) => mockNotifyError(...args),
}));
jest.mock("@/hooks/use-venues", () => ({
  useVenues: {
    getState: () => ({
      venues: [{ venueId: "v1", baseUrl: "https://v1.test", metadata: { name: "Venue One" } }],
    }),
  },
}));
jest.mock("@/hooks/use-auth", () => ({
  useAuthStore: { getState: () => ({ authMap: {} }) },
}));

function job(overrides: { isFinished: boolean; isComplete?: boolean; status?: RunStatus; name?: string; error?: string }) {
  return {
    isFinished: overrides.isFinished,
    isComplete: overrides.isComplete ?? false,
    metadata: { status: overrides.status, name: overrides.name, error: overrides.error },
  };
}

describe("useWatchedJobs store", () => {
  beforeEach(() => {
    act(() => useWatchedJobs.setState({ jobs: [] }));
  });

  it("watch adds a job, deduped by (venueId, jobId)", () => {
    act(() => {
      useWatchedJobs.getState().watch("v1", "j1");
      useWatchedJobs.getState().watch("v1", "j1");
    });
    expect(useWatchedJobs.getState().jobs).toHaveLength(1);
  });

  it("unwatch removes just the targeted job", () => {
    act(() => {
      useWatchedJobs.getState().watch("v1", "j1");
      useWatchedJobs.getState().watch("v1", "j2");
      useWatchedJobs.getState().unwatch("v1", "j1");
    });
    expect(useWatchedJobs.getState().jobs.map((j) => j.jobId)).toEqual(["j2"]);
  });

  it("persists to localStorage under the watched-jobs key", () => {
    act(() => useWatchedJobs.getState().watch("v1", "j1"));
    const raw = window.localStorage.getItem("watched-jobs");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).state.jobs).toHaveLength(1);
  });
});

describe("useWatchedJobsPoll", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    act(() => useWatchedJobs.setState({ jobs: [] }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not poll when the watch list is empty", async () => {
    renderHook(() => useWatchedJobsPoll());
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockJobsGet).not.toHaveBeenCalled();
  });

  it("checks immediately and notifies + unwatches on completion", async () => {
    mockJobsGet.mockResolvedValue(job({ isFinished: true, isComplete: true, name: "My Job" }));
    act(() => useWatchedJobs.getState().watch("v1", "j1"));

    renderHook(() => useWatchedJobsPoll());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockNotifySuccess).toHaveBeenCalledWith(
      "Job complete: My Job",
      expect.objectContaining({ receiptHref: "/venues/v1/jobs/j1" }),
    );
    expect(useWatchedJobs.getState().jobs).toHaveLength(0);
  });

  it("notifies with a receipt link and unwatches on failure", async () => {
    mockJobsGet.mockResolvedValue(
      job({ isFinished: true, isComplete: false, status: RunStatus.FAILED, name: "My Job", error: "boom" }),
    );
    act(() => useWatchedJobs.getState().watch("v1", "j1"));

    renderHook(() => useWatchedJobsPoll());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockNotifyError).toHaveBeenCalledWith(
      expect.stringContaining("My Job"),
      expect.any(Error),
      undefined,
      "/venues/v1/jobs/j1",
    );
    expect(useWatchedJobs.getState().jobs).toHaveLength(0);
  });

  it("leaves an unfinished job watched and does not notify", async () => {
    mockJobsGet.mockResolvedValue(job({ isFinished: false }));
    act(() => useWatchedJobs.getState().watch("v1", "j1"));

    renderHook(() => useWatchedJobsPoll());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockNotifySuccess).not.toHaveBeenCalled();
    expect(mockNotifyError).not.toHaveBeenCalled();
    expect(useWatchedJobs.getState().jobs).toHaveLength(1);
  });

  it("unwatches a job whose venue is no longer known to this browser", async () => {
    act(() => useWatchedJobs.getState().watch("unknown-venue", "j1"));

    renderHook(() => useWatchedJobsPoll());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockJobsGet).not.toHaveBeenCalled();
    expect(useWatchedJobs.getState().jobs).toHaveLength(0);
  });
});
