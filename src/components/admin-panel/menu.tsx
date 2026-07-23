"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { getMenuList } from "@/lib/menu-list";
import { TONE_STYLES } from "@/lib/status";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useHitlOpenCount } from "@/hooks/use-hitl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapseMenuButton } from "@/components/admin-panel/collapse-menu-button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";

interface MenuProps {
  isOpen: boolean | undefined;
}

// All of these require a signed-in user under the hood (Workspace's data is
// per-user, Secrets are per-user credentials, and the HITL inbox is the
// caller's own h/ namespace) — hide them from the sidebar entirely rather than
// showing a sign-in wall after navigating in.
const AUTH_ONLY_LABELS = new Set(["Workspace", "Secrets", "HITL"]);

// Only this entry carries a live count, so the badge is wired by label rather
// than threading a value through the static menu definition.
const HITL_LABEL = "HITL";

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const isAuthenticated = useIsAuthenticated();
  const hitlOpenCount = useHitlOpenCount();
  const rawMenuList = getMenuList();
  const menuList = useMemo(() => {
    if (isAuthenticated) return rawMenuList;
    return rawMenuList.map((group) => ({
      ...group,
      menus: group.menus.filter((m) => !AUTH_ONLY_LABELS.has(m.label)),
    }));
  }, [rawMenuList, isAuthenticated]);

  return (
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="mt-3 h-full w-full">
        <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2">
          {menuList.map(({ groupLabel, menus }, index) => (
            <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
              {(isOpen && groupLabel) || isOpen === undefined ? (
                <p className="px-4 pb-2 max-w-[248px] truncate text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60">
                  {groupLabel}
                </p>
              ) : !isOpen && isOpen !== undefined && groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className="w-full">
                      <div className="w-full flex justify-center items-center">
                        <Ellipsis className="h-5 w-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2"></p>
              )}
              {menus.map(
                ({ href, label, icon: Icon, active, submenus }, index) =>
                  !submenus || submenus.length === 0 ? (
                    <div className="w-full" key={index}>
                      <TooltipProvider disableHoverableContent>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                (active === undefined &&
                                  (href === "/"
                                    ? pathname === href
                                    : pathname.startsWith(href))) ||
                                active
                                  ? "secondary"
                                  : "ghost"
                              }
                              className="w-full justify-start h-10 mb-1"
                              asChild
                            >
                              <Link href={href}>
                                <span
                                  className={cn(isOpen === false ? "" : "mr-4")}
                                >
                                  <Icon size={18} />
                                </span>
                                <p
                                  className={cn(
                                    "max-w-[200px] truncate  ",
                                    isOpen === false
                                      ? "-translate-x-96 opacity-0"
                                      : "translate-x-0 opacity-100"
                                  )}
                                >
                                  {label}
                                </p>
                                {label === HITL_LABEL && hitlOpenCount > 0 && isOpen !== false && (
                                  <span
                                    data-testid="hitl-nav-badge"
                                    className={cn(
                                      "ml-auto min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-semibold",
                                      TONE_STYLES.attention.pill,
                                    )}
                                  >
                                    {hitlOpenCount}
                                  </span>
                                )}
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          {isOpen === false && (
                            <TooltipContent side="right">
                              {label}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <div className="w-full" key={index}>
                      <CollapseMenuButton
                        icon={Icon}
                        label={label}
                        active={
                          active === undefined
                            ? pathname.startsWith(href)
                            : active
                        }
                        submenus={submenus}
                        isOpen={isOpen}
                      />
                    </div>
                  )
              )}
            </li>
          ))}
  
        </ul>
      </nav>
    </ScrollArea>
  );
}
