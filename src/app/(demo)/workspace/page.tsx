
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { WorkspaceExplorer } from "@/components/WorkspaceExplorer";
import { PageHeading } from "@/components/PageHeading";
import { useIsAuthenticated } from "@/hooks/use-auth";

export default function WorkspacePage() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <ContentLayout>
      <TopBar/>
      <div className="py-4">
        <PageHeading className="mb-4" size="sm" align="left" text="Manage your" highlight="Workspace" />

        {isAuthenticated ? (
          <WorkspaceExplorer/>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sign in to view your workspace data.
          </p>
        )}
      </div>
    </ContentLayout>
  );
}
