import { auth } from "@/auth";
import {

  LocationEdit,
  Database,
  PlayCircle,
  LucideIcon,
  Home,
  User,
  BookKey,
  FileKey,
  MapPinCheck,
  MapPinHouse,
  Book,
  LibraryBig
} from "lucide-react";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
   
  if (!session?.user) {
    return [
      {
        groupLabel: "",
        menus: [
          {
            href: "/workspace",
            label: "Workspace",
            icon: Home
          },
          {
            href: "/operations",
            label: "Operations",
            icon: PlayCircle,
          
          },
          {
            href: "/assets",
            label: "Assets",
            icon: Database,
          },
          {
            href: "/venues",
            label: "Venues",
            icon: LocationEdit,
          },
           {
            href: "/history",
            label: "History",
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
  }
  else {
    return [
      {
        groupLabel: "",
        menus: [
          {
            href: "/workspace",
            label: "Workspace",
            icon: Home
          },
          {
            href: "/operations",
            label: "Operations",
            icon: PlayCircle,
          
          },
          {
            href: "/assets",
            label: "Assets",
            icon: Database,
            submenus: [
              {
                href: "/assets",
                label: "Public Assets",
                icon: BookKey,
                active: false
              },
              {
                href: "/myassets",
                label: "My Assets",
                icon: FileKey,
                active: false
              }

            ]
          
          },
          {
            href: "/venues",
            label: "Venues",
            icon: LocationEdit,
            submenus: [
              {
                href: "/venues",
                label: "Public Venues",
                icon: MapPinCheck,
                active: false
              },
              {
                href: "/myvenues",
                label: "My Venues",
                icon: MapPinHouse,
                active: false
              }

            ]
          },
          {
            href: "/history",
            label: "User History",
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
  }
}
