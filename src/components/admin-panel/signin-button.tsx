"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogInIcon, Copy, Check, Key, Plus, Import, Globe, CircleUserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger }from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { useState } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenue } from "@/hooks/use-venue";
import { useVenues } from "@/hooks/use-venues";
import { generateKeyPair, privateKeyToHex, Ed25519Auth } from "@covia/covia-sdk";

export function SignInButton(props: any) {
  const auth = useAuthStore((x) => x.auth);
  const logout = useAuthStore((x) => x.logout);
  const loginWithKeypair = useAuthStore((x) => x.loginWithKeypair);
  const getDeviceKeyHex = useAuthStore((x) => x.getDeviceKeyHex);
  const setDeviceKeyHex = useAuthStore((x) => x.setDeviceKeyHex);
  const currentVenue = useVenue((x) => x.currentVenue);
  const venues = useVenues((x) => x.venues);
  const router = useRouter();

  const [signInOpen, setSignInOpen] = useState(false);
  // "choose" = pick generate vs provide, "show" = display key with copy, "provide" = paste your own key
  const [step, setStep] = useState<"choose" | "show" | "provide">("choose");
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [isExisting, setIsExisting] = useState(false);
  const [pastedKey, setPastedKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  const handleSignInClick = () => {
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
    setSignInOpen(true);
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
      Ed25519Auth.fromHex(trimmed);
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
    setDeviceKeyHex(trimmed);
    const authObj = Ed25519Auth.fromHex(trimmed);
    loginWithKeypair(venueId, trimmed, authObj.getDID());
    setSignInOpen(false);
    router.push("/operations");
  };

  const handleCopyKey = () => {
    if (deviceKey) {
      navigator.clipboard.writeText(deviceKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    const venueId = currentVenue?.venueId || venues[0]?.venueId;
    if (!venueId || !deviceKey) {
      console.error("No venue available for keypair login");
      return;
    }
    setDeviceKeyHex(deviceKey);
    const authObj = Ed25519Auth.fromHex(deviceKey);
    loginWithKeypair(venueId, deviceKey, authObj.getDID());
    setSignInOpen(false);
    router.push("/operations");
  };

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
          onClick={handleSignInClick}
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

        <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
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
                  <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={handleGenerate}>
                    <Plus className="h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <p className="font-medium">Generate a new key</p>
                      <p className="text-xs text-muted-foreground font-normal">We&apos;ll create a new device key for you</p>
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
                    <Button variant="outline" size="icon" onClick={handleCopyKey} className="shrink-0">
                      {keyCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
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
