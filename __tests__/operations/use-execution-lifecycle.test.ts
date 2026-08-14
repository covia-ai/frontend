import { act, renderHook, waitFor } from "@testing-library/react";
import { useExecutionLifecycle } from "@/hooks/use-execution-lifecycle";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

// A controllable fake for venue.jobs.stream(): each call returns a fresh
// async generator whose events are pushed in from the test via `emit`, and
// which can be ended (clean close) or broken (simulated drop/throw).
function fakeStream() {
  const queue: unknown[] = [];
  const waiters: Array<(value: IteratorResult<unknown>) => void> = [];
  let closed = false;
  let failure: Error | null = null;

  const push = (event: IteratorResult<unknown>) => {
    const waiter = waiters.shift();
    if (waiter) waiter(event);
    else if ("value" in event && !event.done) queue.push(event.value);
  };

  return {
    emit(data: unknown) {
      push({
        value: { event: "job-update", data: JSON.stringify(data), id: null, retry: null, json: () => data },
        done: false,
      });
    },
    end() {
      closed = true;
      push({ value: undefined, done: true });
    },
    fail(error: Error) {
      failure = error;
      push({ value: undefined, done: true });
    },
    generator: (async function* () {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift();
          continue;
        }
        if (closed) return;
        if (failure) throw failure;
        const result = await new Promise<IteratorResult<unknown>>((resolve) => {
          waiters.push(resolve);
        });
        if (result.done) {
          if (failure) throw failure;
          return;
        }
        yield result.value;
      }
    })(),
  };
}

const mockVenue: any = {
  venueId: "did:venue:test",
  baseUrl: "https://venue.test",
  metadata: { name: "Test Venue" },
  jobs: {
    get: jest.fn(),
    sendMessage: jest.fn(),
    stream: jest.fn(),
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

describe("useExecutionLifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAuth = { type: "keypair" };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("streams job updates for an authenticated session and stops at a terminal state", async () => {
    const stream = fakeStream();
    mockVenue.jobs.stream.mockReturnValue(stream.generator);
    // The hook always fires one initial GET on mount alongside the stream;
    // this isn't the polling fallback under test.
    mockVenue.jobs.get.mockResolvedValue({
      metadata: { id: "job-1", status: "STARTED" },
    });

    const { result } = renderHook(() =>
      useExecutionLifecycle({ jobId: "job-1" }),
    );

    act(() => {
      stream.emit({ id: "job-1", status: "STARTED" });
    });
    await waitFor(() => expect(result.current.job?.status).toBe("STARTED"));
    expect(result.current.streaming).toBe(true);

    act(() => {
      stream.emit({ id: "job-1", status: "COMPLETE" });
      stream.end();
    });
    await waitFor(() => expect(result.current.job?.status).toBe("COMPLETE"));
    expect(result.current.streaming).toBe(false);

    // No fallback polling once terminal — only the initial mount GET fired.
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockVenue.jobs.get).toHaveBeenCalledTimes(1);
  });

  it("reattaches once on a dropped stream before falling back to polling", async () => {
    const first = fakeStream();
    const second = fakeStream();
    mockVenue.jobs.stream
      .mockReturnValueOnce(first.generator)
      .mockReturnValueOnce(second.generator);
    mockVenue.jobs.get.mockResolvedValue({
      metadata: { id: "job-1", status: "STARTED" },
    });

    const { result } = renderHook(() =>
      useExecutionLifecycle({ jobId: "job-1" }),
    );

    act(() => {
      first.emit({ id: "job-1", status: "STARTED" });
    });
    await waitFor(() => expect(result.current.job?.status).toBe("STARTED"));

    // First stream drops mid-flight — reattach re-fetches current status
    // before reopening the stream.
    act(() => {
      first.fail(new Error("connection reset"));
    });
    await waitFor(() => expect(mockVenue.jobs.stream).toHaveBeenCalledTimes(2));
    // One initial mount GET, plus one reattach GET.
    expect(mockVenue.jobs.get).toHaveBeenCalledTimes(2);

    // Second stream also drops — falls back to polling.
    act(() => {
      second.fail(new Error("connection reset again"));
    });
    await waitFor(() => expect(result.current.streaming).toBe(false));

    mockVenue.jobs.get.mockClear();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(mockVenue.jobs.get).toHaveBeenCalledTimes(1));
    expect(mockVenue.jobs.stream).toHaveBeenCalledTimes(2);
  });

  it("falls back to polling when the venue rejects the stream outright", async () => {
    mockVenue.jobs.stream.mockImplementation(() => {
      throw new Error("Endpoint GET /api/v1/jobs/{id}/sse not found");
    });
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
    expect(result.current.streaming).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(result.current.job?.status).toBe("COMPLETE"));

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
    mockVenue.jobs.stream.mockImplementation(() => fakeStream().generator);

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

  it("does not let the initial GET overwrite a newer terminal stream event", async () => {
    const stream = fakeStream();
    mockVenue.jobs.stream.mockReturnValue(stream.generator);
    const initial = deferred<any>();
    mockVenue.jobs.get.mockReturnValue(initial.promise);

    const { result } = renderHook(() =>
      useExecutionLifecycle({ jobId: "job-stream" }),
    );

    act(() => {
      stream.emit({ id: "job-stream", status: "COMPLETE" });
      stream.end();
    });
    await waitFor(() =>
      expect(result.current.job?.status).toBe("COMPLETE"),
    );
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
