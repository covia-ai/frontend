"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generateKeyPair, privateKeyToHex, Ed25519Auth } from "@covia/covia-sdk";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { probeDeviceKeyAuth } from "@/lib/venue-auth-probe";
import { notifyWarning } from "@/lib/notify";
import { gtmEvent } from "@/lib/utils";

export type DeviceKeyStep = "choose" | "show" | "provide";
export type StoredKeyOption = { hex: string; did: string };

function didOf(hex: string): string | null {
  try {
    return Ed25519Auth.fromHex(hex).getDID();
  } catch {
    return null;
  }
}

// The "no device key yet — generate a new one or provide an existing one"
// flow, previously hand-rolled near-identically in the signup page's and
// topbar's sign-in buttons. trackSignUp preserves each caller's original
// analytics behavior (only the signup flow fired a GTM event).
//
// Before committing a sign-in, the key is probed against the venue
// (lib/venue-auth-probe): a venue that requires admission rejects unknown
// keys with 401/403, and without the probe the sign-in "succeeds" locally
// and every later call fails. A rejected key keeps the dialog open with the
// error and a path to a different key.
export function useDeviceKeySignIn(options: { trackSignUp?: boolean } = {}) {
  const { trackSignUp = false } = options;
  const loginWithKeypair = useAuthStore((x) => x.loginWithKeypair);
  const getDeviceKeyHex = useAuthStore((x) => x.getDeviceKeyHex);
  const setDeviceKeyHex = useAuthStore((x) => x.setDeviceKeyHex);
  const deviceKeys = useAuthStore((x) => x.deviceKeys);
  const venues = useVenues((x) => x.venues);
  const selectedVenueId = useVenues((x) => x.selectedVenueId);
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStepState] = useState<DeviceKeyStep>("choose");
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [isExisting, setIsExisting] = useState(false);
  const [pastedKey, setPastedKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const setStep = (next: DeviceKeyStep) => {
    setAuthError(null);
    setStepState(next);
  };

  // The identity of the key on the "show" step — what the dialog presents
  // instead of the raw private key for returning users.
  const deviceKeyDid = useMemo(
    () => (deviceKey ? didOf(deviceKey) : null),
    [deviceKey],
  );

  // Every readable keypair this browser knows, for the "use a stored key"
  // picker (managed on the profile's Keys tab).
  const storedKeys = useMemo<StoredKeyOption[]>(
    () =>
      deviceKeys.flatMap((hex) => {
        const did = didOf(hex);
        return did ? [{ hex, did }] : [];
      }),
    [deviceKeys],
  );

  const openDialog = () => {
    setAuthError(null);
    const existing = getDeviceKeyHex();
    if (existing) {
      setDeviceKey(existing);
      setIsExisting(true);
      setStepState("show");
    } else {
      setDeviceKey(null);
      setIsExisting(false);
      setPastedKey("");
      setKeyError(null);
      setStepState("choose");
    }
    setDialogOpen(true);
  };

  const handleGenerate = () => {
    const { privateKey } = generateKeyPair();
    setDeviceKey(privateKeyToHex(privateKey));
    setIsExisting(false);
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

  const completeLogin = async (key: string) => {
    const venueId = selectedVenueId || venues[0]?.venueId;
    if (!venueId) {
      notifyWarning("Connect to a venue before signing in");
      return;
    }
    const did = didOf(key);
    if (!did) {
      setKeyError("Invalid key. Please check and try again.");
      return;
    }

    // Ask the venue whether it accepts this key before recording the login.
    // Without a descriptor there is no baseUrl to probe — proceed unverified.
    const descriptor = venues.find((venue) => venue.venueId === venueId);
    setAuthError(null);
    if (descriptor) {
      setChecking(true);
      const probe = await probeDeviceKeyAuth(descriptor.baseUrl, venueId, key);
      setChecking(false);
      if (!probe.ok && probe.kind === "rejected") {
        // Land on the show step (whatever step we came from) with the
        // rejected key's identity visible and a route to a different key.
        setDeviceKey(key);
        setIsExisting(true);
        setStepState("show");
        setAuthError(
          `${descriptor.metadata?.name ?? venueId} rejected this key (HTTP ${probe.status}). ` +
            `It may not be admitted on this venue — use a different key, or ask the venue operator to admit ${did}.`,
        );
        return;
      }
      if (!probe.ok) {
        notifyWarning("Couldn't verify this key against the venue", {
          description: probe.message,
        });
      }
    }

    if (trackSignUp) gtmEvent.signUp("keypair");
    setDeviceKeyHex(key);
    loginWithKeypair(venueId, key, did);
    setDialogOpen(false);
    // Only the dedicated /signUp page's button wants to land in the app on
    // success — the topbar's sign-in button can be opened from any page and
    // should leave the user right where they were.
    if (trackSignUp) router.push("/operations");
  };

  const handleSubmitProvidedKey = () => {
    const trimmed = pastedKey.trim();
    if (!trimmed) {
      setKeyError("Please enter a key.");
      return;
    }
    if (!didOf(trimmed)) {
      setKeyError("Invalid key. Please check and try again.");
      return;
    }
    setKeyError(null);
    void completeLogin(trimmed);
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
    void completeLogin(deviceKey);
  };

  // Sign in with one of the keypairs already stored in this browser.
  const handleUseStoredKey = (hex: string) => {
    void completeLogin(hex);
  };

  // Escape hatch when the current key is rejected (or just unwanted).
  const handleUseDifferentKey = () => {
    setPastedKey("");
    setKeyError(null);
    setStep("choose");
  };

  return {
    dialogOpen, setDialogOpen, openDialog,
    step, setStep,
    deviceKey, deviceKeyDid, isExisting, pastedKey, keyError, copied,
    checking, authError, storedKeys,
    handleGenerate, handleProvideKey, handlePastedKeyChange,
    handleSubmitProvidedKey, handleCopy, handleContinue,
    handleUseStoredKey, handleUseDifferentKey,
  };
}
