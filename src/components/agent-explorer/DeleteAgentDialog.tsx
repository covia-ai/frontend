"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DeleteAgentDialogProps = {
  agentId: string;
  onDelete: (remove: boolean) => void;
};

// #352: Delete used to silently terminate (keep the record, keep the name
// reserved) with no way to tell the user, so a same-named recreate failed
// with an unexplained "already exists". Now the two outcomes are explicit,
// and permanent removal sits behind its own confirmation step.
export function DeleteAgentDialog({ agentId, onDelete }: DeleteAgentDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    if (!open) setConfirmingRemove(false);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
          data-testid="delete-agent-trigger"
        >
          <Trash2 size={14} className="mr-1" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {confirmingRemove ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Permanently remove &quot;{agentId}&quot;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This deletes the record entirely and frees the name for
                reuse. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setConfirmingRemove(false)}>
                Back
              </Button>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                data-testid="delete-agent-confirm-remove"
                onClick={() => onDelete(true)}
              >
                Remove permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete agent &quot;{agentId}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                Terminating keeps the record for audit but reserves the
                name, so recreating an agent with this ID will fail until
                it&apos;s removed permanently.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-col">
              <AlertDialogAction
                className="w-full"
                data-testid="delete-agent-terminate"
                onClick={() => onDelete(false)}
              >
                Terminate (keep record)
              </AlertDialogAction>
              <Button
                variant="outline"
                className="w-full"
                data-testid="delete-agent-remove-step"
                onClick={(e) => {
                  e.preventDefault();
                  setConfirmingRemove(true);
                }}
              >
                Remove permanently (frees the name)
              </Button>
              <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
