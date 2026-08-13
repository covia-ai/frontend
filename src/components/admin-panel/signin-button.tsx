"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogInIcon, Globe, Lock, CircleUserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger }from "@/components/ui/dropdown-menu";
import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import { Identicon } from "@/components/Identicon";
import { useDeviceKeySignIn } from "@/hooks/use-device-key-signin";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { useVenueAccess } from "@/hooks/use-venue-access";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ChromeSignInButtonProps = {
  index?: string | number;
  isOpen?: boolean;
  venueId?: string;
};

export function ChromeSignInButton(props: ChromeSignInButtonProps) {
  const logout = useAuthStore((x) => x.logout);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const activeVenueId = props.venueId ?? selectedVenueId;
  const auth = useAuthStore((state) =>
    activeVenueId ? state.authMap[activeVenueId] ?? null : null,
  );
  const activeBaseUrl = useVenues((state) =>
    activeVenueId ? state.venues.find((v) => v.venueId === activeVenueId)?.baseUrl : undefined,
  );
  const access = useVenueAccess(activeBaseUrl, activeVenueId ?? undefined);

  const {
    dialogOpen, setDialogOpen, openDialog, step, setStep, deviceKey, deviceKeyDid,
    isExisting, pastedKey, keyError, copied, checking, authError, storedKeys,
    handleGenerate, handleProvideKey, handlePastedKeyChange,
    handleSubmitProvidedKey, handleCopy, handleContinue,
    handleUseStoredKey, handleUseDifferentKey,
  } = useDeviceKeySignIn({ venueId: props.venueId });

  if (!auth) {
    // Only assert "Public" once a real anonymous read has confirmed it — a
    // private venue that hasn't finished being probed yet shows neither
    // badge rather than briefly claiming public access it doesn't have.
    const accessBadge =
      access.state === "public"
        ? { icon: Globe, label: "Public" }
        : access.state === "signed-out"
          ? { icon: Lock, label: "Sign-in required" }
          : null;
    return (
      <div className="flex items-center gap-2" key={props.index}>
        {accessBadge && (
          <Badge
            variant="outline"
            className="h-9 px-3 gap-1.5 text-sm bg-muted text-muted-foreground hidden sm:flex items-center font-normal"
          >
            <accessBadge.icon size={14} />
            {accessBadge.label}
          </Badge>
        )}
        <Button
          onClick={openDialog}
          variant="default"
          className="justify-center h-8 my-5 text-sm hover:bg-primary-vlight hover:text-foreground"
        >
          <LogInIcon />
          <p
            className={cn(
              "whitespace-nowrap hidden md:block lg:block",
              props.isOpen === false ? "opacity-0 hidden" : "opacity-100"
            )}
          >
            Sign In
          </p>
        </Button>

        <DeviceKeyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          step={step}
          setStep={setStep}
          deviceKey={deviceKey}
          deviceKeyDid={deviceKeyDid}
          isExisting={isExisting}
          pastedKey={pastedKey}
          onPastedKeyChange={handlePastedKeyChange}
          keyError={keyError}
          copied={copied}
          checking={checking}
          authError={authError}
          storedKeys={storedKeys}
          onGenerate={handleGenerate}
          onProvideKey={handleProvideKey}
          onSubmitProvidedKey={handleSubmitProvidedKey}
          onCopy={handleCopy}
          onContinue={handleContinue}
          onUseStoredKey={handleUseStoredKey}
          onUseDifferentKey={handleUseDifferentKey}
        />
      </div>
    )
  }
  else {
    return (
      <div className="flex flex-row mr-4" >

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
                  {/* A did:key login shows its identicon; other identities keep the
                      generic icon until avatars land. */}
                  {auth?.type === "keypair"
                    ? <Identicon did={auth.did} size={24} title={auth.did} />
                    : <CircleUserRound className="!size-6" />}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Account menu</TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="w-48 mr-8">
            <DropdownMenuItem asChild className="items-start text-center hover:bg-primary-vlight">
              <Link href="/profile">My Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (activeVenueId) logout(activeVenueId);
              }}
              className="items-start text-center hover:bg-primary-vlight"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

}
