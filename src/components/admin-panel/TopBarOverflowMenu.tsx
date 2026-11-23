"use client";

import { useTheme } from "next-themes";
import { BookOpen, Moon, MoreVertical, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVenueAccessBadge } from "@/components/VenueAccessBadge";

// Below sm the topbar drops to four controls so the breadcrumb keeps a readable
// width. Everything it drops lands here rather than disappearing: the per-page
// docs shortcut (`hidden sm:inline-flex` on the bar), the theme toggle, and the
// venue's access state, whose ~90px badge has never had a form that fits a
// phone. The trigger is sm:hidden, so from sm up this renders nothing visible
// and the bar is exactly as it was.
export function TopBarOverflowMenu({
  docsHref,
  venueId,
}: {
  docsHref?: string;
  venueId?: string;
}) {
  const { setTheme, resolvedTheme } = useTheme();
  const access = useVenueAccessBadge(venueId);

  // Same contract as DarkLightToggle: the theme is read when the user acts,
  // never to choose markup. The server can't know it, so both the icon and the
  // label are rendered and the theme class on <html> shows the right one.
  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="More"
          data-testid="topbar-overflow-trigger"
          className="sm:hidden"
        >
          <MoreVertical size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {docsHref && (
          <DropdownMenuItem asChild data-testid="topbar-overflow-docs">
            <a href={docsHref} target="_blank" rel="noopener noreferrer">
              <BookOpen size={16} />
              View documentation
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem data-testid="topbar-overflow-theme" onSelect={toggleTheme}>
          <Moon size={16} className="dark:hidden" />
          <Sun size={16} className="hidden dark:block" />
          <span className="dark:hidden">Switch to dark mode</span>
          <span className="hidden dark:inline">Switch to light mode</span>
        </DropdownMenuItem>
        {access && (
          <>
            <DropdownMenuSeparator />
            {/* Status, not an action — the same thing the badge states inline
                from sm up, so it is disabled rather than clickable. */}
            <DropdownMenuItem
              disabled
              data-testid="topbar-overflow-access"
              className="opacity-100 text-muted-foreground"
            >
              <access.icon size={16} />
              {access.label}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
