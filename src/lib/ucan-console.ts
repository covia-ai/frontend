import type { StatusTone } from "@/lib/status";

/** A capability row as edited in the console, before it is sent. */
export type AttRow = { with: string; can: string };

export const EMPTY_ROW: AttRow = { with: "", can: "" };

/**
 * The self-attenuation an owner starts from: read over their own workspace.
 * `ucan:issue` canonicalises a bare path against the caller, so the plain
 * namespace is the honest pre-fill — narrow, and obviously theirs.
 */
export function selfAttenuation(): AttRow {
  return { with: "/w/", can: "crud/read" };
}

/** Rows the user has actually filled in — both halves present, trimmed. */
export function usableRows(rows: AttRow[]): AttRow[] {
  return rows
    .map((row) => ({ with: row.with.trim(), can: row.can.trim() }))
    .filter((row) => row.with !== "" && row.can !== "");
}

/** A half-filled row is a mistake in progress, unlike a wholly empty one. */
export function hasIncompleteRow(rows: AttRow[]): boolean {
  return rows.some((row) => (row.with.trim() === "") !== (row.can.trim() === ""));
}

/**
 * A scope wide enough to deserve a second look before it is signed: `*` is the
 * wildcard ability, and a bare `/` delegates the whole namespace beneath it.
 */
export function isBroadScope(row: AttRow): boolean {
  const ability = row.can.trim();
  const resource = row.with.trim();
  return ability === "*" || resource === "*" || resource === "/";
}

export function broadScopes(rows: AttRow[]): AttRow[] {
  return usableRows(rows).filter(isBroadScope);
}

/** The `{with, can}` check for `ucan:verify` — only sent when both halves are given. */
export function verifyCheck(row: AttRow): { with: string; can: string } | undefined {
  const resource = row.with.trim();
  const ability = row.can.trim();
  if (!resource || !ability) return undefined;
  return { with: resource, can: ability };
}

export function rootAuthorityTone(authority: string | undefined): StatusTone {
  switch (authority) {
    case "owner": return "success";
    case "venue": return "active";
    case "refused": return "failure";
    default: return "neutral";
  }
}

/**
 * What each root-authority verdict actually means for the holder. The venue
 * returns the word; the console has to say why it matters.
 */
export const ROOT_AUTHORITY_MEANING: Record<string, string> = {
  owner:
    "Self-sovereign: the chain root is signed by the resource owner, so this holds at any venue hosting the data.",
  venue: "Rooted by this venue, which controls the resource.",
  refused:
    "This venue will not honour the capability — its chain root holds no authority over the resource here.",
};

export const LIFETIME_UNIT_SECONDS = {
  minutes: 60,
  hours: 3_600,
  days: 86_400,
} as const;

export type LifetimeUnit = keyof typeof LIFETIME_UNIT_SECONDS;

/**
 * `ucan:issue` takes an absolute future Unix timestamp, and treats an omitted
 * `exp` as a genuinely non-expiring token. The console always sends one.
 */
export function expiryFromNow(seconds: number, now: number = Date.now()): number {
  return Math.floor(now / 1000) + seconds;
}

export function lifetimeSeconds(amount: string, unit: LifetimeUnit): number {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(parsed * LIFETIME_UNIT_SECONDS[unit]);
}

/** Unix seconds as a Date, or null when the claim is absent or unparseable. */
export function expiryDate(exp: unknown): Date | null {
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  return new Date(exp * 1000);
}

/** A delegation chain reads better in words than as a bare hop count. */
export function chainDepthLabel(depth: unknown): string | null {
  if (typeof depth !== "number" || !Number.isFinite(depth)) return null;
  if (depth === 0) return "Root grant — no delegation above it";
  return depth === 1 ? "1 delegation hop above the root" : `${depth} delegation hops above the root`;
}
