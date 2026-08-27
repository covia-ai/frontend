"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { ContextTiers } from "@/components/ContextTiers";
import { MemoryPanel } from "@/components/MemoryPanel";
import { PageHeading } from "@/components/PageHeading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// #228: explains Covia's context tiers (always visible, answers "what does
// my agent know and where does it come from" without a click — AC1) and
// hosts the Memory panel (#163) as the first, default-open tab (AC3). The
// rest of #228 — scope badges beyond this page, more tabs per tier — can
// grow here later; this covers the filed acceptance criteria.
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

        <Tabs defaultValue="memory" className="mt-8">
          <TabsList className="mb-4">
            <TabsTrigger value="memory" data-testid="context-tab-memory">Memory</TabsTrigger>
          </TabsList>

          <TabsContent value="memory">
            <MemoryPanel />
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  );
}
