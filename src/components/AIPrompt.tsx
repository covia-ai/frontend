"use client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { EllipsisVertical, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { usePendingChats } from "@/hooks/use-pending-chats";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter-placeholder";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { KNOWN_LLM_KEYS, LLM_PROVIDERS } from "@/config/llm-providers";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import type { AgentTemplate } from "@/hooks/use-agent-templates";
import { normalizeAgentEntries } from "@/lib/agent-list";
import { AgentStatus } from "@covia/covia-sdk";
import { useRouter } from "next/navigation";
import { PageHeading } from "./PageHeading";
import { cn, gtmEvent, SUGGESTION_PLACEHOLDER_CLASS } from "@/lib/utils";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useDeviceKeySignIn } from "@/hooks/use-device-key-signin";
import { DeviceKeyDialog } from "@/components/DeviceKeyDialog";
import { dispatchAgentMessage } from "@/lib/agent-chat";

// Sentinel picker value — never a real agentId — meaning "create a fresh,
// distinctly-named agent" rather than targeting an existing one.
const NEW_AGENT_OPTION = "__new__";

function makeWorkspaceAgentId(): string {
  return `workspace-agent-${Date.now().toString(36)}`;
}

type AIPromptProps = {
  fixedAgentId?: string;
  onChatStarted?: (agentId: string) => void;
};

