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

    // The venue redirects here with the JWT in the query string, and that JWT
    // carries the user's email and name in a readable (base64url, unencrypted)
    // payload. Clear it from the address bar and the current history entry
    // before doing anything else, so a credential-and-PII-bearing URL is live
    // for as short a time as possible and does not persist if the sign-in
    // below fails and we never navigate away.
    window.history.replaceState(null, "", window.location.pathname);

    const callback = readOAuthCallback(searchParams, (venueId) =>
      useVenues.getState().venues.some((venue) => venue.venueId === venueId),
    );

    if (callback.status !== "accepted") {
      if (callback.status === "rejected") notifyError("Unable to sign in", callback.reason);
      router.replace("/signUp");
      return;
    }

    const { venueId, token, did, returnTo } = callback;
    useAuthStore.getState().loginWithToken(venueId, token, did);
    // D070 §4 identity. The token carries the venue's `email` claim, which
    // is what produces the same user_id as covia.ai and Brevo. It is hashed
    // in memory and never stored or sent; see lib/analytics.
    //
    // Identify resolves before the login event is reported, so the event
    // carries user_id. Not awaited, so the redirect below is never delayed;
    // `finally` so the event still fires if identify fails.
    void identify({ did, token }, { auth_method: "oauth" }).finally(() => {
      gtmEvent.signUp("oauth");
    });
    router.replace(returnTo);
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
