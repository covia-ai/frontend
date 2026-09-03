"use client";

import { useRef, useState } from "react";
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
import { ArrowDownToLine, ExternalLink, FileText, Info, Loader2, Plus, X } from "lucide-react";

const MIGRATE_DOCS_URL = "https://docs.covia.ai/docs/user-guide/agents/migrate-an-agent";
const SKILLS_DOCS_URL = "https://docs.covia.ai/docs/user-guide/agents/tools-and-context";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { parseSkillFrontmatter } from "@/lib/skills";
import { gtmEvent } from "@/lib/utils";
import { DEFAULT_AGENT_ID } from "@/config/agents";

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
}

/**
 * Port an existing agent onto the venue as a native Covia agent (the M1
 * migration wedge): paste its system prompt and its SKILL.md skills, and one
 * call to `v/ops/agent/from-skills` imports each skill and creates the agent
 * that indexes them. Tools and memory are not migrated here.
 */
export function PortAgentDialog({ trigger, open, onOpenChange }: PortAgentDialogProps) {
  const router = useRouter();
  const venue = useAuthenticatedVenue();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [agentName, setAgentName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [skills, setSkills] = useState<StagedSkill[]>([]);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const nextId = useRef(1);

  const resolvedAgentId = slugify(agentName);

  const reset = () => {
    setAgentName("");
    setSystemPrompt("");
    setSkills([]);
    setDraft("");
  };

  const addSkill = () => {
    const text = draft.trim();
    if (!text) return;
    const { name, description } = parseSkillFrontmatter(text);
    if (!name || !description) {
      notifyWarning("That does not look like a SKILL.md", {
        description: "It needs a frontmatter block with a name and a description.",
      });
      return;
    }
    if (skills.some((s) => s.name === name)) {
      notifyWarning(`A skill named "${name}" is already staged`);
      return;
    }
    setSkills((prev) => [...prev, { id: nextId.current++, name, description, text }]);
    setDraft("");
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

    setCreating(true);
    try {
      const result = await venue.operations.run<FromSkillsResult>("v/ops/agent/from-skills", {
        agentId: resolvedAgentId,
        ...(systemPrompt.trim() && { systemPrompt: systemPrompt.trim() }),
        skills: skills.map((s) => ({ text: s.text })),
      });
      const createdId = result?.agentId ?? resolvedAgentId;
      const importedCount = result?.importedSkills?.length ?? skills.length;

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
              Paste a SKILL.md (the format Claude and others already use), then add it. Each one is
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!draft.trim()}
              onClick={addSkill}
              data-testid="port-skill-add"
            >
              <Plus size={14} /> Add skill
            </Button>
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
