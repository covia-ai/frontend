import {
  Activity,
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Bot,
  Boxes,
  Braces,
  BrainCircuit,
  Cable,
  CalendarClock,
  CalendarPlus,
  Clock,
  Cpu,
  FileStack,
  Fingerprint,
  FlaskConical,
  FolderOpen,
  GitBranch,
  Hash,
  HardDrive,
  History,
  Home,
  Inbox,
  Info,
  KeyRound,
  Layers,
  LibraryBig,
  Link,
  ListOrdered,
  MapPinned,
  MessageSquareText,
  Package,
  Plug,
  Plus,
  Puzzle,
  Ruler,
  ScrollText,
  Settings,
  Shapes,
  Sparkles,
  Tags,
  ToggleRight,
  Type,
  User,
  Users,
  Wrench,
} from "lucide-react";
import type { TypeLook } from "@/lib/file-type-look";

// THE single source of truth for Covia iconography. One icon + one brand-tinted
// tile per CONCEPT, used everywhere the concept appears (nav, cards, rows,
// headers, workspace) so the same thing never wears two icons. Brand palette
// (Royal Purple / Cerulean / Amber Gold accent / neutrals) via the theme
// tokens; flat tiles, no gradients; amber (accent) reserved for keys/secrets
// and used sparingly per the brand guidelines. Add a concept here and it is
// uniform across the whole app — never hand-pick an icon per surface again.

// Tile tokens, on the house opacity rule.
const PRI = "bg-primary/15 text-primary";
const SEC = "bg-secondary/15 text-secondary";
const ACC = "bg-accent/25 text-accent-foreground";
const NEU = "bg-muted text-muted-foreground";
const C1 = "bg-chart-1/20 text-chart-1";
const C2 = "bg-chart-2/20 text-chart-2";
const C3 = "bg-chart-3/20 text-chart-3";
const C4 = "bg-chart-4/25 text-chart-4";
const C5 = "bg-chart-5/20 text-chart-5";

export type Concept =
  | "home" | "agent" | "create" | "chat" | "connected" | "skill"
  | "operation" | "adapter" | "model" | "job" | "inbox" | "context"
  | "connection" | "secret" | "venue" | "workspace" | "files" | "asset"
  | "artifacts" | "test" | "info" | "metadata" | "user" | "resources"
  | "demo" | "playground";

export const CONCEPT_ICONS: Record<Concept, TypeLook> = {
  home: { Icon: Home, tile: PRI, label: "Home" },
  agent: { Icon: Bot, tile: PRI, label: "Agent" },
  create: { Icon: Plus, tile: PRI, label: "Create" },
  chat: { Icon: MessageSquareText, tile: SEC, label: "Chat" },
  connected: { Icon: Cable, tile: C3, label: "Connected" },
  skill: { Icon: BookOpenCheck, tile: C2, label: "Skill" },
  operation: { Icon: Boxes, tile: C5, label: "Operation" },
  adapter: { Icon: Puzzle, tile: C5, label: "Adapter" },
  model: { Icon: Cpu, tile: C2, label: "Model" },
  job: { Icon: ScrollText, tile: C1, label: "Job" },
  inbox: { Icon: Inbox, tile: C4, label: "Inbox" },
  context: { Icon: BrainCircuit, tile: C2, label: "Context" },
  connection: { Icon: Plug, tile: C3, label: "Connection" },
  secret: { Icon: KeyRound, tile: ACC, label: "Secret" },
  // A venue is a node/place in the coordination grid — a pinned location, not a
  // globe. Cerulean (the coordination/neutrality signal) carries it.
  venue: { Icon: MapPinned, tile: SEC, label: "Venue" },
  workspace: { Icon: FolderOpen, tile: PRI, label: "Workspace" },
  files: { Icon: HardDrive, tile: PRI, label: "Files" },
  asset: { Icon: Package, tile: C3, label: "Asset" },
  artifacts: { Icon: FileStack, tile: C3, label: "Artifacts" },
  test: { Icon: FlaskConical, tile: NEU, label: "Test" },
  info: { Icon: Info, tile: SEC, label: "Info" },
  metadata: { Icon: Tags, tile: NEU, label: "Metadata" },
  user: { Icon: User, tile: C1, label: "User" },
  resources: { Icon: LibraryBig, tile: C1, label: "Resources" },
  demo: { Icon: Sparkles, tile: C5, label: "Demo" },
  playground: { Icon: Wrench, tile: C4, label: "Playground" },
};

