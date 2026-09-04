import {
  AlertCircle,
  Archive,
  Ban,
  BookOpen,
  Bot,
  Boxes,
  Braces,
  Brain,
  Cable,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FlaskConical,
  FolderOpen,
  Globe,
  HelpCircle,
  KeyRound,
  Loader,
  Network,
  Package,
  PauseCircle,
  Plug,
  Radio,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Workflow,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { RunStatus, type JobMetadata } from "@covia/covia-sdk";
import { toneForRunStatus, TONE_STYLES, type StatusTone } from "@/lib/status";

/**
 * Visual identity for a job's operation: an icon and a colour, keyed by the
 * adapter family so the list is scannable by *what ran* rather than a hex id.
 * The hue is a category, deliberately separate from the status tone (which
 * carries success/failure), so the two never fight for the same meaning.
 */
export interface OperationVisual {
  Icon: LucideIcon;
  /** Tailwind classes for the icon tile (text + subtle background). */
  className: string;
  /** The adapter family, e.g. "http", "secret", "agent". */
  kind: string;
}

const ADAPTER_VISUALS: Record<string, OperationVisual> = {
  http:        { Icon: Globe,      className: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10",       kind: "http" },
  secret:      { Icon: KeyRound,   className: "text-amber-600 dark:text-amber-400 bg-amber-500/10",    kind: "secret" },
  agent:       { Icon: Bot,        className: "text-primary bg-primary/10",                             kind: "agent" },
  llmagent:    { Icon: Bot,        className: "text-primary bg-primary/10",                             kind: "agent" },
  goaltree:    { Icon: Bot,        className: "text-primary bg-primary/10",                             kind: "agent" },
  connections: { Icon: Cable,      className: "text-violet-600 dark:text-violet-400 bg-violet-500/10",  kind: "connections" },
  skills:      { Icon: BookOpen,   className: "text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10", kind: "skills" },
  dlfs:        { Icon: FolderOpen, className: "text-blue-600 dark:text-blue-400 bg-blue-500/10",        kind: "files" },
  file:        { Icon: FolderOpen, className: "text-blue-600 dark:text-blue-400 bg-blue-500/10",        kind: "files" },
  vault:       { Icon: FolderOpen, className: "text-blue-600 dark:text-blue-400 bg-blue-500/10",        kind: "files" },
  grid:        { Icon: Network,    className: "text-teal-600 dark:text-teal-400 bg-teal-500/10",        kind: "grid" },
  mcp:         { Icon: Boxes,      className: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",  kind: "mcp" },
  schema:      { Icon: Braces,     className: "text-sky-600 dark:text-sky-400 bg-sky-500/10",           kind: "schema" },
  convex:      { Icon: Database,   className: "text-blue-600 dark:text-blue-400 bg-blue-500/10",        kind: "convex" },
  scheduler:   { Icon: Clock,      className: "text-orange-600 dark:text-orange-400 bg-orange-500/10",  kind: "scheduler" },
  ucan:        { Icon: ShieldCheck,className: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10", kind: "ucan" },
  memory:      { Icon: Brain,      className: "text-pink-600 dark:text-pink-400 bg-pink-500/10",        kind: "memory" },
  a2a:         { Icon: Radio,      className: "text-teal-600 dark:text-teal-400 bg-teal-500/10",        kind: "a2a" },
  hitl:        { Icon: HelpCircle, className: "text-amber-600 dark:text-amber-400 bg-amber-500/10",     kind: "human" },
  orchestrator:{ Icon: Workflow,   className: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",  kind: "orchestrator" },
  asset:       { Icon: Package,    className: "text-blue-600 dark:text-blue-400 bg-blue-500/10",        kind: "asset" },
  jvm:         { Icon: Cpu,        className: "text-slate-600 dark:text-slate-400 bg-slate-500/10",     kind: "jvm" },
  langchain:   { Icon: Sparkles,   className: "text-primary bg-primary/10",                             kind: "model" },
  oauth:       { Icon: Plug,       className: "text-violet-600 dark:text-violet-400 bg-violet-500/10",  kind: "oauth" },
  user:        { Icon: UserPlus,   className: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10",        kind: "user" },
  archive:     { Icon: Archive,    className: "text-blue-600 dark:text-blue-400 bg-blue-500/10",        kind: "archive" },
  test:        { Icon: FlaskConical,className: "text-muted-foreground bg-muted",                        kind: "test" },
};

const GENERIC_VISUAL: OperationVisual = {
  Icon: Zap,
  className: "text-muted-foreground bg-muted",
  kind: "operation",
};

/** Keyword fallback when a job has a display name but no resolvable operation path. */
const NAME_KEYWORDS: [RegExp, string][] = [
  [/http|fetch|url|get|post/i, "http"],
  [/secret|credential|token|key/i, "secret"],
  [/agent|chat/i, "agent"],
  [/connect/i, "connections"],
  [/skill/i, "skills"],
  [/file|dlfs|vault|upload/i, "dlfs"],
  [/schema/i, "schema"],
  [/schedule/i, "scheduler"],
];

/** The adapter segment of an operation path such as `v/ops/<adapter>/<op>`. */
function adapterFromOperation(operation?: string): string | undefined {
  if (!operation) return undefined;
  const parts = operation.split("/").filter(Boolean);
  const opsIdx = parts.indexOf("ops");
  if (opsIdx >= 0 && parts[opsIdx + 1]) return parts[opsIdx + 1];
  // Bare adapter shorthand like "agent:create".
  if (operation.includes(":")) return operation.split(":")[0];
  return undefined;
}

export function operationVisual(job: Pick<JobMetadata, "operation" | "name">): OperationVisual {
  const adapter = adapterFromOperation(job.operation);
  if (adapter && ADAPTER_VISUALS[adapter]) return ADAPTER_VISUALS[adapter];
  const name = job.name ?? "";
  for (const [re, key] of NAME_KEYWORDS) {
    if (re.test(name) && ADAPTER_VISUALS[key]) return ADAPTER_VISUALS[key];
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

/** Absolute latency band → a fill colour, so a slow outlier reads at a glance. */
export function durationFillClass(ms: number): string {
  if (ms < 500) return "bg-green-500 dark:bg-green-400";
  if (ms < 2000) return "bg-cyan-500 dark:bg-cyan-400";
  if (ms < 8000) return "bg-amber-500 dark:bg-amber-400";
  return "bg-destructive";
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
