"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ChevronRight, KeyRound, Globe, ExternalLink, Eye, EyeOff } from "lucide-react";
import { DidDisplay } from "@/components/DidDisplay";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentAuth, useAuthStore } from "@/hooks/use-auth";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { Ed25519Auth, type DIDDocument } from "@covia/covia-sdk";
import { PageHeading } from "@/components/PageHeading";
import { AccountsPanel } from "@/components/AccountsPanel";
import { IdentityTokenButton } from "@/components/IdentityTokenButton";
import { KeysPanel } from "@/components/KeysPanel";
import { NotificationLog } from "@/components/NotificationLog";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Like CopyField, but concealed by default: the value renders as dots until
// explicitly revealed. Copy works without revealing (clipboard gets the real
// value), so the common path never puts the key on screen.
function SecretCopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code data-testid="secret-field-value" className="bg-muted flex-1 rounded-md px-3 py-2 text-xs font-mono break-all select-all">
          {revealed ? value : "•".repeat(48)}
        </code>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="secret-field-reveal"
              variant="outline"
              size="icon"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "Hide" : "Show"}
              className="shrink-0"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{revealed ? "Hide private key" : "Show private key"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copy private key" className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy private key"}</TooltipContent>
        </Tooltip>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Anyone with this key can act as you. Never share it.
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const auth = useCurrentAuth();
  const venue = useAuthenticatedVenue();
  // Accounts are per-venue, so "not signed in on the selected venue" is not
  // the same as "not signed in at all" — only the latter leaves the page.
  const hasAnyAccount = useAuthStore(
    (state) =>
      Object.keys(state.accountsMap).length > 0 ||
      Object.keys(state.authMap).length > 0 ||
      state.deviceKeys.length > 0,
  );

  const [didDocument, setDidDocument] = useState<DIDDocument | null>(null);
  const [didDocError, setDidDocError] = useState(false);

  useEffect(() => {
    if (!auth && !hasAnyAccount) {
      router.push("/signUp");
    }
  }, [auth, hasAnyAccount, router]);

  useEffect(() => {
    if (!venue) return;
    venue.didDocument().then(setDidDocument).catch(() => setDidDocError(true));
  }, [venue]);

  const publicKeyHex = useMemo(() => {
    if (!auth || auth.type !== "keypair") return null;
    try {
      return toHex(Ed25519Auth.fromHex(auth.privateKeyHex).getPublicKey());
    } catch {
      return null;
    }
  }, [auth]);

  if (!auth && !hasAnyAccount) return null;

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Your" highlight="profile" />

        <Tabs defaultValue="identity">
          <TabsList className="mb-4">
            <TabsTrigger value="identity" data-testid="profile-tab-identity">Identity</TabsTrigger>
            <TabsTrigger value="logins" data-testid="profile-tab-logins">Logins</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="profile-tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="keys" data-testid="profile-tab-keys">Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="space-y-6">
            {auth ? (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound size={16} className="text-blue-500" />
                  Your Identity
                  {venue && (
                    <span className="text-xs font-normal text-muted-foreground">
                      on {venue.metadata?.name ?? venue.venueId}
                    </span>
                  )}
                </h3>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">DID</p>
                  <DidDisplay value={auth.did} chars="full" iconSize={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Login type</p>
                  <p className="text-sm">
                    {auth.type === "keypair" ? "Device Key (Ed25519)" : "Bearer Token (OAuth)"}
                  </p>
                </div>
                {venue?.venueId && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Identity token</p>
                    <IdentityTokenButton venueId={venue.venueId} account={auth} variant="button" />
                    <p className="text-xs text-muted-foreground mt-1">
                      A bearer token proving this identity to the venue&apos;s API — for curl,
                      CLI tools, or agent configs.
                      {auth.type === "keypair" && " Minted tokens are usable only at this venue and expire after the chosen duration."}
                    </p>
                  </div>
                )}
                {publicKeyHex && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Public Key</p>
                    <DidDisplay value={publicKeyHex} chars="full" iconSize={20} />
                  </div>
                )}
                {auth.type === "keypair" && (
                  <SecretCopyField label="Private Key" value={auth.privateKeyHex} />
                )}
              </div>
            ) : (
              <p
                data-testid="profile-no-venue-auth"
                className="border rounded-lg p-4 text-sm text-muted-foreground"
              >
                You are not signed in on the selected venue — pick an account on the
                Logins tab, use a key from the Keys tab, or sign in from the top bar.
              </p>
            )}

            {venue && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Globe size={16} className="text-blue-500" />
                  Venue Identity
                </h3>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Venue DID</p>
                  <code className="bg-muted block rounded-md px-3 py-2 text-xs font-mono break-all select-all">
                    {venue.venueId}
                  </code>
                </div>
                <a
                  href={`${venue.baseUrl}/.well-known/did.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-1 w-fit hover:underline"
                >
                  View DID document
                  <ExternalLink size={12} />
                </a>

                {didDocument && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <ChevronRight size={16} className="transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                      DID Document
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="bg-muted mt-2 rounded-md p-3 text-xs font-mono overflow-x-auto">
                        {JSON.stringify(didDocument, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                {didDocError && (
                  <p className="text-sm text-destructive">Could not load the venue&apos;s DID document.</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logins">
            <AccountsPanel />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationLog />
          </TabsContent>

          <TabsContent value="keys">
            <KeysPanel />
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  );
}
