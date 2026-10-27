"use client";

import { useState } from "react";
import { Pause } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** The venue keeps at most this much of a stop's reason (covia#590). */
export const MAX_SUSPEND_REASON = 512;

type SuspendAgentDialogProps = {
  agentId: string;
  onSuspend: (reason?: string) => void;
};

// Suspending records who stopped the agent and, since covia 0.10, why
// (covia#590) — the reason then shows wherever the agent reads as suspended.
export function SuspendAgentDialog({ agentId, onSuspend }: SuspendAgentDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="suspend-agent-trigger">
          <Pause size={14} className="mr-1" /> Suspend
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* Mounted only while open, so each open starts with an empty reason. */}
        <SuspendAgentForm agentId={agentId} onSuspend={onSuspend} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SuspendAgentForm({ agentId, onSuspend }: SuspendAgentDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Suspend &quot;{agentId}&quot;?</AlertDialogTitle>
        <AlertDialogDescription>
          It stops taking work until it is resumed. Its state, sessions and history are kept.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suspend-reason">Reason (optional)</Label>
        <Input
          id="suspend-reason"
          data-testid="suspend-agent-reason"
          value={reason}
          maxLength={MAX_SUSPEND_REASON}
          placeholder="Shown to anyone who sees the agent suspended"
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction data-testid="suspend-agent-confirm" onClick={() => onSuspend(reason)}>
          Suspend
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
