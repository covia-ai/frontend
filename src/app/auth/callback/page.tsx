"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { gtmEvent } from "@/lib/utils";
import { identify } from "@/lib/analytics";
import { notifyError } from "@/lib/notify";
import { readOAuthCallback } from "@/lib/oauth";

function SigningIn() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Signing in...</p>
    </div>
  );
}

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Clearing the URL below changes `searchParams`, which would re-run the
  // effect against an empty query and race a second redirect against the first.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Remove the one-use code (and any obsolete token-bearing query) before
    // network requests or analytics. Keep a snapshot for this one exchange.
    const params = new URLSearchParams(searchParams.toString());
    window.history.replaceState(null, "", window.location.pathname);

    void (async () => {
      if (!useVenues.persist.hasHydrated()) await useVenues.persist.rehydrate();
      const callback = await readOAuthCallback(params, (venueId) =>
        useVenues.getState().venues.find((venue) => venue.venueId === venueId)?.baseUrl,
      );
      if (callback.status !== "accepted") {
        if (callback.status === "rejected") notifyError("Unable to sign in", callback.reason);
        router.replace("/signUp");
        return;
      }
      const { venueId, token, did, returnTo } = callback;
      useAuthStore.getState().loginWithToken(venueId, token, did);
      // Only the derived analytics identity leaves this call; never the token.
      void identify({ did, token }, { auth_method: "oauth" }).finally(() => {
        gtmEvent.signUp("oauth");
      });
      router.replace(returnTo);
    })();
  }, [searchParams, router]);

  return <SigningIn />;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<SigningIn />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
