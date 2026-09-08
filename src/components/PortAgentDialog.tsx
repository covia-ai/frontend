"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownToLine,
  ExternalLink,
  FileText,
  Info,
  LifeBuoy,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { parseSkillFrontmatter } from "@/lib/skills";
import { gtmEvent } from "@/lib/utils";
import { DEFAULT_AGENT_ID } from "@/config/agents";
import { LLM_PROVIDERS } from "@/config/llm-providers";
import {
  AgentRuntimeFields,
  CUSTOM_PROVIDER_OPTION,
  DEFAULT_PROVIDER_OPTION,
  isAgentProviderReady,
  resolvedModelId,
} from "@/components/agent-config/AgentConfigEditor";

const MIGRATE_DOCS_URL = "https://docs.covia.ai/docs/user-guide/agents/migrate-an-agent";
const SKILLS_DOCS_URL = "https://docs.covia.ai/docs/user-guide/agents/tools-and-context";
const COMMUNITY_URL = "https://discord.gg/fywdrKd8QT";

const slugify = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

/** One staged SKILL.md, previewed from its frontmatter before it is imported. */
interface StagedSkill {
  id: number;
  name: string;
  description: string;
  text: string;
}

/** The output shape of v/ops/agent/from-skills. */
interface FromSkillsResult {
  agentId?: string;
  address?: string;
  status?: string;
  importedSkills?: string[];
  skillset?: string;
}

interface PortAgentDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Seed the name field when the dialog opens (e.g. converting a connected agent). */
  initialName?: string;
  /** Seed the system prompt when the dialog opens. */
  initialSystemPrompt?: string;
}

/**
 * Port an existing agent onto the venue as a native Covia agent (the M1
 * migration wedge): give its system prompt and its SKILL.md skills (pasted or
 * uploaded), optionally pick a model and a first task, and one call to
 * `v/ops/agent/from-skills` imports each skill and creates the agent that
 * indexes them. Tools and memory are not migrated here.
 */
