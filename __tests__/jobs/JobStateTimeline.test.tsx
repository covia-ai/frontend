import { render, screen } from "@testing-library/react";

jest.mock("@/components/DidDisplay", () => ({
  DidDisplay: ({ value }: { value: string }) => <span data-testid="did">{value}</span>,
}));

import { JobStateTimeline } from "@/components/jobs/JobStateTimeline";
import type { JobMetadata } from "@covia/covia-sdk";

const job = {
  status: "COMPLETE",
  updated: 300,
  caller: "did:key:zActor",
  prev: {
    status: "STARTED",
    updated: 200,
    caller: "did:key:zActor",
    prev: { status: "PENDING", updated: 100, caller: "did:key:zActor" },
  },
} as unknown as JobMetadata;

describe("JobStateTimeline", () => {
  it("renders each transition oldest-first", () => {
    render(<JobStateTimeline job={job} />);
    const list = screen.getByTestId("job-state-timeline");
    expect(list).toBeInTheDocument();
    for (const label of ["PENDING", "STARTED", "COMPLETE"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows the actor once when it is unchanged across steps", () => {
    render(<JobStateTimeline job={job} />);
    expect(screen.getAllByTestId("did")).toHaveLength(1);
  });

  it("shows an empty note when there is no history", () => {
    render(<JobStateTimeline job={{} as JobMetadata} />);
    expect(screen.getByText(/no state history/i)).toBeInTheDocument();
  });
});
