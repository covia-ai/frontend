"use client";

import { useAuthStore, type VenueAuth } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyRound, Globe, LogOut, Trash2, Users } from "lucide-react";

// Every account known to this browser, grouped by venue. Auth is per-venue
// (authMap holds the active account; accountsMap holds every account used),
// so switching venues automatically restores that venue's last-used account —
// this panel makes that state visible and lets you switch, sign out of, or
// forget accounts without re-entering tokens or keys.
export function AccountsPanel() {
  const authMap = useAuthStore((state) => state.authMap);
  const accountsMap = useAuthStore((state) => state.accountsMap);
  const switchAccount = useAuthStore((state) => state.switchAccount);
  const removeAccount = useAuthStore((state) => state.removeAccount);
  const logout = useAuthStore((state) => state.logout);
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);

  // Selected venue first, then the rest in stable order.
  const venueIds = Array.from(
    new Set([...Object.keys(accountsMap), ...Object.keys(authMap)]),
  ).sort((a, b) => Number(b === selectedVenueId) - Number(a === selectedVenueId));

  const venueLabel = (venueId: string) =>
    venues.find((venue) => venue.venueId === venueId)?.metadata?.name ?? venueId;

  const isActive = (venueId: string, account: VenueAuth) => {
    const active = authMap[venueId];
    return !!active && active.did === account.did && active.type === account.type;
  };

  return (
    <div className="border rounded-lg p-4 space-y-4" data-testid="accounts-panel">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Users size={16} className="text-blue-500" />
        Accounts
      </h3>
      <p className="text-xs text-muted-foreground">
        Sign-ins are per venue. Switching venue restores the account you last used
        there; signing out keeps the account here so you can use it again later.
      </p>

      {venueIds.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="accounts-empty">
          No sign-ins yet — connect to a venue and sign in from the top bar.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {venueIds.map((venueId) => {
          const accounts = accountsMap[venueId] ?? [];
          const hasActive = !!authMap[venueId];
          return (
            <div key={venueId} data-testid="accounts-venue" data-venue={venueId}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-sm font-medium flex items-center gap-2 min-w-0">
                  <Globe size={13} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{venueLabel(venueId)}</span>
                  {venueId === selectedVenueId && (
                    <Badge variant="secondary" className="text-xs shrink-0">current venue</Badge>
                  )}
                </p>
                {hasActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="venue-signout"
                    onClick={() => logout(venueId)}
                  >
                    <LogOut size={13} className="mr-1" /> Sign out
                  </Button>
                )}
              </div>

              <ul className="flex flex-col divide-y divide-border border border-border rounded-md">
                {accounts.map((account) => {
                  const active = isActive(venueId, account);
                  return (
                    <li
                      key={`${account.type}:${account.did}`}
                      data-testid="account-entry"
                      data-did={account.did}
                      data-active={active}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <KeyRound size={13} className="text-muted-foreground shrink-0" />
                      <code className="font-mono text-xs truncate flex-1 min-w-0" title={account.did}>
                        {account.did}
                      </code>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {account.type === "keypair" ? "Device key" : "OAuth"}
                      </Badge>
                      {active ? (
                        <Badge className="text-xs shrink-0">active</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="account-use"
                          onClick={() => switchAccount(venueId, account.did, account.type)}
                        >
                          Use
                        </Button>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            data-testid="account-remove"
                            aria-label="Forget account"
                            onClick={() => removeAccount(venueId, account.did, account.type)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Forget this account{account.type === "bearer" ? " and its token" : ""}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                })}
                {accounts.length === 0 && (
                  <li className="px-3 py-2 text-xs text-muted-foreground">
                    No stored accounts for this venue.
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
