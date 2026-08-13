"use client";

import {
  Bot, BookOpen, Boxes, GitFork, Hammer, LucideIcon, Minus, Network, Search, Sparkles, Lock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { AddNewAgent } from "./AddNewAgent";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useAgentTemplates, type AgentTemplate } from "@/hooks/use-agent-templates";
import { PageHeading } from "./PageHeading";
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
    <div className="flex flex-col items-center justify-center w-full px-10 py-10">
      <PageHeading className="mb-3" text="Start with a" highlight="template" />
      <p className="mb-8 max-w-2xl text-center text-sm text-muted-foreground">
        Templates provide a tested starting configuration that you can adjust before creating the agent.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner variant="ellipsis" className="text-primary" size={48} />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-16">
          This venue doesn&apos;t publish any agent templates.
        </p>
      ) : (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((template) => {
            const Icon = ICONS[template.key] ?? Bot;
            return (
              <Card
                key={template.key}
                className="bg-card border border-muted hover:border-accent flex flex-col items-center justify-between p-6 gap-4 rounded-lg transition-colors"
              >
                <div className="text-primary mt-2"><Icon size={32} /></div>
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground capitalize">
                    {templateTitle(template)}
                  </div>
                  {/* Clamp so cards stay even — venue descriptions run 150–250 chars. */}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-4" title={template.description}>
                    {template.description}
                  </p>
                </div>
                {isAuthenticated ? (
                  <AddNewAgent
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-primary text-primary hover:bg-primary/20 hover:text-primary"
                      >
                        Use Template
                      </Button>
                    }
                    initialAgentName={template.key}
                    initialSystemPrompt={template.systemPrompt ?? ""}
                    initialProvider={providerForOperation(template.llmOperation)}
                    initialModel={template.model ?? ""}
                    initialConfig={template.config}
                    initialConfigPreview={template.preview}
                  />
                ) : (
                  <Button variant="outline" size="sm" disabled className="w-full mt-2 gap-2 text-muted-foreground">
                    <Lock size={12} /> Sign in to use
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// The name is "Skilled Agent Template" etc. — on a "Choose a Template" page the
// " Agent Template" suffix is noise on every card, so drop it: "Skilled".
function templateTitle(t: AgentTemplate): string {
  return (t.name ?? t.key).replace(/\s*Agent Template$/i, "").trim() || t.key;
}
