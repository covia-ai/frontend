
"use client"

import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { ChromeSignInButton } from "./signin-button";
import { VenueSelector } from "@/components/VenueSelector";
import { HitlIndicator } from "@/components/HitlIndicator";
import { NotificationBell } from "@/components/NotificationBell";
import { DarkLightToggle } from "../DarkLightToggle";
import { SmartBreadcrumb } from "../SmartBreadcrumb";
import { VenueSubnav } from "@/components/VenueSubnav";
import { Separator } from "../ui/separator";
import { usePathname } from "next/navigation";
import { docsLinkFor } from "@/lib/breadcrumbs";
import { BookOpen } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type TopBarProps = {
  assetOrJobName?: string;
  venueName?: string;
  venueId?: string;
};

export function TopBar(props: TopBarProps) {
  const pathname = usePathname();
  const docsHref = docsLinkFor(pathname);

  return (
    <header className="sticky top-0 z-10 w-full bg-background">
      <div className=" flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-4 ml-4 min-w-0">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <SmartBreadcrumb pathname={pathname} assetOrJobName={props.assetOrJobName} venueName={props.venueName} />
          </div>
          <div className="flex shrink-0 items-center justify-end space-x-1 sm:space-x-4">
              {docsHref && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Per-page docs shortcut: a convenience, not core nav —
                        hidden on mobile so the tight topbar keeps room for the
                        breadcrumb; it stays in the tooltip-less controls at sm+. */}
                    <Button asChild variant="ghost" size="icon" aria-label="Documentation" className="hidden sm:inline-flex">
                      <a href={docsHref} target="_blank" rel="noopener noreferrer">
                        <BookOpen size={16} />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View documentation for this page</TooltipContent>
                </Tooltip>
              )}
              <HitlIndicator />
              <NotificationBell />
              <DarkLightToggle/>
              <VenueSelector venueId={props.venueId} />
              <ChromeSignInButton venueId={props.venueId}/>
          </div>
        </div>
      </div>
       <Separator/>
       {/* Venue sub-nav — renders only on /venues/<slug>/* routes (self-hides
           elsewhere), tying a venue's sections together (W4 4B). */}
       <VenueSubnav />
    </header>
  );
}
