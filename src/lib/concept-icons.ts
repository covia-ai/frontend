import {
  BookOpenCheck,
  Bot,
  Boxes,
  BrainCircuit,
  Cable,
  Cpu,
  Database,
  FileStack,
  FlaskConical,
  FolderOpen,
  Globe,
  HardDrive,
  Home,
  Inbox,
  Info,
  KeyRound,
  LibraryBig,
  MapPinned,
  MessageSquareText,
  Package,
  Plug,
  Plus,
  Puzzle,
  ScrollText,
  Sparkles,
  Tags,
  User,
  Wrench,
} from "lucide-react";
import type { TypeLook } from "@/lib/file-type-look";

// THE single source of truth for what each Covia CONCEPT looks like — one icon
// + one brand-tinted tile per concept, used everywhere the concept appears
// (nav, cards, list rows, headers, workspace) so the same thing never wears two
// different icons. Tints follow the house opacity rule (primary/secondary /15,
// chart-* /20, chart-4/accent /25, neutral fallback). Add a concept here and it
// is uniform across the whole app — never hand-pick an icon per surface again.

export type Concept =
  | "home"
  | "agent"
  | "create"
  | "chat"
  | "connected"
  | "skill"
  | "operation"
  | "adapter"
  | "model"
  | "job"
  | "inbox"
  | "context"
  | "connection"
  | "secret"
  | "venue"
  | "workspace"
  | "files"
  | "asset"
  | "artifacts"
  | "test"
  | "info"
  | "metadata"
  | "user"
  | "resources"
  | "demo"
  | "playground";

export const CONCEPT_ICONS: Record<Concept, TypeLook> = {
  home: { Icon: Home, tile: "bg-primary/15 text-primary", label: "Home" },
  agent: { Icon: Bot, tile: "bg-primary/15 text-primary", label: "Agent" },
  create: { Icon: Plus, tile: "bg-primary/15 text-primary", label: "Create" },
  chat: { Icon: MessageSquareText, tile: "bg-secondary/15 text-secondary", label: "Chat" },
  connected: { Icon: Cable, tile: "bg-chart-3/20 text-chart-3", label: "Connected" },
  skill: { Icon: BookOpenCheck, tile: "bg-chart-2/20 text-chart-2", label: "Skill" },
  operation: { Icon: Boxes, tile: "bg-chart-5/20 text-chart-5", label: "Operation" },
  adapter: { Icon: Puzzle, tile: "bg-chart-5/20 text-chart-5", label: "Adapter" },
  model: { Icon: Cpu, tile: "bg-chart-2/20 text-chart-2", label: "Model" },
  job: { Icon: ScrollText, tile: "bg-chart-1/20 text-chart-1", label: "Job" },
  inbox: { Icon: Inbox, tile: "bg-chart-4/25 text-chart-4", label: "Inbox" },
  context: { Icon: BrainCircuit, tile: "bg-chart-2/20 text-chart-2", label: "Context" },
  connection: { Icon: Plug, tile: "bg-chart-3/20 text-chart-3", label: "Connection" },
  secret: { Icon: KeyRound, tile: "bg-accent/25 text-accent-foreground", label: "Secret" },
  venue: { Icon: Globe, tile: "bg-secondary/15 text-secondary", label: "Venue" },
  workspace: { Icon: FolderOpen, tile: "bg-primary/15 text-primary", label: "Workspace" },
  files: { Icon: HardDrive, tile: "bg-primary/15 text-primary", label: "Files" },
  asset: { Icon: Package, tile: "bg-chart-3/20 text-chart-3", label: "Asset" },
  artifacts: { Icon: FileStack, tile: "bg-chart-3/20 text-chart-3", label: "Artifacts" },
  test: { Icon: FlaskConical, tile: "bg-muted text-muted-foreground", label: "Test" },
  info: { Icon: Info, tile: "bg-secondary/15 text-secondary", label: "Info" },
  metadata: { Icon: Tags, tile: "bg-muted text-muted-foreground", label: "Metadata" },
  user: { Icon: User, tile: "bg-chart-1/20 text-chart-1", label: "User" },
  resources: { Icon: LibraryBig, tile: "bg-chart-1/20 text-chart-1", label: "Resources" },
  demo: { Icon: Sparkles, tile: "bg-chart-5/20 text-chart-5", label: "Demo" },
  playground: { Icon: Wrench, tile: "bg-chart-4/25 text-chart-4", label: "Playground" },
  // `venues` (the list of nodes) and `assets store` share the concept above; the
  // MapPinned / Database glyphs stay available for nav chrome that wants them.
};

/** Nav-chrome glyphs kept for surfaces that use a plain outline rather than a
 *  tinted tile (the sidebar). Same concept, so they read as a set. */
export const NAV_GLYPHS = { venues: MapPinned, artifactsStore: Database } as const;

export function conceptLook(concept: Concept): TypeLook {
  return CONCEPT_ICONS[concept];
}
