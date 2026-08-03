import type { DemoBeat } from "@/components/demo-kit/BeatCard";

// Governed Escalation makes ONE claim: when an agent hits the edge of its
// authority, the decision goes to a human, and what the human grants is a real
// expiring capability — not a flag in a database.

export const ESCALATION_BEATS: DemoBeat[] = [
  {
    id: "escalate",
    title: "1 · Drift becomes a governed event",
    narration:
      "The cohort window moves to week two, where device-reuse velocity has tripled. rk-monitor reads both windows under its own capped authority, reports the numbers, and an ask is raised proposing a temporary raise of the reviewed limit. Its job parks — nothing moves until a person decides.",
    watch: "The job holds at INPUT_REQUIRED. The wait itself is a recorded state.",
  },
  {
    id: "decide",
    title: "2 · A human decides, and authority is granted",
    narration:
      "You answer in the real Inbox as the risk officer and sign the capability with your own device key. An agent cannot answer this — the runtime refuses on identity, not on scope, because resolving an ask confers authority. The parked job then resumes on its own.",
    watch: "The grant is verified here by the venue's own ucan:verify: your DID as issuer, one narrow capability, a real expiry that lapses by itself.",
  },
];
