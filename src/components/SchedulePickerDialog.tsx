"use client";

import { useState } from "react";
import { CalendarClock, Repeat } from "lucide-react";
import type { Venue } from "@covia/covia-sdk";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CADENCE_PRESETS, type CadencePreset } from "@/lib/schedules";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn, gtmEvent } from "@/lib/utils";

type Cadence = CadencePreset | "once";

const CADENCE_LABELS: Record<Cadence, string> = {
  once: "Once at…",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
};

const CADENCE_INTERVAL_NOUN: Record<CadencePreset, string> = {
  hourly: "hour",
  daily: "day",
  weekly: "week",
};

const CADENCE_ORDER: Cadence[] = ["once", "hourly", "daily", "weekly"];

interface SchedulePickerDialogProps {
  venue: Venue | null;
  // Reference of the operation to invoke when due (a catalog path/asset id —
  // whatever venue.operations.run's "operation" argument accepts elsewhere).
  operation: string;
  // Input passed to the operation when it fires.
  input: unknown;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
  triggerClassName?: string;
  disabled?: boolean;
  onScheduled?: () => void;
}

// Shared cadence picker mounted from both the operation run sheet
// (OperationInputForm) and the agent detail page (AgentChatPanel) — see
// covia-ai/frontend#230. No cron option: the venue doesn't support it yet
// (covia#408 stage 2, unscheduled) — don't build UI for a capability the
// backend can't fulfill, even as a disabled placeholder.
export function SchedulePickerDialog({
  venue,
  operation,
  input,
  triggerLabel = "Run on a schedule",
  triggerVariant = "outline",
  triggerSize = "default",
  triggerClassName = "w-auto whitespace-nowrap",
  disabled,
  onScheduled,
}: SchedulePickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [cadence, setCadence] = useState<Cadence>("once");
  const [atTime, setAtTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setCadence("once");
    setAtTime("");
    setError("");
  };

  function handleSubmit() {
    if (!venue) return;
    const payload: Record<string, unknown> = { operation, input };

    if (cadence === "once") {
      const time = atTime ? new Date(atTime).getTime() : NaN;
      if (Number.isNaN(time)) {
        setError("Pick a date and time.");
        return;
      }
      payload.time = time;
    } else {
      payload.repeat = { every: CADENCE_PRESETS[cadence] };
    }

    setError("");
    setSubmitting(true);
    gtmEvent.buttonClick("Create Schedule", operation);
    venue.operations
      .run("v/ops/scheduler/schedule", payload)
      .then(() => {
        notifySuccess("Schedule created", { receiptHref: "/jobs?tab=scheduled" });
        setOpen(false);
        reset();
        onScheduled?.();
      })
      .catch((err) => notifyError("Unable to create schedule", err))
      .finally(() => setSubmitting(false));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          type="button"
          className={cn("gap-1.5", triggerClassName)}
          disabled={disabled || !venue}
        >
          <CalendarClock size={14} />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
          <DialogDescription>
            Choose when this should run. A recurring schedule keeps firing on this cadence until
            you cancel it from the Scheduled tab.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={cadence} onValueChange={(value) => setCadence(value as Cadence)}>
          {CADENCE_ORDER.map((option) => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem value={option} id={`cadence-${option}`} />
              <Label htmlFor={`cadence-${option}`}>{CADENCE_LABELS[option]}</Label>
            </div>
          ))}
        </RadioGroup>

        {cadence === "once" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-time">Date and time</Label>
            <Input
              id="schedule-time"
              type="datetime-local"
              value={atTime}
              onChange={(event) => setAtTime(event.target.value)}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Repeat size={14} />
            First fire one interval from now, then every {CADENCE_INTERVAL_NOUN[cadence]}.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !venue}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
