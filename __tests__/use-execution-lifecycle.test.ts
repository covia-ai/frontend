import { act, renderHook, waitFor } from "@testing-library/react";
import { useExecutionLifecycle } from "@/hooks/use-execution-lifecycle";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const mockVenue: any = {
  venueId: "did:venue:test",
  baseUrl: "https://venue.test",
  metadata: { name: "Test Venue" },
  jobs: {
    get: jest.fn(),
    sendMessage: jest.fn(),
  },
  getAsset: jest.fn(),
};
let mockAuth: any = { type: "keypair" };

jest.mock("@/hooks/use-resolved-venue", () => ({
  useResolvedVenueContext: () => ({
    descriptor: mockVenue,
    venue: mockVenue,
    auth: mockAuth,
    isAuthenticated: mockAuth !== null,
  }),
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

describe("useExecutionLifecycle", () => {
  const originalEventSource = global.EventSource;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAuth = { type: "keypair" };
    FakeEventSource.instances = [];
    global.EventSource = FakeEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.EventSource = originalEventSource;
  });

  it("uses non-overlapping authenticated polling and stops at a terminal state", async () => {
    mockVenue.jobs.get
      .mockResolvedValueOnce({
        metadata: { id: "job-1", status: "STARTED" },
      })
      .mockResolvedValueOnce({
        metadata: { id: "job-1", status: "COMPLETE" },
      });

    const { result } = renderHook(() =>
      useExecutionLifecycle({ jobId: "job-1" }),
    );

    await waitFor(() => expect(result.current.job?.status).toBe("STARTED"));
    expect(FakeEventSource.instances).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(result.current.job?.status).toBe("COMPLETE"));
    expect(mockVenue.jobs.get).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockVenue.jobs.get).toHaveBeenCalledTimes(2);
  });

  it("ignores a slow response after the route switches to another job", async () => {
    const oldJob = deferred<any>();
    const newJob = deferred<any>();
    mockVenue.jobs.get.mockImplementation((jobId: string) =>
      jobId === "job-old" ? oldJob.promise : newJob.promise,
    );

    const { result, rerender } = renderHook(
      ({ jobId }) => useExecutionLifecycle({ jobId }),
      { initialProps: { jobId: "job-old" } },
    );
    rerender({ jobId: "job-new" });

    await act(async () => {
      newJob.resolve({
        metadata: { id: "job-new", status: "STARTED" },
      });
      await newJob.promise;
    });
    await waitFor(() => expect(result.current.job?.id).toBe("job-new"));

    await act(async () => {
      oldJob.resolve({
        metadata: { id: "job-old", status: "FAILED" },
      });
      await oldJob.promise;
    });
    expect(result.current.job?.id).toBe("job-new");
    expect(result.current.job?.status).toBe("STARTED");
  });

  it("does not let the initial GET overwrite a newer terminal SSE event", async () => {
    mockAuth = null;
    const initial = deferred<any>();
    mockVenue.jobs.get.mockReturnValue(initial.promise);

    const { result } = renderHook(() =>
      useExecutionLifecycle({ jobId: "job-stream" }),
    );
    const source = FakeEventSource.instances[0];
    expect(source.url).toBe(
      "https://venue.test/api/v1/jobs/job-stream/sse",
    );

    act(() => {
      source.onopen?.();
      source.emit({
        metadata: { id: "job-stream", status: "COMPLETE" },
      });
    });
    await waitFor(() =>
      expect(result.current.job?.status).toBe("COMPLETE"),
    );
    expect(source.close).toHaveBeenCalled();
    expect(result.current.streaming).toBe(false);

    await act(async () => {
      initial.resolve({
        metadata: { id: "job-stream", status: "STARTED" },
      });
      await initial.promise;
    });
    expect(result.current.job?.status).toBe("COMPLETE");
  });
});
