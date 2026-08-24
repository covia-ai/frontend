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

// Tailwind classes per scope, reused by the badge so the four categories
// stay visually distinct without inventing a new color per tier.
export const SCOPE_BADGE_CLASSES: Record<ContextScope, string> = {
  private: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  agent: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  session: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "shared-venue": "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
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