export function conceptLook(concept: Concept): TypeLook {
  return CONCEPT_ICONS[concept];
}

// ---------------------------------------------------------------------------
// Field-level icons — common data-attribute keys (created, updated, name, id,
// version, status, owner, config, …). These are ATTRIBUTES, not concepts, so
// two sibling keys under one namespace (e.g. meta/created and meta/updated) get
// their own icon instead of both inheriting the namespace's glyph.

const FIELD_GROUPS: { keys: string[]; look: TypeLook }[] = [
  // temporal
  { keys: ["created", "createdat", "createdon", "createddate", "creationtime"], look: { Icon: CalendarPlus, tile: SEC, label: "Created" } },
  { keys: ["updated", "updatedat", "modified", "lastmodified", "changed", "revised"], look: { Icon: CalendarClock, tile: SEC, label: "Updated" } },
  { keys: ["timestamp", "time", "date", "datetime", "ts", "at"], look: { Icon: Clock, tile: SEC, label: "Time" } },
  { keys: ["expires", "expiry", "expiresat", "ttl", "deadline", "waketime", "nextwake"], look: { Icon: History, tile: SEC, label: "Expiry" } },
  // identity
  { keys: ["id", "uuid", "guid", "identifier"], look: { Icon: Hash, tile: PRI, label: "Id" } },
  { keys: ["did", "publickey", "pubkey", "fingerprint", "hash"], look: { Icon: Fingerprint, tile: PRI, label: "Identity" } },
  { keys: ["name", "title", "label", "displayname"], look: { Icon: Type, tile: PRI, label: "Name" } },
  // descriptive
  { keys: ["description", "desc", "summary", "notes", "note", "message", "text", "body", "content", "prompt", "systemprompt"], look: { Icon: AlignLeft, tile: NEU, label: "Text" } },
  // config
  { keys: ["config", "configuration", "settings", "options", "params", "parameters", "opts"], look: { Icon: Settings, tile: NEU, label: "Config" } },
  // status
  { keys: ["status", "state", "phase"], look: { Icon: Activity, tile: NEU, label: "Status" } },
  // people
  { keys: ["owner", "author", "creator", "createdby", "updatedby", "by"], look: { Icon: User, tile: C1, label: "Owner" } },
  { keys: ["users", "members", "accounts", "operators", "people"], look: { Icon: Users, tile: C1, label: "Users" } },
  // labels
  { keys: ["tags", "labels", "keywords", "categories", "category"], look: { Icon: Tags, tile: NEU, label: "Tags" } },
  // links
  { keys: ["url", "uri", "link", "href", "endpoint", "address", "baseurl"], look: { Icon: Link, tile: SEC, label: "Link" } },
  // measures
  { keys: ["count", "total", "length", "num", "number", "n"], look: { Icon: Hash, tile: NEU, label: "Count" } },
  { keys: ["size", "bytes", "bytesize", "filesize"], look: { Icon: Ruler, tile: NEU, label: "Size" } },
  // version
  { keys: ["version", "ver", "revision", "rev"], look: { Icon: GitBranch, tile: C2, label: "Version" } },
  // type
  { keys: ["type", "kind", "format", "mimetype", "contenttype", "mime"], look: { Icon: Shapes, tile: C5, label: "Type" } },
  // io
  { keys: ["input", "inputs", "request", "args", "arguments"], look: { Icon: ArrowRight, tile: SEC, label: "Input" } },
  { keys: ["output", "outputs", "result", "results", "response", "value"], look: { Icon: ArrowLeft, tile: C2, label: "Output" } },
  // structure
  { keys: ["schema"], look: { Icon: Braces, tile: C2, label: "Schema" } },
  { keys: ["steps", "sequence", "order", "pipeline"], look: { Icon: ListOrdered, tile: C5, label: "Steps" } },
  { keys: ["items", "entries", "list", "elements", "children"], look: { Icon: Layers, tile: NEU, label: "Items" } },
  // flags
  { keys: ["enabled", "active", "disabled", "visible", "public", "flag"], look: { Icon: ToggleRight, tile: NEU, label: "Flag" } },
];

const FIELD_INDEX: Record<string, TypeLook> = {};
for (const group of FIELD_GROUPS) {
  for (const key of group.keys) FIELD_INDEX[key] = group.look;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Icon + tile for a well-known data-field key, or undefined if it isn't one. */
export function fieldLook(key: string): TypeLook | undefined {
  return FIELD_INDEX[normalizeKey(key)];
}
