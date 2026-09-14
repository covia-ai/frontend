"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Fingerprint, KeyRound } from "lucide-react";
import { SignupSignInButton } from "@/components/sign-in-button";
import { DidDisplay } from "@/components/DidDisplay";
import { useCurrentAuth } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { venueDisplayName } from "@/lib/venue-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// The auth entry (#2C). A centered auth shell — a single form column on
// mobile/tablet, a two-column split on lg+ where a branded panel replaces the
// empty muted half-screen the legacy page shipped. Both the signed-out and
// signed-in states render inside this same shell.
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Brand panel — lg+ only. Deliberately dark in both themes (a front-door
          moment), so its colours are fixed rather than token-driven. */}
      <aside className="relative hidden overflow-hidden bg-[#1E2642] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 120% at 100% 0%, rgba(124,92,255,.30), transparent 55%), radial-gradient(60% 50% at 12% 100%, rgba(125,110,242,.28), transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <Image src="/Covia_logo_icon_transparent.png" width={34} height={34} alt="Covia" priority />
          <span className="text-lg font-bold tracking-tight">Covia</span>
        </div>
        <div className="relative">
          <h2 className="max-w-[15ch] text-[26px] font-semibold leading-tight tracking-tight">
            The management layer for the synthetic workforce.
          </h2>
          <p className="mt-3 max-w-[34ch] text-sm text-white/70">
            Sign in to govern how your agents act — rules, memory, coordination,
            and a durable record of every action.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-4 text-xs text-white/55">
          <span className="flex items-center gap-1.5">
            <Fingerprint size={14} /> Cryptographic identity
          </span>
          <span className="flex items-center gap-1.5">
            <KeyRound size={14} /> Device-key or SSO
          </span>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

// The mobile brand mark — the panel is lg-only, so the form column needs its own
// Covia mark on smaller screens.
function MobileBrandMark() {
  return (
    <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
      <Image src="/Covia_logo_icon_transparent.png" width={28} height={28} alt="Covia" />
      <span className="text-base font-bold tracking-tight text-foreground">Covia</span>
    </div>
  );
}

export default function SignUp() {
  const auth = useCurrentAuth();
  const venueName = useVenues((s) => {
    const venue = s.venues.find((v) => v.venueId === s.selectedVenueId);
    return venue ? venueDisplayName(venue, s.selectedVenueId ?? undefined) : null;
  });

  if (!auth) {
    return (
      <AuthShell>
        <MobileBrandMark />
        <Card className="p-6">
          <div className="mb-5 text-center">
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to this venue with a provider or a device key.
            </p>
          </div>

          {venueName && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-secondary/10 p-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                <Building2 size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-none text-muted-foreground">Signing in to</p>
                <p className="truncate text-sm font-semibold text-foreground">{venueName}</p>
              </div>
              <Link href="/venues" className="shrink-0 text-xs font-semibold text-primary hover:underline">
                Change
              </Link>
            </div>
          )}

          <SignupSignInButton />

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By continuing, you agree to the Covia{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">Terms</Link>{" "}
            and{" "}
            <Link href="/privacypolicy" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <MobileBrandMark />
      <Card className="p-6 text-center">
        <div className="mb-3 flex justify-center">
          <DidDisplay value={auth.did} />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">You&apos;re signed in</h1>
        <div className="mt-2">
          <Badge variant="outline">{auth.type === "keypair" ? "Device Key" : "OAuth"}</Badge>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/">
              Continue to dashboard <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/profile">Manage identities</Link>
          </Button>
        </div>
      </Card>
    </AuthShell>
  );
}
