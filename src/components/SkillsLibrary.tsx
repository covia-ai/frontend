"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Venue } from "@covia/covia-sdk";
import { Bot, BookOpenCheck, ChevronLeft, Copy, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypeTile } from "@/components/TypeTile";
import { skillLook } from "@/lib/workspace-look";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SkillEditorDialog, type SkillEditorMode } from "@/components/SkillEditorDialog";
import { useSkillsLibrary } from "@/hooks/use-skills-library";
import { deleteSkill } from "@/lib/skill-authoring";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  agentUsesSkill,
  isEditableSkill,
  NEW_SKILL_TEMPLATE,
  skillToMarkdown,
  type SkillSummary,
} from "@/lib/skills";

function AgentsUsingSkill({ venue, skill }: { venue: Venue; skill: SkillSummary }) {
  const [agents, setAgents] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await venue.agents.list(true);
      const details = await Promise.all(
        result.agents.map((agent) => venue.agents.info(agent.agentId).catch(() => null)),
      );
      setAgents(details
        .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
        .filter((detail) => agentUsesSkill(detail.config, skill))
        .map((detail) => detail.agentId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-8 border-t pt-5">
      <h3 className="text-sm font-semibold">Agents using this skill</h3>
      {agents === null ? (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()} disabled={loading}>
          {loading && <Loader2 className="mr-2 animate-spin" size={14} />}
          Find agents
        </Button>
      ) : agents.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {agents.map((agentId) => (
            <Button key={agentId} asChild variant="outline" size="sm">
              <Link href={`/agents/agent/${encodeURIComponent(agentId)}`}>
                <Bot size={14} /> {agentId}
              </Link>
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No current agent configuration references this skill.</p>
      )}
      {error && <p className="mt-2 text-sm text-destructive">Unable to inspect agent configurations.</p>}
    </section>
  );
}

export function SkillsLibrary() {
  const library = useSkillsLibrary();
  const [query, setQuery] = useState("");
  // The list + detail sit side-by-side from md up. Below md they don't both
  // fit, so we drill down: the list picks a skill, which swaps to the detail
  // (full width) with a back bar. The hook auto-selects the first skill, so this
  // is its own view state rather than being derived from selectedPath.
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  // One dialog serves create/edit/duplicate; `seed` is the SKILL.md it opens
  // with, so the three differ only in their starting text and wording.
  const [editor, setEditor] = useState<{ mode: SkillEditorMode; seed: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SkillSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return library.skills;
    return library.skills.filter((skill) =>
      `${skill.name} ${skill.description} ${skill.path}`.toLowerCase().includes(needle),
    );
  }, [library.skills, query]);
  const userSkills = library.skills.filter((skill) => skill.source === "user");

  const confirmDelete = async () => {
    if (!library.venue || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteSkill(library.venue, pendingDelete.path);
      notifySuccess(`Deleted ${pendingDelete.name}`);
      setPendingDelete(null);
      library.reload();
    } catch (cause) {
      notifyError("Unable to delete skill", cause, library.venue.baseUrl);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ContentLayout>
      <TopBar />
      <div className="flex flex-wrap items-start justify-between gap-3 py-5">
        <div>
          <h1 className="text-2xl font-semibold">Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the instructions and tools agents can load from this venue and your workspace.
          </p>
        </div>
        {library.venue && (
          <Button onClick={() => setEditor({ mode: "create", seed: NEW_SKILL_TEMPLATE })}>
            <Plus size={15} className="mr-1.5" /> New skill
          </Button>
        )}
      </div>

      {!library.venue ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border text-center">
          <BookOpenCheck size={36} className="text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Select a venue to browse its skills.</p>
        </div>
      ) : library.loading ? (
        <div className="flex min-h-80 items-center justify-center" role="status">
          <Loader2 className="animate-spin text-primary" size={28} />
          <span className="sr-only">Loading skills</span>
        </div>
      ) : library.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {library.error}
        </div>
      ) : (
        <div className="grid min-h-[620px] grid-cols-1 overflow-hidden rounded-xl border bg-background md:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)]">
          <aside className={cn("min-w-0 flex-col border-r", mobileView === "list" ? "flex" : "hidden", "md:flex")}>
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <Input
                  aria-label="Search skills"
                  placeholder="Search skills"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filtered.map((skill) => (
                <button
                  key={skill.path}
                  type="button"
                  className={`w-full border-b px-4 py-3 text-left transition-colors ${
                    library.selectedPath === skill.path ? "bg-accent" : "hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    library.setSelectedPath(skill.path);
                    setMobileView("detail");
                  }}
                >
                  <div className="flex items-start gap-3">
                    {(() => {
                      const look = skillLook(skill.key || skill.name);
                      return (
                        <TypeTile
                          Icon={look.Icon}
                          tile={look.tile}
                          className="size-7"
                          iconSize={15}
                          title={look.label}
                        />
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{skill.name}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                          {skill.source}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {skill.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No matching skills.</p>
              )}
            </div>
            {userSkills.length === 0 && (
              <div className="border-t bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                No user skills yet. Skills in <code className="font-mono">w/skills</code> appear here and can override venue defaults in agent configurations.
                <button
                  type="button"
                  className="mt-1 block font-medium text-foreground underline underline-offset-2"
                  onClick={() => setEditor({ mode: "create", seed: NEW_SKILL_TEMPLATE })}
                >
                  Write your first skill
                </button>
              </div>
            )}
          </aside>

          <main className={cn("min-w-0 flex-col overflow-y-auto p-6 sm:p-8", mobileView === "detail" ? "flex" : "hidden", "md:flex")}>
            <button
              type="button"
              onClick={() => setMobileView("list")}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground md:hidden"
            >
              <ChevronLeft size={16} className="shrink-0" />
              Back to skills
            </button>
            {library.detailLoading ? (
              <div className="flex min-h-60 items-center justify-center" role="status">
                <Loader2 className="animate-spin text-primary" size={24} />
                <span className="sr-only">Loading skill</span>
              </div>
            ) : library.detail ? (
              <article>
                <div className="flex flex-wrap items-start gap-3 border-b pb-5">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-semibold">{library.detail.name}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {library.detail.description}
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                      {library.detail.path}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{library.detail.source}</Badge>
                    {isEditableSkill(library.detail) ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditor({ mode: "edit", seed: skillToMarkdown(library.detail!) })
                          }
                        >
                          <Pencil size={14} className="mr-1.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setPendingDelete(library.detail)}
                        >
                          <Trash2 size={14} className="mr-1.5" /> Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditor({ mode: "duplicate", seed: skillToMarkdown(library.detail!) })
                        }
                      >
                        <Copy size={14} className="mr-1.5" /> Duplicate to workspace
                      </Button>
                    )}
                  </div>
                </div>

                {library.detail.tools.length > 0 && (
                  <section className="py-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tools</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {library.detail.tools.map((tool) => (
                        <Badge key={tool} variant="outline" className="font-mono text-[11px]">{tool}</Badge>
                      ))}
                    </div>
                  </section>
                )}

                <section className="py-5">
                  {library.detail.body ? (
                    <MarkdownMessage className="text-[15px] leading-7">{library.detail.body}</MarkdownMessage>
                  ) : (
                    <p className="text-sm text-muted-foreground">This skill has no separate instruction body.</p>
                  )}
                </section>

                <AgentsUsingSkill venue={library.venue} skill={library.detail} />
              </article>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center text-center text-muted-foreground">
                <BookOpenCheck size={36} />
                <p className="mt-3 text-sm">Select a skill to read it.</p>
                {library.detailError && <p className="mt-2 text-sm text-destructive">{library.detailError}</p>}
              </div>
            )}
          </main>
        </div>
      )}

      {library.venue && editor && (
        <SkillEditorDialog
          venue={library.venue}
          mode={editor.mode}
          initialMarkdown={editor.seed}
          open
          onOpenChange={(next) => !next && setEditor(null)}
          onSaved={(path) => library.reload(path)}
        />
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && !deleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{pendingDelete?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <code className="font-mono">{pendingDelete?.path}</code> from your
              workspace. Agents configured to load it will no longer find it, and a venue skill of
              the same name it was shadowing becomes visible again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                // Keep the dialog up while the delete runs; it closes on success.
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Delete skill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContentLayout>
  );
}
