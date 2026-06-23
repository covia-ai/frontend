"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogInIcon, Copy, Check, Key, Plus, Import, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { useState } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenue } from "@/hooks/use-venue";
import { useVenues } from "@/hooks/use-venues";
import { generateKeyPair, privateKeyToHex, KeyPairAuth } from "@covia/covia-sdk";

export function SignInButton(props: any) {
  const auth = useAuthStore((x) => x.auth);
  const logout = useAuthStore((x) => x.logout);
  const loginWithKeypair = useAuthStore((x) => x.loginWithKeypair);
  const getDeviceKeyHex = useAuthStore((x) => x.getDeviceKeyHex);
  const setDeviceKeyHex = useAuthStore((x) => x.setDeviceKeyHex);
  const currentVenue = useVenue((x) => x.currentVenue);
  const venues = useVenues((x) => x.venues);
  const router = useRouter();

  const [openKeyboadShortcut, setOpenKeyboardShortcut] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  // "choose" = pick generate vs provide, "show" = display key with copy, "provide" = paste your own key
  const [step, setStep] = useState<"choose" | "show" | "provide">("choose");
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [isExisting, setIsExisting] = useState(false);
  const [pastedKey, setPastedKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const closeDialog = () => {
    setOpenKeyboardShortcut(false);
  };
  const copyDid = () => {
    if (!auth) return;
    navigator.clipboard.writeText(auth.did);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    setDeviceKeyHex(trimmed);
    const authObj = KeyPairAuth.fromHex(trimmed);
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
    const authObj = KeyPairAuth.fromHex(deviceKey);
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
          <DialogContent className="sm:max-w-md">
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
            <Avatar>
              <AvatarFallback>{auth.did.slice(-2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit mr-8">
            <DropdownMenuLabel className="truncate max-w-[200px]">{auth.did}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copyDid} className="items-start text-center hover:bg-primary-vlight">
              {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
              {copied ? "Copied!" : "Copy DID"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setOpenKeyboardShortcut(true)} className="items-start text-center hover:bg-primary-vlight">
              Keyboard Shortcuts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="items-start text-center hover:bg-primary-vlight">
              <div
                onClick={() => { logout(); router.push("/"); }}
                className="text-sm "
              >
                Sign Out
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={openKeyboadShortcut} onOpenChange={closeDialog}>
          <DialogContent className="bg-card text-card-foreground font-thin">
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <hr />

            <div className="flex flex-row items-start justify-between text-sm">
              <div className="text-center">Sidebar Toggle</div>
              <div className="text-center"><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">Cltr</span><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">b</span></div>
            </div>
            <div className="flex flex-row items-start justify-between text-sm">
              <div className="text-center">Theme Toggle</div>
              <div className="text-center"><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">Cltr</span><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">x</span></div>
            </div>

            <div className="flex flex-row items-start justify-between text-sm">
              <div className="text-center">On asset page - Add new asset</div>
              <div className="text-center"><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">Cltr</span><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">a</span></div>
            </div>
            <div className="flex flex-row items-start justify-between text-sm">
              <div className="text-center">On venue page - Add new venue</div>
              <div className="text-center"><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">Cltr</span><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">v</span></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

}
