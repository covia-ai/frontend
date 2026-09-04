import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Heavy children stubbed to isolate the ExecutionViewer layout.
jest.mock("@/components/admin-panel/TopBar", () => ({ TopBar: () => <div data-testid="top-bar" /> }));
jest.mock("@/components/ExecutionToolbar", () => ({ ExecutionToolbar: () => <button>Delete</button> }));
jest.mock("@/components/execution/ExecutionChildJobs", () => ({ ExecutionChildJobs: () => <div data-testid="child-jobs" /> }));
jest.mock("@/components/execution/ExecutionDataTable", () => ({
  ExecutionDataTable: ({ direction }: { direction: string }) => <div data-testid={`datatable-${direction}`} />,
}));
jest.mock("@/components/typed-result/TypedResultRenderer", () => ({ TypedResultRenderer: () => <div data-testid="typed-result" /> }));
jest.mock("@/components/AssetLoadState", () => ({ AssetLoadState: () => null }));
jest.mock("@/components/ErrorDisplay", () => ({ ErrorDisplay: () => <div data-testid="error-display" /> }));
jest.mock("@/components/DidDisplay", () => ({ DidDisplay: ({ value }: { value: string }) => <span>{value}</span> }));

const baseJob = {
  id: "0x01a06b196edf000084336cf650a762fb",
  name: "Set Secret",
  status: "COMPLETE",
  operation: "v/ops/secret/set",
  created: "2026-09-04T13:47:22.000Z",
  updated: "2026-09-04T13:47:22.008Z",
  input: { Name: "DEMO" },
  output: { Stored: true },
  caller: "did:key:z6MktjExampleCallerDid",
};

let mockExecution: any;
jest.mock("@/hooks/use-execution-lifecycle", () => ({
  useExecutionLifecycle: () => mockExecution,
}));

import { ExecutionViewer } from "@/components/ExecutionViewer";

function setExecution(job: any) {
  mockExecution = {
    venue: { venueId: "did:key:z6MkVenue", metadata: { name: "Test Venue" } },
    job,
    operationAsset: undefined,
    loading: false,
    error: null,
    notFound: false,
    streaming: false,
    message: "",
    setMessage: jest.fn(),
    sendMessage: jest.fn(),
    sendingMessage: false,
  };
}

describe("ExecutionViewer — rich job detail", () => {
  it("renders the hero, at-a-glance tiles, input/output and provenance", () => {
    setExecution(baseJob);
    render(<ExecutionViewer jobId={baseJob.id} venueId="did:key:z6MkVenue" />);

    // Hero: operation name + status + actions.
    expect(screen.getByRole("heading", { name: "Set Secret" })).toBeInTheDocument();
    expect(screen.getByText("COMPLETE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    // Operation path is shown (hero + provenance).
    expect(screen.getAllByText("v/ops/secret/set").length).toBeGreaterThan(0);

    // At-a-glance tiles: created AND updated both present (nothing dropped).
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Started")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();

    // Input + Output panels (not the error panel, since it's COMPLETE).
    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByTestId("datatable-input")).toBeInTheDocument();
    expect(screen.queryByText("Error")).not.toBeInTheDocument();

    // Provenance: caller DID + reference.
    expect(screen.getByText("Provenance")).toBeInTheDocument();
    expect(screen.getByText("did:key:z6MktjExampleCallerDid")).toBeInTheDocument();
    expect(screen.getByText("Reference")).toBeInTheDocument();
  });

  it("shows the Error panel and a red tone for a failed job", () => {
    setExecution({ ...baseJob, status: "FAILED", error: "boom" });
    render(<ExecutionViewer jobId={baseJob.id} venueId="did:key:z6MkVenue" />);

    expect(screen.getByText("FAILED")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByTestId("error-display")).toBeInTheDocument();
    // No Output panel for a failed job.
    expect(screen.queryByText("Output")).not.toBeInTheDocument();
  });
});
