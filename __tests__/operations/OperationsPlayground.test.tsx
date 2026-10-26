import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/operations/playground",
}));
jest.mock("@/components/admin-panel/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));
jest.mock("@/components/execution/OperationRunResult", () => ({
  OperationRunResult: ({ jobId }: { jobId: string }) => <div data-testid="run-result">{jobId}</div>,
}));
jest.mock("@/lib/notify", () => require("@test/notify").notifyMock);
jest.mock("@/hooks/use-authenticated-venue", () => ({
  ...require("@test/use-authenticated-venue").venueMock,
  useAuthenticatedVenue: () => ({ venueId: "did:web:venue.example" }),
}));
jest.mock("@/hooks/use-auth", () => ({
  ...require("@test/use-auth").authMock,
  useIsAuthenticated: () => true,
}));

const mockInvoke = jest.fn();
jest.mock("@/lib/operations-catalog", () => ({
  resolveOperationByAddress: jest.fn(async () => ({ invoke: mockInvoke })),
}));

import { OperationsPlayground } from "@/components/OperationsPlayground";
import { useWatchedJobs } from "@/hooks/use-watched-jobs";

describe("OperationsPlayground", () => {
  it("locks the operation and tab pickers while a run is being submitted", async () => {
    let started!: (job: { id: string }) => void;
    mockInvoke.mockReturnValue(new Promise((resolve) => { started = resolve; }));
    const user = userEvent.setup();
    render(<OperationsPlayground />);

    const panel = screen.getByRole("tabpanel");
    const picker = within(panel).getByRole("combobox");
    const otherTab = screen.getAllByRole("tab").find((tab) => tab.getAttribute("aria-selected") !== "true")!;
    expect(picker).toBeEnabled();

    await user.click(within(panel).getByTestId("playground-run"));

    // Switching either clears the result pane — which the in-flight invoke
    // would then fill under the wrong operation.
    expect(picker).toBeDisabled();
    expect(otherTab).toBeDisabled();

    await act(async () => { started({ id: "job-1" }); });
    expect(await screen.findByTestId("run-result")).toHaveTextContent("job-1");
    expect(picker).toBeEnabled();
    expect(otherTab).toBeEnabled();
    // Watched like every other user-started run, for the ambient completion
    // notification (#241).
    expect(useWatchedJobs.getState().jobs).toContainEqual(
      expect.objectContaining({ venueId: "did:web:venue.example", jobId: "job-1" }),
    );
  });
});
