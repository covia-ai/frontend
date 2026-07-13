"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronRight, KeyRound, Globe, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { Ed25519Auth, type DIDDocument } from "@covia/covia-sdk";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="bg-muted flex-1 rounded-md px-3 py-2 text-xs font-mono break-all select-all">
          {value}
        </code>
        <Button variant="outline" size="icon" onClick={copy} className="shrink-0">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuthStore((x) => x.auth);
  const venue = useAuthenticatedVenue();

  const [didDocument, setDidDocument] = useState<DIDDocument | null>(null);
  const [didDocError, setDidDocError] = useState(false);

  useEffect(() => {
    if (!auth) {
      router.push("/signUp");
    }
  }, [auth, router]);

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

  if (!auth) return null;

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <h2 className="text-2xl font-thin mb-4">
          Your{" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            profile
          </span>
        </h2>

        <div className="border rounded-lg p-4 mb-6 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <KeyRound size={16} className="text-blue-500" />
            Your Identity
          </h3>
          <CopyField label="DID" value={auth.did} />
          <div>
            <p className="text-sm text-muted-foreground mb-1">Login type</p>
            <p className="text-sm">
              {auth.type === "keypair" ? "Device Key (Ed25519)" : "Bearer Token (OAuth)"}
            </p>
          </div>
          {publicKeyHex && <CopyField label="Public Key" value={publicKeyHex} />}
        </div>

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
      </div>
    </ContentLayout>
  );
}
