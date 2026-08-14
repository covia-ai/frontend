"use client";

import { useState } from "react";
import type { VenueAuth } from "@/hooks/use-auth";
import { identityTokenFor, IDENTITY_TOKEN_LIFETIMES } from "@/lib/identity-token";
import { MintTokenDialog } from "@/components/MintTokenDialog";
import { notifyError, notifySuccess } from "@/lib/notify";
import { abbreviateDid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyRound } from "lucide-react";

// Copy a bearer-usable identity token for `account` at `venueId` to the
// clipboard. Device keys mint a fresh aud-bound JWT with the given lifetime;
// OAuth accounts copy their stored bearer token as-is. The token itself
// never goes into a notification (the session log keeps descriptions).
async function copyIdentityToken(
  venueId: string,
  account: VenueAuth,
  lifetimeSeconds?: number,
): Promise<void> {
  try {
    const token = identityTokenFor(account, venueId, lifetimeSeconds);
    await navigator.clipboard.writeText(token);
    notifySuccess("Identity token copied", {
      description:
        account.type === "keypair"
          ? `Valid ${IDENTITY_TOKEN_LIFETIMES.find((l) => l.seconds === lifetimeSeconds)?.label ?? "5 minutes"}, usable only at ${abbreviateDid(venueId)}`
          : `Stored OAuth token for ${abbreviateDid(venueId)}`,
    });
  } catch (err) {
    notifyError("Unable to copy identity token", err);
  }
}

type IdentityTokenButtonProps = {
  venueId: string;
  account: VenueAuth;
  /** "icon" — compact row action (Accounts panel); "button" — labelled. */
  variant?: "icon" | "button";
};

/**
 * Copies a bearer token proving this account's identity at one venue —
 * for use outside this app (curl, CLI tools, agent configs) as
 * `Authorization: Bearer <token>`. Device keys offer a lifetime menu;
 * OAuth accounts copy their stored token directly.
 */
export function IdentityTokenButton({
  venueId,
  account,
  variant = "icon",
}: IdentityTokenButtonProps) {
  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const trigger = (onClick?: () => void) =>
    variant === "icon" ? (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        data-testid="account-token"
        aria-label="Copy identity token"
        onClick={onClick}
      >
        <KeyRound size={13} />
      </Button>
    ) : (
      <Button variant="outline" size="sm" data-testid="account-token" onClick={onClick}>
        <KeyRound size={13} className="mr-1" /> Copy identity token
      </Button>
    );

  if (account.type === "bearer") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger(() => copyIdentityToken(venueId, account))}
        </TooltipTrigger>
        <TooltipContent>Copy this account&apos;s bearer token</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger()}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Copy an identity token for this venue</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">Copy identity token</DropdownMenuLabel>
          {IDENTITY_TOKEN_LIFETIMES.map(({ seconds, label }) => (
            <DropdownMenuItem
              key={seconds}
              data-testid={`token-lifetime-${seconds}`}
              onClick={() => copyIdentityToken(venueId, account, seconds)}
            >
              Valid {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-testid="token-custom"
            onSelect={() => setMintDialogOpen(true)}
          >
            Custom…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MintTokenDialog
        venueId={venueId}
        account={account}
        open={mintDialogOpen}
        onOpenChange={setMintDialogOpen}
      />
    </>
  );
}
