"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { gtmEvent } from "@/lib/utils";
import { identify } from "@/lib/analytics";
import { safeReturnTo } from "@/lib/oauth";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loginWithToken = useAuthStore((x) => x.loginWithToken);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);

  useEffect(() => {
    // The venue redirects here with the JWT in the query string, and that JWT
    // carries the user's email and name in a readable (base64url, unencrypted)
    // payload. Clear it from the address bar and the current history entry
    // before doing anything else, so a credential-and-PII-bearing URL is live
    // for as short a time as possible and does not persist if the sign-in
    // below fails and we never navigate away. `searchParams` was captured on
    // render, so this does not affect the values read below.
    window.history.replaceState(null, "", window.location.pathname);

    const token = searchParams.get("token");
    const did = searchParams.get("did");
    const venueId = searchParams.get("venueId") || selectedVenueId;
    const returnTo = safeReturnTo(searchParams.get("returnTo"));

    if (token && did && venueId) {
      loginWithToken(venueId, token, did);
      // D070 §4 identity. The token carries the venue's `email` claim, which
      // is what produces the same user_id as covia.ai and Brevo. It is hashed
      // in memory and never stored or sent; see lib/analytics.
      //
      // Identify resolves before the login event is reported, so the event
      // carries user_id. Not awaited, so the redirect below is never delayed;
      // `finally` so the event still fires if identify fails.
      void identify({ did, token }, { auth_method: 'oauth' }).finally(() => {
        gtmEvent.signUp('oauth');
      });
      router.replace(returnTo);
    } else {
      router.replace("/signUp");
    }
  }, [searchParams, loginWithToken, router, selectedVenueId]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Signing in...</p>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Signing in...</p></div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}
