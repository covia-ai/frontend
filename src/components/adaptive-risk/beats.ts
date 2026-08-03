import type { Job, Venue } from "@covia/covia-sdk";
import { resolveOperationByAddress } from "@/lib/operations-catalog";
import { createUCANJWT, hexToPrivateKey } from "@covia/covia-sdk";
import { AdaptiveRiskAddresses, STARTER_CARD_LIMIT, riskPaths } from "./fixtures";

// Beat runners. Each beat is ONE real job on the venue: the agent:request
// invocation, whose record adopts the task outcome (verified live — a failed
// transition surfaces as this job FAILED with the venue's error). The demo
// renders that record and never animates anything over it.

export const AGENT_REQUEST_OP = "v/ops/agent/request";

function sentinelTask(addresses: AdaptiveRiskAddresses): string {
  const paths = riskPaths(addresses.root);
  return (
    `Scan this week's starter-card applications under ${paths.applications} ` +
    `(twelve records, APP-1060 to APP-1071). Write one signal record per applicant to ` +
    `${paths.signals}/<applicant-id> and, where two or more applications share a ` +
    `device id, a flag record at ${paths.flags}/<device-id> with the sharing ` +
    `applicant ids under sharedWith. When the ledger is written, complete the task ` +
    `with a one-line summary of what you flagged.`
  );
}

// A failed transition suspends the agent on purpose: it accepts no new work
// and names its cause and remedy ("fix the cause, then use agent:resume"),
// so a broken agent cannot burn through queued tasks. Clearing that is the
// operator's call — here the Run click IS that decision, which is why resume
// happens per run rather than automatically in the background. Same pattern
// as AIPrompt's dispatch path.
async function resumeIfSuspended(venue: Venue, agentId: string): Promise<void> {
  let suspended = false;
  try {
    const info = await venue.agents.info(agentId);
    suspended = info?.status === "SUSPENDED";
  } catch {
    // A missing or unreadable agent surfaces on the request itself, with the
    // venue's own message — nothing useful to add here.
    return;
  }
  if (!suspended) return;
  // A failed resume must not be swallowed: the request below would then fail
  // with the stale suspension reason and hide the real cause.
  await venue.agents.resume(agentId);
}

