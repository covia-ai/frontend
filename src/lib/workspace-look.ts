import { FolderOpen } from "lucide-react";
import type { TypeLook } from "@/lib/file-type-look";
import { CONCEPT_ICONS, fieldLook, type Concept } from "@/lib/concept-icons";
import { adapterLookup, ADAPTER_FALLBACK } from "@/lib/adapter-icons";

// Maps the Workspace lattice onto the canonical concept-icon directory, so a
// namespace and its keys wear the same icons the rest of the app uses for those
// concepts (agents look like agents, secrets like secrets, operations like
// operations) — never nine identical folders, and never every key under a
// namespace sharing one glyph.

// The nine root namespaces → their concept.
const NAMESPACE_CONCEPT: Record<string, Concept> = {
  v: "venue",
  w: "workspace",
  o: "operation",
  a: "asset",
  g: "agent",
  j: "job",
  h: "inbox",
  s: "secret",
  meta: "metadata",
};

// Well-known sub-namespace keys (e.g. under `v`: ops, adapters, skills, …) →
// their concept, so they each get their OWN icon rather than the parent's.
const KEY_CONCEPT: Record<string, Concept> = {
  ops: "operation",
  operations: "operation",
  "ops-tools": "operation",
  provenance: "job",
  adapters: "adapter",
  adapter: "adapter",
  skills: "skill",
  skill: "skill",
  agents: "agent",
  agent: "agent",
  models: "model",
  model: "model",
  info: "info",
  test: "test",
  tests: "test",
  assets: "asset",
  asset: "asset",
  jobs: "job",
  job: "job",
  secrets: "secret",
  secret: "secret",
  auth: "secret",
  templates: "skill",
  memory: "context",
  context: "context",
  users: "user",
  user: "user",
  admin: "user",
  connections: "connection",
  connection: "connection",
  connected: "connected",
  a2a: "connection",
  building: "create",
  create: "create",
  venue: "venue",
  venues: "venue",
  workspace: "workspace",
  workspaces: "workspace",
  files: "files",
  inbox: "inbox",
  chat: "chat",
  home: "home",
  playground: "playground",
  resources: "resources",
  docs: "resources",
  documentation: "resources",
  demo: "demo",
  demos: "demo",
  meta: "metadata",
  metadata: "metadata",
};

const NAMESPACE_FALLBACK: TypeLook = { Icon: FolderOpen, tile: "bg-muted text-muted-foreground", label: "Namespace" };
const KEY_FALLBACK: TypeLook = { Icon: FolderOpen, tile: "bg-muted text-muted-foreground", label: "Key" };

/** Icon + tile for a root namespace, keyed on the root segment of a path. */
export function namespaceLook(pathOrKey: string): TypeLook {
  const root = pathOrKey.split("/")[0];
  const concept = NAMESPACE_CONCEPT[root];
  return concept ? CONCEPT_ICONS[concept] : NAMESPACE_FALLBACK;
}

/** Icon + tile for a single key inside a namespace. Resolved in order:
 *  1. a well-known data-field key (created, updated, name, id, version…) gets
 *     its own attribute icon, so sibling fields under one namespace (e.g.
 *     meta/created and meta/updated) never share a glyph;
 *  2. a well-known sub-namespace key (ops, adapters, skills…) gets its concept
 *     icon;
 *  3. an instance key (an agent id, a secret name) inherits its namespace's
 *     concept (a secret name reads as a secret);
 *  4. anything else gets a neutral key glyph. */
export function keyLook(fullPath: string): TypeLook {
  const segments = fullPath.split("/").filter(Boolean);
  const leaf = segments[segments.length - 1] ?? "";
  const root = segments[0];

  const field = fieldLook(leaf);
  if (field) return field;

  const keyConcept = KEY_CONCEPT[leaf.toLowerCase()];
  if (keyConcept) return CONCEPT_ICONS[keyConcept];

  const nsConcept = segments.length > 1 ? NAMESPACE_CONCEPT[root] : undefined;
  if (nsConcept) return CONCEPT_ICONS[nsConcept];

  return KEY_FALLBACK;
}

/** Icon + tile for a skill row, resolved so a skill reads consistently with the
 *  rest of the app:
 *  1. a name that matches a brand-marked adapter family (covia, convex, mcp,
 *     langchain, a2a, vault…) wears the SAME mark it wears on Operations, so a
 *     concept looks identical across pages;
 *  2. a name that maps to a concept (auth→secret, admin→user, building→create)
 *     wears that concept's icon;
 *  3. anything else gets the skill glyph — a uniform, meaningful default, never
 *     a bare folder, so an arbitrarily-named skill still reads as a skill. */
export function skillLook(nameOrKey: string): TypeLook {
  const leaf = (nameOrKey.split("/").filter(Boolean).pop() ?? "").toLowerCase();

  const adapter = adapterLookup(leaf);
  if (adapter !== ADAPTER_FALLBACK) return { ...adapter, label: leaf };

  const keyConcept = KEY_CONCEPT[leaf];
  if (keyConcept) return CONCEPT_ICONS[keyConcept];

  return CONCEPT_ICONS.skill;
}

export type ValueTypeName = "object" | "array" | "string" | "number" | "boolean" | "null";

/** The JSON shape of a workspace value, for the row/inspector badge. */
export function valueTypeOf(value: unknown): ValueTypeName {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "object") return "object";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "string";
}

/** Short mono label for a value-type badge. */
export const VALUE_TYPE_LABEL: Record<ValueTypeName, string> = {
  object: "{ }",
  array: "[ ]",
  string: "str",
  number: "num",
  boolean: "bool",
  null: "null",
};

/** A did:key asset reference (content-addressed) — rendered with a DID
 *  identicon rather than a type icon. */
export function isAssetRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("did:key:");
}
