import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader,
  PauseCircle,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { RunStatus, type JobMetadata } from "@covia/covia-sdk";
import { toneForRunStatus, TONE_STYLES, MAGNITUDE_FILL, type StatusTone } from "@/lib/status";
import { adapterLookup, ADAPTER_FALLBACK } from "@/lib/adapter-icons";
import type { IconCmp } from "@/lib/file-type-look";

/**
 * Visual identity for a job's operation: an icon and a colour, keyed by the
 * adapter family so the list is scannable by *what ran* rather than a hex id.
 * The hue is a category, deliberately separate from the status tone (which
 * carries success/failure), so the two never fight for the same meaning.
 */
export interface OperationVisual {
  Icon: IconCmp;
  /** Tailwind classes for the icon tile (text + subtle background). */
  className: string;
  /** The adapter family, e.g. "http", "secret", "agent". */
  kind: string;
}

// The adapter family (`kind`) each adapter reports — a stable grouping key
// (asserted by the tests, and used by the name-keyword fallback). The icon +
// tint no longer live here: they come from the single adapter directory
// (lib/adapter-icons.ts), the same source the Operations catalogue uses, so the
// two surfaces can never drift. Only the family label is job-specific.
const ADAPTER_KIND: Record<string, string> = {
  http: "http", secret: "secret", vault: "files",
  agent: "agent", llmagent: "agent", goaltree: "agent",
  connections: "connections", skills: "skills",
  dlfs: "files", file: "files",
  grid: "grid", mcp: "mcp", schema: "schema", convex: "convex",
  scheduler: "scheduler", ucan: "ucan", memory: "memory", a2a: "a2a",
  hitl: "human", orchestrator: "orchestrator", asset: "asset", jvm: "jvm",
  langchain: "model", oauth: "oauth", user: "user", archive: "archive", test: "test",
};

// Built once at module load — a static merged map, so lookup stays O(1) with no
// per-render work.
const ADAPTER_VISUALS: Record<string, OperationVisual> = Object.fromEntries(
  Object.entries(ADAPTER_KIND).map(([key, kind]) => {
    const { Icon, tile } = adapterLookup(key);
    return [key, { Icon, className: tile, kind }];
  }),
);

const GENERIC_VISUAL: OperationVisual = {
  Icon: Zap,
  className: "bg-muted text-muted-foreground",
  kind: "operation",
};

// The visual for an adapter dispatch string (`http:get`) or bare family
// (`http`). Curated families (ADAPTER_KIND) keep their asserted `kind` and
// brand tile; any other family the shared directory recognises — aliases like
// `json`→schema, and marks like `covia`/`venue`/`lattice`/`connector` that
// aren't in ADAPTER_KIND — still renders its real icon, with the family name
// standing in as the `kind`. Unknown families return undefined so the caller
// can try its next candidate.
function visualForAdapter(adapter?: string): OperationVisual | undefined {
  if (!adapter) return undefined;
  const family = adapter.split(":")[0];
  const known = ADAPTER_VISUALS[family];
  if (known) return known;
  const look = adapterLookup(family);
  if (look !== ADAPTER_FALLBACK) {
    return { Icon: look.Icon, className: look.tile, kind: family };
  }
  return undefined;
}

// Keyword fallback when a job has a display name but no resolvable operation
// adapter (an inline definition never registered in the catalogue). Ordered
// most-specific first; each value is an adapter family resolved through
// visualForAdapter. Intentionally conservative — "echo"/"operation" stay
// generic, as a bare "echo" is too weak a signal on its own.
const NAME_KEYWORDS: [RegExp, string][] = [
  [/http|fetch|\burl\b|rest|webhook/i, "http"],
  [/secret|credential|token|api[\s-]?key|password/i, "secret"],
  [/\bagent\b|assistant|\bchat\b/i, "agent"],
  [/connect/i, "connections"],
  [/skill/i, "skills"],
  [/\bfile\b|dlfs|upload|download|directory|\bdrive\b/i, "dlfs"],
  [/vault/i, "vault"],
  [/schema|validat|\binfer\b/i, "schema"],
  [/\bstore\b|register|\basset\b|\bpin\b/i, "asset"],
  // Lattice always wears its own grid mark, never the Convex hexagon.
  [/lattice/i, "lattice"],
  [/convex|append|slice|aggregate|inspect/i, "convex"],
  [/memory|recall|remember/i, "memory"],
  [/schedul|\bcron\b|timer/i, "scheduler"],
  [/\bmcp\b/i, "mcp"],
  [/orchestrat|workflow|pipeline/i, "orchestrator"],
  [/archive/i, "archive"],
  [/delay|random|generat|sample|\bnoop\b|\bsleep\b/i, "test"],
  [/\bmodel\b|\bllm\b|completion|embedding|\bprompt\b/i, "langchain"],
  [/\bgrid\b/i, "grid"],
];

/**
 * The adapter segment of an operation path, handling both catalog shapes:
 * `v/ops/<adapter>/<op>` (adapter follows "ops") and `v/<adapter>/ops/<op>`
 * such as `v/test/ops/echo` (adapter precedes "ops"). Also maps model ops
 * (`v/models/<provider>/<id>`) and bare `adapter:op` shorthand.
 */
