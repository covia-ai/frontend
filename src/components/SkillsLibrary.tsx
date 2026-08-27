"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Venue } from "@covia/covia-sdk";
import { Bot, BookOpenCheck, Loader2, Search } from "lucide-react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSkillsLibrary } from "@/hooks/use-skills-library";
import { agentUsesSkill, type SkillSummary } from "@/lib/skills";

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
              <Link href={`/agents/view?agentId=${encodeURIComponent(agentId)}`}>
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
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return library.skills;
    return library.skills.filter((skill) =>
      `${skill.name} ${skill.description} ${skill.path}`.toLowerCase().includes(needle),
    );
  }, [library.skills, query]);
  const userSkills = library.skills.filter((skill) => skill.source === "user");

  return (
    <ContentLayout>
      <TopBar />
      <div className="py-5">
        <h1 className="text-2xl font-semibold">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the instructions and tools agents can load from this venue and your workspace.
        </p>
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
        <div className="grid min-h-[620px] grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] overflow-hidden rounded-xl border bg-background">
          <aside className="flex min-w-0 flex-col border-r">
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
                  onClick={() => library.setSelectedPath(skill.path)}
                >
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{skill.name}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                      {skill.source}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {skill.description}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No matching skills.</p>
              )}
            </div>
            {userSkills.length === 0 && (
              <div className="border-t bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                No user skills yet. Skills placed in <code className="font-mono">w/skills</code> appear here and can override venue defaults in agent configurations.
              </div>
            )}
          </aside>

          <main className="min-w-0 overflow-y-auto p-6 sm:p-8">
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
                  <Badge variant="secondary" className="capitalize">{library.detail.source}</Badge>
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
    </ContentLayout>
  );
}
