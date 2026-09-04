import {
  BrainCircuit,
  Cable,
  Database,
  FileStack,
  FlaskConical,
  FolderOpen,
  HardDrive,
  Home,
  Inbox,
  KeyRound,
  LibraryBig,
  List,
  MapPinned,
  MessageSquareText,
  Plug,
  BookOpenCheck,
  PlayCircle,
  Plus,
  ScrollText,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  badge?: "inbox" | "connections";
  match?: "exact" | "prefix";
  children?: MenuItem[];
};

export type MenuGroup = {
  groupLabel: string;
  menus: MenuItem[];
};

export const MENU_LIST: MenuGroup[] = [
  {
    groupLabel: "",
    menus: [{ href: "/", label: "Home", icon: Home, match: "exact" }],
  },
  {
    groupLabel: "Agents",
    menus: [
      { href: "/agents/create", label: "Create", icon: Plus },
      { href: "/agents/view", label: "View", icon: List },
      { href: "/agents/chat", label: "Chat", icon: MessageSquareText },
      { href: "/agents/connected", label: "Connected", icon: Cable },
      { href: "/agents/skills", label: "Skills", icon: BookOpenCheck },
    ],
  },
  {
    groupLabel: "Grid",
    menus: [
      { href: "/publicartifacts", label: "Public Artifacts", icon: Database },
      { href: "/myartifacts", label: "My Artifacts", icon: FileStack, requiresAuth: true },
      {
        href: "/operations",
        label: "Operations",
        icon: PlayCircle,
        children: [
          { href: "/operations/playground", label: "Playground", icon: Wrench, requiresAuth: true },
        ],
      },
      { href: "/jobs", label: "Jobs", icon: ScrollText },
      { href: "/inbox", label: "Inbox", icon: Inbox, requiresAuth: true, badge: "inbox" },
    ],
  },
  {
    // Renamed from "Manage" — scoped to #163 (memory panel needs a nav
    // home). The rest of #221's Data regrouping (splitting Grid/Agents,
    // moving Venues out) is a separate, larger pass.
    groupLabel: "Data",
    menus: [
      { href: "/context", label: "Context", icon: BrainCircuit, requiresAuth: true },
      { href: "/connections", label: "Connections", icon: Plug, requiresAuth: true, badge: "connections" },
      { href: "/secrets", label: "Secrets", icon: KeyRound, requiresAuth: true },
      { href: "/venues", label: "Venues", icon: MapPinned },
      { href: "/workspace", label: "Workspace", icon: FolderOpen, requiresAuth: true },
      { href: "/files", label: "Files", icon: HardDrive, requiresAuth: true },
    ],
  },
  {
    groupLabel: "Learn",
    menus: [
      { href: "/learning", label: "Resources", icon: LibraryBig },
      { href: "/demos", label: "Demos", icon: FlaskConical },
    ],
  },
];
