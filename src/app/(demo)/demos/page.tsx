"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { JobLifecycleDemo } from "@/components/JobLifecycleDemo";
import { PageHeading } from "@/components/PageHeading";

export default function DemosPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <PageHeading
          className="mb-2"
          size="sm"
          align="left"
          text="Run a job with the"
          highlight="TypeScript SDK"
        />
        <p className="text-sm text-muted-foreground mb-6">
          A live walkthrough of how the SDK executes work on a venue.
        </p>
        <JobLifecycleDemo />
      </div>
    </ContentLayout>
  );
}
