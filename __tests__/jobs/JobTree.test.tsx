import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockLoadJobTree = jest.fn();
jest.mock("@/lib/job-tree", () => ({
  ...jest.requireActual("@/lib/job-tree"),
  loadJobTree: (...args: unknown[]) => mockLoadJobTree(...args),
}));

import { JobTreePanel } from "@/components/jobs/JobTree";

const venue = { venueId: "did:key:z6MkVenue" } as any;
const wrap = (tree: React.ReactNode) => <section data-testid="panel">{tree}</section>;

const node = (id: string, name: string, children: any[] = []) => ({ id, name, status: "COMPLETE", children });

describe("JobTreePanel", () => {
  beforeEach(() => mockLoadJobTree.mockReset());

  it("renders nothing for a standalone job", async () => {
    mockLoadJobTree.mockResolvedValue({ root: node("aa", "Solo"), size: 1, complete: true, truncatedAbove: false });
    render(<JobTreePanel venue={venue} venueId="did:key:z6MkVenue" job={{ id: "0xaa", status: "COMPLETE" } as any} wrap={wrap} />);
    await waitFor(() => expect(mockLoadJobTree).toHaveBeenCalled());
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
  });

  it("links every other node and marks the viewed job", async () => {
    mockLoadJobTree.mockResolvedValue({
      root: node("aa", "Parent", [node("bb", "Child")]),
      size: 2,
      complete: false,
      truncatedAbove: false,
    });
    render(<JobTreePanel venue={venue} venueId="did:key:z6MkVenue" job={{ id: "0xbb", status: "COMPLETE" } as any} wrap={wrap} />);

    const parent = await screen.findByRole("link", { name: "Parent" });
    expect(parent).toHaveAttribute("href", "/venues/did%3Akey%3Az6MkVenue/jobs/0xaa");
    // The viewed job is text, not a link to itself.
    expect(screen.queryByRole("link", { name: "Child" })).not.toBeInTheDocument();
    expect(screen.getByText("this job")).toBeInTheDocument();
    expect(screen.getByText(/older child jobs may be missing/)).toBeInTheDocument();
  });

  it("re-reads when the job's status changes", async () => {
    mockLoadJobTree.mockResolvedValue({ root: node("aa", "Solo"), size: 1, complete: true, truncatedAbove: false });
    const { rerender } = render(
      <JobTreePanel venue={venue} venueId="v" job={{ id: "0xaa", status: "STARTED" } as any} wrap={wrap} />,
    );
    await waitFor(() => expect(mockLoadJobTree).toHaveBeenCalledTimes(1));
    rerender(<JobTreePanel venue={venue} venueId="v" job={{ id: "0xaa", status: "COMPLETE" } as any} wrap={wrap} />);
    await waitFor(() => expect(mockLoadJobTree).toHaveBeenCalledTimes(2));
  });
});
