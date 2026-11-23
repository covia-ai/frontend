"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { ContextTiers } from "@/components/ContextTiers";
import { MemoryPanel } from "@/components/MemoryPanel";
import { PageHeading } from "@/components/PageHeading";
import { Brain } from "lucide-react";

// #228: explains Covia's context tiers (always visible, answers "what does
// my agent know and where does it come from" without a click — AC1) and hosts
// the Memory panel (#163), which renders directly by default (AC3). The single
// "Memory" tab shell was dropped — a tab bar that can't switch reads as broken;
// when a second tier surface exists, reintroduce Tabs here.
export default function ContextPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-2" size="sm" align="left" text="Your agent's" highlight="Context" />
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Everything an agent can know comes from one of these places. Each
          tier below explains its scope and links to where you can browse it.
        </p>

        <ContextTiers />

        <section className="mt-8" data-testid="context-memory-section">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Brain size={18} className="text-primary" /> Memory
          </h2>
          <MemoryPanel />
        </section>
      </div>
    </ContentLayout>
  );
}
