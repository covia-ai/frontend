"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { SecretList } from "@/components/SecretList";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Info, ChevronRight } from "lucide-react";
import { KNOWN_LLM_KEYS } from "@/config/llm-providers";

export default function SecretsPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <h2 className="text-2xl font-thin mb-4">
          Manage your{" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            secrets
          </span>
        </h2>

        <Collapsible className="border border-blue-500/30 bg-blue-500/5 rounded-lg mb-6">
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 text-sm font-semibold text-foreground cursor-pointer">
            <ChevronRight size={16} className="text-blue-500 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
            <Info size={16} className="text-blue-500" />
            LLM API Key Naming Convention
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4">
              <p className="text-sm text-muted-foreground mb-3">
                To use LLM providers in your workspaces, store your API keys with the following names. Agents and tools in the workspace will automatically look for these secret names.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {Object.entries(KNOWN_LLM_KEYS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">{key}</code>
                    <span className="text-muted-foreground">— {label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">MISTRAL_API_KEY</code>
                  <span className="text-muted-foreground">— Mistral</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">GROQ_API_KEY</code>
                  <span className="text-muted-foreground">— Groq</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">COHERE_API_KEY</code>
                  <span className="text-muted-foreground">— Cohere</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <SecretList />
      </div>
    </ContentLayout>
  );
}
