// Synthetic fixtures and operation metadata for the Adaptive Risk demo.
// Twelve applicants, one fictional bank (Meridian Bank Singapore). Nothing
// here describes a real person, device or lender.
//
// The planted case: APP-1071 requests S$2,500 against a S$500 authority AND
// shares device dev-9903 with APP-1063 — wrong twice, so the gate has two
// independent reasons to refuse.

export const STARTER_CARD_LIMIT = 500;

export type Applicant = {
  id: string;
  requestedAmount: number;
  device: string;
  tenureMonths: number;
  monthlyIncomeSgd: number;
};

export const APPLICANTS: Applicant[] = [
  { id: "APP-1060", requestedAmount: 500, device: "dev-4411", tenureMonths: 3, monthlyIncomeSgd: 3200 },
  { id: "APP-1061", requestedAmount: 400, device: "dev-8062", tenureMonths: 5, monthlyIncomeSgd: 2800 },
  { id: "APP-1062", requestedAmount: 500, device: "dev-1174", tenureMonths: 2, monthlyIncomeSgd: 3600 },
  { id: "APP-1063", requestedAmount: 500, device: "dev-9903", tenureMonths: 4, monthlyIncomeSgd: 3100 },
  { id: "APP-1064", requestedAmount: 300, device: "dev-2258", tenureMonths: 7, monthlyIncomeSgd: 2500 },
  { id: "APP-1065", requestedAmount: 450, device: "dev-6640", tenureMonths: 3, monthlyIncomeSgd: 2900 },
  { id: "APP-1066", requestedAmount: 500, device: "dev-3319", tenureMonths: 6, monthlyIncomeSgd: 4100 },
  { id: "APP-1067", requestedAmount: 350, device: "dev-7702", tenureMonths: 2, monthlyIncomeSgd: 2700 },
  { id: "APP-1068", requestedAmount: 500, device: "dev-5527", tenureMonths: 8, monthlyIncomeSgd: 3800 },
  { id: "APP-1069", requestedAmount: 400, device: "dev-9086", tenureMonths: 4, monthlyIncomeSgd: 3000 },
  { id: "APP-1070", requestedAmount: 450, device: "dev-1531", tenureMonths: 5, monthlyIncomeSgd: 3300 },
  { id: "APP-1071", requestedAmount: 2500, device: "dev-9903", tenureMonths: 1, monthlyIncomeSgd: 5200 },
];

// Cohort windows for beat 4. The "drift" is this fixture swap — the venue has
// no drift metric; what is real is everything that happens after the monitor
// reads the numbers.
export const WEEK_ONE = {
  window: "week-1",
  cohortSize: APPLICANTS.length,
  deviceReuseRate: 0.08,
  note: "Baseline week: device reuse across the cohort within normal range.",
};

export const WEEK_TWO = {
  window: "week-2",
  cohortSize: APPLICANTS.length,
  deviceReuseRate: 0.26,
  note: "Device-reuse velocity across the cohort has tripled against baseline.",
};

// ---------------------------------------------------------------------------
// Addresses. Everything is editable in the setup panel before seeding, so a
// user can point the demo at operations they already run.

export type AdaptiveRiskAddresses = {
  /** Root lattice path for the demo's data (applications, signals, flags, decisions, windows). */
  root: string;
  /** The gate operation — the assessor's invoke grant is conditional on it. */
  limitGate: string;
  /** The decision-writing operation the assessor invokes, gated. */
  issueLimit: string;
  /** Content-addressed policy operation (asset id). Filled by seeding; editable to swap in your own. */
  policyAsset: string;
  sentinelAgent: string;
  assessorAgent: string;
  monitorAgent: string;
  /** LLM provider operation for the agents (e.g. v/ops/langchain/openai). */
  llmOperation: string;
  /** Model id forwarded to the provider; empty = provider default. */
  model: string;
};

export const DEFAULT_ADDRESSES: AdaptiveRiskAddresses = {
  root: "w/risk",
  limitGate: "w/ops/risk/limit-gate",
  issueLimit: "w/ops/risk/issue-limit",
  policyAsset: "",
  sentinelAgent: "rk-sentinel",
  assessorAgent: "rk-assessor",
  monitorAgent: "rk-monitor",
  llmOperation: "v/ops/langchain/openai",
  model: "",
};

