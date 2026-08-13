"use client";

import {
  Bot, BookOpen, Boxes, GitFork, Hammer, LucideIcon, Minus, Network, Search, Sparkles, Lock,
} from "lucide-react";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { AddNewAgent } from "./AddNewAgent";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useAgentTemplates, type AgentTemplate } from "@/hooks/use-agent-templates";
import { providerForOperation } from "@/lib/agent-config";

// A recognisable face per template. Falls back to a generic bot for any the
// venue adds later that we don't have an icon for.
const ICONS: Record<string, LucideIcon> = {
  skilled: Sparkles,
  full: Boxes,
  worker: Hammer,
  manager: Network,
  analyst: Search,
  reader: BookOpen,
  minimal: Minus,
  goaltree: GitFork,
};

export function AgentTemplates() {
  const isAuthenticated = useIsAuthenticated();
  const { templates, loading } = useAgentTemplates();

  return (
    <section className="w-full px-4 py-6 sm:px-10">
      <h2 className="text-lg font-semibold">Start from a template</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a ready-made configuration, then adjust it as needed.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner variant="ellipsis" className="text-primary" size={48} />
        </div>
      ) : templates.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">
          No templates are available from this venue.
        </p>
      ) : (
        <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((template) => {
            const Icon = ICONS[template.key] ?? Bot;
            const title = templateTitle(template);
            const card = (
              <button
                type="button"
                disabled={!isAuthenticated}
                aria-label={isAuthenticated ? `Use ${title} template` : `${title} template — sign in to use`}
                className="group flex min-h-28 w-full cursor-pointer flex-col gap-3 rounded-lg border border-muted bg-card p-4 text-left shadow-sm transition-colors enabled:hover:border-primary/60 enabled:hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex w-full items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base font-medium capitalize text-foreground">
                    {title}
                  </span>
                  {!isAuthenticated && <Lock size={15} className="shrink-0 text-muted-foreground" />}
                </span>
                <span className="line-clamp-2 text-sm leading-5 text-muted-foreground" title={template.description}>
                  {template.description}
                </span>
              </button>
            );

            if (!isAuthenticated) return <span key={template.key}>{card}</span>;
            return (
              <AddNewAgent
                key={template.key}
                trigger={card}
                initialAgentName={title}
                initialSystemPrompt={template.systemPrompt ?? ""}
                initialProvider={providerForOperation(template.llmOperation)}
                initialModel={template.model ?? ""}
                initialConfig={template.config}
                initialConfigPreview={template.preview}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

// The name is "Skilled Agent Template" etc. — on a "Choose a Template" page the
// " Agent Template" suffix is noise on every card, so drop it: "Skilled".
function templateTitle(t: AgentTemplate): string {
  return (t.name ?? t.key).replace(/\s*Agent Template$/i, "").trim() || t.key;
}
