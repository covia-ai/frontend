import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/notify", () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
  notifyInfo: jest.fn(),
  jobFailure: (err: unknown) => ({ reason: String(err), jobHref: undefined }),
}));

const getMock = jest.fn();
const cancelMock = jest.fn().mockResolvedValue({});
const invokeMock = jest.fn().mockResolvedValue({ id: "0xNEWJOB" });
const mockVenue = {
  venueId: "venue-1",
  baseUrl: "https://venue.example",
  jobs: { get: getMock, cancel: cancelMock },
  operations: { invoke: invokeMock },
};
jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { JobRowActions } from "@/components/jobs/JobRowActions";
import { notifySuccess } from "@/lib/notify";
import { RunStatus } from "@covia/covia-sdk";

// Real job records carry the operation as a content hash under `op` (#322).
const fullJob = (over: Record<string, unknown> = {}) => ({
  metadata: { id: "0xabc", op: "0xop", input: { x: 1 }, status: "COMPLETE", ...over },
});

describe("JobRowActions", () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue(fullJob());
    cancelMock.mockClear();
    invokeMock.mockClear();
    (notifySuccess as jest.Mock).mockClear();
    global.URL.createObjectURL = jest.fn(() => "blob:x");
    global.URL.revokeObjectURL = jest.fn();
  });

  it("re-runs the operation with the fetched op + input", async () => {
    render(<JobRowActions job={{ id: "0xabc", status: RunStatus.COMPLETE }} />);
    await userEvent.click(screen.getByTestId("job-actions-0xabc"));
    await userEvent.click(await screen.findByText("Re-run"));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("0xop", { x: 1 }));
    expect(getMock).toHaveBeenCalledWith("0xabc");
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("downloads a JSON receipt built from the job record", async () => {
    render(<JobRowActions job={{ id: "0xabc", status: RunStatus.COMPLETE }} />);
    await userEvent.click(screen.getByTestId("job-actions-0xabc"));
    await userEvent.click(await screen.findByText("Download receipt"));

    await waitFor(() => expect(global.URL.createObjectURL).toHaveBeenCalled());
    expect(getMock).toHaveBeenCalledWith("0xabc");
    expect(notifySuccess).toHaveBeenCalledWith("Receipt downloaded");
  });

  it("shows Cancel only for an active job, and cancels after confirming", async () => {
    const onChanged = jest.fn();
    render(<JobRowActions job={{ id: "0xrun", status: RunStatus.STARTED }} onChanged={onChanged} />);
    await userEvent.click(screen.getByTestId("job-actions-0xrun"));
    await userEvent.click(await screen.findByText("Cancel job"));

    // Confirm dialog → confirm.
    const confirm = await screen.findByRole("button", { name: /cancel job/i });
    await userEvent.click(confirm);

    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith("0xrun"));
    expect(onChanged).toHaveBeenCalled();
  });

  it("hides Cancel for a terminal job", async () => {
    render(<JobRowActions job={{ id: "0xdone", status: RunStatus.COMPLETE }} />);
    await userEvent.click(screen.getByTestId("job-actions-0xdone"));
    await screen.findByText("Re-run");
    expect(screen.queryByText("Cancel job")).not.toBeInTheDocument();
  });
});