export const riskPaths = (root: string) => ({
  applications: `${root}/applications`,
  signals: `${root}/signals`,
  flags: `${root}/flags`,
  decisions: `${root}/decisions`,
  windows: `${root}/windows`,
  window: `${root}/window`,
  limitReview: `${root}/limit-review`,
});

// ---------------------------------------------------------------------------
// Operation metadata. The policy op's OUTPUT SCHEMA is the policy: the gate
// pipes a composed verdict through it with strict step validation, so a
// violating verdict fails schema validation, which fails the gate, which
// denies the invocation — all venue-side.

export function policyCheckMetadata(limit: number = STARTER_CARD_LIMIT) {
  return {
    name: "Starter Card Policy",
    description:
      `Meridian starter-card issue policy: amount up to S$${limit} and no flagged device. ` +
      "The output schema of this operation IS the policy — a violating verdict fails " +
      "schema validation, which fails the gate that runs it.",
    operation: {
      adapter: "json:merge",
      input: {
        type: "object",
        properties: { values: { type: "array" } },
        required: ["values"],
      },
      output: {
        type: "object",
        properties: {
          result: {
            type: "object",
            properties: {
              amount: { type: "number", maximum: limit },
              deviceFlagged: { const: false },
            },
            required: ["amount", "deviceFlagged"],
          },
        },
        required: ["result"],
      },
    },
  };
}

export function limitGateMetadata(policyRef: string, addresses: AdaptiveRiskAddresses) {
  const paths = riskPaths(addresses.root);
  return {
    name: "Risk Limit Gate",
    description:
      "Policy gate for issue-limit: reads the shared signal ledger and passes a composed " +
      "verdict through the content-addressed starter-card policy. Evaluated by the venue " +
      "before the gated operation executes; a policy violation denies the invocation.",
    operation: {
      adapter: "orchestrator",
      // Output validation is opt-in — without strict the policy schema is
      // never enforced and the gate silently passes everything.
      strict: true,
      input: { type: "object" },
      output: { type: "object" },
      steps: [
        {
          name: "Read device flag",
          op: "v/ops/covia/read",
          input: {
            path: ["concat", ["const", `${paths.flags}/`], ["input", "input", "device"]],
          },
        },
        {
          name: "Policy check",
          op: policyRef,
          input: {
            values: [
              "array",
              {
                applicant: ["input", "input", "applicant"],
                amount: ["input", "input", "amount"],
                device: ["input", "input", "device"],
                deviceFlagged: [0, "exists"],
              },
            ],
          },
        },
      ],
      result: { verdict: [1, "result"] },
    },
  };
}

export function issueLimitMetadata(addresses: AdaptiveRiskAddresses) {
  const paths = riskPaths(addresses.root);
  return {
    name: "Issue Credit Limit",
    description:
      "Writes an approved credit-limit decision to the risk decision ledger. The assessor " +
      "agent's grant to invoke this operation is conditional on the limit gate.",
    operation: {
      adapter: "orchestrator",
      input: {
        type: "object",
        properties: {
          applicant: { type: "string" },
          amount: { type: "number" },
          device: { type: "string" },
        },
        required: ["applicant", "amount", "device"],
      },
      output: { type: "object" },
      steps: [
        {
          name: "Write decision",
          op: "v/ops/covia/write",
          input: {
            path: ["concat", ["const", `${paths.decisions}/`], ["input", "applicant"]],
            value: {
              applicant: ["input", "applicant"],
              amount: ["input", "amount"],
              device: ["input", "device"],
              status: ["const", "approved"],
            },
          },
        },
      ],
      result: { decision: ["input"], written: [0] },
    },
  };
}

// ---------------------------------------------------------------------------
// Agent configs. caps are hard authority (enforced by the runtime); tools are
// what the model is offered. The assessor's ONLY route to issue-limit is a
// grant conditional on the gate.

