"use client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { EllipsisVertical, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { toast } from "sonner";
import { KNOWN_LLM_KEYS, LLM_PROVIDERS } from "@/config/llm-providers";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { AgentStatus } from "@covia/covia-sdk";
import { useRouter } from "next/navigation";
import { PageHeading } from "./PageHeading";

// Sentinel picker value — never a real agentId — meaning "create a fresh,
// distinctly-named agent" rather than targeting an existing one.
const NEW_AGENT_OPTION = "__new__";

function makeWorkspaceAgentId(): string {
  return `workspace-agent-${Date.now().toString(36)}`;
}

export const AIPrompt = () => {
  const [prompt, setPrompt] = useState('')
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [showPickerDialog, setShowPickerDialog] = useState(false)
  const [detectedKeys, setDetectedKeys] = useState<string[]>([])
  const [selectedSecretName, setSelectedSecretName] = useState('')
  const [agentOptions, setAgentOptions] = useState<{ agentId: string; status: string }[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>(DEFAULT_AGENT_ID)
  const [pendingAgentId, setPendingAgentId] = useState<string>(DEFAULT_AGENT_ID)
  const venue = useAuthenticatedVenue();
  const router = useRouter();

  const promptSamples = [
    'Customer onboarding automation',
    'Contract review and signature',
    'Automate the security patching process for servers',
    'Define a multi-agent orchestration strategy for a Content Publishing',
    'Migrate a static HTML website to a modern React framework'
  ]

  // Populates the picker's option list. Best-effort and separate from the
  // fresh venue.agents.list() call in handleMagicWand — that one drives the
  // actual resume/create/send decision, this one only feeds the dropdown, so
  // it being briefly stale (until the next refresh) never causes a bad send.
  async function refreshAgentOptions() {
    if (!venue) { setAgentOptions([]); return; }
    try {
      const { agents } = await venue.agents.list();
      setAgentOptions(agents);
    } catch {
      // Non-fatal — picker just falls back to Default agent / New agent.
    }
  }

  useEffect(() => {
    refreshAgentOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);

  const { defaultAgentLabel, otherAgents } = useMemo(() => {
    const hasDefault = agentOptions.some((a) => a.agentId === DEFAULT_AGENT_ID);
    return {
      defaultAgentLabel: hasDefault ? "Default agent" : "Default agent (new)",
      otherAgents: agentOptions.filter((a) => a.agentId !== DEFAULT_AGENT_ID),
    };
  }, [agentOptions]);

  // Drives the subtext under the input — names whichever agent the next
  // submission will target.
  const selectedAgentLabel = selectedAgentId === NEW_AGENT_OPTION
    ? "a new agent"
    : selectedAgentId === DEFAULT_AGENT_ID
      ? "the default agent"
      : `"${selectedAgentId}"`;

  // True once the selected target is a real, non-terminated agent — i.e. the
  // task can be sent directly, no creation step needed.
  const targetAgentReady = selectedAgentId !== NEW_AGENT_OPTION &&
    agentOptions.some((a) => a.agentId === selectedAgentId && a.status !== AgentStatus.TERMINATED);

  // Fire-and-forget task dispatch on an already-existing, ready agent —
  // shared by every path once the target is confirmed usable.
  async function sendPrompt(agentId: string) {
    if (!venue) return;
    setCreating(true);
    try {
      // wait:false — fire-and-forget so a slow/failing task doesn't block navigation
      await venue.agents.request(agentId, { task: prompt }, false);
      router.push(`/agents/explorer?agentId=${encodeURIComponent(agentId)}`);
    } catch (err: any) {
      toast("Failed to send task", { description: err?.message ?? "Please try again." });
    } finally {
      setCreating(false);
    }
  }

  async function proceedWithKey(secretName: string, agentId: string) {
    if (!venue) return;

    const providerEntry = Object.entries(LLM_PROVIDERS).find(
      ([, p]) => p.secretKey === secretName
    );
    if (!providerEntry) {
      toast("Unknown provider for key " + secretName);
      return;
    }
    const [, provider] = providerEntry;

    setCreating(true);
    try {
      await venue.agents.create({
        agentId,
        // overwrite:true only matters when the slot is occupied — the venue
        // allows that solely for a TERMINATED agent (recreates it fresh).
        // This path only runs when the target is absent or TERMINATED, so
        // it's always safe here.
        overwrite: true,
        config: {
          operation: "v/ops/llmagent/chat",
          llmOperation: provider.operation,
          systemPrompt:
            "You are a helpful AI assistant working on the Covia grid. Complete the user's task thoroughly and report your results clearly.",
        },
      });
    } catch (err: any) {
      setCreating(false);
      toast("Failed to create agent", { description: err?.message ?? "Please try again." });
      return;
    }
    setCreating(false);
    await sendPrompt(agentId);
    refreshAgentOptions();
  }

  async function routeThroughKeyDetection(agentId: string) {
    if (!venue) return;
    setPendingAgentId(agentId);
    const secrets = await venue.secrets.list();
    const matchedKeys = secrets.filter((s: string) => s in KNOWN_LLM_KEYS);

    if (matchedKeys.length === 1) {
      toast(`Using ${KNOWN_LLM_KEYS[matchedKeys[0]]}`);
      await proceedWithKey(matchedKeys[0], agentId);
    } else if (matchedKeys.length > 1) {
      setDetectedKeys(matchedKeys);
      setShowPickerDialog(true);
    } else {
      setSelectedSecretName('');
      setShowKeyDialog(true);
    }
  }

  async function handleMagicWand() {
    if (!prompt.trim()) return;
    if (!venue) {
      toast("Please connect to a venue first");
      return;
    }

    setChecking(true);
    try {
      if (selectedAgentId === NEW_AGENT_OPTION) {
        // Always a fresh, distinctly-named agent — never collides with an
        // existing slot, so there's nothing to resume or reuse here.
        await routeThroughKeyDetection(makeWorkspaceAgentId());
        return;
      }

      // Reuse the selected agent directly once it exists — no key lookup,
      // no re-creation, just dispatch the task. A SUSPENDED agent is resumed
      // first, since a task sent to a suspended agent would just fail. A
      // TERMINATED agent can't be resumed, so it falls through to recreation
      // below instead (only reachable for the reserved default agent — the
      // picker excludes terminated agents from its option list).
      const { agents } = await venue.agents.list();
      const existing = agents.find((a) => a.agentId === selectedAgentId);
      if (existing && existing.status !== AgentStatus.TERMINATED) {
        if (existing.status === AgentStatus.SUSPENDED) {
          try {
            await venue.agents.resume(selectedAgentId);
          } catch (err: any) {
            toast("Failed to resume agent", { description: err?.message ?? "Please try again." });
            return;
          }
        }
        await sendPrompt(selectedAgentId);
        return;
      }

      await routeThroughKeyDetection(selectedAgentId);
    } catch {
      toast("Unable to prepare agent. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handlePickKey(secretName: string) {
    setShowPickerDialog(false);
    await proceedWithKey(secretName, pendingAgentId);
  }

  async function handleSaveKey() {
    if (!keyInput.trim() || !venue || !selectedSecretName) return;

    setSavingKey(true);
    try {
      await venue.secrets.set(selectedSecretName, keyInput.trim());
      toast(`${selectedSecretName} saved`);
      setShowKeyDialog(false);
      setKeyInput('');
      await proceedWithKey(selectedSecretName, pendingAgentId);
    } catch {
      toast("Failed to store the API key. Please try again.");
    } finally {
      setSavingKey(false);
    }
  }

  const busy = checking || creating || savingKey;

  return (
    <div data-testid="chat-container" className="flex flex-col items-center justify-center py-10 px-10 ">
        <PageHeading text="Do anything on" highlight="the Grid" />

        <div className="flex flex-col md:flex-row lg:flex-row items-center justify-center w-full space-x-2 space-y-2 ">
            <Input
            placeholder="Add a prompt and click the magic wand..."
            className="bg-card placeholder:text-muted-foreground my-2"
            aria-label="prompt"
            value={prompt}
            onChange={ (e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy) handleMagicWand(); }}
            disabled={busy}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Choose agent"
                data-testid="agent-picker"
                variant="ghost"
                size="icon"
                className="my-4 mx-0"
                disabled={busy}
              >
                <EllipsisVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Send to</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <DropdownMenuRadioItem value={DEFAULT_AGENT_ID}>{defaultAgentLabel}</DropdownMenuRadioItem>
                {otherAgents.map((a) => (
                  <DropdownMenuRadioItem key={a.agentId} value={a.agentId}>{a.agentId}</DropdownMenuRadioItem>
                ))}
                <DropdownMenuRadioItem value={NEW_AGENT_OPTION}>+ New agent</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            aria-label="Run"
            role="button"
            data-testid="chat-button"
            variant="default"
            className="my-4 btn btn-xs mx-0 bg-primary text-primary-foreground"
            disabled={!prompt.trim() || busy}
            onClick={handleMagicWand}
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <MagicWandIcon/>}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-md">
          This request will go to {selectedAgentLabel}. If you want to choose another agent,
          click the <EllipsisVertical size={12} className="inline align-text-bottom" /> icon before the magic wand.
        </p>

        {creating && (
          <p className="text-xs text-muted-foreground animate-pulse mt-1">
            {targetAgentReady ? "Sending task…" : "Creating agent and sending task…"}
          </p>
        )}

        {/* Picker dialog — shown when multiple LLM keys are detected */}
        <Dialog open={showPickerDialog} onOpenChange={setShowPickerDialog}>
          <DialogContent data-testid="chat-picker-dialog" className="flex flex-col items-center justify-center bg-card text-card-foreground gap-4">
            <DialogTitle>Choose an LLM provider</DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Multiple API keys detected in your secrets. Select which provider to use.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {detectedKeys.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handlePickKey(key)}
                  disabled={creating}
                >
                  {creating
                    ? <Loader2 className="animate-spin" size={14} />
                    : null}
                  <span className="font-semibold">{KNOWN_LLM_KEYS[key]}</span>
                  <span className="text-xs text-muted-foreground font-mono">({key})</span>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Key input dialog — shown when no LLM key is found */}
        <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
          <DialogContent data-testid="chat-dialog" className="flex flex-col items-center justify-center bg-card text-card-foreground gap-4">
            <DialogTitle>No LLM API key found</DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Add an API key for one of the supported providers. It will be securely stored in your venue secrets.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(KNOWN_LLM_KEYS).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={selectedSecretName === key ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedSecretName(key)}
                >
                  {label}
                </Badge>
              ))}
            </div>
            {selectedSecretName && (
              <>
                <Input
                  type="password"
                  placeholder={selectedSecretName}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
                />
                <Button
                  data-testid="chat-connect-to-model"
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim() || savingKey || creating}
                >
                  {savingKey ? "Saving…" : creating ? "Creating agent…" : "Save & Continue"}
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

         <div className="flex flex-row flex-wrap items-center justify-center w-full space-x-2 space-y-2 mt-4">
          {promptSamples.map( (promptText,_index) => (

             prompt == promptText ? (

              <Badge key={promptText} variant="outline" className="bg-primary-light cursor-pointer"
              onClick={() => setPrompt(promptText)}>
                {promptText}
              </Badge>
             ) : (
              <Badge key={promptText} variant="outline" className="bg-muted px-2 cursor-pointer hover:border-accent"
              onClick={() => setPrompt(promptText)}>
                {promptText}
              </Badge>
             )
          ))}
         </div>
      </div>
  );
};
