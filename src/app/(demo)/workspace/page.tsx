
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { WorkspaceExplorer } from "@/components/WorkspaceExplorer";
import { PageHeading } from "@/components/PageHeading";

export default function WorkspacePage() {
  return (
    <ContentLayout>
      <TopBar/>
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Manage your" highlight="Workspace" />

        <WorkspaceExplorer/>
      </div>
    </ContentLayout>
  );
}
