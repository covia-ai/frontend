"use client";

import { Key, Copy, Check, Plus, Import } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Identicon } from "@/components/Identicon";
import { DidDisplay } from "@/components/DidDisplay";
import { abbreviateDid } from "@/lib/utils";
import type { DeviceKeyStep, StoredKeyOption } from "@/hooks/use-device-key-signin";

interface DeviceKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: DeviceKeyStep;
  setStep: (step: DeviceKeyStep) => void;
  deviceKey: string | null;
  deviceKeyDid: string | null;
  isExisting: boolean;
  pastedKey: string;
  onPastedKeyChange: (value: string) => void;
  keyError: string | null;
  copied: boolean;
  checking: boolean;
  authError: string | null;
  storedKeys: StoredKeyOption[];
  onGenerate: () => void;
  onProvideKey: () => void;
  onSubmitProvidedKey: () => void;
  onCopy: () => void;
  onContinue: () => void;
  onUseStoredKey: (hex: string) => void;
  onUseDifferentKey: () => void;
}

// The device-key sign-in dialog, shared by the signup page's and topbar's
// sign-in buttons (see useDeviceKeySignIn). Continue probes the venue before
// the login is recorded; a rejected key shows the error here with a path to
// a different key rather than "succeeding" into a broken session.
export function DeviceKeyDialog({
  open, onOpenChange, step, setStep, deviceKey, deviceKeyDid, isExisting, pastedKey,
  onPastedKeyChange, keyError, copied, checking, authError, storedKeys,
  onGenerate, onProvideKey, onSubmitProvidedKey, onCopy, onContinue,
  onUseStoredKey, onUseDifferentKey,
}: DeviceKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        {step === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Device Key
              </DialogTitle>
              <DialogDescription>
                {storedKeys.length > 0
                  ? "Choose how to sign in to this venue."
                  : "No device key found for this venue. Would you like to generate a new one or provide an existing key?"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              {storedKeys.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">Keys stored in this browser:</p>
                  <ul className="border border-border rounded-md divide-y divide-border">
                    {storedKeys.map(({ hex, did }) => (
                      <li key={hex}>
                        <button
                          type="button"
                          data-testid="stored-key-option"
                          data-did={did}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted disabled:opacity-50"
                          disabled={checking}
                          onClick={() => onUseStoredKey(hex)}
                        >
                          <Identicon did={did} size={16} />
                          <span className="font-mono text-xs truncate">{abbreviateDid(did, 24)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={onGenerate}>
                <Plus className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <p className="font-medium">Generate a new key</p>
                  <p className="text-xs text-muted-foreground font-normal">We&apos;ll create a new device key for you</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={onProvideKey}>
                <Import className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <p className="font-medium">I have a key</p>
                  <p className="text-xs text-muted-foreground font-normal">Enter an existing device key</p>
                </div>
              </Button>
            </div>
          </>
        )}

        {step === "provide" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Import className="h-5 w-5" />
                Enter Your Device Key
              </DialogTitle>
              <DialogDescription>
                Paste your existing device key below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Paste your device key here"
                value={pastedKey}
                onChange={(e) => onPastedKeyChange(e.target.value)}
                className="font-mono text-xs"
              />
              {keyError && <p className="text-sm text-destructive">{keyError}</p>}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep("choose")} disabled={checking}>
                Back
              </Button>
              <Button onClick={onSubmitProvidedKey} disabled={checking}>
                {checking ? "Checking…" : "Continue"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "show" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {isExisting ? "Welcome Back" : "Device Key Ready"}
              </DialogTitle>
              <DialogDescription>
                {isExisting
                  ? "This browser has a device key. Continue checks it with the venue before signing you in."
                  : "Your device key is stored in your browser — as long as you don't clear your browser data, we'll read it from there automatically."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {isExisting && deviceKeyDid ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">You&apos;ll sign in as:</p>
                  <DidDisplay value={deviceKeyDid} chars={28} iconSize={20} />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    You can save a copy of your key for safekeeping:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 rounded-md px-3 py-2 text-xs font-mono break-all select-all">
                      {deviceKey}
                    </code>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={onCopy} aria-label="Copy device key" className="shrink-0">
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{copied ? "Copied!" : "Copy device key"}</TooltipContent>
                    </Tooltip>
                  </div>
                </>
              )}
              {authError && (
                <p
                  data-testid="devicekey-auth-error"
                  className="text-sm text-destructive rounded border border-destructive/40 bg-destructive/5 p-3 break-words"
                >
                  {authError}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                data-testid="devicekey-use-different"
                onClick={onUseDifferentKey}
                disabled={checking}
              >
                Use a different key
              </Button>
              <Button onClick={onContinue} disabled={checking} className="w-full sm:w-auto" data-testid="devicekey-continue">
                {checking ? "Checking…" : authError ? "Try again" : "Continue"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
