"use client";

import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import { useDeviceKeySignIn } from "@/hooks/use-device-key-signin";
import { OAuthSignInButtons } from "@/components/OAuthSignInButtons";
import { useOAuthSignInOptions } from "@/hooks/use-oauth-sign-in";

export const SignupSignInButton = () => {
  const {
    dialogOpen, setDialogOpen, openDialog, step, setStep, deviceKey, deviceKeyDid,
    isExisting, pastedKey, keyError, copied, checking, authError, storedKeys,
    handleGenerate, handleProvideKey, handlePastedKeyChange,
    handleSubmitProvidedKey, handleCopy, handleContinue,
    handleUseStoredKey, handleUseDifferentKey,
  } = useDeviceKeySignIn({ trackSignUp: true });

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
          onClick={openDialog}
        >
          <Key className="mr-1 h-4 w-4" />Continue with a device key
        </Button>
      </div>

      <DeviceKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        step={step}
        setStep={setStep}
        deviceKey={deviceKey}
        deviceKeyDid={deviceKeyDid}
        isExisting={isExisting}
        pastedKey={pastedKey}
        onPastedKeyChange={handlePastedKeyChange}
        keyError={keyError}
        copied={copied}
        checking={checking}
        authError={authError}
        storedKeys={storedKeys}
        onGenerate={handleGenerate}
        onProvideKey={handleProvideKey}
        onSubmitProvidedKey={handleSubmitProvidedKey}
        onCopy={handleCopy}
        onContinue={handleContinue}
        onUseStoredKey={handleUseStoredKey}
        onUseDifferentKey={handleUseDifferentKey}
      />
    </>
  );
};
