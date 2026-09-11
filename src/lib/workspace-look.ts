import { Bot, Boxes, FolderOpen, Globe, Inbox, KeyRound, Package, ScrollText, Tags } from "lucide-react";
import type { TypeLook } from "@/lib/file-type-look";

// Per-namespace icon + tint for the Workspace lattice, and value-type badges for
// its rows — same house pattern as file-type-look. Each of the nine root
// namespaces gets an icon that matches the concept it holds (Bot for agents,
// KeyRound for secrets, ScrollText for jobs…), so the namespace pane reads at a
// glance instead of nine identical folders.

const NAMESPACES: Record<string, TypeLook> = {
  v: { Icon: Globe, tile: "bg-secondary/15 text-secondary", label: "Venue" },
  w: { Icon: FolderOpen, tile: "bg-primary/15 text-primary", label: "Workspace" },
  o: { Icon: Boxes, tile: "bg-chart-5/20 text-chart-5", label: "Operations" },
  a: { Icon: Package, tile: "bg-chart-3/20 text-chart-3", label: "Assets" },
  g: { Icon: Bot, tile: "bg-primary/15 text-primary", label: "Agents" },
  j: { Icon: ScrollText, tile: "bg-chart-1/20 text-chart-1", label: "Jobs" },
  h: { Icon: Inbox, tile: "bg-chart-4/25 text-chart-4", label: "Inbox" },
  s: { Icon: KeyRound, tile: "bg-accent/25 text-accent-foreground", label: "Secrets" },
  meta: { Icon: Tags, tile: "bg-muted text-muted-foreground", label: "Metadata" },
};

const NAMESPACE_FALLBACK: TypeLook = { Icon: FolderOpen, tile: "bg-muted text-muted-foreground", label: "Namespace" };

/** Icon + tile for a namespace, keyed on the root segment of a path (so both
 *  "v" and "v/skills/x" resolve to the Venue look). */
export function namespaceLook(pathOrKey: string): TypeLook {
  const root = pathOrKey.split("/")[0];
  return NAMESPACES[root] ?? NAMESPACE_FALLBACK;
}

export type ValueTypeName = "object" | "array" | "string" | "number" | "boolean" | "null";

/** The JSON shape of a workspace value, for the row badge. */
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
