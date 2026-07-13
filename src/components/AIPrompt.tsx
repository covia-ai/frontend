"use client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { toast } from "sonner";
import { KNOWN_LLM_KEYS, LLM_PROVIDERS } from "@/config/llm-providers";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { AgentStatus } from "@covia/covia-sdk";
import { useRouter } from "next/navigation";

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
  const venue = useAuthenticatedVenue();
  const router = useRouter();

  const promptSamples = [
    'Customer onboarding automation',
    'Contract review and signature',
    'Automate the security patching process for servers',
    'Define a multi-agent orchestration strategy for a Content Publishing',
    'Migrate a static HTML website to a modern React framework'
  ]

  // Fire-and-forget task dispatch on the (already-existing) default agent,
  // shared by both the first-time and reuse paths so navigation stays instant.
  async function sendPrompt() {
    if (!venue) return;
    setCreating(true);
    try {
      // wait:false — fire-and-forget so a slow/failing task doesn't block navigation
      await venue.agents.request(DEFAULT_AGENT_ID, { task: prompt }, false);
      router.push(`/agents/explorer?agentId=${encodeURIComponent(DEFAULT_AGENT_ID)}`);
    } catch (err: any) {
      toast("Failed to send task", { description: err?.message ?? "Please try again." });
    } finally {
      setCreating(false);
    }
  }

  async function proceedWithKey(secretName: string) {
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
        agentId: DEFAULT_AGENT_ID,
        // overwrite:true only matters when the slot is occupied — the venue
        // allows that solely for a TERMINATED agent (recreates it fresh),
        // and this path is only reached when the default agent is absent
        // or TERMINATED, so it's always safe here.
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
    await sendPrompt();
  }

  async function handleMagicWand() {
    if (!prompt.trim()) return;
    if (!venue) {
      toast("Please connect to a venue first");
      return;
    }

    setChecking(true);
    try {
      // Reuse the default agent directly once it exists — no key lookup,
      // no re-creation, just dispatch the task. A SUSPENDED agent is resumed
      // first, since a task sent to a suspended agent would just fail. A
      // TERMINATED agent can't be resumed, so it falls through to recreation
      // below instead.
      const { agents } = await venue.agents.list();
      const existing = agents.find((a) => a.agentId === DEFAULT_AGENT_ID);
      if (existing && existing.status !== AgentStatus.TERMINATED) {
        if (existing.status === AgentStatus.SUSPENDED) {
          try {
            await venue.agents.resume(DEFAULT_AGENT_ID);
          } catch (err: any) {
            toast("Failed to resume agent", { description: err?.message ?? "Please try again." });
            return;
          }
        }
        await sendPrompt();
        return;
      }

      const secrets = await venue.secrets.list();
      const matchedKeys = secrets.filter((s: string) => s in KNOWN_LLM_KEYS);

      if (matchedKeys.length === 1) {
        toast(`Using ${KNOWN_LLM_KEYS[matchedKeys[0]]}`);
        await proceedWithKey(matchedKeys[0]);
      } else if (matchedKeys.length > 1) {
        setDetectedKeys(matchedKeys);
        setShowPickerDialog(true);
      } else {
        setSelectedSecretName('');
        setShowKeyDialog(true);
      }
    } catch {
      toast("Unable to prepare agent. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handlePickKey(secretName: string) {
    setShowPickerDialog(false);
    await proceedWithKey(secretName);
  }

  async function handleSaveKey() {
    if (!keyInput.trim() || !venue || !selectedSecretName) return;

    setSavingKey(true);
    try {
      await venue.secrets.set(selectedSecretName, keyInput.trim());
      toast(`${selectedSecretName} saved`);
      setShowKeyDialog(false);
      setKeyInput('');
      await proceedWithKey(selectedSecretName);
    } catch {
      toast("Failed to store the API key. Please try again.");
    } finally {
      setSavingKey(false);
    }
  }

  const busy = checking || creating || savingKey;

  return (
    <div data-testid="chat-container" className="flex flex-col items-center justify-center py-10 px-10 ">
        <h3 className="text-center text-4xl  font-thin">
          Do anything on   {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            the Grid ...
          </span>
        </h3>

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

        {creating && (
          <p className="text-xs text-muted-foreground animate-pulse mt-1">
            Sending task…
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

              <Badge key={promptText} variant="outline" className="bg-primary-light"
              onClick={() => setPrompt(promptText)}>
                {promptText}
              </Badge>
             ) : (
              <Badge key={promptText} variant="outline" className="bg-muted px-2 hover:border-white"
              onClick={() => setPrompt(promptText)}>
                {promptText}
              </Badge>
             )
          ))}
         </div>
      </div>
  );
};
