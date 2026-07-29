
"use client"

import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { ChromeSignInButton } from "./signin-button";
import { VenueSelector } from "@/components/VenueSelector";
import { HitlIndicator } from "@/components/HitlIndicator";
import { DarkLightToggle } from "../DarkLightToggle";
import { SmartBreadcrumb } from "../smartbreadcrumb2";
import { Separator } from "../ui/separator";
import { usePathname, useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// Checked most-specific first — a venue-scoped route like /venues/x/jobs
// must resolve to the Jobs doc, not the generic Venues one, so Jobs/Agents/
// Operations/Assets all run before the plain "/venues" fallback.
const DOCS_LINKS: { test: (pathname: string) => boolean; href: string }[] = [
  { test: (p) => p.includes("/jobs"), href: "https://docs.covia.ai/docs/user-guide/api#jobs" },
  { test: (p) => p.includes("/agents"), href: "https://docs.covia.ai/docs/user-guide/agents" },
  { test: (p) => p.includes("/operations"), href: "https://docs.covia.ai/docs/user-guide/adapters" },
  { test: (p) => p.includes("/publicartifacts") || p.includes("/assets"), href: "https://docs.covia.ai/docs/user-guide/api#assets" },
  { test: (p) => p.includes("/venues"), href: "https://docs.covia.ai/docs/overview/venues" },
];

function docsLinkFor(pathname: string): string | undefined {
  return DOCS_LINKS.find(({ test }) => test(pathname))?.href;
}

export function TopBar(props:any) {
  const router = useRouter();
  const pathname = usePathname();
  const docsHref = docsLinkFor(pathname);

  return (
    <header className="sticky top-0 z-10 w-full bg-background">
      <div className=" flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-4 w-full ml-4">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <SmartBreadcrumb onNavigate={(href) => router.push(href)} pathname={pathname} assetOrJobName= {props.assetOrJobName} venueName={props.venueName}/>
          </div>
          <div className="flex items-center justify-end space-x-4">
              {docsHref && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost" size="icon" aria-label="Documentation">
                      <a href={docsHref} target="_blank" rel="noopener noreferrer">
                        <Info size={16} />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View documentation for this page</TooltipContent>
                </Tooltip>
              )}
              <HitlIndicator />
              <DarkLightToggle/>
              <VenueSelector />
              <ChromeSignInButton/>
          </div>
        </div>
      </div>
       <Separator/>
    </header>
  );
}
