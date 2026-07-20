
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { WorkspaceExplorer } from "@/components/WorkspaceExplorer";
import { useIsAuthenticated } from "@/hooks/use-auth";

export default function WorkspacePage() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <ContentLayout>
      <TopBar/>
      {isAuthenticated ? (
        <WorkspaceExplorer/>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Sign in to view your workspace data.
        </p>
      )}
    </ContentLayout>
  );
}
