"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { gtmEvent } from "@/lib/utils";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loginWithToken = useAuthStore((x) => x.loginWithToken);
  const selectedVenueId = useVenues((state) => state.selectedVenueId);

  useEffect(() => {
    const token = searchParams.get("token");
    const did = searchParams.get("did");
    const venueId = searchParams.get("venueId") || selectedVenueId;

    if (token && did && venueId) {
      loginWithToken(venueId, token, did);
      gtmEvent.signUp('oauth');
      router.replace("/operations");
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
