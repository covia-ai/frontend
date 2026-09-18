"use client";

import { useEffect, useMemo, useState } from "react";
import type { Venue } from "@covia/covia-sdk";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { saveSkill } from "@/lib/skill-authoring";
import { USER_SKILLSET, validateSkillMarkdown } from "@/lib/skills";

export type SkillEditorMode = "create" | "edit" | "duplicate";

const COPY: Record<SkillEditorMode, { title: string; description: string; action: string }> = {
  create: {
    title: "New skill",
    description: `Write a SKILL.md. It is stored in your workspace at ${USER_SKILLSET}/<name>, where the name comes from the frontmatter.`,
    action: "Create skill",
  },
  edit: {
    title: "Edit skill",
    description: "Changes apply to future reads and loads. An agent's already-loaded copy stays as it was until it reloads the skill.",
    action: "Save changes",
  },
  duplicate: {
    title: "Duplicate to your workspace",
    description: `A copy is written to ${USER_SKILLSET}/<name>, where it shadows a venue skill of the same name in agent configurations. Rename it in the frontmatter to keep both.`,
    action: "Create copy",
  },
};

export function SkillEditorDialog({
  venue,
  mode,
  initialMarkdown,
  open,
  onOpenChange,
  onSaved,
}: {
  venue: Venue;
  mode: SkillEditorMode;
  initialMarkdown: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the path the venue wrote, so the caller can reload and select it. */
  onSaved: (path: string) => void;
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [saving, setSaving] = useState(false);

  // Reopening for a different skill must not show the previous draft. Keyed on
  // `open` as well so cancelling and reopening restores the original text
  // rather than leaving the abandoned edit in place.
  useEffect(() => {
    if (open) {
      setMarkdown(initialMarkdown);
      setSaving(false);
    }
  }, [open, initialMarkdown]);

  const check = useMemo(() => validateSkillMarkdown(markdown), [markdown]);
  const copy = COPY[mode];

  const save = async () => {
    if (!check.ok) return;
    setSaving(true);
    try {
      const result = await saveSkill(venue, markdown);
      // The venue reports the frontmatter keys it recognised but does not
      // store, so a dropped key is visible rather than silently lost.
      if (result.ignored.length > 0) {
        notifyWarning(`Saved without ${result.ignored.join(", ")}`, {
          description: `This venue does not store ${result.ignored.length === 1 ? "that frontmatter key" : "those frontmatter keys"}. Everything else was saved.`,
        });
      } else {
        notifySuccess(result.existed ? `Updated ${result.name}` : `Created ${result.name}`);
      }
      onSaved(result.path);
      onOpenChange(false);
    } catch (cause) {
      notifyError(`Unable to save ${mode === "edit" ? "changes" : "skill"}`, cause, venue.baseUrl);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <Textarea
          aria-label="Skill markdown"
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          spellCheck={false}
          // The Textarea primitive sets `field-sizing-content`, so it grows to
          // fit. Long skills (the venue's own a2a skill is ~4KB) then push the
          // dialog past the viewport and the Save button out of reach, so cap
          // the height and let the textarea scroll inside instead.
          className="max-h-[50vh] min-h-[22rem] overflow-y-auto font-mono text-[13px] leading-6"
        />

        <p
          className={check.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}
          role={check.ok ? undefined : "alert"}
        >
          {check.ok
            ? `Saves to ${USER_SKILLSET}/${check.name}`
            : check.error}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!check.ok || saving}>
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
            {copy.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
