import { LocationEdit, Database, PlayCircle, LucideIcon, Home, FolderOpen, User, BookKey, LibraryBig, BotIcon, KeyRound, Inbox, FlaskConical }from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function   getMenuList(): Group[] {
   
  const menusDev =  [
      {
        groupLabel: "",
        menus: [
          {
            href: "/",
            label: "Home",
            icon: Home
          },
        ]
      },
      {
        groupLabel: "Build",
        menus: [
          {
            href: "/workspace",
            label: "Workspace",
            icon: FolderOpen
          },
          {
            href: "/assets",
            label: "Assets",
            icon: Database,
            submenus: [
              {
                href: "/publicartifacts",
                label: "Public Artifacts",
                icon: BookKey
              },
              {
                href: "/operations",
                label: "Operations",
                icon: PlayCircle
              },

            ]

          },
          {
            href: "/agents",
            label: "Agents",
            icon: BotIcon,
          } ,
        ]
      },
      {
        groupLabel: "Operate",
        menus: [
          {
            href: "/venues",
            label: "Venues",
            icon: LocationEdit,
          },
           {
            href: "/jobs",
            label: "Jobs",
            icon: User
          },
          {
            href: "/inbox",
            label: "Inbox",
            icon: Inbox
          },
        ]
      },
      {
        groupLabel: "Manage",
        menus: [
          {
            href: "/secrets",
            label: "Secrets",
            icon: KeyRound
          },
        ]
      },
      {
        groupLabel: "Learn",
        menus: [
          {
            href: "/learning",
            label: "Resources",
            icon: LibraryBig
          },
          {
            href: "/demos",
            label: "Demos",
            icon: FlaskConical
          },
        ]
      },

  ];
  const menusProd =  [
      {
        groupLabel: "",
        menus: [
          {
            href: "/",
            label: "Home",
            icon: Home
          },
        ]
      },
      {
        groupLabel: "Build",
        menus: [
          {
            href: "/workspace",
            label: "Workspace",
            icon: FolderOpen
          },
          {
            href: "/assets",
            label: "Assets",
            icon: Database,
            submenus: [
              {
                href: "/publicartifacts",
                label: "Public Artifacts",
                icon: BookKey
              },
              {
                href: "/operations",
                label: "Operations",
                icon: PlayCircle
              },

            ]
          },
        ]
      },
      {
        groupLabel: "Operate",
        menus: [
          {
            href: "/venues",
            label: "Venues",
            icon: LocationEdit,
          },
           {
            href: "/jobs",
            label: "Jobs",
            icon: User
          },
          {
            href: "/inbox",
            label: "Inbox",
            icon: Inbox
          },
        ]
      },
      {
        groupLabel: "Manage",
        menus: [
          {
            href: "/secrets",
            label: "Secrets",
            icon: KeyRound
          },
        ]
      },
      {
        groupLabel: "Learn",
        menus: [
          {
            href: "/learning",
            label: "Resources",
            icon: LibraryBig
          },
          {
            href: "/demos",
            label: "Demos",
            icon: FlaskConical
          },
        ]
      },

  ];
if(process.env.NEXT_PUBLIC_IS_ENV_PROD == "false") {
    return menusDev;
  }
  else 
    return menusProd;
}
