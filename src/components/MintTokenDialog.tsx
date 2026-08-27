"use client";

import { useState } from "react";
import type { VenueAuth } from "@/hooks/use-auth";
import { identityTokenFor } from "@/lib/identity-token";
import { notifyError, notifySuccess } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy } from "lucide-react";

const UNIT_SECONDS = {
  minutes: 60,
  hours: 3_600,
  days: 86_400,
} as const;

type Unit = keyof typeof UNIT_SECONDS;

type MintTokenDialogProps = {
  venueId: string;
  account: VenueAuth;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Sophisticated token minting for device-key accounts: choose an exact
 * lifetime and, when needed, a different audience DID — the cross-venue
 * case, where a venue that recognises this DID accepts a token bound to
 * itself. The quick lifetimes on the dropdown cover everyday use.
 */
export function MintTokenDialog({ venueId, account, open, onOpenChange }: MintTokenDialogProps) {
  const [audience, setAudience] = useState(venueId);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<Unit>("hours");
  const [minted, setMinted] = useState<{ token: string; expiresAt: Date } | null>(null);

  const seconds = Math.round(Number(amount) * UNIT_SECONDS[unit]);
  const valid = audience.trim().startsWith("did:") && Number.isFinite(seconds) && seconds >= 60;
  const longLived = valid && seconds > UNIT_SECONDS.days;

  const mint = () => {
    try {
      const token = identityTokenFor(account, audience.trim(), seconds);
      setMinted({ token, expiresAt: new Date(Date.now() + seconds * 1000) });
    } catch (err) {
      notifyError("Unable to mint identity token", err);
    }
  };

  const copy = async () => {
    if (!minted) return;
    try {
      await navigator.clipboard.writeText(minted.token);
      notifySuccess("Identity token copied");
    } catch (err) {
      notifyError("Unable to copy identity token", err);
    }
  };

  // Minted tokens are input-specific — invalidate the result when the
  // inputs change so a stale token can't be copied by mistake.
  const edit = (apply: () => void) => {
    setMinted(null);
    apply();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mint identity token</DialogTitle>
          <DialogDescription>
            Sign a bearer token with this device key. The token is only
            accepted by the venue whose DID is the audience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="mint-token-audience" className="mb-1">Audience (venue DID)</Label>
            <Input
              id="mint-token-audience"
              data-testid="mint-token-audience"
              value={audience}
              onChange={(e) => edit(() => setAudience(e.target.value))}
              className="font-mono text-xs"
            />
          </div>

          <div>
            <Label htmlFor="mint-token-amount" className="mb-1">Lifetime</Label>
            <div className="flex gap-2">
              <Input
                id="mint-token-amount"
                data-testid="mint-token-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => edit(() => setAmount(e.target.value))}
                className="w-24"
              />
              <Select value={unit} onValueChange={(v) => edit(() => setUnit(v as Unit))}>
                <SelectTrigger data-testid="mint-token-unit" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">minutes</SelectItem>
                  <SelectItem value="hours">hours</SelectItem>
                  <SelectItem value="days">days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {longLived && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                Long-lived token: anyone holding it can act as you until it
                expires. Treat it like a password.
              </p>
            )}
          </div>

          <Button data-testid="mint-token-mint" onClick={mint} disabled={!valid}>
            Mint token
          </Button>

          {minted && (
            <div>
              <div className="flex items-center gap-2">
                <code
                  data-testid="mint-token-value"
                  className="bg-muted flex-1 rounded-md px-3 py-2 text-xs font-mono break-all select-all max-h-32 overflow-y-auto"
                >
                  {minted.token}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  data-testid="mint-token-copy"
                  aria-label="Copy token"
                  onClick={copy}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Expires {minted.expiresAt.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
