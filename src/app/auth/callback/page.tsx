"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";

export default function AuthCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loginWithToken = useAuthStore((x) => x.loginWithToken);

  useEffect(() => {
    const token = searchParams.get("token");
    const did = searchParams.get("did");

    if (token && did) {
      loginWithToken(token, did);
      router.replace("/operations");
    } else {
      router.replace("/signUp");
    }
  }, [searchParams, loginWithToken, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Signing in...</p>
    </div>
  );
}
