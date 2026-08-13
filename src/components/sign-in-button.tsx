"use client";

import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import { useDeviceKeySignIn } from "@/hooks/use-device-key-signin";
import { OAuthSignInButtons } from "@/components/OAuthSignInButtons";

export const SignupSignInButton = () => {
  const {
    dialogOpen, setDialogOpen, openDialog, step, setStep, deviceKey, deviceKeyDid,
    isExisting, pastedKey, keyError, copied, checking, authError, storedKeys,
    handleGenerate, handleProvideKey, handlePastedKeyChange,
    handleSubmitProvidedKey, handleCopy, handleContinue,
    handleUseStoredKey, handleUseDifferentKey,
  } = useDeviceKeySignIn({ trackSignUp: true });

  return (
    <>
      <div className="flex flex-col items-center justify-center dark:bg-background">
        <OAuthSignInButtons />
        <Button
          aria-label="signin"
          role="button"
          variant="outline"
          className="my-2 w-64"
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
