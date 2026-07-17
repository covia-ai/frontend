"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenue } from "@/hooks/use-venue";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loginWithToken = useAuthStore((x) => x.loginWithToken);
  const currentVenue = useVenue((x) => x.currentVenue);

  useEffect(() => {
    const token = searchParams.get("token");
    const did = searchParams.get("did");
    const venueId = searchParams.get("venueId") || currentVenue?.venueId;

    if (token && did && venueId) {
      loginWithToken(venueId, token, did);
      router.replace("/operations");
    } else {
      router.replace("/signUp");
    }
  }, [searchParams, loginWithToken, router, currentVenue]);

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
