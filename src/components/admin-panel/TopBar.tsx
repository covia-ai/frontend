
"use client"

import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { SignInButton } from "./signin-button";
import { VenueSelector } from "@/components/VenueSelector";
import { DarkLightToggle } from "../DarkLightToggle";
import { SmartBreadcrumb } from "../smartbreadcrumb2";
import { Separator } from "../ui/separator";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { Button } from "../ui/button";
import { LogIn, LogOut, Fingerprint } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

export function TopBar(props:any) {
  const router = useRouter();
  const auth = useAuthStore((x) => x.auth);
  const logout = useAuthStore((x) => x.logout);

  return (
    <header className="sticky top-0 z-10 w-full bg-background">
      <div className=" flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-4 w-full ml-4">
          <SmartBreadcrumb onNavigate={(href) => router.push(href)} pathname={usePathname()} assetOrJobName= {props.assetOrJobName} venueName={props.venueName} agentName={props.agentName}/>
          <div className="flex flex-1 items-center justify-end space-x-4">
              <DarkLightToggle/>
              {auth ? (
                <div className="flex items-center space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        <Fingerprint size={12} />
                        <span>{auth.did.slice(0, 16)}...{auth.did.slice(-4)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{auth.did}</TooltipContent>
                  </Tooltip>
                  <Button variant="ghost" size="sm" onClick={logout} className="text-xs">
                    <LogOut size={14} className="mr-1" /> Logout
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => router.push("/signUp")} className="text-xs">
                  <LogIn size={14} className="mr-1" /> Login
                </Button>
              )}
              <VenueSelector />
              <SignInButton/>

          </div>

        </div>

      </div>
       <Separator/>
    </header>
  );
}