export const AIPrompt = ({ fixedAgentId, onChatStarted }: AIPromptProps = {}) => {
  const [prompt, setPrompt] = useState('')
  const [promptFocused, setPromptFocused] = useState(false)
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [showPickerDialog, setShowPickerDialog] = useState(false)
  const [detectedKeys, setDetectedKeys] = useState<string[]>([])
  const [selectedSecretName, setSelectedSecretName] = useState('')
  const [agentOptions, setAgentOptions] = useState<{ agentId: string; status?: string }[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>(fixedAgentId ?? DEFAULT_AGENT_ID)
  const [pendingAgentId, setPendingAgentId] = useState<string>(fixedAgentId ?? DEFAULT_AGENT_ID)
  const venue = useAuthenticatedVenue();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const startPendingChat = usePendingChats((s) => s.startPendingChat);
  const attachSessionId = usePendingChats((s) => s.attachSessionId);
  const clearPendingChat = usePendingChats((s) => s.clearPendingChat);

  const {
    dialogOpen: signInDialogOpen, setDialogOpen: setSignInDialogOpen, openDialog: openSignInDialog,
    step: signInStep, setStep: setSignInStep, deviceKey: signInDeviceKey, deviceKeyDid: signInDeviceKeyDid,
    isExisting: signInIsExisting, pastedKey: signInPastedKey, keyError: signInKeyError,
    copied: signInCopied, checking: signInChecking, authError: signInAuthError, storedKeys: signInStoredKeys,
    handleGenerate: handleSignInGenerate, handleProvideKey: handleSignInProvideKey,
    handlePastedKeyChange: handleSignInPastedKeyChange, handleSubmitProvidedKey: handleSignInSubmitProvidedKey,
    handleCopy: handleSignInCopy, handleContinue: handleSignInContinue,
    handleUseStoredKey: handleSignInUseStoredKey, handleUseDifferentKey: handleSignInUseDifferentKey,
  } = useDeviceKeySignIn();

  const promptSamples = [
    'Automate an AP invoice pipeline',
    'Orchestrate a cross-venue workflow',
    'Publish an operation to REST, MCP, and A2A',
  ]

  const typingPromptSamples = [
    'Automate an AP invoice pipeline with agents',
    'Orchestrate a workflow across three venues',
    'Publish an operation to REST, MCP, and A2A',
    'Build an agent that scans and enriches vendor records',
    'Chat with a Gemini-powered agent about my data',
    'Set up a sovereign file store with DLFS',
    'Issue a UCAN to share access with a partner venue',
    'Infer a JSON schema from sample data',
  ]

  const animatedPlaceholder = useTypewriterPlaceholder(typingPromptSamples, prompt.length === 0 && !promptFocused);

  // Populates the picker's option list. Best-effort and separate from the
  // fresh venue.agents.list() call in handleMagicWand — that one drives the
  // actual resume/create/send decision, this one only feeds the dropdown, so
  // it being briefly stale (until the next refresh) never causes a bad send.
  async function refreshAgentOptions() {
    if (fixedAgentId) return;
    if (!venue) { setAgentOptions([]); return; }
    try {
      const { agents } = await venue.agents.list();
      setAgentOptions(normalizeAgentEntries(agents));
    } catch {
      // Non-fatal — picker just falls back to Assistant / New agent.
    }
  }

  useEffect(() => {
    refreshAgentOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, fixedAgentId]);

  const { defaultAgentLabel, otherAgents } = useMemo(() => {
    const hasDefault = agentOptions.some((a) => a.agentId === DEFAULT_AGENT_ID);
    return {
      defaultAgentLabel: hasDefault ? "Assistant" : "Assistant (new)",
      otherAgents: agentOptions.filter((a) => a.agentId !== DEFAULT_AGENT_ID),
    };
  }, [agentOptions]);

  // Drives the subtext under the input — names whichever agent the next
  // submission will target.
  const selectedAgentLabel = selectedAgentId === NEW_AGENT_OPTION
    ? "a new agent"
    : selectedAgentId === DEFAULT_AGENT_ID
      ? "the assistant"
      : `"${selectedAgentId}"`;

  // Conversational dispatch on an already-existing, ready agent — shared by
  // every path once the target is confirmed usable. The prompt travels over
  // agent_chat as a plain string message, not an agent_request task envelope:
  // a person typing here is starting a conversation, and an agent that judges
  // the work deserves a durable, tracked job can spawn one itself (the
  // manager-template pattern). chat() blocks until the agent replies, so the
  // promise is deliberately left un-awaited — we publish the message as a
  // pending chat first so the chat surface can echo it straight
  // away, then poll up the recorded turn and the eventual reply. Failures and
  // empty replies surface via toast, which is global (sonner) and so outlives
  // this component — as does this promise chain, so clearing the pending chat
  // on settle still runs after we have unmounted.
  function sendPrompt(agentId: string) {
    if (!venue) return;
    const text = prompt.trim();
    // No session id — chat() with none makes the venue mint a fresh session,
    // and it only comes back with the reply.
    const chat = startPendingChat({ agentId, sessionId: null, text });
    void dispatchAgentMessage({
      agentId,
      text,
      venueId: venue.venueId,
      venueBaseUrl: venue.baseUrl,
      send: (message) => venue.agents.chat(agentId, message),
    })
      .then((result) => {
        if (result?.sessionId) attachSessionId(chat, result.sessionId);
      })
      .catch(() => undefined)
      .finally(() => clearPendingChat(chat));
    if (onChatStarted) onChatStarted(agentId);
    else router.push(`/agents/chat?agentId=${encodeURIComponent(agentId)}`);
  }

  async function proceedWithKey(secretName: string, agentId: string) {
    if (!venue) return;

    const providerEntry = Object.entries(LLM_PROVIDERS).find(
      ([, p]) => p.secretKey === secretName
    );
    if (!providerEntry) {
      notifyWarning("Unknown provider for key " + secretName);
      return;
    }
    const [, provider] = providerEntry;

    setCreating(true);
    try {
      // The reserved assistant is built from the venue's own skilled template
      // (read job-free, same surface useAgentTemplates uses) rather than a
      // prompt/tools/skills set hardcoded here — so it gets the normal
      // read/list + skill-loading contract instead of a bare chat loop, and
      // stays in sync with the template instead of drifting from it. Only
      // the LLM provider is ours to decide, from the detected key; the
      // template's own model is never carried over, since it may not exist
      // for a different provider.
      const templateRead = await venue.workspace.read("v/agents/templates/skilled");
      if (!templateRead?.exists || !templateRead.value) {
        throw new Error("Skilled agent template not found on this venue");
      }
      const template = templateRead.value as Omit<AgentTemplate, "key">;

      // The venue no longer accepts agents.create's overwrite flag — a
      // TERMINATED slot (the only occupied state this path ever runs
      // against, see callers below) must be cleared with an explicit
      // delete(remove=true) before recreating. A fresh agentId has nothing
      // to clear. list() defaults to hiding TERMINATED agents, so
      // includeTerminated=true is required here — without it this check
      // never finds the very state it exists to catch.
      const { agents: existingAgents } = await venue.agents.list(true);
      if (normalizeAgentEntries(existingAgents).some((a) => a.agentId === agentId)) {
        await venue.agents.delete(agentId, true);
      }

      await venue.agents.create({
        agentId,
        config: {
          ...(template.skills?.length ? { skills: template.skills } : {}),
          ...(template.tools?.length ? { tools: template.tools } : {}),
          ...(template.defaultTools != null ? { defaultTools: template.defaultTools } : {}),
          operation: template.operation ?? "v/ops/llmagent/chat",
          llmOperation: provider.operation,
          ...(template.systemPrompt && { systemPrompt: template.systemPrompt }),
        },
      });
    } catch (err: any) {
      setCreating(false);
      gtmEvent.createAgentFailed(agentId, err?.message);
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to create agent", reason, undefined, jobHref);
      return;
    }
    setCreating(false);
    gtmEvent.createAgent(agentId, provider.operation);
    sendPrompt(agentId);
    refreshAgentOptions();
  }

  async function routeThroughKeyDetection(agentId: string) {
    if (!venue) return;
    setPendingAgentId(agentId);
    const secrets = await venue.secrets.list();
    const matchedKeys = secrets.filter((s: string) => s in KNOWN_LLM_KEYS);

    if (matchedKeys.length === 1) {
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
    if (!isAuthenticated) {
      openSignInDialog();
      return;
    }
    if (!venue) {
      notifyWarning("Please connect to a venue first");
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
      const existing = normalizeAgentEntries(agents).find((a) => a.agentId === selectedAgentId);
      if (existing && existing.status !== AgentStatus.TERMINATED) {
        if (existing.status === AgentStatus.SUSPENDED) {
          try {
            await venue.agents.resume(selectedAgentId);
            gtmEvent.resumeAgent(selectedAgentId);
          } catch (err: any) {
            gtmEvent.resumeAgentFailed(selectedAgentId, err?.message);
            const { reason, jobHref } = jobFailure(err, venue.venueId);
            notifyError("Unable to resume agent", reason, undefined, jobHref);
            return;
          }
        }
        sendPrompt(selectedAgentId);
        return;
      }

      await routeThroughKeyDetection(selectedAgentId);
    } catch (err) {
      notifyError("Unable to prepare agent", err, venue.baseUrl);
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
      notifySuccess(`${selectedSecretName} saved`);
      setShowKeyDialog(false);
      setKeyInput('');
      await proceedWithKey(selectedSecretName, pendingAgentId);
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to store API key", reason, venue.baseUrl, jobHref);
    } finally {
      setSavingKey(false);
    }
  }

  const busy = checking || creating || savingKey;

  return (
    <div data-testid="chat-container" className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-4 py-10 sm:px-10">
        <PageHeading
          text={fixedAgentId ? "How can I" : "Do anything on"}
          highlight={fixedAgentId ? "help?" : "the Grid"}
        />

        <Card className="mt-6 w-full max-w-3xl gap-1 rounded-3xl p-3 shadow-sm">
          <Textarea
            placeholder={promptFocused ? '' : animatedPlaceholder}
            className={cn(
              "min-h-12 resize-none border-none bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent",
              SUGGESTION_PLACEHOLDER_CLASS,
            )}
            aria-label="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !busy) {
                e.preventDefault();
                handleMagicWand();
              }
            }}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            disabled={busy}
          />

          <div className="flex items-center justify-end gap-1">
            {!fixedAgentId && <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label="Choose agent"
                      data-testid="agent-picker"
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                    >
                      <EllipsisVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Your message will go to {selectedAgentLabel}. Click to choose another agent.
                </TooltipContent>
              </Tooltip>
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
            </DropdownMenu>}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Run"
                  role="button"
                  data-testid="chat-button"
                  variant="default"
                  size="icon"
                  className="rounded-full"
                  disabled={!prompt.trim() || busy}
                  onClick={handleMagicWand}
                >
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <MagicWandIcon/>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                This will send your message to {selectedAgentLabel}.
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>

        {creating && (
          <p className="text-xs text-muted-foreground animate-pulse mt-1">
            Creating agent…
          </p>
        )}
        {fixedAgentId && !creating && (
          <p className="mt-2 text-xs text-muted-foreground">
            Your assistant will be created from the venue&apos;s skilled template when you send your first message.
          </p>
        )}

        {/* Picker dialog — shown when multiple LLM keys are detected */}
        <Dialog open={showPickerDialog} onOpenChange={setShowPickerDialog}>
          <DialogContent data-testid="chat-picker-dialog" className="flex flex-col items-center justify-center bg-card text-card-foreground gap-4">
            <DialogTitle>Choose an LLM provider</DialogTitle>
            <DialogDescription className="text-center">
              Multiple API keys detected in your secrets. Select which provider to use.
            </DialogDescription>
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
            <DialogDescription className="text-center">
              Add an API key for one of the supported providers. It will be securely stored in your venue secrets.
            </DialogDescription>
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

        <DeviceKeyDialog
          open={signInDialogOpen}
          onOpenChange={setSignInDialogOpen}
          step={signInStep}
          setStep={setSignInStep}
          deviceKey={signInDeviceKey}
          deviceKeyDid={signInDeviceKeyDid}
          isExisting={signInIsExisting}
          pastedKey={signInPastedKey}
          onPastedKeyChange={handleSignInPastedKeyChange}
          keyError={signInKeyError}
          copied={signInCopied}
          checking={signInChecking}
          authError={signInAuthError}
          storedKeys={signInStoredKeys}
          onGenerate={handleSignInGenerate}
          onProvideKey={handleSignInProvideKey}
          onSubmitProvidedKey={handleSignInSubmitProvidedKey}
          onCopy={handleSignInCopy}
          onContinue={handleSignInContinue}
          onUseStoredKey={handleSignInUseStoredKey}
          onUseDifferentKey={handleSignInUseDifferentKey}
        />

         <div className="flex flex-row flex-wrap items-center justify-center w-full gap-2 mt-6">
          {promptSamples.map( (promptText,_index) => (

             prompt == promptText ? (

              <Badge key={promptText} variant="outline" className="bg-primary-light cursor-pointer px-2 py-1 text-xs"
              onClick={() => setPrompt(promptText)}>
                {promptText}
              </Badge>
             ) : (
              <Badge key={promptText} variant="outline" className="bg-muted px-2 py-1 text-xs cursor-pointer hover:border-accent"
              onClick={() => setPrompt(promptText)}>
                {promptText}
              </Badge>
             )
          ))}
         </div>
      </div>
  );
};
