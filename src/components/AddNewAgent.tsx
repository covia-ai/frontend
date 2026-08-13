"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { LLM_PROVIDERS } from "@/config/llm-providers";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { AlertTriangle, BookmarkPlus } from "lucide-react";
import Link from "next/link";
import { gtmEvent, SUGGESTION_PLACEHOLDER_CLASS } from "@/lib/utils";
import {
  AgentRuntimeFields,
  AgentSystemPromptField,
  CUSTOM_PROVIDER_OPTION,
  isAgentProviderReady,
  modelSelectionFromId,
  resolvedModelId,
} from "@/components/agent-config/AgentConfigEditor";
import {
  AGENT_TEMPLATES_CHANGED_EVENT,
  asSdkAgentConfig,
  inlineAgentConfigPreview,
  type AgentConfigInput,
  type AgentConfigMap,
  withAgentConfigOverrides,
  withoutAgentConfigFields,
} from "@/lib/agent-templates";

interface AddNewAgentProps {
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dialogTitle?: string;
  submitLabel?: string;
  initialAgentName?: string;
  initialSystemPrompt?: string;
  initialProvider?: string;
  initialModel?: string;
  preferAvailableProvider?: boolean;
  /** Exact template/clone config: an inline map, reference, or ordered layers. */
  initialConfig?: AgentConfigInput;
  /** Resolved inline fields for describing configs that contain references. */
  initialConfigPreview?: AgentConfigMap;
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

export function AddNewAgent({
  trigger,
  open: controlledOpen,
  onOpenChange,
  dialogTitle = "Create a new agent",
  submitLabel = "Create",
  initialAgentName = "",
  initialSystemPrompt = "",
  initialProvider = "anthropic",
  initialModel = "",
  preferAvailableProvider = true,
  initialConfig,
  initialConfigPreview,
}: AddNewAgentProps = {}) {
  const router = useRouter();
  const [agentName, setAgentName] = useState(initialAgentName);
  const [agentId, setAgentId] = useState("");
  const [agentIdEdited, setAgentIdEdited] = useState(false);
  const [llmProvider, setLlmProvider] = useState(initialProvider);
  const [customProviderOperation, setCustomProviderOperation] = useState("");
  // "" = venue default (model omitted from config); CUSTOM_MODEL_OPTION shows
  // a free-text input for ids not in the curated list.
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [initialCommand, setInitialCommand] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  // A key pasted inline when the chosen provider has none — stored on create
  // so you don't have to leave the dialog to add it in Secrets first.
  const [apiKeyInput, setApiKeyInput] = useState("");


  const venue = useAuthenticatedVenue();
  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const resolvedAgentId = agentId.trim() || slugify(agentName);
  const isReservedAgentId = resolvedAgentId === DEFAULT_AGENT_ID;

  useEffect(() => {
    if (!open) return;
    setAgentName(initialAgentName);
    setAgentId(slugify(initialAgentName));
    setAgentIdEdited(false);
    setSystemPrompt(initialSystemPrompt);
    setLlmProvider(initialProvider);
    setCustomProviderOperation("");
    const modelSelection = modelSelectionFromId(initialProvider, initialModel);
    setModel(modelSelection.model);
    setCustomModel(modelSelection.customModel);
    setInitialCommand("");
    setApiKeyInput("");
    if (!venue) return;
    venue.secrets
      .list()
      .then((secrets: string[]) => {
        setAvailableKeys(secrets);
        // Templates all default to OpenAI, but most users hold a different key.
        // If the seeded provider has no key and another does, switch to a ready
        // one so "Use Template" just works instead of showing "No API key".
        const ready = (id: string) => {
          const p = LLM_PROVIDERS[id];
          return !!p && (!p.requiresKey || secrets.includes(p.secretKey));
        };
        if (preferAvailableProvider && !ready(initialProvider)) {
          const pick = Object.keys(LLM_PROVIDERS).find(ready);
          if (pick) {
            setLlmProvider(pick);
            setModel("");
            setCustomModel("");
          }
        }
      })
      .catch(() => setAvailableKeys([]));
  }, [
    open,
    venue,
    initialAgentName,
    initialSystemPrompt,
    initialProvider,
    initialModel,
    preferAvailableProvider,
  ]);

  // The model actually sent in the agent config; "" means omit (venue default).
  const resolvedModel = resolvedModelId(model, customModel);

  const handleProviderChange = (providerId: string) => {
    setLlmProvider(providerId);
    if (providerId !== CUSTOM_PROVIDER_OPTION) setCustomProviderOperation("");
    // Model ids are provider-specific — a Claude id is meaningless on OpenAI.
    setModel("");
    setCustomModel("");
  };

  const isProviderReady = (providerId: string) =>
    isAgentProviderReady(providerId, availableKeys);

  const buildAgentConfig = (): AgentConfigInput => {
    const provider = LLM_PROVIDERS[llmProvider];
    const baseConfig = withoutAgentConfigFields(
      initialConfig,
      ["llmOperation", "model", "systemPrompt"],
    );
    const overrides: AgentConfigMap = {
      ...(initialConfig === undefined ? { operation: "v/ops/llmagent/chat" } : {}),
      llmOperation:
        llmProvider === CUSTOM_PROVIDER_OPTION
          ? customProviderOperation.trim()
          : provider.operation,
      ...(resolvedModel && { model: resolvedModel }),
      ...(systemPrompt.trim() && { systemPrompt: systemPrompt.trim() }),
    };
    return withAgentConfigOverrides(baseConfig, overrides);
  };

  const handleNewAgent = async () => {
    if (!venue) {
      notifyWarning("Please connect to a venue first");
      return;
    }
    if (!agentName.trim()) {
      notifyWarning("Please enter an agent name");
      return;
    }
    if (llmProvider === CUSTOM_PROVIDER_OPTION && !customProviderOperation.trim()) {
      notifyWarning("Enter the custom provider operation path");
      return;
    }
    const provider = LLM_PROVIDERS[llmProvider];
    // The provider needs a key it doesn't have. Accept one pasted inline rather
    // than making the user leave for the Secrets page.
    const needsKey = !!provider?.requiresKey && !isProviderReady(llmProvider);
    if (needsKey && !apiKeyInput.trim()) {
      notifyWarning(`Enter an API key for ${provider.label}, or add one in Secrets`);
      return;
    }
    if (isReservedAgentId) {
      notifyWarning(`"${DEFAULT_AGENT_ID}" is reserved for the workspace prompt bar — pick another id`);
      return;
    }
    setCreating(true);
    try {
      // Store the pasted key first so the provider op can resolve it.
      if (needsKey && apiKeyInput.trim()) {
        await venue.secrets.set(provider.secretKey, apiKeyInput.trim());
      }
      const result = await venue.agents.create({
        agentId: resolvedAgentId,
        config: asSdkAgentConfig(buildAgentConfig()),
      });

      if (initialCommand.trim()) {
        // Fire-and-forget (wait:false): without it the SDK blocks until the
        // initial task reaches a terminal state, so a failed task would surface
        // below as a false "Unable to create agent" even though creation already
        // succeeded. Task failures instead show up via normal job polling (#142).
        await venue.agents.request(result.agentId, { task: initialCommand.trim() }, false);
      }

      gtmEvent.createAgent(result.agentId, llmProvider);
      setAgentName("");
      setAgentId("");
      setAgentIdEdited(false);
      setSystemPrompt("");
      setCustomProviderOperation("");
      setInitialCommand("");
      setOpen(false);
      router.push(`/agents/chat?agentId=${encodeURIComponent(result.agentId)}`);
    } catch (err) {
      gtmEvent.createAgentFailed(resolvedAgentId, err instanceof Error ? err.message : undefined);
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to create agent", reason, venue.baseUrl, jobHref);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (
      !venue || !agentName.trim() || !resolvedAgentId || isReservedAgentId ||
      (llmProvider === CUSTOM_PROVIDER_OPTION && !customProviderOperation.trim())
    ) return;
    const path = `w/templates/${resolvedAgentId}`;
    setSavingTemplate(true);
    try {
      const existing = await venue.workspace.read(path);
      if (existing?.exists) {
        notifyWarning("A template with this ID already exists", { description: path });
        return;
      }
      await venue.workspace.write(path, {
        name: agentName.trim(),
        agent: { config: buildAgentConfig() },
      });
      window.dispatchEvent(new Event(AGENT_TEMPLATES_CHANGED_EVENT));
      notifySuccess("Template saved", { description: path });
    } catch (error) {
      notifyError("Unable to save agent template", error, venue.baseUrl);
    } finally {
      setSavingTemplate(false);
    }
  };

  const configPreview = initialConfigPreview ?? (
    initialConfig === undefined ? {} : inlineAgentConfigPreview(initialConfig)
  );
  const previewSkills = Array.isArray(configPreview.skills) ? configPreview.skills : [];
  const previewTools = Array.isArray(configPreview.tools) ? configPreview.tools : [];
  const hasTemplateCapabilities = Boolean(
    previewSkills.length || previewTools.length || configPreview.defaultTools,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button data-testid="create-agent-trigger" className="shrink-0 gap-2">
              <PlusCircledIcon />
              Create Agent
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden bg-card p-0 text-card-foreground sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-lg">{dialogTitle}</DialogTitle>
          <DialogDescription>
            Define the agent, then create it now or save the configuration as a template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 overflow-y-auto lg:grid-cols-2">
          <section
            data-testid="agent-identity-column"
            className="flex flex-col gap-5 p-6 lg:border-r"
          >
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                data-testid="agent-name"
                id="agent-name"
                className={SUGGESTION_PLACEHOLDER_CLASS}
                placeholder="e.g., Customer Support Agent"
                value={agentName}
                onChange={(e) => {
                  setAgentName(e.target.value);
                  if (!agentIdEdited) setAgentId(slugify(e.target.value));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-id">Agent ID</Label>
              <Input
                id="agent-id"
                className={SUGGESTION_PLACEHOLDER_CLASS}
                placeholder="e.g., customer-support-agent"
                value={agentId}
                onChange={(e) => {
                  setAgentId(e.target.value);
                  setAgentIdEdited(true);
                }}
              />
              {isReservedAgentId ? (
                <p className="flex items-center gap-1 text-sm text-amber-500">
                  <AlertTriangle size={14} />
                  &quot;{DEFAULT_AGENT_ID}&quot; is reserved. Choose another ID.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generated from the name. You can change it.
                </p>
              )}
            </div>

            <AgentSystemPromptField
              value={systemPrompt}
              onChange={setSystemPrompt}
            />
          </section>

          <section
            data-testid="agent-settings-column"
            className="flex flex-col gap-5 border-t p-6 lg:border-t-0"
          >
            <div>
              <h3 className="font-semibold">Settings</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose the runtime settings for this agent.
              </p>
            </div>

            {initialConfig && hasTemplateCapabilities && (
              <p data-testid="template-capabilities" className="rounded-md border p-3 text-sm text-muted-foreground">
                Includes{previewSkills.length ? ` a skills index (${previewSkills.join(", ")})` : ""}
                {previewTools.length ? `${previewSkills.length ? "," : ""} ${previewTools.length} tool${previewTools.length === 1 ? "" : "s"}` : ""}
                {configPreview.defaultTools ? `${previewSkills.length || previewTools.length ? ", and" : ""} the platform default tools` : ""}.
              </p>
            )}

            <AgentRuntimeFields
              providerId={llmProvider}
              onProviderChange={handleProviderChange}
              model={model}
              onModelChange={setModel}
              customModel={customModel}
              onCustomModelChange={setCustomModel}
              availableKeys={availableKeys}
              apiKey={apiKeyInput}
              onApiKeyChange={setApiKeyInput}
              customProviderOperation={customProviderOperation}
              onCustomProviderOperationChange={setCustomProviderOperation}
            />

            <div className="space-y-2">
              <Label htmlFor="initial-command">First task <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                id="initial-command"
                className={SUGGESTION_PLACEHOLDER_CLASS}
                placeholder="e.g., Greet the user and ask how you can help"
                value={initialCommand}
                onChange={(e) => setInitialCommand(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Sent after creation. This is not saved in a template.
              </p>
            </div>

            {!venue && (
              <p className="flex items-center gap-1 text-sm text-amber-500">
                <AlertTriangle size={14} /> No venue connected.{" "}
                <Link href="/venues" className="underline">Connect one in Venues</Link>.
              </p>
            )}
          </section>
        </div>

        <DialogFooter data-testid="agent-actions" className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            data-testid="save-agent-template"
            onClick={handleSaveTemplate}
            disabled={
              savingTemplate || creating || !venue || !agentName.trim() ||
              isReservedAgentId ||
              (llmProvider === CUSTOM_PROVIDER_OPTION && !customProviderOperation.trim())
            }
            className="gap-2"
          >
            <BookmarkPlus size={16} />
            {savingTemplate ? "Saving…" : "Save template"}
          </Button>
          <Button
            aria-label="create agent"
            type="button"
            data-testid="create-agent"
            onClick={handleNewAgent}
            disabled={
              creating || savingTemplate || !venue || !agentName.trim() ||
              !isProviderReady(llmProvider) || isReservedAgentId ||
              (llmProvider === CUSTOM_PROVIDER_OPTION && !customProviderOperation.trim())
            }
          >
            {creating ? "Creating…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
