"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogInIcon, CircleUserRound, Key } from "lucide-react";
import { FaGithub, FaGoogle, FaMicrosoft } from "react-icons/fa";
import { VenueAccessBadge } from "@/components/VenueAccessBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger }from "@/components/ui/dropdown-menu";
import { abbreviateDid } from "@/lib/utils";
import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import { Identicon } from "@/components/Identicon";
import { useDeviceKeySignIn } from "@/hooks/use-device-key-signin";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOAuthSignInOptions } from "@/hooks/use-oauth-sign-in";
import { OAUTH_PROVIDER_LABELS } from "@/lib/oauth";

type ChromeSignInButtonProps = {
  index?: string | number;
  isOpen?: boolean;
  venueId?: string;
};

// One stored account as a menu row: identicon (device keys) or generic icon,
// elided DID, login type. Selecting activates it — switching/signing back in
// only ever uses accounts already stored; nothing here mints keys or starts
// a fresh sign-in flow.
function AccountMenuItem({
  account,
  testId,
  onSelect,
}: {
  account: { type: "keypair" | "bearer"; did: string };
  testId: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      data-testid={testId}
      data-did={account.did}
      onClick={onSelect}
      className="gap-2 hover:bg-primary-vlight"
    >
      {account.type === "keypair" ? (
        <Identicon did={account.did} size={18} title={account.did} />
      ) : (
        <CircleUserRound className="!size-4.5 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1 truncate font-mono text-xs">
        {abbreviateDid(account.did)}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {account.type === "keypair" ? "Device key" : "OAuth"}
      </span>
    </DropdownMenuItem>
  );
}

export function ChromeSignInButton(props: ChromeSignInButtonProps) {
  const logout = useAuthStore((x) => x.logout);
  const switchAccount = useAuthStore((x) => x.switchAccount);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);
  const activeVenueId = props.venueId ?? selectedVenueId;
  const auth = useAuthStore((state) =>
    activeVenueId ? state.authMap[activeVenueId] ?? null : null,
  );
  // Select the raw store value — defaulting to [] inside the selector would
  // mint a fresh reference per render and loop useSyncExternalStore.
  const storedAccountsRaw = useAuthStore((state) =>
    activeVenueId ? state.accountsMap[activeVenueId] : undefined,
  );
  const storedAccounts = storedAccountsRaw ?? [];
  const oauthOptions = useOAuthSignInOptions(activeVenueId ?? undefined);

  const {
    dialogOpen, setDialogOpen, openDialog, step, setStep, deviceKey, deviceKeyDid,
    isExisting, pastedKey, keyError, copied, checking, authError, storedKeys,
    handleGenerate, handleProvideKey, handlePastedKeyChange,
    handleSubmitProvidedKey, handleCopy, handleContinue,
    handleUseStoredKey, handleUseDifferentKey,
  } = useDeviceKeySignIn({ venueId: props.venueId });

  if (!auth) {
    return (
      <div className="flex items-center gap-2" key={props.index}>
        {/* Inline from sm up; below that the same state is a row in the
            topbar's overflow menu, where it does not compete for width. */}
        <VenueAccessBadge venueId={props.venueId} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="justify-center h-8 my-5 text-sm hover:bg-primary-vlight hover:text-foreground"
            >
              <LogInIcon />
              <span
                className={cn(
                  "whitespace-nowrap hidden md:block lg:block",
                  props.isOpen === false ? "opacity-0 hidden" : "opacity-100"
                )}
              >
                Sign In
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {storedAccounts.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Recent accounts
                </DropdownMenuLabel>
                {storedAccounts.map((account) => (
                  <AccountMenuItem
                    key={`${account.type}:${account.did}`}
                    account={account}
                    testId="recent-account"
                    onSelect={() => {
                      if (activeVenueId) {
                        switchAccount(activeVenueId, account.did, account.type);
                      }
                    }}
                  />
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            {oauthOptions.map(({ provider, signIn }) => {
              const ProviderIcon = provider === "google"
                ? FaGoogle
                : provider === "microsoft"
                  ? FaMicrosoft
                  : FaGithub;
              return (
                <DropdownMenuItem key={provider} onSelect={() => void signIn()}>
                  <ProviderIcon />
                  Continue with {OAUTH_PROVIDER_LABELS[provider]}
                </DropdownMenuItem>
              );
            })}
            {oauthOptions.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={openDialog}>
              <Key />
              Continue with a device key
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
          <DropdownMenuContent className="w-56 mr-8">
            <DropdownMenuItem asChild className="items-start text-center hover:bg-primary-vlight">
              <Link href="/profile">My Profile</Link>
            </DropdownMenuItem>
            {/* Other accounts already stored for THIS venue — switching only,
                never a path that mints a new key or starts a fresh sign-in
                (those live behind the signed-out Sign In flow). */}
            {(() => {
              const others = storedAccounts.filter(
                (account) =>
                  !(account.did === auth.did && account.type === auth.type),
              );
              if (others.length === 0) return null;
              return (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Switch account
                  </DropdownMenuLabel>
                  {others.map((account) => (
                    <AccountMenuItem
                      key={`${account.type}:${account.did}`}
                      account={account}
                      testId="switch-account"
                      onSelect={() => {
                        if (activeVenueId) {
                          switchAccount(activeVenueId, account.did, account.type);
                        }
                      }}
                    />
                  ))}
                </>
              );
            })()}
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
