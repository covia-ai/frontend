import { Database, type LucideIcon } from "lucide-react";
import { CONCEPT_ICONS } from "@/lib/concept-icons";

// Nav icons come from the canonical icon directory (lib/concept-icons.ts) so a
// destination in the sidebar wears the SAME glyph the concept wears everywhere
// else (cards, list rows, headers, workspace). Never hand-pick a lucide icon
// for a nav entry — pick the concept. The one non-concept glyph is the public
// artifacts *store* (Database), a shared catalogue distinct from your own
// artifacts.
const I = CONCEPT_ICONS;

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  badge?: "inbox" | "connections";
  match?: "exact" | "prefix";
  // Extra path prefixes that should also light up this item — e.g. "Agents"
  // (/agents, exact) stays active on the agent drill-in (/agents/agent/…)
  // without also matching sibling routes like /agents/create.
  activePrefixes?: string[];
  children?: MenuItem[];
};

export type MenuGroup = {
  groupLabel: string;
  menus: MenuItem[];
};

export const MENU_LIST: MenuGroup[] = [
  {
    groupLabel: "",
    menus: [{ href: "/", label: "Home", icon: I.home.Icon, match: "exact" }],
  },
  {
    groupLabel: "Agents",
    menus: [
      { href: "/agents", label: "Agents", icon: I.agent.Icon, match: "exact", activePrefixes: ["/agents/agent"] },
      { href: "/agents/create", label: "Create", icon: I.create.Icon },
      { href: "/agents/chat", label: "Chat", icon: I.chat.Icon },
      { href: "/agents/skills", label: "Skills", icon: I.skill.Icon },
      { href: "/agents/connected", label: "Connected", icon: I.connected.Icon },
    ],
  },
  {
    groupLabel: "Grid",
    menus: [
      { href: "/publicartifacts", label: "Public Artifacts", icon: Database },
      { href: "/myartifacts", label: "My Artifacts", icon: I.artifacts.Icon, requiresAuth: true },
      {
        href: "/operations",
        label: "Operations",
        icon: I.operation.Icon,
        children: [
          { href: "/operations/playground", label: "Playground", icon: I.playground.Icon, requiresAuth: true },
        ],
      },
      { href: "/jobs", label: "Jobs", icon: I.job.Icon },
      { href: "/inbox", label: "Inbox", icon: I.inbox.Icon, requiresAuth: true, badge: "inbox" },
    ],
  },
  {
    // Renamed from "Manage" — scoped to #163 (memory panel needs a nav
    // home). The rest of #221's Data regrouping (splitting Grid/Agents,
    // moving Venues out) is a separate, larger pass.
    groupLabel: "Data",
    menus: [
      { href: "/context", label: "Context", icon: I.context.Icon, requiresAuth: true },
      { href: "/connections", label: "Connections", icon: I.connection.Icon, requiresAuth: true, badge: "connections" },
      { href: "/secrets", label: "Secrets", icon: I.secret.Icon, requiresAuth: true },
      { href: "/venues", label: "Venues", icon: I.venue.Icon },
      { href: "/workspace", label: "Workspace", icon: I.workspace.Icon, requiresAuth: true },
      { href: "/files", label: "Files", icon: I.files.Icon, requiresAuth: true },
    ],
  },
  {
    groupLabel: "Learn",
    menus: [
      { href: "/learning", label: "Resources", icon: I.resources.Icon },
      { href: "/demos", label: "Demos", icon: I.demo.Icon },
    ],
  },
];
