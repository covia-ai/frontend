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
import type { DeviceKeyStep } from "@/hooks/use-device-key-signin";

interface DeviceKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: DeviceKeyStep;
  setStep: (step: DeviceKeyStep) => void;
  deviceKey: string | null;
  isExisting: boolean;
  pastedKey: string;
  onPastedKeyChange: (value: string) => void;
  keyError: string | null;
  copied: boolean;
  onGenerate: () => void;
  onProvideKey: () => void;
  onSubmitProvidedKey: () => void;
  onCopy: () => void;
  onContinue: () => void;
}

// The "no device key yet — generate or provide one" dialog content, shared
// by the signup page's and topbar's sign-in buttons (see useDeviceKeySignIn).
export function DeviceKeyDialog({
  open, onOpenChange, step, setStep, deviceKey, isExisting, pastedKey, onPastedKeyChange,
  keyError, copied, onGenerate, onProvideKey, onSubmitProvidedKey, onCopy, onContinue,
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
                No device key found for this venue. Would you like to generate a new one or provide an existing key?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
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
              <Button variant="ghost" onClick={() => setStep("choose")}>
                Back
              </Button>
              <Button onClick={onSubmitProvidedKey}>
                Continue
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
                  ? "We found your existing device key. You're ready to continue."
                  : "Your device key is stored in your browser — as long as you don't clear your browser data, we'll read it from there automatically."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {isExisting
                  ? "This is the device key stored in your browser:"
                  : "You can save a copy of your key for safekeeping:"}
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
            </div>
            <DialogFooter>
              <Button onClick={onContinue} className="w-full sm:w-auto">
                Continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
