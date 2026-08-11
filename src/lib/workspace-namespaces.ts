// Root-level lattice namespace keys (see covia/venue Namespace.java). Every
// venue supports all of these regardless of whether anything has been
// written under them yet, so the workspace root listing always shows the
// full fixed set rather than only whichever namespaces already have data.
export const ROOT_NAMESPACES: readonly { key: string; label: string }[] = [
  { key: "j", label: "Jobs" },
  { key: "g", label: "Agents" },
  { key: "s", label: "Secrets" },
  { key: "a", label: "Assets" },
  { key: "o", label: "Operations" },
  { key: "h", label: "Inbox" },
  { key: "w", label: "Workspace" },
  { key: "meta", label: "Metadata" },
];

export const ROOT_NAMESPACE_LABELS: Record<string, string> = Object.fromEntries(
  ROOT_NAMESPACES.map(({ key, label }) => [key, label]),
);
