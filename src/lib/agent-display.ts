import { LLM_PROVIDERS } from "@/config/llm-providers";
import {
  CUSTOM_PROVIDER_OPTION,
  DEFAULT_PROVIDER_OPTION,
  providerForOperation,
} from "@/lib/agent-config";

// Display helpers for the agent workforce roster. Native agents carry no
// name/description — the id is the identity and everything else lives in
// `config` — so these turn a raw agentId + config into something a person can
// read: a humanised name, a monogram avatar, a provider/model label, and short
// skill/tool labels. Shared by the roster card and (later) the profile view.

/** "refund-bot-7f3a" → "Refund Bot 7f3a". The raw id is always shown too. */
export function humanizeAgentId(id: string): string {
  const words = id
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/);
  return words
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** 1–2 letter monogram for the avatar tile, from the humanised name. */
export function agentMonogram(id: string): string {
  const words = humanizeAgentId(id).split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Deterministic avatar tint from the id, drawn from the app's brand + chart
// tokens so two agents are told apart at a glance and the same agent always
// looks the same. Pure token classes — works in both themes.
const AVATAR_TILES = [
  "bg-primary/15 text-primary",
  "bg-secondary/15 text-secondary",
  "bg-chart-2/20 text-chart-2",
  "bg-chart-3/20 text-chart-3",
  "bg-chart-4/25 text-chart-4",
  "bg-chart-5/20 text-chart-5",
];
export function agentTileClass(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TILES[h % AVATAR_TILES.length];
}

/** The last path segment of a skill/tool address, for a compact chip. */
export function shortRefLabel(ref: string): string {
  const parts = ref.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : ref;
}

// Compact relative time for roster liveness: past → "4m ago", future → "in
// 14m". Coarse units (s/m/h/d) keep it glanceable; empty for missing values.
export function relTime(ms?: number, now: number = Date.now()): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
  const diff = ms - now;
  const future = diff > 0;
  const abs = Math.abs(diff);
  const s = Math.round(abs / 1000);
  let label: string;
  if (s < 45) label = future ? "soon" : "just now";
  else {
    const m = Math.round(s / 60);
    if (m < 60) label = `${m}m`;
    else {
      const h = Math.round(m / 60);
      label = h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
    }
  }
  if (label === "soon" || label === "just now") return label;
  return future ? `in ${label}` : `${label} ago`;
}

export interface AgentDisplay {
  providerLabel: string;
  model: string;
  /** The system prompt (its brief) — the closest thing a native agent has to
   *  a description. Empty string when none is set. */
  brief: string;
  skills: string[];
  tools: string[];
  /** True when the agent carries an explicit capability grant (governed). */
  hasCaps: boolean;
}

function providerLabelFor(config: Record<string, any> | undefined): string {
  const op = config?.llmOperation as string | undefined;
  if (!op) return "Venue default";
  const key = providerForOperation(op);
  if (key === DEFAULT_PROVIDER_OPTION) return "Venue default";
  if (key === CUSTOM_PROVIDER_OPTION) return "Custom model";
  return LLM_PROVIDERS[key]?.label ?? "Custom model";
}

/** Derive everything the roster shows about an agent from its `config`. */
export function agentDisplay(config: Record<string, any> | undefined): AgentDisplay {
  const skills = Array.isArray(config?.skills) ? (config!.skills as string[]) : [];
  const tools = Array.isArray(config?.tools) ? (config!.tools as string[]) : [];
  const caps = config?.caps;
  const hasCaps =
    Array.isArray(caps) ? caps.length > 0 : !!caps && typeof caps === "object" && Object.keys(caps).length > 0;
  return {
    providerLabel: providerLabelFor(config),
    model: typeof config?.model === "string" ? config.model : "",
    brief: typeof config?.systemPrompt === "string" ? config.systemPrompt : "",
    skills,
    tools,
    hasCaps,
  };
}
