import { render, screen } from "@testing-library/react";
import { RunStatus } from "@covia/covia-sdk";

jest.mock("@/components/ExecutionViewer", () => ({
  ExecutionViewer: ({ jobId }: { jobId: string }) => <div data-testid="exec-viewer">{jobId}</div>,
}));
jest.mock("@/components/jobs/JobRowActions", () => ({
  JobRowActions: ({ job }: { job: { id?: string } }) => <div data-testid="row-actions">{job.id}</div>,
}));

import { JobDetailDrawer } from "@/components/jobs/JobDetailDrawer";

describe("JobDetailDrawer", () => {
  it("is closed (renders nothing) when job is null", () => {
    render(<JobDetailDrawer job={null} onOpenChange={() => {}} />);
    expect(screen.queryByTestId("exec-viewer")).not.toBeInTheDocument();
  });

  it("opens with the detail viewer, actions, and an Open-full-page link", () => {
    render(
      <JobDetailDrawer
        job={{ id: "0xabc", status: RunStatus.COMPLETE }}
        venueId="venue-1"
        fullHref="/job/0xabc"
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByTestId("exec-viewer")).toHaveTextContent("0xabc");
    expect(screen.getByTestId("row-actions")).toHaveTextContent("0xabc");
    const link = screen.getByRole("link", { name: /open full page/i });
    expect(link).toHaveAttribute("href", "/job/0xabc");
  });
});
