"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { MENU_LIST } from "@/lib/menu-list";
import { TONE_STYLES } from "@/lib/status";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useHitlOpenCount } from "@/hooks/use-hitl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";

interface MenuProps {
  isOpen: boolean | undefined;
}

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const isAuthenticated = useIsAuthenticated();
  const hitlOpenCount = useHitlOpenCount();
  const menuList = useMemo(() => {
    const list = isAuthenticated
      ? MENU_LIST
      : MENU_LIST.map((group) => ({
          ...group,
          menus: group.menus.filter((menu) => !menu.requiresAuth),
        }));
    // Drop a group when all its entries require authentication rather than
    // rendering a bare heading above empty space.
    return list.filter((group) => group.menus.length > 0);
  }, [isAuthenticated]);

  return (
    <ScrollArea className="flex-1 min-h-0 [&>div>div[style]]:!block">
      <TooltipProvider disableHoverableContent>
        <nav className="mt-3 h-full w-full">
          {/* min-h-full (not a hardcoded 100vh-Npx guess) — nav is h-full of
              ScrollArea's viewport, which is now genuinely bounded by the
              flex-1 min-h-0 above, so this fills exactly the real space
              left after the sidebar's header and footer, however tall they
              actually are, instead of a pixel count that drifts out of sync
              with them. Only real content taller than that scrolls. */}
          <ul className="flex flex-col min-h-full items-start space-y-0.5 px-2">
            {menuList.map(({ groupLabel, menus }) => (
              <li className={cn("w-full", groupLabel ? "pt-2" : "")} key={groupLabel || "home"}>
                {(isOpen && groupLabel) || isOpen === undefined ? (
                  <p className="px-4 pb-1 max-w-[248px] truncate text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/45">
                    {groupLabel}
                  </p>
                ) : !isOpen && isOpen !== undefined && groupLabel ? (
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
                ) : (
                  <p className="pb-1" />
                )}
                {menus.map(({ href, label, icon: Icon, badge, match }) => {
                  const active = match === "exact"
                    ? pathname === href
                    : pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <div className="w-full" key={href}>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={active ? "secondary" : "ghost"}
                            className="w-full justify-start h-8 mb-0 relative"
                            asChild
                          >
                            <Link href={href}>
                              <span className={cn(isOpen === false ? "" : "mr-2")}>
                                <Icon size={18} />
                              </span>
                              <p
                                className={cn(
                                  "max-w-[200px] truncate text-sm",
                                  isOpen === false
                                    ? "-translate-x-96 opacity-0"
                                    : "translate-x-0 opacity-100"
                                )}
                              >
                                {label}
                              </p>
                              {/* Collapsed, the label is translated off-screen and a
                                  count would have nowhere to sit — so the pending
                                  state degrades to a dot on the icon rather than
                                  disappearing entirely. */}
                              {badge === "inbox" && hitlOpenCount > 0 && (
                                isOpen === false ? (
                                  <span
                                    data-testid="hitl-nav-dot"
                                    className={cn(
                                      "absolute top-1.5 right-1.5 h-2 w-2 rounded-full",
                                      TONE_STYLES.attention.dot,
                                    )}
                                  />
                                ) : (
                                  <span
                                    data-testid="hitl-nav-badge"
                                    className={cn(
                                      "ml-auto min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-semibold",
                                      TONE_STYLES.attention.pill,
                                    )}
                                  >
                                    {hitlOpenCount}
                                  </span>
                                )
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
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </nav>
      </TooltipProvider>
    </ScrollArea>
  );
}
