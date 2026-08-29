"use client";

import { useState } from "react";
import { Ed25519Auth, generateKeyPair, privateKeyToHex } from "@covia/covia-sdk";
import { gtmEvent } from "@/lib/utils";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { notifySuccess, notifyWarning } from "@/lib/notify";
import { DidDisplay } from "@/components/DidDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";

function didForKey(hex: string): string | null {
  try {
    return Ed25519Auth.fromHex(hex).getDID();
  } catch {
    return null;
  }
}

// Local Ed25519 keypairs known to this browser (profile → Keys tab). The
// default key is what the sign-in dialog offers first; any key can be used to
// sign in on the selected venue directly from here. Keys live only in
// localStorage — removing one here cannot be undone unless it was exported.
export function KeysPanel() {
  const deviceKeys = useAuthStore((state) => state.deviceKeys);
  const deviceKeyHex = useAuthStore((state) => state.deviceKeyHex);
  const addDeviceKey = useAuthStore((state) => state.addDeviceKey);
  const removeDeviceKey = useAuthStore((state) => state.removeDeviceKey);
  const setDeviceKeyHex = useAuthStore((state) => state.setDeviceKeyHex);
  const loginWithKeypair = useAuthStore((state) => state.loginWithKeypair);
  const authMap = useAuthStore((state) => state.authMap);
  const venues = useVenues((state) => state.venues);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);

  const [importHex, setImportHex] = useState("");

  const venueLabel = (venueId: string) =>
    venues.find((venue) => venue.venueId === venueId)?.metadata?.name ?? venueId;

  // Venues currently signed in with a given key — shows what a removal touches.
  // A venueId with no entry in the venues list is an orphaned sign-in (removed
  // or replaced venue); its raw id is a DID that reads like a key, so count
  // those instead of listing them. They can be cleaned up on the Logins tab.
  const venuesUsing = (hex: string) => {
    const venueIds = Object.entries(authMap)
      .filter(([, auth]) => auth.type === "keypair" && auth.privateKeyHex === hex)
      .map(([venueId]) => venueId);
    const known = venueIds.filter((id) => venues.some((v) => v.venueId === id));
    const orphans = venueIds.length - known.length;
    const parts = known.map(venueLabel);
    if (orphans > 0) parts.push(`${orphans} removed venue${orphans === 1 ? "" : "s"}`);
    return parts;
  };

  const handleGenerate = () => {
    const { privateKey } = generateKeyPair();
    const hex = privateKeyToHex(privateKey);
    addDeviceKey(hex);
    gtmEvent.didIssued("user", "keys-panel");
    notifySuccess("New device key generated", {
      description: `${didForKey(hex)} — export a copy if you need it on another device.`,
    });
  };

  const handleImport = () => {
    const trimmed = importHex.trim();
    if (!trimmed) return;
    if (!didForKey(trimmed)) {
      notifyWarning("Invalid key", {
        description: "Expected a 64-character hex Ed25519 private key.",
      });
      return;
    }
    addDeviceKey(trimmed);
    setImportHex("");
    notifySuccess("Key imported", { description: didForKey(trimmed) ?? undefined });
  };

  const handleUseOnVenue = (hex: string) => {
    const did = didForKey(hex);
    if (!selectedVenueId || !did) {
      notifyWarning("Connect to a venue first");
      return;
    }
    loginWithKeypair(selectedVenueId, hex, did);
    notifySuccess(`Signed in to ${venueLabel(selectedVenueId)}`, { description: did });
  };

  const handleExport = (hex: string) => {
    void navigator.clipboard.writeText(hex);
    notifySuccess("Private key copied to clipboard", {
      description: "Anyone with this key can act as you. Paste it somewhere safe.",
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4" data-testid="keys-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <KeyRound size={16} className="text-blue-500" />
          Device Keys
        </h3>
        <Button size="sm" data-testid="key-generate" onClick={handleGenerate}>
          <Plus size={13} className="mr-1" /> Generate key
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Ed25519 keypairs stored in this browser. The default key is offered first at
        sign-in; the same key produces the same DID on every venue. Removing a key
        here is permanent unless you exported it.
      </p>

      {deviceKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No local keys yet — generate one, or import an existing private key below.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border border-border rounded-md">
          {deviceKeys.map((hex) => {
            const did = didForKey(hex);
            const isDefault = hex === deviceKeyHex;
            const usedBy = venuesUsing(hex);
            return (
              <li
                key={hex}
                data-testid="key-entry"
                data-did={did ?? ""}
                data-default={isDefault}
                className="flex flex-col gap-1 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  {did ? (
                    <DidDisplay value={did} className="flex-1" />
                  ) : (
                    <code className="font-mono text-xs flex-1 min-w-0">(unreadable key)</code>
                  )}
                  {isDefault ? (
                    <Badge className="text-xs shrink-0">default</Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="key-make-default"
                      onClick={() => setDeviceKeyHex(hex)}
                    >
                      Make default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="key-use"
                    disabled={!selectedVenueId}
                    onClick={() => handleUseOnVenue(hex)}
                  >
                    Use on this venue
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        data-testid="key-export"
                        aria-label="Copy private key"
                        onClick={() => handleExport(hex)}
                      >
                        <Copy size={13} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy private key (secret)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        data-testid="key-remove"
                        aria-label="Remove key"
                        onClick={() => removeDeviceKey(hex)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove key from this browser (permanent)</TooltipContent>
                  </Tooltip>
                </div>
                {usedBy.length > 0 && (
                  <p className="text-xs text-muted-foreground pl-6">
                    Signed in on: {usedBy.join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2 items-center">
        <Input
          data-testid="key-import-input"
          placeholder="Paste a private key (hex) to import…"
          value={importHex}
          onChange={(event) => setImportHex(event.target.value)}
          className="font-mono text-xs"
        />
        <Button
          variant="outline"
          data-testid="key-import"
          disabled={!importHex.trim()}
          onClick={handleImport}
        >
          Import
        </Button>
      </div>
    </div>
  );
}
