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
    const token = searchParams.get("token");
    const did = searchParams.get("did");
    const venueId = searchParams.get("venueId") || selectedVenueId;
    const returnTo = safeReturnTo(searchParams.get("returnTo"));

    if (token && did && venueId) {
      loginWithToken(venueId, token, did);
      gtmEvent.signUp('oauth');
      // D070 §4 identity. The DID stands in for the spec's hashed email,
      // which this app never sees — see the note in lib/analytics.
      void identify(did, { auth_method: 'oauth' });
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
