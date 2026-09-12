import {
  Archive,
  BotMessageSquare,
  Braces,
  Brain,
  Clock,
  FileText,
  GitBranch,
  Globe,
  HardDrive,
  HelpCircle,
  LogIn,
  Network,
  Puzzle,
  Radio,
  ShieldCheck,
  Vault,
  Workflow,
} from "lucide-react";
import { CONCEPT_ICONS, type Concept } from "@/lib/concept-icons";
import type { IconCmp } from "@/lib/file-type-look";
import {
  ConvexGlyph,
  CoviaGlyph,
  JavaGlyph,
  LangchainGlyph,
  LatticeGlyph,
  McpGlyph,
} from "@/components/adapter-glyphs";

// THE single source of truth for adapter iconography — one icon + one
// brand-tinted tile per adapter family, shared by every "what ran" surface
// (Jobs, Operations). Concept-backed families reuse the concept directory
// verbatim (so an `asset` adapter is the SAME tile as the `asset` concept on a
// card or in Workspace — they can't drift). The rest use the brand arc from the
// same palette (Option A: purple → violet → cerulean → indigo → navy + amber +
// neutral — no chart colours). Real product logos (LangChain, MCP, Java) and
// two original marks (convex hexagon, lattice grid) carry the families a lucide
// glyph can't.

export type AdapterLook = { Icon: IconCmp; tile: string };

// Brand-arc tiles (mirrors concept-icons.ts).
const PRI = "bg-primary/15 text-primary";
const SEC = "bg-secondary/15 text-secondary";
const VIOLET = "bg-icon-violet/15 text-icon-violet";
const INDIGO = "bg-icon-indigo/15 text-icon-indigo";
const NAVY = "bg-icon-navy/20 text-icon-navy";
const ACC = "bg-accent/25 text-accent-foreground";
const NEU = "bg-muted text-muted-foreground";

const fromConcept = (concept: Concept): AdapterLook => {
  const { Icon, tile } = CONCEPT_ICONS[concept];
  return { Icon, tile };
};

export const ADAPTER_LOOK: Record<string, AdapterLook> = {
  // Agents — purple (concept-derived; llmagent/goaltree get distinct glyphs).
  agent: fromConcept("agent"),
  llmagent: { Icon: BotMessageSquare, tile: PRI },
  goaltree: { Icon: GitBranch, tile: PRI },
  // The native Covia adapter — the Covia mark, on the brand purple.
  covia: { Icon: CoviaGlyph, tile: PRI },
  // A venue op — the venue concept mark (cerulean pin).
  venue: fromConcept("venue"),
  // Network & connectivity — cerulean.
  http: { Icon: Globe, tile: SEC },
  a2a: { Icon: Radio, tile: SEC },
  grid: { Icon: Network, tile: SEC },
  connections: fromConcept("connected"),
  connector: fromConcept("connection"),
  oauth: { Icon: LogIn, tile: SEC },
  hitl: { Icon: HelpCircle, tile: SEC },
  // Capability & intelligence — violet.
  langchain: { Icon: LangchainGlyph, tile: VIOLET },
  skills: fromConcept("skill"),
  memory: { Icon: Brain, tile: VIOLET },
  // Data & lattice — indigo.
  schema: { Icon: Braces, tile: INDIGO },
  asset: fromConcept("asset"),
  convex: { Icon: ConvexGlyph, tile: INDIGO },
  lattice: { Icon: LatticeGlyph, tile: INDIGO },
  archive: { Icon: Archive, tile: INDIGO },
  // Files — purple (matches the files concept).
  dlfs: { Icon: HardDrive, tile: PRI },
  file: { Icon: FileText, tile: PRI },
  // Operations & security — navy.
  mcp: { Icon: McpGlyph, tile: NAVY },
  orchestrator: { Icon: Workflow, tile: NAVY },
  ucan: { Icon: ShieldCheck, tile: NAVY },
  scheduler: { Icon: Clock, tile: NAVY },
  // Keys — amber.
  secret: fromConcept("secret"),
  vault: { Icon: Vault, tile: ACC },
  // People & runtime — neutral.
  user: fromConcept("user"),
  jvm: { Icon: JavaGlyph, tile: NEU },
  test: fromConcept("test"),
};

// Adapter-name aliases that resolve to a family above.
const ALIASES: Record<string, string> = {
  openai: "langchain",
  llm: "langchain",
  json: "schema",
  data: "dlfs",
};

/** Neutral fallback so a new/unknown adapter never renders blank. */
export const ADAPTER_FALLBACK: AdapterLook = { Icon: Puzzle, tile: NEU };

/** Icon + tile for an adapter family (the first `adapter:subop` segment). */
export function adapterLookup(adapter?: string | null): AdapterLook {
  if (!adapter) return ADAPTER_FALLBACK;
  const key = ALIASES[adapter] ?? adapter;
  return ADAPTER_LOOK[key] ?? ADAPTER_FALLBACK;
}
