import {
  Database,
  FlaskConical,
  FolderOpen,
  Home,
  Inbox,
  KeyRound,
  LibraryBig,
  List,
  MapPinned,
  MessageSquareText,
  BookOpenCheck,
  PlayCircle,
  Plus,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  badge?: "inbox";
  match?: "exact" | "prefix";
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
      { href: "/agents/skills", label: "Skills", icon: BookOpenCheck },
    ],
  },
  {
    groupLabel: "Grid",
    menus: [
      { href: "/publicartifacts", label: "Public Artifacts", icon: Database },
      { href: "/operations", label: "Operations", icon: PlayCircle },
      { href: "/jobs", label: "Jobs", icon: ScrollText },
      { href: "/inbox", label: "Inbox", icon: Inbox, requiresAuth: true, badge: "inbox" },
    ],
  },
  {
    groupLabel: "Manage",
    menus: [
      { href: "/secrets", label: "Secrets", icon: KeyRound, requiresAuth: true },
      { href: "/venues", label: "Venues", icon: MapPinned },
      { href: "/workspace", label: "Workspace", icon: FolderOpen, requiresAuth: true },
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