export function PortAgentDialog({
  trigger,
  open,
  onOpenChange,
  initialName,
  initialSystemPrompt,
}: PortAgentDialogProps) {
  const router = useRouter();
  const venue = useAuthenticatedVenue();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const wasOpen = useRef(false);

  const [agentName, setAgentName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [skills, setSkills] = useState<StagedSkill[]>([]);
  const [draft, setDraft] = useState("");
  const [firstTask, setFirstTask] = useState("");
  const [creating, setCreating] = useState(false);
  const nextId = useRef(1);
  const fileInput = useRef<HTMLInputElement>(null);

  // Provider / model — defaults to the venue default (no key needed).
  const [llmProvider, setLlmProvider] = useState(DEFAULT_PROVIDER_OPTION);
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customProviderOperation, setCustomProviderOperation] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);

  const resolvedAgentId = slugify(agentName);
  const provider = LLM_PROVIDERS[llmProvider];
  const usingProvider = llmProvider !== DEFAULT_PROVIDER_OPTION;
  const isCustomProvider = llmProvider === CUSTOM_PROVIDER_OPTION;
  const providerReady = isAgentProviderReady(llmProvider, availableKeys);
  const needsKey = !!provider?.requiresKey && !providerReady;

  // Load the venue's stored secret names so the model picker knows which
  // providers already have a key.
  useEffect(() => {
    if (!isOpen || !venue) return;
    let active = true;
    venue.secrets.list()
      .then((secrets: string[]) => { if (active) setAvailableKeys(secrets); })
      .catch(() => { if (active) setAvailableKeys([]); });
    return () => { active = false; };
  }, [isOpen, venue]);

  // Seed name/prompt on the transition into open (e.g. converting a connected
  // agent), without clobbering edits while the dialog stays open.
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      if (initialName !== undefined) setAgentName(initialName);
      if (initialSystemPrompt !== undefined) setSystemPrompt(initialSystemPrompt);
    }
    wasOpen.current = isOpen;
  }, [isOpen, initialName, initialSystemPrompt]);

  const reset = () => {
    setAgentName("");
    setSystemPrompt("");
    setSkills([]);
    setDraft("");
    setFirstTask("");
    setLlmProvider(DEFAULT_PROVIDER_OPTION);
    setModel("");
    setCustomModel("");
    setCustomProviderOperation("");
    setApiKeyInput("");
  };

  const handleProviderChange = (id: string) => {
    setLlmProvider(id);
    if (id !== CUSTOM_PROVIDER_OPTION) setCustomProviderOperation("");
    setModel("");
    setCustomModel("");
  };

  /** Parse one SKILL.md and stage it; returns whether it was added. */
  const stageSkill = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const { name, description } = parseSkillFrontmatter(trimmed);
    if (!name || !description) {
      notifyWarning("That does not look like a SKILL.md", {
        description: "It needs a frontmatter block with a name and a description.",
      });
      return false;
    }
    if (skills.some((s) => s.name === name)) {
      notifyWarning(`A skill named "${name}" is already staged`);
      return false;
    }
    setSkills((prev) => [...prev, { id: nextId.current++, name, description, text: trimmed }]);
    return true;
  };

  const addFromDraft = () => {
    if (stageSkill(draft)) setDraft("");
  };

  const onFilesPicked = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        stageSkill(text);
      } catch {
        notifyWarning(`Could not read ${file.name}`);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeSkill = (id: number) => setSkills((prev) => prev.filter((s) => s.id !== id));

  const handlePort = async () => {
    if (!venue) {
      notifyWarning("Please connect to a venue first");
      return;
    }
    if (!agentName.trim() || !resolvedAgentId) {
      notifyWarning("Please enter an agent name");
      return;
    }
    if (resolvedAgentId === DEFAULT_AGENT_ID) {
      notifyWarning(`"${DEFAULT_AGENT_ID}" is reserved — pick another name`);
      return;
    }
    if (skills.length === 0 && !systemPrompt.trim()) {
      notifyWarning("Add a system prompt or at least one skill to port");
      return;
    }
    if (isCustomProvider && !customProviderOperation.trim()) {
      notifyWarning("Enter the custom provider operation path");
      return;
    }
    if (needsKey && !apiKeyInput.trim()) {
      notifyWarning(`Enter an API key for ${provider?.label}, or add one in Secrets`);
      return;
    }

    const llmOperation = isCustomProvider ? customProviderOperation.trim() : provider?.operation;
    const resolvedModel = resolvedModelId(model, customModel);

    setCreating(true);
    try {
      // Store a pasted key first so the provider operation can resolve it.
      if (needsKey && provider && apiKeyInput.trim()) {
        await venue.secrets.set(provider.secretKey, apiKeyInput.trim());
      }

      const result = await venue.operations.run<FromSkillsResult>("v/ops/agent/from-skills", {
        agentId: resolvedAgentId,
        ...(systemPrompt.trim() && { systemPrompt: systemPrompt.trim() }),
        skills: skills.map((s) => ({ text: s.text })),
        ...(usingProvider && llmOperation && { llmOperation }),
        ...(resolvedModel && { model: resolvedModel }),
      });
      const createdId = result?.agentId ?? resolvedAgentId;
      const importedCount = result?.importedSkills?.length ?? skills.length;

      // Fire-and-forget first task (wait:false), so a slow or failing task
      // does not turn a successful port into a false error — it surfaces via
      // normal job polling instead.
      if (firstTask.trim()) {
        await venue.agents.request(createdId, { task: firstTask.trim() }, false);
      }

      gtmEvent.createAgent(createdId, "from-skills");
      notifySuccess(`Ported ${createdId}`, {
        description: importedCount === 1 ? "1 skill imported" : `${importedCount} skills imported`,
      });
      reset();
      setOpen(false);
      router.push(`/agents/chat?agentId=${encodeURIComponent(createdId)}`);
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to port agent", reason, venue.baseUrl, jobHref);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="border-b p-6">
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine size={18} className="text-primary" /> Port an agent
          </DialogTitle>
          <DialogDescription>
            Bring an existing agent&apos;s system prompt and its SKILL.md skills across as a native
            Covia agent.{" "}
            <a
              href={MIGRATE_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              How porting works <ExternalLink size={12} />
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto p-6">
          <div className="flex gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
            <Info size={15} className="mt-0.5 shrink-0 text-primary" />
            <p>
              Covia imports each skill into your <span className="font-mono">w/skills</span> and
              creates a native agent that runs on your venue: governed, discoverable, and
              resumable. Its <span className="font-medium text-foreground">tools and memory are not
              migrated yet</span>, and those come next.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="port-name">Agent name</Label>
            <Input
              id="port-name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Refund bot"
              data-testid="port-agent-name"
            />
            {resolvedAgentId && (
              <p className="text-xs text-muted-foreground">
                Created at <span className="font-mono">g/{resolvedAgentId}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="port-prompt">System prompt</Label>
            <Textarea
              id="port-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are Acme's support agent. Follow the refund policy skill exactly."
              className="h-24 resize-none"
              data-testid="port-agent-prompt"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port-skill">Skills</Label>
            <p className="text-xs text-muted-foreground">
              Paste or upload a SKILL.md (the format Claude and others already use). Each one is
              imported into <span className="font-mono">w/skills</span> and indexed by the agent.{" "}
              <a
                href={SKILLS_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                What is a SKILL.md? <ExternalLink size={11} />
              </a>
            </p>

            {skills.length === 0 && (
              <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                No skills yet. You can port an agent with just a system prompt, but adding its skills
                is what carries its know-how across.
              </p>
            )}

            {skills.length > 0 && (
              <ul className="space-y-2" data-testid="port-skill-list">
                {skills.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 rounded-md border bg-card p-3">
                    <FileText size={16} className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSkill(s.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${s.name}`}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Textarea
              id="port-skill"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={"---\nname: refund-policy\ndescription: How to handle refund requests.\n---\n\n# Refund policy\n..."}
              className="h-32 resize-y font-mono text-xs"
              data-testid="port-skill-draft"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!draft.trim()}
                onClick={addFromDraft}
                data-testid="port-skill-add"
              >
                <Plus size={14} /> Add skill
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => fileInput.current?.click()}
                data-testid="port-skill-upload"
              >
                <Upload size={14} /> Upload SKILL.md
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                multiple
                className="hidden"
                onChange={(e) => onFilesPicked(e.target.files)}
              />
            </div>
          </div>

          <div className="space-y-4">
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
              allowVenueDefaultProvider
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port-first-task">
              First task <span className="font-normal text-muted-foreground">optional</span>
            </Label>
            <Input
              id="port-first-task"
              value={firstTask}
              onChange={(e) => setFirstTask(e.target.value)}
              placeholder="e.g. Draft a reply to a customer asking for a refund on a 20-day-old order"
              data-testid="port-agent-first-task"
            />
            <p className="text-xs text-muted-foreground">
              Runs as soon as the agent is created, so you land in a live conversation.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            <LifeBuoy size={15} className="mt-0.5 shrink-0" />
            <p>
              Porting from a specific framework? Most agents that expose a prompt and skills come
              across cleanly. If yours does not, tell us which framework on{" "}
              <a href={COMMUNITY_URL} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                the community
              </a>{" "}
              and we will look at supporting it, or see the{" "}
              <a href={MIGRATE_DOCS_URL} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                migration guide
              </a>{" "}
              for help.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t p-6">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handlePort} disabled={creating} className="gap-2" data-testid="port-agent-submit">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}
            Port agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