export async function runBeat1(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<Job> {
  await resumeIfSuspended(venue, addresses.sentinelAgent);
  const op = await resolveOperationByAddress(venue, AGENT_REQUEST_OP);
  return op.invoke({
    agentId: addresses.sentinelAgent,
    input: { task: sentinelTask(addresses) },
    wait: true,
  });
}

function assessorTask(
  addresses: AdaptiveRiskAddresses,
  applicant: string,
  amount: number,
  device: string,
): string {
  const paths = riskPaths(addresses.root);
  return (
    `Assess starter-card applicant ${applicant}. Read their application at ` +
    `${paths.applications}/${applicant} and the fraud signal ledger under ` +
    `${paths.signals}. Then issue the decision by invoking ${addresses.issueLimit} ` +
    `with exactly {"applicant": "${applicant}", "amount": ${amount}, "device": "${device}"}. ` +
    `Issue exactly that amount — the runtime enforces policy, not you. If the ` +
    `invocation fails, report the error you received word for word and stop.`
  );
}

/**
 * Beats 2 and 3 are the same call with different inputs — that is the point:
 * nothing about the assessor changes between the approval and the refusal,
 * only what it is asked to issue. The gate decides.
 */
export async function runAssessorBeat(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
  applicant: string,
  amount: number,
  device: string,
): Promise<Job> {
  await resumeIfSuspended(venue, addresses.assessorAgent);
  const op = await resolveOperationByAddress(venue, AGENT_REQUEST_OP);
  return op.invoke({
    agentId: addresses.assessorAgent,
    input: { task: assessorTask(addresses, applicant, amount, device) },
    wait: true,
  });
}

// Job-free ledger snapshot for the beat-1 effect panel: what the sentinel
// actually wrote, read straight off the lattice.
export type LedgerSnapshot = {
  signalCount: number;
  signalKeys: string[];
  flags: Array<{ device: string; record: unknown }>;
};

export async function readLedger(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<LedgerSnapshot> {
  const paths = riskPaths(addresses.root);
  const signals = await venue.workspace.list(paths.signals);
  const signalKeys = (signals.exists ? (signals.keys ?? []) : []).map(String);
  const flagsList = await venue.workspace.list(paths.flags);
  const flagKeys = (flagsList.exists ? (flagsList.keys ?? []) : []).map(String);
  const flags = await Promise.all(
    flagKeys.map(async (device) => ({
      device,
      record: (await venue.workspace.read(`${paths.flags}/${device}`)).value,
    })),
  );
  return { signalCount: signalKeys.length, signalKeys, flags };
}

// The decision ledger, read job-free. Beat 2's effect (a decision written)
// and beat 3's non-effect (nothing written for the refused applicant) are
// both read from here — the refusal is proved by absence.
export type DecisionSnapshot = {
  applicants: string[];
  records: Array<{ applicant: string; record: unknown }>;
};

export async function readDecisions(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<DecisionSnapshot> {
  const paths = riskPaths(addresses.root);
  const listed = await venue.workspace.list(paths.decisions);
  const applicants = (listed.exists ? (listed.keys ?? []) : []).map(String);
  const records = await Promise.all(
    applicants.map(async (applicant) => ({
      applicant,
      record: (await venue.workspace.read(`${paths.decisions}/${applicant}`)).value,
    })),
  );
  return { applicants, records };
}

// ---------------------------------------------------------------------------
// Beat 4. The drift itself is a fixture swap — the venue has no drift metric
// and the demo says so on screen. Everything after the swap is real: the
// monitor's escalation, the parked job, the human's answer in the Inbox, the
// venue-signed grant, and the resumption.

export const GRANT_LIFETIME_DAYS = 7;

/** Points the cohort-window pointer at week two. A real write, a real job. */
export async function swapToWeekTwo(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<void> {
  await venue.workspace.write(riskPaths(addresses.root).window, "week-2");
}

function monitorTask(addresses: AdaptiveRiskAddresses): string {
  const paths = riskPaths(addresses.root);
  // The grant offered is deliberately NOT invoke-on-issue-limit: an ungated
  // grant covering that op would short-circuit the limit gate entirely
  // (CapabilityChecker prefers an ungated covering grant), which would
  // dismantle the very thing beats 2 and 3 establish. It grants write on the
  // reviewed-limit path instead; the gate's device-flag condition keeps
  // applying whatever the limit says.
  const exp = Math.floor(Date.now() / 1000) + GRANT_LIFETIME_DAYS * 24 * 3600;
  return (
    `First load the \`hitl\` skill (skill_load), which activates the hitl_request tool — ` +
    `hitl:request is Job-carried and cannot be invoked as a plain tool. Then read the ` +
    `current cohort window pointer at ${paths.window} and both window ` +
    `records under ${paths.windows}. Compare the current window's deviceReuseRate ` +
    `to the week-1 baseline. If it has at least doubled, raise a human-in-the-loop ` +
    `request by calling hitl_request with EXACTLY this input, substituting ` +
    `the two real rates you read into the description:\n` +
    `{"title": "Raise starter-card autonomous limit to S$800 for ${GRANT_LIFETIME_DAYS} days",` +
    `"description": "Device-reuse velocity across the cohort has risen from <baseline> ` +
    `(week 1) to <current> (week 2). Proposing a temporary raise of the assessor's ` +
    `reviewed limit from S$500 to S$800 for ${GRANT_LIFETIME_DAYS} days. The device-flag ` +
    `condition in the limit gate continues to apply regardless of the limit.",` +
    `"asks": [{"id": "raise", "type": "approval", "prompt": "Approve the temporary ` +
    `limit raise to S$800?", "grants": [{"with": "${paths.limitReview}/", ` +
    `"can": "crud/write", "exp": ${exp}}]}]}\n` +
    `Do not change any policy yourself. Report the request id you received.`
  );
}

export const HITL_REQUEST_OP = "v/ops/hitl/request";

/** Whatever the monitor said, for embedding in the ask verbatim. */
function monitorFinding(output: unknown): string {
  const walk = (value: unknown, depth: number): string | null => {
    if (depth > 5 || value == null) return null;
    if (typeof value === "string" && value.length > 40) return value;
    if (typeof value === "object") {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        const hit = walk(nested, depth + 1);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(output, 0) ?? "(the monitor returned no narrative)";
}

export type Beat4Result = { analysis: Job; ask: Job };

/**
 * Beat 4 runs in two parts, and the UI says so rather than blurring them.
 *
 * The monitor's ANALYSIS is real: it reads both cohort windows under its own
 * capped authority and decides whether the threshold is breached.
 *
 * The ASK is raised by this page, not by the agent — not a shortcut, a venue
 * limitation: every agent tool call is dispatched through invokeInternal, and
 * HITLAdapter refuses hitl:request on that path ("Job-carried — invoke it as
 * an operation, not internally"), so an agent currently cannot raise one at
 * all (covia-ai/covia#316). The monitor's own words are carried into the
 * ask's description verbatim, and everything downstream — the parked job,
 * the Inbox answer, the venue-signed grant, the resumption — is real.
 */
export async function runBeat4(
  venue: Venue,
  addresses: AdaptiveRiskAddresses,
): Promise<Beat4Result> {
  await resumeIfSuspended(venue, addresses.monitorAgent);
  const agentOp = await resolveOperationByAddress(venue, AGENT_REQUEST_OP);
  const analysis = await agentOp.invoke({
    agentId: addresses.monitorAgent,
    input: { task: monitorTask(addresses) },
    wait: true,
  });
  await analysis.refresh();

  const finding = analysis.isComplete
    ? monitorFinding(analysis.output)
    : (analysis.metadata?.error ?? "(the monitor's analysis did not complete)");
  const paths = riskPaths(addresses.root);
  const hitlOp = await resolveOperationByAddress(venue, HITL_REQUEST_OP);
  // No `wait` — this job PARKS in INPUT_REQUIRED until a human answers, which
  // may be minutes or days away.
  const ask = await hitlOp.invoke({
    title: `Raise starter-card autonomous limit to S$800 for ${GRANT_LIFETIME_DAYS} days`,
    description:
      `**${addresses.monitorAgent} reported:**\n\n> ${finding}\n\n` +
      `Proposing a temporary raise of the reviewed limit from S$${STARTER_CARD_LIMIT} ` +
      `to S$800 for ${GRANT_LIFETIME_DAYS} days. The device-flag condition in the ` +
      `limit gate continues to apply regardless of the limit.\n\n` +
      `_Raised by the Adaptive Risk demo page carrying the monitor's finding: ` +
      `agents cannot raise HITL asks on this venue build (covia-ai/covia#316)._`,
    // A `token` ask (COG-19), not an approval-with-grants (COG-17. The venue
    // can only mint a root grant over resources IT controls; a device-key
    // signer is self-sovereign, so w/risk/... under their DID is theirs, and
    // the venue refuses to root-sign it — verbatim: "Cannot issue a
    // venue-signed root grant … the resource is not controlled by this venue.
    // Self-sovereign DID owners must sign the UCAN with their own key". So the
    // human signs it with their own device key; the venue only transports and
    // verifies it. Stronger, not weaker: the venue never holds the authority.
    asks: [
      {
        id: "raise",
        type: "token",
        prompt:
          `Approve a temporary raise of the reviewed limit to S$800 for ` +
          `${GRANT_LIFETIME_DAYS} days by signing a grant with your own key.`,
        required: true,
        token: {
          caps: [{ with: `${paths.limitReview}/`, can: "crud/write" }],
          exp: GRANT_LIFETIME_DAYS * 24 * 3600,
        },
      },
    ],
  });

  return { analysis, ask };
}

/** The open ask this demo raised, if any — used to deep-link into the Inbox. */
export async function findOpenAsk(
  venue: Venue,
): Promise<{ id: string; title: string } | null> {
  const listed = await venue.workspace.list("h");
  // Request ids are time-ordered, so the newest sorts last — take that one
  // first. Repeated runs leave earlier asks open, and linking at a stale one
  // would send the viewer to a decision they already made.
  const ids = (listed.exists ? (listed.keys ?? []) : [])
    .map(String)
    .sort()
    .reverse();
  for (const id of ids) {
    const record = (await venue.workspace.read(`h/${id}`)).value as
      | { status?: string; title?: string }
      | null;
    if (record?.status === "open" && record.title?.includes("S$800")) {
      return { id, title: record.title };
    }
  }
  return null;
}

export type GrantVerification = {
  valid: boolean;
  reason?: string;
  expiresAt: number | null;
  attenuations: Array<{ with?: string; can?: string }>;
  issuer?: string;
};

/**
 * Verifies the minted token with the venue's own `ucan:verify`, so the grant
 * on screen is cryptographically checked rather than merely displayed.
 */
export async function verifyGrantToken(
  venue: Venue,
  token: string,
): Promise<GrantVerification> {
  const result = await venue.ucan.verify(token);
  return {
    valid: !!result.valid,
    reason: result.reason,
    expiresAt: typeof result.exp === "number" ? result.exp : null,
    attenuations: (result.att ?? []) as Array<{ with?: string; can?: string }>,
    issuer: result.iss,
  };
}

// A JWT by shape, not by key name. The venue delivers a capability token two
// different ways: a venue-minted COG-17 grant lands on `token`, while a
// self-signed COG-19 transported token rides `tokens` keyed by ask id
// (HITLAdapter.resolveAnswer). Matching the shape covers both, and anything
// else the envelope grows later.
const JWT_SHAPE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;

export function extractGrantToken(output: unknown): string | null {
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number): string | null => {
    if (depth > 6 || value == null || seen.has(value)) return null;
    if (typeof value === "string") {
      return JWT_SHAPE.test(value) ? value : null;
    }
    if (typeof value === "object") {
      seen.add(value);
      for (const nested of Object.values(value as Record<string, unknown>)) {
        const hit = walk(nested, depth + 1);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(output, 0);
}

// ---------------------------------------------------------------------------
// Beat 5. Reconstruction, never re-execution. JOBS.md is explicit that
// recovery "stabilises, never re-executes" — a stored record is read back, and
// nothing is ever re-fired. So this beat produces a plain REST read of a
// record that already exists, not a way to run anything again.

export const JOBS_MD_RULE =
  "Recovery stabilises, never re-executes — a venue restart leaves every job " +
  "in a stable, honest state so callers can resume, cancel, or retry as they " +
  "wish. Re-execution would double side effects for non-idempotent ops, so " +
  "nothing is ever re-fired.";

/**
 * The curl that returns the same record from plain REST.
 *
 * Job records live in the caller's own namespace, so an anonymous GET 404s —
 * the read has to carry the caller's identity. `token` is a short-lived
 * identity UCAN signed in the browser with the user's own device key; it is
 * never sent anywhere by this page, only rendered for the user to copy.
 */
export function reconstructionCurl(
  baseUrl: string,
  jobId: string,
  token: string | null,
): string {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/jobs/${jobId}`;
  if (!token) {
    return [
      `# Set COVIA_TOKEN to an identity token for this venue first`,
      `curl -s -H "Authorization: Bearer $COVIA_TOKEN" \\`,
      `  ${url} | jq`,
    ].join("\n");
  }
  return [`curl -s -H "Authorization: Bearer ${token}" \\`, `  ${url} | jq`].join("\n");
}

export type RecordSummary = {
  status: string | null;
  /** Present only when the acting principal differs from the owner. */
  actor: string | null;
  caller: string | null;
  error: string | null;
  /** How many predecessor states the record carries. */
  prevDepth: number;
  states: string[];
};

/** Walks the embedded `prev` chain — the record's own state history. */
export function summariseRecord(record: unknown): RecordSummary {
  const top = (record ?? {}) as Record<string, unknown>;
  const states: string[] = [];
  let depth = 0;
  let node: Record<string, unknown> | null = top;
  while (node && depth <= 24) {
    const status: unknown = node.status;
    if (typeof status === "string") states.push(status);
    const prev: unknown = node.prev;
    node =
      prev && typeof prev === "object" ? (prev as Record<string, unknown>) : null;
    if (node) depth += 1;
  }
  return {
    status: typeof top.status === "string" ? top.status : null,
    actor: typeof top.actor === "string" ? top.actor : null,
    caller: typeof top.caller === "string" ? top.caller : null,
    error: typeof top.error === "string" ? top.error : null,
    prevDepth: depth,
    // Oldest first reads as a history rather than a stack.
    states: states.reverse(),
  };
}

/**
 * A short-lived identity token for the curl, signed in the browser with the
 * user's own device key. Deliberately minutes, not days: it is pasted into a
 * terminal and should stop working soon after.
 */
export const CURL_TOKEN_LIFETIME_SECONDS = 600;

export function signIdentityToken(privateKeyHex: string, venueDID: string): string {
  return createUCANJWT(
    hexToPrivateKey(privateKeyHex),
    venueDID,
    [],
    CURL_TOKEN_LIFETIME_SECONDS,
  );
}
