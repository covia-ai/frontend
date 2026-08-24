
"use client";

import { useSearchParams } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { WorkspaceExplorer } from "@/components/WorkspaceExplorer";
import { PageHeading } from "@/components/PageHeading";

export default function WorkspacePage() {
  // ?path= deep-links here (e.g. from the Context page's tier cards) —
  // read once at mount, see use-workspace-explorer's startPath handling.
  const initialPath = useSearchParams().get("path") ?? undefined;

  return (
    <ContentLayout>
      <TopBar/>
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Manage your" highlight="Workspace" />

        <WorkspaceExplorer initialPath={initialPath}/>
      </div>
    </ContentLayout>
  );
}
