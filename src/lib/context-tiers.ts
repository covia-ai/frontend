// The context tiers explained on the /context page (#228) — what an agent
// can know and where each source lives. Distinct from ROOT_NAMESPACES
// (lib/workspace-namespaces.ts), which enumerates raw lattice roots: these
// are the agent-context shorthands from covia/venue/docs/AGENT_CONTEXT.md
// §6, several of which resolve *into* those roots (n/c/ under g, t/ under j)
// rather than being roots themselves.
export type ContextScope = "private" | "agent" | "session" | "shared-venue";

export type ContextTier = {
  key: string;
  label: string;
  prefix: string;
  scope: ContextScope;
  description: string;
  href: string;
  linkLabel: string;
};

export const SCOPE_LABELS: Record<ContextScope, string> = {
  private: "Private",
  agent: "Agent",
  session: "Session",
  "shared-venue": "Shared — venue",
};

// One theme-aware token tint per scope, from the app's categorical tile palette
// (the same tints TypeTile / concept-icons use) — NOT the semantic status tones
// (scopes are categories, and "agent" has no status tone). Shared by each tier's
// TypeTile and its scope chip so a scope reads as one colour: private = secondary
// (yours), agent = violet, session = accent/amber (ephemeral), shared-venue =
// neutral (read-only, de-emphasised).
export const SCOPE_TILE: Record<ContextScope, string> = {
  private: "bg-secondary/15 text-secondary",
  agent: "bg-icon-violet/15 text-icon-violet",
  session: "bg-accent/25 text-accent-foreground",
  "shared-venue": "bg-muted text-muted-foreground",
};

export const CONTEXT_TIERS: ContextTier[] = [
  {
    key: "memory",
    label: "User Memory",
    prefix: "w/memory",
    scope: "private",
    description:
      "Durable facts about you, as a numbered list. Carries into any agent that enables “Inject user memory into context”.",
    href: "/workspace?path=w/memory",
    linkLabel: "Open in Workspace",
  },
  {
    key: "workspace",
    label: "User Workspace",
    prefix: "w/",
    scope: "private",
    description:
      "Your general-purpose, editable data — everything else you save that isn't memory, an asset, or an operation.",
    href: "/workspace?path=w",
    linkLabel: "Browse Workspace",
  },
  {
    key: "agent",
    label: "Agent-scoped",
    prefix: "n/",
    scope: "agent",
    description:
      "Notes an agent keeps for itself, persisting across every session and task it runs. Lives under each agent's own state tree.",
    href: "/workspace?path=g",
    linkLabel: "Browse under g → your agent → n",
  },
  {
    key: "session",
    label: "Session Scratch",
    prefix: "c/",
    scope: "session",
    description:
      "Working notes for one active chat session — cleared when the session ends. Nested under the owning agent.",
    href: "/workspace?path=g",
    linkLabel: "Browse under g → your agent → sessions → c",
  },
  {
    key: "job",
    label: "Job Temp",
    prefix: "t/",
    scope: "session",
    description:
      "Scratch space for one running task, surviving until the job finishes. Nested under that job's record.",
    href: "/workspace?path=j",
    linkLabel: "Browse under j → your job → temp",
  },
  {
    key: "venue",
    label: "Venue Shared",
    prefix: "v/",
    scope: "shared-venue",
    description:
      "Operations, skills, agent templates, and public information this venue provides to every caller. Read-only.",
    href: "/workspace?path=v",
    linkLabel: "Browse Venue (read-only)",
  },
];
