"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogInIcon, Globe, CircleUserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger }from "@/components/ui/dropdown-menu";
import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import { useDeviceKeySignIn } from "@/hooks/use-device-key-signin";
import { useAuthStore } from "@/hooks/use-auth";

export function ChromeSignInButton(props: any) {
  const auth = useAuthStore((x) => x.auth);
  const logout = useAuthStore((x) => x.logout);
  const router = useRouter();

  const {
    dialogOpen, setDialogOpen, openDialog, step, setStep, deviceKey, isExisting,
    pastedKey, keyError, copied, handleGenerate, handleProvideKey,
    handlePastedKeyChange, handleSubmitProvidedKey, handleCopy, handleContinue,
  } = useDeviceKeySignIn();

  if (!auth) {
    return (
      <div className="flex items-center gap-2" key={props.index}>
        <Badge
          variant="outline"
          className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 font-normal"
        >
          <Globe size={10} />
          Public
        </Badge>
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
          isExisting={isExisting}
          pastedKey={pastedKey}
          onPastedKeyChange={handlePastedKeyChange}
          keyError={keyError}
          copied={copied}
          onGenerate={handleGenerate}
          onProvideKey={handleProvideKey}
          onSubmitProvidedKey={handleSubmitProvidedKey}
          onCopy={handleCopy}
          onContinue={handleContinue}
        />
      </div>
    )
  }
  else {
    return (
      <div className="flex flex-row mr-4" >

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
              <CircleUserRound className="!size-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 mr-8">
            <DropdownMenuItem asChild className="items-start text-center hover:bg-primary-vlight">
              <Link href="/profile">My Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { logout(); router.push("/"); }}
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
