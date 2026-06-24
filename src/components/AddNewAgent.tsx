"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Iconbutton } from "./Iconbutton";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { LLM_PROVIDERS } from "@/config/llm-providers";
import { Check, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface AddNewAgentProps {
  trigger?: React.ReactNode;
  initialAgentName?: string;
  initialSystemPrompt?: string;
  initialProvider?: string;
  onCreated?: () => void;
}

export function AddNewAgent({
  trigger,
  initialAgentName = "",
  initialSystemPrompt = "",
  initialProvider = "anthropic",
  onCreated,
}: AddNewAgentProps = {}) {
  const [agentName, setAgentName] = useState(initialAgentName);
  const [llmProvider, setLlmProvider] = useState(initialProvider);
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [initialCommand, setInitialCommand] = useState("");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);

  const venue = useAuthenticatedVenue();

  useEffect(() => {
    if (!open) return;
    setAgentName(initialAgentName);
    setSystemPrompt(initialSystemPrompt);
    setLlmProvider(initialProvider);
    setInitialCommand("");
    if (!venue) return;
    venue.secrets
      .list()
      .then((secrets: string[]) => setAvailableKeys(secrets))
      .catch(() => setAvailableKeys([]));
  }, [open, venue, initialAgentName, initialSystemPrompt, initialProvider]);

  const isProviderReady = (providerId: string) => {
    const provider = LLM_PROVIDERS[providerId];
    if (!provider) return false;
    if (!provider.requiresKey) return true;
    return availableKeys.includes(provider.secretKey);
  };

  const handleNewAgent = async () => {
    if (!venue || !agentName.trim()) {
      toast("Please enter an agent name");
      return;
    }
    setCreating(true);
    try {
      const provider = LLM_PROVIDERS[llmProvider];
      const result = await venue.agents.create({
        agentId: agentName,
        config: {
          operation: "v/ops/llmagent/chat",
          llmOperation: provider.operation,
          ...(systemPrompt.trim() && { systemPrompt: systemPrompt.trim() }),
        },
      });

      if (initialCommand.trim()) {
        await venue.agents.request(result.agentId, { task: initialCommand.trim() });
      }

      toast("Agent created", {
        description: `Agent "${result.agentId}" is now ${result.status}`,
      });
      setAgentName("");
      setSystemPrompt("");
      setInitialCommand("");
      setOpen(false);
      onCreated?.();
    } catch {
      toast("Unable to create agent");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Iconbutton
            icon={PlusCircledIcon}
            message="Create a new agent"
            label="Create a new agent"
          />
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col bg-card max-h-[85vh] overflow-y-auto">
        <DialogTitle className="space-y-2">
          <Label className="text-md">Create a new agent</Label>
          <Separator />
        </DialogTitle>

        <div className="flex flex-col items-start justify-center space-y-6">
          {/* Agent Name */}
          <div className="space-y-2 w-full">
            <Label htmlFor="agent-name" className="w-32 text-sm">
              Agent Name:
            </Label>
            <Input
              data-testid="agent-name"
              placeholder="e.g., Customer Support Agent"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
          </div>

          {/* LLM Provider */}
          <div className="space-y-2 w-full">
            <Label>LLM Provider:</Label>
            <Select value={llmProvider} onValueChange={setLlmProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LLM_PROVIDERS).map(([id, provider]) => (
                  <SelectItem key={id} value={id}>
                    <span className="flex items-center gap-2">
                      {provider.label}
                      {isProviderReady(id) && (
                        <Check size={14} className="text-green-500" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isProviderReady(llmProvider) && LLM_PROVIDERS[llmProvider]?.requiresKey && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle size={12} />
                No API key found for this provider.{" "}
                <Link href="/secrets" className="underline">
                  Add one in Secrets
                </Link>
              </p>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-2 w-full">
            <Label htmlFor="system-prompt">System Prompt:</Label>
            <Textarea
              id="system-prompt"
              placeholder="e.g., You are a helpful customer support agent that..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="text-sm w-full"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Instructions that define the agent&apos;s behavior and persona.
            </p>
          </div>

          {/* Initial Command */}
          <div className="space-y-2 w-full">
            <Label htmlFor="initial-command">Initial Command:</Label>
            <Input
              id="initial-command"
              placeholder="e.g., Greet the user and ask how you can help"
              value={initialCommand}
              onChange={(e) => setInitialCommand(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              First task to send to the agent after creation.
            </p>
          </div>
        </div>

        <Button
          aria-label="create agent"
          role="button"
          data-testid="create-agent"
          onClick={handleNewAgent}
          disabled={creating || !agentName.trim()}
          className="btn-sm mt-2"
        >
          {creating ? "Creating..." : "Create"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
