"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/hooks/use-auth";
import { useVenues } from "@/hooks/use-venues";
import { writeTextToClipboard } from "@/lib/clipboard";
import { forgetAccountOnDevice, venuesForgottenWith } from "@/lib/forget-account";
import { notifyError, notifySuccess } from "@/lib/notify";
import { abbreviateDid } from "@/lib/utils";

type ForgetAccountDialogProps = {
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Confirms "Sign out and forget" for the active device-key account on a venue
// (#436). The key is one identity on every venue, so the dialog names every
// venue it signs out of, and offers an export first: without one, the
// identity can't be recovered.
export function ForgetAccountDialog({ venueId, open, onOpenChange }: ForgetAccountDialogProps) {
  const auth = useAuthStore((state) => state.authMap[venueId] ?? null);
  const venues = useVenues((state) => state.venues);

  if (!auth || auth.type !== "keypair") return null;

  const affected = venuesForgottenWith(venueId, auth);
  const named = affected
    .map((id) => venues.find((v) => v.venueId === id)?.metadata?.name)
    .filter((name): name is string => !!name);
  const unnamed = affected.length - named.length;
  const venueList = [
    ...named,
    ...(unnamed > 0 ? [`${unnamed} removed venue${unnamed === 1 ? "" : "s"}`] : []),
  ].join(", ");

  const handleExport = async () => {
    try {
      await writeTextToClipboard(auth.privateKeyHex);
      notifySuccess("Private key copied to clipboard", {
        description: "Anyone with this key can act as you. Paste it somewhere safe.",
      });
    } catch (error: unknown) {
      // The export is the only way back to this identity; never claim one that failed.
      notifyError("Unable to copy private key", error);
    }
  };

  const handleForget = () => {
    forgetAccountOnDevice(venueId);
    notifySuccess("Signed out and forgotten on this device", {
      description: abbreviateDid(auth.did),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="forget-account-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out and forget this device key?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                This deletes the private key for{" "}
                <span className="font-mono">{abbreviateDid(auth.did)}</span> from this
                browser and signs you out of every venue that uses it:{" "}
                <span data-testid="forget-account-venues">{venueList}</span>.
              </p>
              <p>
                It also clears the watched jobs, notifications and unsaved operation
                inputs kept here for those venues. Use this on a shared or public device.
              </p>
              <p className="font-medium text-foreground">
                The key can&apos;t be recovered unless you export it first. Without it,
                you lose access to this identity.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            data-testid="forget-account-export"
            onClick={handleExport}
            className="sm:mr-auto"
          >
            Export key first
          </Button>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="forget-account-confirm"
            onClick={handleForget}
            className={buttonVariants({ variant: "destructive" })}
          >
            Forget key
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
