// Narration for the Adaptive Risk demo, kept as data so the copy is testable
// and reviewable apart from the runner. One entry per beat; `watch` is the
// single thing the viewer should look at while the beat runs.
//
// Wording rule (JOBS.md): recovery stabilises and never re-executes — the
// demo says "reconstruct", never "re-run the past".

export type AdaptiveRiskBeat = {
  id: string;
  title: string;
  narration: string;
  watch: string;
};

export const ADAPTIVE_RISK_BEATS: AdaptiveRiskBeat[] = [
  {
    id: "silos",
    title: "1 · Two silos, one substrate",
    narration:
      "rk-sentinel scans the applications and writes device and velocity signals into a shared ledger. It never calls the credit agent and does not know it exists.",
    watch: "The signal ledger fills — a job record, not a message to another agent.",
  },
  {
    id: "clean-approval",
    title: "2 · A clean approval",
    narration:
      "rk-assessor reads the application and the signal ledger, and proposes S$500 for a clean applicant. The limit gate evaluates before issue-limit executes — and passes.",
    watch: "The gate is not merely a blocker: a clean case flows through it to a written decision.",
  },
  {
    id: "refusal",
    title: "3 · The refusal",
    narration:
      "The assessor is told to approve APP-1071 at S$2,500. The gate runs before execution, reads the ledger, and finds device dev-9903 shared with APP-1063. The venue refuses — the model was not persuaded, it was not permitted.",
    watch: "The venue's own denial string, verbatim, frozen on a failed job record. No decision is written.",
  },
  {
    id: "drift",
    title: "4 · Drift becomes a governed event",
    narration:
      "Week two: device-reuse velocity across the cohort has tripled. rk-monitor raises a real HITL ask proposing a temporary S$800 authority, and its job parks until the risk officer decides in the Inbox. An agent cannot answer it — the runtime refuses on identity, not on scope.",
    watch: "The ask is answered in the real Inbox; approval mints a venue-signed, expiring grant and the parked job completes.",
  },
  {
    id: "reconstruction",
    title: "5 · Reconstruction",
    narration:
      "Open the APP-1071 refusal and read the same record back over plain REST: the inputs, the caller, the error, the prev chain of every state it passed through. Reconstruct the decision — the venue stabilises records and never re-executes them.",
    watch: "The curl below returns the same record from your terminal.",
  },
];
