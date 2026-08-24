"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { MemoryPanel } from "@/components/MemoryPanel";
import { PageHeading } from "@/components/PageHeading";

// Scoped to #163 (User Memory panel): the full context-tiers page (#228 —
// scope badges, links into every explorer view, v/ read-only framing) is a
// separate, larger pass. This is just Memory's home for now.
export default function ContextPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Your" highlight="Memory" />

        <MemoryPanel />
      </div>
    </ContentLayout>
  );
}
