"use client";

import Link from "next/link";
import { ScrollText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface SidebarLegalFooterProps {
  isOpen: boolean | undefined;
}

// A plain flex sibling of the scrollable menu region (sidebar.tsx) rather
// than an absolute overlay — it claims its own real space in the layout, so
// it can never overlap the menu's content no matter how tall the menu gets.
// Both links share a single row (rather than stacking, as this used to) to
// keep that claimed space small; full names ride the tooltip/aria-label,
// visible text is abbreviated to fit one row at the sidebar's open width.
//
// Collapsed labels animate via max-width (not translate-x, as elsewhere in
// this sidebar) — translate only moves the paint position, it doesn't
// shrink the box, so a translated-but-still-full-width label keeps
// contributing its width to this row's layout. That's invisible on a
// single-link-per-row layout (the label just overflows into empty space to
// the right), but with two links sharing one row at the sidebar's ~66px
// collapsed content width, it pushed one icon out of view entirely.
export function SidebarLegalFooter({ isOpen }: SidebarLegalFooterProps) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-1 border-t border-sidebar-border/60 bg-sidebar px-3 py-2">
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Link
            href="/privacypolicy"
            aria-label="Privacy Policy"
            className="flex items-center rounded-md px-1 py-1 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
          >
            <ShieldCheck size={14} className={cn(isOpen === false ? "" : "mr-1.5")} />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out",
                isOpen === false ? "max-w-0 opacity-0" : "max-w-[60px] opacity-100",
              )}
            >
              Privacy
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side={isOpen === false ? "right" : "top"}>Privacy Policy</TooltipContent>
      </Tooltip>
      <span
        aria-hidden
        className={cn(
          "overflow-hidden text-sidebar-foreground/30 transition-[max-width,opacity] duration-300 ease-in-out",
          isOpen === false ? "max-w-0 opacity-0" : "max-w-[8px] opacity-100",
        )}
      >
        ·
      </span>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Link
            href="/terms"
            aria-label="Terms of Service"
            className="flex items-center rounded-md px-1 py-1 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
          >
            <ScrollText size={14} className={cn(isOpen === false ? "" : "mr-1.5")} />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out",
                isOpen === false ? "max-w-0 opacity-0" : "max-w-[60px] opacity-100",
              )}
            >
              Terms
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side={isOpen === false ? "right" : "top"}>Terms of Service</TooltipContent>
      </Tooltip>
    </div>
  );
}
