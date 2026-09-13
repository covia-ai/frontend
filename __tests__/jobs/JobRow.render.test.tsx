import React, { useCallback, useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Render-count measurement for the JobRow memoisation (Gate B): each JobRow
// renders a JobDuration, so counting JobDuration invocations is a faithful proxy
// for "did this row re-render". React.memo should stop an unchanged row from
// re-rendering when a sibling's live data changes — the win over the old
// derive-and-rebuild-every-row-twice loop.
const durationRenders: string[] = [];
jest.mock("@/components/jobs/JobDuration", () => ({
  JobDuration: ({ job }: { job: { id?: string } }) => {
    durationRenders.push(job.id ?? "");
    return <span data-testid="dur" />;
  },
}));
jest.mock("@/components/StatusBadge", () => ({ StatusBadge: () => <span /> }));
jest.mock("@/components/jobs/JobRowActions", () => ({ JobRowActions: () => <span /> }));

import { JobRow } from "@/components/jobs/JobRow";

const JOBS = [
  { id: "a", name: "A", status: "STARTED", op: "x", created: "2026-01-01T00:00:00Z" },
  { id: "b", name: "B", status: "STARTED", op: "y", created: "2026-01-01T00:00:00Z" },
  { id: "c", name: "C", status: "STARTED", op: "z", created: "2026-01-01T00:00:00Z" },
] as unknown as import("@covia/covia-sdk").JobMetadata[];

// Mirrors JobList's stable-props pattern: stable job refs + a string adapter +
// useCallback handlers, so only the changed `live` overlay differs between renders.
function Harness() {
  const [live, setLive] = useState<Record<string, { status: string }>>({});
  const onOpen = useCallback(() => {}, []);
  const onChanged = useCallback(() => {}, []);
  return (
    <div>
      <button data-testid="bump" onClick={() => setLive((l) => ({ ...l, b: { status: "COMPLETE" } }))} />
      {JOBS.map((job) => (
        <JobRow
          key={job.id}
          variant="card"
          job={job}
          live={live[job.id ?? ""] as never}
          adapter="test:echo"
          maxMs={0}
          onOpen={onOpen}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

describe("JobRow memoisation — render count", () => {
  it("re-renders only the row whose live data changed", () => {
    durationRenders.length = 0;
    render(<Harness />);
    // Initial mount: each of the three rows renders exactly once.
    expect(durationRenders).toEqual(["a", "b", "c"]);

    durationRenders.length = 0;
    // A live update arrives for job "b" only (as a 5s poll would deliver).
    act(() => { fireEvent.click(screen.getByTestId("bump")); });
    // Only "b" re-renders; "a" and "c" are memoised away (0 extra renders each).
    expect(durationRenders).toEqual(["b"]);
  });
});
