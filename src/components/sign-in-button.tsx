"use client";

import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import { useDeviceKeySignIn } from "@/hooks/use-device-key-signin";
import { OAuthSignInButtons } from "@/components/OAuthSignInButtons";
import { useOAuthSignInOptions } from "@/hooks/use-oauth-sign-in";

export const SignupSignInButton = () => {
  const signIn = useDeviceKeySignIn({ trackSignUp: true });

  // Providers are discovered per venue (OAuthSignInButtons renders nothing when a
  // venue advertises none — which is every current venue, see #394). When there's
  // no SSO the device key is the ONLY path, so it becomes the primary (filled)
  // action; when SSO is present it sits under the "or" as a secondary option.
  const hasOAuth = useOAuthSignInOptions().length > 0;

  return (
    <>
      <div className="flex flex-col items-center justify-center">
        <OAuthSignInButtons />
        <Button
          variant={hasOAuth ? "outline" : "default"}
          className="w-64"
          onClick={signIn.openDialog}
        >
          <Key className="mr-1 h-4 w-4" />Continue with a device key
        </Button>
      </div>

      <DeviceKeyDialog signIn={signIn} />
    </>
  );
};