function adapterFromOperation(operation?: string): string | undefined {
  if (!operation) return undefined;
  const parts = operation.split("/").filter(Boolean);
  const opsIdx = parts.indexOf("ops");
  if (opsIdx >= 0) {
    const before = parts[opsIdx - 1];
    // v/<adapter>/ops/<op> — the adapter is the segment before "ops".
    if (before && before !== "v" && before !== "o") return before;
    // v/ops/<adapter>/<op> — the adapter is the segment after "ops".
    if (parts[opsIdx + 1]) return parts[opsIdx + 1];
  }
  if (parts.includes("models")) return "langchain";
  if (operation.includes(":")) return operation.split(":")[0];
  return undefined;
}

export function operationVisual(
  job: Pick<JobMetadata, "op" | "name">,
  /** `operation.adapter` off the resolved operation asset, in the venue's
   *  `adapter:subop` dispatch form. A job invoked by hash — a pinned
   *  definition, or any record written before venue 0.9.9 — has no path in
   *  `op` to parse, and the asset carries the adapter that the hash cannot
   *  (#322). Callers holding the asset should pass it; the list does not. */
  assetAdapter?: string,
): OperationVisual {
  const candidates = [adapterFromOperation(job.op), assetAdapter];
  for (const adapter of candidates) {
    const visual = visualForAdapter(adapter);
    if (visual) return visual;
  }
  const name = job.name ?? "";
  for (const [re, key] of NAME_KEYWORDS) {
    if (re.test(name)) {
      const visual = visualForAdapter(key);
      if (visual) return visual;
    }
  }
  return GENERIC_VISUAL;
}

/** `0x01a05fa1d467…62a2fd9` — enough of each end to recognise, no wall of hex. */
export function abbreviateJobId(id?: string): string {
  if (!id) return "--";
  const hex = id.startsWith("0x") ? id.slice(2) : id;
  if (hex.length <= 14) return id;
  return `0x${hex.slice(0, 6)}…${hex.slice(-4)}`;
}

/** Elapsed milliseconds for a terminal job, or null if it can't be computed. */
export function jobDurationMs(job: Pick<JobMetadata, "created" | "updated">): number | null {
  if (!job.created || !job.updated) return null;
  const ms = new Date(job.updated).getTime() - new Date(job.created).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/** Linear interpolation percentile over an unsorted numeric array. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

/** Absolute latency band → a magnitude fill, so a slow outlier reads at a
 *  glance. A band index into the shared `MAGNITUDE_FILL` ramp (not a status
 *  tone — magnitude, not success/failure). */
export function durationFillClass(ms: number): string {
  if (ms < 500) return MAGNITUDE_FILL[0];
  if (ms < 2000) return MAGNITUDE_FILL[1];
  if (ms < 8000) return MAGNITUDE_FILL[2];
  return MAGNITUDE_FILL[3];
}

const STATUS_ICONS: Partial<Record<RunStatus, { Icon: LucideIcon; spin?: boolean }>> = {
  [RunStatus.COMPLETE]: { Icon: CheckCircle2 },
  [RunStatus.FAILED]: { Icon: XCircle },
  [RunStatus.REJECTED]: { Icon: XCircle },
  [RunStatus.TIMEOUT]: { Icon: Clock },
  [RunStatus.CANCELLED]: { Icon: Ban },
  [RunStatus.PENDING]: { Icon: Loader, spin: true },
  [RunStatus.STARTED]: { Icon: Loader, spin: true },
  [RunStatus.PAUSED]: { Icon: PauseCircle },
  [RunStatus.INPUT_REQUIRED]: { Icon: AlertCircle },
  [RunStatus.AUTH_REQUIRED]: { Icon: AlertCircle },
};

export interface StatusVisual {
  Icon: LucideIcon;
  /** Whether the icon should spin (running/pending). */
  spin: boolean;
  tone: StatusTone;
  /** Tailwind text-colour class for the tone. */
  textClass: string;
  label: string;
}

/** Icon + tone + colour for a job status, distinct per state (complete, failed, running…). */
export function statusVisual(status?: string): StatusVisual {
  const tone = toneForRunStatus(status);
  const entry = (status && STATUS_ICONS[status as RunStatus]) || { Icon: HelpCircle };
  return {
    Icon: entry.Icon,
    spin: entry.spin ?? false,
    tone,
    textClass: TONE_STYLES[tone].text,
    label: status ?? "unknown",
  };
}

/** One transition in a job's lifecycle. */
export interface JobStateStep {
  status: string;
  /** Epoch ms or ISO string — pass to `formatDateTime`. */
  at?: string | number;
  /** The caller/actor DID recorded for this transition, if any. */
  actor?: string;
}

/**
 * A job's state history, reconstructed from its `prev` chain — each stored
 * record snapshots one transition (PENDING → STARTED → COMPLETE/FAILED …).
 * Returned oldest-first for a natural top-to-bottom timeline. A `seen` guard
 * keeps a malformed cyclic chain from looping.
 */
export function stateHistory(job?: JobMetadata | null): JobStateStep[] {
  const steps: JobStateStep[] = [];
  const seen = new Set<unknown>();
  let node: unknown = job;
  while (node && typeof node === "object" && !seen.has(node)) {
    seen.add(node);
    const n = node as { status?: string; updated?: string | number; created?: string | number; caller?: string; prev?: unknown };
    if (n.status) steps.push({ status: n.status, at: n.updated ?? n.created, actor: n.caller });
    node = n.prev;
  }
  return steps.reverse();
}
