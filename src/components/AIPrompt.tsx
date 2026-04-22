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

const KNOWN_LLM_KEYS: Record<string, string> = {
  OPENAI_API_KEY: "OpenAI",
  ANTHROPIC_API_KEY: "Anthropic",
  GOOGLE_API_KEY: "Google Gemini",
  MISTRAL_API_KEY: "Mistral",
  GROQ_API_KEY: "Groq",
  COHERE_API_KEY: "Cohere",
};

export const AIPrompt = () => {
  const [prompt, setPrompt] = useState('')
  const [checking, setChecking] = useState(false)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [showPickerDialog, setShowPickerDialog] = useState(false)
  const [detectedKeys, setDetectedKeys] = useState<string[]>([])
  const [selectedSecretName, setSelectedSecretName] = useState('')
  const venue = useAuthenticatedVenue();

  const promptSamples = [
    'Customer onboarding automation',
    'Contract review and signature',
    'Automate the security patching process for servers',
    'Define a multi-agent orchestration strategy for a Content Publishing',
    'Migrate a static HTML website to a modern React framework'
  ]

  function proceedWithKey(secretName: string) {
    toast(`Using stored ${secretName} (${KNOWN_LLM_KEYS[secretName]})`);
    // TODO: execute the AI prompt with the selected model
  }

  async function handleMagicWand() {
    if (!prompt.trim()) return;
    if (!venue) {
      toast("Please connect to a venue first");
      return;
    }

    setChecking(true);
    try {
      const secrets = await venue.secrets.list();
      const matchedKeys = secrets.filter((s: string) => s in KNOWN_LLM_KEYS);

      if (matchedKeys.length === 1) {
        proceedWithKey(matchedKeys[0]);
      } else if (matchedKeys.length > 1) {
        setDetectedKeys(matchedKeys);
        setShowPickerDialog(true);
      } else {
        // No LLM key found — prompt user to add one
        setSelectedSecretName('');
        setShowKeyDialog(true);
      }
    } catch {
      toast("Unable to check secrets. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  function handlePickKey(secretName: string) {
    setShowPickerDialog(false);
    proceedWithKey(secretName);
  }

  async function handleSaveKey() {
    if (!keyInput.trim() || !venue || !selectedSecretName) return;

    setSavingKey(true);
    try {
      await venue.secrets.put(selectedSecretName, keyInput.trim());
      toast(`${selectedSecretName} saved`);
      setShowKeyDialog(false);
      setKeyInput('');
      proceedWithKey(selectedSecretName);
    } catch {
      toast("Failed to store the API key. Please try again.");
    } finally {
      setSavingKey(false);
    }
  }

  return (
    <div data-testid="chat-container" className="flex flex-col items-center justify-center py-10 px-10 ">
        <h3 className="text-center text-4xl  font-thin">
          Do anything on   {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent dark:text-primary-light bg-clip-text">
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
          />

          <Button
            aria-label="Run"
            role="button"
            data-testid="chat-button"
            variant="default"
            className="my-4 btn btn-xs mx-0 bg-primary dark:bg-primary-light text-primary-foreground"
            disabled={!prompt.trim() || checking}
            onClick={handleMagicWand}
          >
            {checking ? <Loader2 className="animate-spin" size={16} /> : <MagicWandIcon/>}
          </Button>
        </div>

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
                >
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
                  disabled={!keyInput.trim() || savingKey}
                >
                  {savingKey ? "Saving..." : "Save & Continue"}
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

         <div className="flex flex-row flex-wrap items-center justify-center w-full space-x-2 space-y-2 mt-4">
          {promptSamples.map( (promptText,index) => (

             prompt == promptText ? (

              <Badge key={index} variant="outline" className="bg-primary-light"
              onClick={() => setPrompt(promptText)}>
                {promptText}
              </Badge>
             ) : (
              <Badge key={index} variant="outline" className="bg-muted px-2 hover:border-white"
              onClick={() => setPrompt(promptText)}>
                {promptText}
              </Badge>
             )
          ))}
         </div>
      </div>
  );
};
