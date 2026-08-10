import type { Job, Venue } from "@covia/covia-sdk";
import { resolveOperationByAddress } from "@/lib/operations-catalog";
import {
  EscalationAddresses,
  GRANT_LIFETIME_DAYS,
  BASELINE_LIMIT,
  PROPOSED_LIMIT,
  driftPaths,
} from "./fixtures";

export const AGENT_REQUEST_OP = "v/ops/agent/request";
export const HITL_REQUEST_OP = "v/ops/hitl/request";

/** A failed transition suspends an agent on purpose; the Run click is the
 *  operator's decision to retry, so clear it then — not in the background. */
async function resumeIfSuspended(venue: Venue, agentId: string): Promise<void> {
  let suspended = false;
  try {
    suspended = (await venue.agents.info(agentId))?.status === "SUSPENDED";
  } catch {
    return; // A missing agent surfaces on the request itself.
  }
  if (suspended) await venue.agents.resume(agentId);
}

/** Whatever the monitor said, for quoting in the ask verbatim. */
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

/** Points the cohort-window pointer at week two. The "drift" IS this swap. */
export async function swapToWeekTwo(venue: Venue, addresses: EscalationAddresses) {
  await venue.workspace.write(driftPaths(addresses.root).window, "week-2");
}

export type EscalationResult = { analysis: Job; ask: Job };

/**
 * Two halves, and the UI says which is which.
 *
 * The monitor's ANALYSIS is real: it reads both windows under its own capped
 * authority and reports the numbers.
 *
 * The ASK is raised by this page, not the agent — a venue limitation, not a
 * shortcut: every agent tool call is dispatched internally and the venue
 * requires hitl:request to carry its own job, so an agent cannot raise one at
 * all (covia-ai/covia#316). The monitor's words are quoted into it verbatim.
 */
export async function runEscalation(
  venue: Venue,
  addresses: EscalationAddresses,
): Promise<EscalationResult> {
  await resumeIfSuspended(venue, addresses.monitorAgent);
  const paths = driftPaths(addresses.root);

  const agentOp = await resolveOperationByAddress(venue, AGENT_REQUEST_OP);
  const analysis = await agentOp.invoke({
    agentId: addresses.monitorAgent,
    input: {
      task:
        `Read the current cohort window pointer at ${paths.window} and both window records ` +
        `under ${paths.windows}. Compare the current window's deviceReuseRate to the week-1 ` +
        `baseline and report both numbers and the ratio in one short paragraph.`,
    },
    wait: true,
  });
  await analysis.refresh();

  const finding = analysis.isComplete
    ? monitorFinding(analysis.output)
    : (analysis.metadata?.error ?? "(the monitor's analysis did not complete)");

  const hitlOp = await resolveOperationByAddress(venue, HITL_REQUEST_OP);
  // No `wait` — this job PARKS in INPUT_REQUIRED until a human answers.
  const ask = await hitlOp.invoke({
    title: `Raise the reviewed limit to S$${PROPOSED_LIMIT} for ${GRANT_LIFETIME_DAYS} days`,
    description:
      `**${addresses.monitorAgent} reported:**\n\n> ${finding}\n\n` +
      `Proposing a temporary raise of the reviewed limit from S$${BASELINE_LIMIT} to ` +
      `S$${PROPOSED_LIMIT} for ${GRANT_LIFETIME_DAYS} days.\n\n` +
      `_Raised by the demo page carrying the monitor's finding: agents cannot raise HITL ` +
      `asks on this venue build (covia-ai/covia#316)._`,
    asks: [
      {
        id: "raise",
        type: "token",
        prompt:
          `Approve a temporary raise of the reviewed limit to S$${PROPOSED_LIMIT} for ` +
          `${GRANT_LIFETIME_DAYS} days by signing a grant with your own key.`,
        required: true,
        // A `token` ask (COG-19), not an approval-with-grants (COG-17): the
        // venue only root-signs for resources IT controls, and a device-key
        // holder is self-sovereign — verbatim, "Self-sovereign DID owners must
        // sign the UCAN with their own key". So the human signs it; the venue
        // transports and verifies without ever holding the authority.
        token: {
          caps: [{ with: `${paths.limitReview}/`, can: "crud/write" }],
          exp: GRANT_LIFETIME_DAYS * 24 * 3600,
        },
      },
    ],
  });

  return { analysis, ask };
}

/** The open ask this demo raised, for deep-linking into the real Inbox. */
export async function findOpenAsk(
  venue: Venue,
): Promise<{ id: string; title: string } | null> {
  const listed = await venue.workspace.list("h");
  // Ids are time-ordered, so the newest sorts last — take that one. Repeated
  // runs leave earlier asks open and a stale link would send the viewer to a
  // decision they already made.
  const ids = (listed.exists ? (listed.keys ?? []) : []).map(String).sort().reverse();
  for (const id of ids) {
    const record = (await venue.workspace.read(`h/${id}`)).value as
      | { status?: string; title?: string }
      | null;
    if (record?.status === "open" && record.title?.includes(`S$${PROPOSED_LIMIT}`)) {
      return { id, title: record.title };
    }
  }
  return null;
}

// A capability token, matched by SHAPE rather than key name: a venue-minted
// COG-17 grant lands on `token`, a self-signed COG-19 one rides `tokens` keyed
// by ask id. Matching the shape covers both, and whatever the envelope grows.
const JWT_SHAPE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;

export function extractGrantToken(output: unknown): string | null {
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number): string | null => {
    if (depth > 6 || value == null || seen.has(value)) return null;
    if (typeof value === "string") return JWT_SHAPE.test(value) ? value : null;
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

export type GrantVerification = {
  valid: boolean;
  reason?: string;
  expiresAt: number | null;
  attenuations: Array<{ with?: string; can?: string }>;
  issuer?: string;
};

/** Checked with the venue's own ucan:verify, so the grant on screen is
 *  cryptographically verified rather than merely displayed. */
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
