"use client";

import { useState } from "react";
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
import { gtmEvent } from "@/lib/utils";
import { generateKeyPair, privateKeyToHex, KeyPairAuth } from "@covia/covia-sdk";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenue } from "@/hooks/use-venue";
import { useVenues } from "@/hooks/use-venues";
import { useRouter } from "next/navigation";

export const SignInButton = () => {
    const loginWithKeypair = useAuthStore((x) => x.loginWithKeypair);
    const getDeviceKeyHex = useAuthStore((x) => x.getDeviceKeyHex);
    const setDeviceKeyHex = useAuthStore((x) => x.setDeviceKeyHex);
    const currentVenue = useVenue((x) => x.currentVenue);
    const venues = useVenues((x) => x.venues);
    const router = useRouter();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [step, setStep] = useState<"choose" | "show" | "provide">("choose");
    const [deviceKey, setDeviceKey] = useState<string | null>(null);
    const [isExisting, setIsExisting] = useState(false);
    const [pastedKey, setPastedKey] = useState("");
    const [keyError, setKeyError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSignIn = () => {
      const existing = getDeviceKeyHex();
      if (existing) {
        setDeviceKey(existing);
        setIsExisting(true);
        setStep("show");
      } else {
        setDeviceKey(null);
        setIsExisting(false);
        setPastedKey("");
        setKeyError(null);
        setStep("choose");
      }
      setDialogOpen(true);
    };

    const handleGenerate = () => {
      const { privateKey } = generateKeyPair();
      const hex = privateKeyToHex(privateKey);
      setDeviceKey(hex);
      setStep("show");
    };

    const handleProvideKey = () => {
      setPastedKey("");
      setKeyError(null);
      setStep("provide");
    };

    const handleSubmitProvidedKey = () => {
      const trimmed = pastedKey.trim();
      if (!trimmed) {
        setKeyError("Please enter a key.");
        return;
      }
      try {
        KeyPairAuth.fromHex(trimmed);
      } catch {
        setKeyError("Invalid key. Please check and try again.");
        return;
      }
      setKeyError(null);
      const venueId = currentVenue?.venueId || venues[0]?.venueId;
      if (!venueId) {
        console.error("No venue available for keypair login");
        return;
      }
      gtmEvent.buttonClick('Sign Up', 'keypair');
      setDeviceKeyHex(trimmed);
      const auth = KeyPairAuth.fromHex(trimmed);
      loginWithKeypair(venueId, trimmed, auth.getDID());
      setDialogOpen(false);
      router.push("/operations");
    };

    const handleCopy = () => {
      if (deviceKey) {
        navigator.clipboard.writeText(deviceKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    const handleContinue = () => {
      const venueId = currentVenue?.venueId || venues[0]?.venueId;
      if (!venueId || !deviceKey) {
        console.error("No venue available for keypair login");
        return;
      }
      gtmEvent.buttonClick('Sign Up', 'keypair');
      setDeviceKeyHex(deviceKey);
      const auth = KeyPairAuth.fromHex(deviceKey);
      loginWithKeypair(venueId, deviceKey, auth.getDID());
      setDialogOpen(false);
      router.push("/operations");
    };

    return (
      <>
        <div className="flex flex-col items-center justify-center dark:bg-background">
          <Button
            aria-label="signin"
            role="button"
            variant="outline"
            className="my-2 w-64"
            onClick={handleSignIn}
          >
            <Key className="mr-1 h-4 w-4" />Sign In
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            {step === "choose" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Device Key
                  </DialogTitle>
                  <DialogDescription>
                    No device key found. Would you like to generate a new one or provide an existing key?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 pt-2">
                  <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={handleGenerate}>
                    <Plus className="h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <p className="font-medium">Generate a new key</p>
                      <p className="text-xs text-muted-foreground font-normal">We will create a new device key for you</p>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={handleProvideKey}>
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
                    onChange={(e) => { setPastedKey(e.target.value); setKeyError(null); }}
                    className="font-mono text-xs"
                  />
                  {keyError && <p className="text-sm text-destructive">{keyError}</p>}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" onClick={() => setStep("choose")}>
                    Back
                  </Button>
                  <Button onClick={handleSubmitProvidedKey}>
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
                      : "Your device key is stored in your browser \u2014 as long as you don't clear your browser data, we'll read it from there automatically."}
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
                    <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleContinue} className="w-full sm:w-auto">
                    Continue
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
};
