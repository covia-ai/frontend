import {

  LocationEdit,
  Database,
  PlayCircle,
  LucideIcon,
  Home,
  User,
  BookKey,
  FileKey,
  LibraryBig,
  Activity,
  BotIcon
} from "lucide-react";

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
            href: "/workspace",
            label: "Workspace",
            icon: Home
          },
          {
            href: "/assets",
            label: "Assets",
            icon: Database,
            submenus: [
              {
                href: "/publicartifacts",
                label: "Public Artifacts",
                icon: BookKey,
                active: false
              },
              {
                href: "/operations",
                label: "Operations",
                icon: PlayCircle,
                active: false
              
              },

            ]
          
          },
          {
            href: "/agents",
            label: "Agents",
            icon: BotIcon,
          } ,
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
            href: "/learning",
            label: "Learning corner",
            icon: LibraryBig
          },
          
          
        ]
      },
    
  ];
  const menusProd =  [
      {
        groupLabel: "",
        menus: [
          {
            href: "/workspace",
            label: "Workspace",
            icon: Home
          },
          {
            href: "/assets",
            label: "Assets",
            icon: Database,
            submenus: [
              {
                href: "/publicartifacts",
                label: "Public Artifacts",
                icon: BookKey,
                active: false
              },
              {
                href: "/operations",
                label: "Operations",
                icon: PlayCircle,
                active: false
              
              },

            ]
          },
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
            href: "/learning",
            label: "Learning corner",
            icon: LibraryBig
          },
          
          
        ]
      },
    
  ];
  console.log(typeof(process.env.NEXT_PUBLIC_IS_ENV_PROD))
if(process.env.NEXT_PUBLIC_IS_ENV_PROD == "false") {
    return menusDev;
  }
  else 
    return menusProd;
}
