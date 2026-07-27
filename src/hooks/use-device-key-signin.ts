"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateKeyPair, privateKeyToHex, Ed25519Auth } from "@covia/covia-sdk";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { gtmEvent } from "@/lib/utils";

export type DeviceKeyStep = "choose" | "show" | "provide";

// The "no device key yet — generate a new one or provide an existing one"
// flow, previously hand-rolled near-identically in the signup page's and
// topbar's sign-in buttons. trackSignUp preserves each caller's original
// analytics behavior (only the signup flow fired a GTM event).
export function useDeviceKeySignIn(options: { trackSignUp?: boolean } = {}) {
  const { trackSignUp = false } = options;
  const loginWithKeypair = useAuthStore((x) => x.loginWithKeypair);
  const getDeviceKeyHex = useAuthStore((x) => x.getDeviceKeyHex);
  const setDeviceKeyHex = useAuthStore((x) => x.setDeviceKeyHex);
  const venues = useVenues((x) => x.venues);
  const selectedVenueId = useVenues((x) => x.selectedVenueId);
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<DeviceKeyStep>("choose");
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [isExisting, setIsExisting] = useState(false);
  const [pastedKey, setPastedKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const openDialog = () => {
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
    setDeviceKey(privateKeyToHex(privateKey));
    setStep("show");
  };

  const handleProvideKey = () => {
    setPastedKey("");
    setKeyError(null);
    setStep("provide");
  };

  const handlePastedKeyChange = (value: string) => {
    setPastedKey(value);
    setKeyError(null);
  };

  const completeLogin = (key: string) => {
    const venueId = selectedVenueId || venues[0]?.venueId;
    if (!venueId) {
      console.error("No venue available for keypair login");
      return;
    }
    if (trackSignUp) gtmEvent.signUp('keypair');
    setDeviceKeyHex(key);
    const auth = Ed25519Auth.fromHex(key);
    loginWithKeypair(venueId, key, auth.getDID());
    setDialogOpen(false);
    router.push("/operations");
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
    completeLogin(trimmed);
  };

  const handleCopy = () => {
    if (deviceKey) {
      navigator.clipboard.writeText(deviceKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    if (!deviceKey) return;
    completeLogin(deviceKey);
  };

  return {
    dialogOpen, setDialogOpen, openDialog,
    step, setStep,
    deviceKey, isExisting, pastedKey, keyError, copied,
    handleGenerate, handleProvideKey, handlePastedKeyChange,
    handleSubmitProvidedKey, handleCopy, handleContinue,
  };
}
