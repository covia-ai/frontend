"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface SidebarLegalFooterProps {
  isOpen: boolean | undefined;
}

// Pinned via `absolute` rather than a flex sibling of Menu — Menu's nav
// list already stretches to fill the sidebar height with a calc()-based
// min-height (see menu.tsx), so a flex-flow footer would sit below the
// fold on most viewports. Absolute-positioning it over the scroll area
// keeps it always visible without touching that calc.
export function SidebarLegalFooter({ isOpen }: SidebarLegalFooterProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border/60 bg-sidebar px-3 py-2">
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Link
            href="/privacypolicy"
            className="flex items-center rounded-md px-1 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
          >
            <span className={cn(isOpen === false ? "" : "mr-2")}>
              <ShieldCheck size={16} />
            </span>
            <span
              className={cn(
                "whitespace-nowrap transition-[transform,opacity] duration-300 ease-in-out",
                isOpen === false
                  ? "-translate-x-96 opacity-0"
                  : "translate-x-0 opacity-100",
              )}
            >
              Privacy Policy
            </span>
          </Link>
        </TooltipTrigger>
        {isOpen === false && (
          <TooltipContent side="right">Privacy Policy</TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}
