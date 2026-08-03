// Governed Escalation. A drift monitor watches a metric, and when it breaches
// a threshold the decision goes to a human — not to another agent.
//
// The cohort numbers are fixtures and the breach is scripted; the venue has no
// drift metric. What is real is everything after the monitor reads them: the
// escalation, the parked job, the human's answer in the Inbox, the signed
// capability and the resumption. The page says so.

export const GRANT_LIFETIME_DAYS = 7;
export const BASELINE_LIMIT = 500;
export const PROPOSED_LIMIT = 800;

export const WEEK_ONE = {
  window: "week-1",
  cohortSize: 12,
  deviceReuseRate: 0.08,
  note: "Baseline week: device reuse across the cohort within normal range.",
};

export const WEEK_TWO = {
  window: "week-2",
  cohortSize: 12,
  deviceReuseRate: 0.26,
  note: "Device-reuse velocity across the cohort has tripled against baseline.",
};

export type EscalationAddresses = {
  /** Root for this demo's data (cohort windows, the reviewed limit). */
  root: string;
  monitorAgent: string;
  /** Where the venue's HITL skill is shadowed so a capped agent can load it. */
  skillsPath: string;
  llmOperation: string;
  model: string;
};

export const DEFAULT_ADDRESSES: EscalationAddresses = {
  root: "w/drift",
  monitorAgent: "rk-monitor",
  skillsPath: "w/skills",
  llmOperation: "v/ops/langchain/openai",
  model: "",
};

export const ADDRESS_FIELDS = [
  { key: "root", label: "Data root", hint: "cohort windows and the reviewed limit live under here", common: true },
  { key: "llmOperation", label: "LLM provider operation", hint: "the venue needs this provider's API key in Secrets", common: true },
  { key: "model", label: "Model", hint: "empty = provider default", common: true },
  { key: "monitorAgent", label: "Monitor agent id" },
  { key: "skillsPath", label: "Skills path", hint: "the venue HITL skill is copied here so a capped agent can load it" },
];

export const driftPaths = (root: string) => ({
  windows: `${root}/windows`,
  window: `${root}/window`,
  limitReview: `${root}/limit-review`,
});

export const VENUE_HITL_SKILL = "v/skills/hitl";

export function monitorConfig(addresses: EscalationAddresses) {
  const paths = driftPaths(addresses.root);
  return {
    operation: "v/ops/llmagent/chat",
    llmOperation: addresses.llmOperation,
    ...(addresses.model ? { model: addresses.model } : {}),
    systemPrompt:
      "You are rk-monitor, a drift watch. Read the current cohort window pointer and the " +
      "window records, compare the current window's deviceReuseRate to the week-1 baseline, " +
      "and report the two numbers. Do not change any policy yourself.",
    tools: ["v/ops/covia/read", "v/ops/covia/list"],
    skills: [addresses.skillsPath],
    defaultTools: false,
    // Reads cover this demo's own data and the shadowed skill. The monitor
    // holds no write anywhere except the reviewed-limit record, and no
    // authority to change policy — it watches and escalates.
    caps: [
      { with: `${addresses.root}/`, can: "crud/read" },
      { with: `${addresses.skillsPath}/`, can: "crud/read" },
      { with: `${paths.limitReview}/`, can: "crud/write" },
      { with: "v/ops/covia/read", can: "invoke" },
      { with: "v/ops/covia/list", can: "invoke" },
    ],
  };
}
