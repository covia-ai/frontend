"use client";

import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import { useDeviceKeySignIn } from "@/hooks/use-device-key-signin";

export const SignupSignInButton = () => {
  const {
    dialogOpen, setDialogOpen, openDialog, step, setStep, deviceKey, isExisting,
    pastedKey, keyError, copied, handleGenerate, handleProvideKey,
    handlePastedKeyChange, handleSubmitProvidedKey, handleCopy, handleContinue,
  } = useDeviceKeySignIn({ trackSignUp: true });

  return (
    <>
      <div className="flex flex-col items-center justify-center dark:bg-background">
        <Button
          aria-label="signin"
          role="button"
          variant="outline"
          className="my-2 w-64"
          onClick={openDialog}
        >
          <Key className="mr-1 h-4 w-4" />Sign In
        </Button>
      </div>

      <DeviceKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        step={step}
        setStep={setStep}
        deviceKey={deviceKey}
        isExisting={isExisting}
        pastedKey={pastedKey}
        onPastedKeyChange={handlePastedKeyChange}
        keyError={keyError}
        copied={copied}
        onGenerate={handleGenerate}
        onProvideKey={handleProvideKey}
        onSubmitProvidedKey={handleSubmitProvidedKey}
        onCopy={handleCopy}
        onContinue={handleContinue}
      />
    </>
  );
};
