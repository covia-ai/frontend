"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
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
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface AddNewAgentProps {
  trigger?: React.ReactNode;
  initialAgentName?: string;
  initialSystemPrompt?: string;
  initialProvider?: string;
  onCreated?: () => void;
}

const CUSTOM_MODEL_OPTION = "__custom__";
const DEFAULT_MODEL_OPTION = "__default__";

const slugify = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

export function AddNewAgent({
  trigger,
  initialAgentName = "",
  initialSystemPrompt = "",
  initialProvider = "anthropic",
  onCreated,
}: AddNewAgentProps = {}) {
  const [agentName, setAgentName] = useState(initialAgentName);
  const [agentId, setAgentId] = useState("");
  const [agentIdEdited, setAgentIdEdited] = useState(false);
  const [llmProvider, setLlmProvider] = useState(initialProvider);
  // "" = venue default (model omitted from config); CUSTOM_MODEL_OPTION shows
  // a free-text input for ids not in the curated list.
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [initialCommand, setInitialCommand] = useState("");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);


  const venue = useAuthenticatedVenue();

  const resolvedAgentId = agentId.trim() || slugify(agentName);
  const isReservedAgentId = resolvedAgentId === DEFAULT_AGENT_ID;

  useEffect(() => {
    if (!open) return;
    setAgentName(initialAgentName);
    setAgentId(slugify(initialAgentName));
    setAgentIdEdited(false);
    setSystemPrompt(initialSystemPrompt);
    setLlmProvider(initialProvider);
    setModel("");
    setCustomModel("");
    setInitialCommand("");
    if (!venue) return;
    venue.secrets
      .list()
      .then((secrets: string[]) => setAvailableKeys(secrets))
      .catch(() => setAvailableKeys([]));
  }, [open, venue, initialAgentName, initialSystemPrompt, initialProvider]);

  // The model actually sent in the agent config; "" means omit (venue default).
  const resolvedModel =
    model === CUSTOM_MODEL_OPTION ? customModel.trim() : model === DEFAULT_MODEL_OPTION ? "" : model;

  const handleProviderChange = (providerId: string) => {
    setLlmProvider(providerId);
    // Model ids are provider-specific — a Claude id is meaningless on OpenAI.
    setModel("");
    setCustomModel("");
  };

  const isProviderReady = (providerId: string) => {
    const provider = LLM_PROVIDERS[providerId];
    if (!provider) return false;
    if (!provider.requiresKey) return true;
    return availableKeys.includes(provider.secretKey);
  };

  const handleNewAgent = async () => {
    if (!venue) {
      toast("Please connect to a venue first");
      return;
    }
    if (!agentName.trim()) {
      toast("Please enter an agent name");
      return;
    }
    if (!isProviderReady(llmProvider)) {
      toast("No API key found for this provider");
      return;
    }
    if (isReservedAgentId) {
      toast(`"${DEFAULT_AGENT_ID}" is reserved for the workspace prompt bar — pick another id`);
      return;
    }
    setCreating(true);
    try {
      const provider = LLM_PROVIDERS[llmProvider];
      const result = await venue.agents.create({
        agentId: resolvedAgentId,
        config: {
          operation: "v/ops/llmagent/chat",
          llmOperation: provider.operation,
          // The agent loop forwards `model` into the LLM op input
          // (AbstractLLMAdapter K_MODEL); omitted → provider default.
          ...(resolvedModel && { model: resolvedModel }),
          ...(systemPrompt.trim() && { systemPrompt: systemPrompt.trim() }),
        },
      });

      if (initialCommand.trim()) {
        // Fire-and-forget (wait:false): without it the SDK blocks until the
        // initial task reaches a terminal state, so a failed task would surface
        // below as a false "Unable to create agent" even though creation already
        // succeeded. Task failures instead show up via normal job polling (#142).
        await venue.agents.request(result.agentId, { task: initialCommand.trim() }, false);
      }

      toast("Agent created", {
        description: `Agent "${result.agentId}" is now ${result.status}`,
      });
      setAgentName("");
      setAgentId("");
      setAgentIdEdited(false);
      setSystemPrompt("");
      setInitialCommand("");
      setOpen(false);
      onCreated?.();
    } catch (err) {
      toast("Unable to create agent", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button data-testid="create-agent-trigger" className="shrink-0 gap-2">
            <PlusCircledIcon />
            Create Agent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col bg-card text-card-foreground max-h-[85vh] overflow-y-auto">
        <DialogTitle className="space-y-2">
          <Label className="text-md">Create a new agent</Label>
          <Separator />
        </DialogTitle>
        <DialogDescription className="sr-only">
          Configure the identity, model, and initial prompt for a new venue agent.
        </DialogDescription>

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
              onChange={(e) => {
                setAgentName(e.target.value);
                if (!agentIdEdited) setAgentId(slugify(e.target.value));
              }}
            />
          </div>

          {/* Agent ID */}
          <div className="space-y-2 w-full">
            <Label htmlFor="agent-id" className="w-32 text-sm">
              Agent ID:
            </Label>
            <Input
              id="agent-id"
              placeholder="e.g., customer-support-agent"
              value={agentId}
              onChange={(e) => {
                setAgentId(e.target.value);
                setAgentIdEdited(true);
              }}
            />
            {isReservedAgentId ? (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle size={12} />
                &quot;{DEFAULT_AGENT_ID}&quot; is reserved for the workspace prompt bar — pick another id.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Unique identifier — auto-suggested from name. Edit to override.
              </p>
            )}
          </div>

          {/* LLM Provider */}
          <div className="space-y-2 w-full">
            <Label>LLM Provider:</Label>
            <Select value={llmProvider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LLM_PROVIDERS).map(([id, provider]) => (
                  <SelectItem key={id} value={id}>
                    {provider.label}
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

          {/* Model */}
          <div className="space-y-2 w-full">
            <Label>Model:</Label>
            <Select
              value={model || DEFAULT_MODEL_OPTION}
              onValueChange={(v) => setModel(v === DEFAULT_MODEL_OPTION ? "" : v)}
            >
              <SelectTrigger data-testid="model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_MODEL_OPTION}>Venue default</SelectItem>
                {(LLM_PROVIDERS[llmProvider]?.models ?? []).map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
                <SelectItem value={CUSTOM_MODEL_OPTION}>Custom…</SelectItem>
              </SelectContent>
            </Select>
            {model === CUSTOM_MODEL_OPTION && (
              <Input
                data-testid="model-custom-input"
                placeholder="e.g. claude-opus-4-8"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Venue default uses the provider&apos;s configured model.
            </p>
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

        {!venue && (
          <p className="text-xs text-amber-500 flex items-center gap-1">
            <AlertTriangle size={12} />
            No venue connected.{" "}
            <Link href="/venues" className="underline">
              Connect one in Venues
            </Link>
          </p>
        )}

        <Button
          aria-label="create agent"
          role="button"
          data-testid="create-agent"
          onClick={handleNewAgent}
          disabled={creating || !venue || !agentName.trim() || !isProviderReady(llmProvider) || isReservedAgentId}
          className="btn-sm mt-2"
        >
          {creating ? "Creating..." : "Create"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