export function agentConfigs(addresses: AdaptiveRiskAddresses) {
  const paths = riskPaths(addresses.root);
  const llm = {
    operation: "v/ops/llmagent/chat",
    llmOperation: addresses.llmOperation,
    ...(addresses.model ? { model: addresses.model } : {}),
  };
  return {
    sentinel: {
      agentId: addresses.sentinelAgent,
      config: {
        ...llm,
        systemPrompt:
          "You are rk-sentinel, the fraud-signal agent for Meridian Bank Singapore's starter card. " +
          `Read the applications under ${paths.applications} and write one signal record per applicant to ` +
          `${paths.signals}/<applicant-id> with the device id and anything anomalous. When two or more ` +
          `applications share a device, write a flag record to ${paths.flags}/<device-id> listing the sharing ` +
          "applicants under sharedWith. You do not decide credit and you do not contact other agents; you " +
          "only read applications and write signals and flags.",
        tools: ["v/ops/covia/read", "v/ops/covia/list", "v/ops/covia/write"],
        defaultTools: false,
        caps: [
          { with: `${paths.applications}/`, can: "crud/read" },
          { with: `${paths.signals}/`, can: "crud/write" },
          { with: `${paths.flags}/`, can: "crud/write" },
          { with: "v/ops/covia/read", can: "invoke" },
          { with: "v/ops/covia/list", can: "invoke" },
          { with: "v/ops/covia/write", can: "invoke" },
        ],
      },
    },
    assessor: {
      agentId: addresses.assessorAgent,
      config: {
        ...llm,
        systemPrompt:
          "You are rk-assessor, the credit agent for Meridian Bank Singapore's starter card " +
          `(base limit S$${STARTER_CARD_LIMIT}). To assess an applicant, read their application under ` +
          `${paths.applications} and the signal ledger under ${paths.signals}, then issue the decision by ` +
          `invoking ${addresses.issueLimit} with {applicant, amount, device}. Issue exactly the amount you ` +
          "were asked to issue; the runtime enforces policy, not you. If an invocation fails, report the " +
          "error you received verbatim and stop.",
        tools: ["v/ops/covia/read", "v/ops/covia/list", addresses.issueLimit],
        defaultTools: false,
        caps: [
          { with: `${paths.applications}/`, can: "crud/read" },
          { with: `${paths.signals}/`, can: "crud/read" },
          { with: `${paths.flags}/`, can: "crud/read" },
          { with: `${paths.decisions}/`, can: "crud/write" },
          { with: "v/ops/covia/read", can: "invoke" },
          { with: "v/ops/covia/list", can: "invoke" },
          { with: "v/ops/covia/write", can: "invoke" },
          { with: addresses.issueLimit, can: "invoke", nb: { gate: addresses.limitGate } },
          { with: addresses.policyAsset ? addresses.policyAsset : "a/", can: "invoke" },
        ],
      },
    },
    monitor: {
      agentId: addresses.monitorAgent,
      config: {
        ...llm,
        systemPrompt:
          "You are rk-monitor, the drift watch for Meridian Bank Singapore's starter card. Read the " +
          `current cohort window pointer at ${paths.window} and the window records under ${paths.windows}. ` +
          "Compare the current window's deviceReuseRate to the week-1 baseline. If it has at least doubled, " +
          "load the `hitl` skill and raise the escalation with the hitl_request tool it activates — " +
          "hitl:request is Job-carried, so it is only reachable through the skill, never as a plain tool. " +
          "Title the ask clearly, describe the breach with both real numbers, and attach the offered grant " +
          "exactly as instructed in the task. Do not change any policy yourself.",
        tools: ["v/ops/covia/read", "v/ops/covia/list"],
        skills: ["w/skills"],
        defaultTools: false,
        // Reads are broad enough to cover the demo's own data AND the venue
        // skill library: hitl:request is Job-carried, reachable only via the
        // `hitl` skill, and skill loading confers no authority of its own —
        // a caps-pinned agent must be able to read v/skills and invoke the op
        // (skills/hitl/SKILL.md §agent, point 5). The boundary that matters
        // is unchanged: the monitor holds NO grant on issue-limit and no
        // write to the decision ledger. It watches and escalates.
        caps: [
          { with: `${addresses.root}/`, can: "crud/read" },
          { with: "w/skills/", can: "crud/read" },
          { with: `${paths.limitReview}/`, can: "crud/write" },
          { with: "v/ops/covia/read", can: "invoke" },
          { with: "v/ops/covia/list", can: "invoke" },
          { with: "v/ops/hitl/request", can: "invoke" },
          { with: "v/ops/hitl/list", can: "invoke" },
          { with: "v/ops/grid/job-status", can: "invoke" },
        ],
      },
    },
  };
}
