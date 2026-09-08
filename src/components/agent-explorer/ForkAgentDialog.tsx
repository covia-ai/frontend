"use client";

import { useEffect, useState } from "react";
import { GitFork, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemedJsonEditor } from "@/components/ThemedJsonEditor";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { SUGGESTION_PLACEHOLDER_CLASS } from "@/lib/utils";

export type ForkAgentOptions = {
  agentId: string;
  includeTimeline: boolean;
  config?: Record<string, unknown>;
};

type ForkAgentDialogProps = {
  sourceAgentId: string;
  disabled?: boolean;
  forking: boolean;
  onFork: (
    options: ForkAgentOptions,
  ) => Promise<{ status: "created" | "failed"; agentId?: string }>;
};

// The buildable half of #171 (design question #171): clone-to-venue stays
// gated on the cross-venue auth decision and is out of scope here. This
// dialog only forks within the currently connected venue.
export function ForkAgentDialog({
  sourceAgentId,
  disabled,
  forking,
  onFork,
}: ForkAgentDialogProps) {
  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [includeTimeline, setIncludeTimeline] = useState(false);
  const [configOverride, setConfigOverride] = useState<Record<string, unknown>>({});
  const [showConfigOverride, setShowConfigOverride] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAgentId(`${sourceAgentId}-fork`);
    setIncludeTimeline(false);
    setConfigOverride({});
    setShowConfigOverride(false);
  }, [open, sourceAgentId]);

  const trimmedAgentId = agentId.trim();
  const isReserved = trimmedAgentId === DEFAULT_AGENT_ID;

  const handleFork = async () => {
    if (!trimmedAgentId || isReserved || forking) return;
    const result = await onFork({
      agentId: trimmedAgentId,
      includeTimeline,
      config: configOverride,
    });
    if (result.status === "created") setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          data-testid="fork-agent-trigger"
        >
          <GitFork size={14} className="mr-1" /> Fork
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fork &quot;{sourceAgentId}&quot;</DialogTitle>
          <DialogDescription>
            Creates a new agent from this one&apos;s config and state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fork-agent-id">New agent ID</Label>
            <Input
              id="fork-agent-id"
              data-testid="fork-agent-id"
              className={SUGGESTION_PLACEHOLDER_CLASS}
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            />
            {isReserved && (
              <p className="text-sm text-amber-500">
                &quot;{DEFAULT_AGENT_ID}&quot; is reserved. Choose another ID.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="fork-include-timeline"
              data-testid="fork-include-timeline"
              checked={includeTimeline}
              onCheckedChange={(checked) => setIncludeTimeline(checked === true)}
            />
            <Label htmlFor="fork-include-timeline" className="font-normal">
              Include timeline history
            </Label>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-sm font-normal text-muted-foreground hover:bg-transparent"
              onClick={() => setShowConfigOverride((v) => !v)}
              data-testid="fork-config-override-toggle"
            >
              {showConfigOverride ? "Hide config overrides" : "Override config (optional)"}
            </Button>
            {showConfigOverride && (
              <div className="rounded-md border p-2" data-testid="fork-config-override-editor">
                <ThemedJsonEditor
                  data={configOverride}
                  rootName="config"
                  editable
                  onChange={(data) =>
                    setConfigOverride(
                      typeof data === "object" && data !== null
                        ? (data as Record<string, unknown>)
                        : {},
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            data-testid="fork-agent-submit"
            onClick={handleFork}
            disabled={forking || !trimmedAgentId || isReserved}
          >
            {forking && <Loader2 size={14} className="mr-1 animate-spin" />}
            {forking ? "Forking…" : "Fork agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
