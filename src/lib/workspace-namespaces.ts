// Root-level lattice and virtual namespace keys. User namespace roots may not
// materialise until they contain data; `v` is a venue-provided virtual view
// and therefore does not appear in the caller's root listing either. Keep the
// complete browser catalogue here, with one shared explanation for every UI.
export const ROOT_NAMESPACES = [
  {
    key: "v",
    label: "Venue",
    description: "Operations, agent templates, skills, tests, and public information supplied by this venue.",
  },
  {
    key: "w",
    label: "Workspace",
    description: "Your general-purpose, editable data and saved work.",
  },
  {
    key: "o",
    label: "Operations",
    description: "Your named operation definitions and pinned operation shortcuts.",
  },
  {
    key: "a",
    label: "Assets",
    description: "Your immutable, content-addressed assets.",
  },
  {
    key: "g",
    label: "Agents",
    description: "Agent configuration, runtime state, sessions, tasks, and timelines.",
  },
  {
    key: "j",
    label: "Jobs",
    description: "Invocation records, statuses, inputs, outputs, and failures.",
  },
  {
    key: "h",
    label: "Inbox",
    description: "Human-in-the-loop requests waiting for review or input.",
  },
  {
    key: "s",
    label: "Secrets",
    description: "Encrypted credentials managed through the Secrets interface.",
  },
  {
    key: "meta",
    label: "Metadata",
    description: "Account and namespace metadata maintained by the venue.",
  },
];

export type WorkspaceNamespace = (typeof ROOT_NAMESPACES)[number];

export const ROOT_NAMESPACE_LABELS: Record<string, string> = Object.fromEntries(
  ROOT_NAMESPACES.map(({ key, label }) => [key, label]),
);

const ROOT_NAMESPACE_BY_KEY = new Map<string, WorkspaceNamespace>(
  ROOT_NAMESPACES.map((namespace) => [namespace.key, namespace]),
);

export function workspaceNamespaceForPath(
  path: string | null | undefined,
): WorkspaceNamespace | null {
  const root = path?.split("/").filter(Boolean)[0];
  return root ? ROOT_NAMESPACE_BY_KEY.get(root) ?? null : null;
}

export function isWorkspaceNamespaceRoot(path: string): boolean {
  const segments = path.split("/").filter(Boolean);
  return segments.length === 1 && ROOT_NAMESPACE_BY_KEY.has(segments[0]);
}
