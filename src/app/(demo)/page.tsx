
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ShowCase } from "@/components/ShowCase";
import { AIPrompt } from "@/components/AIPrompt";
import { TopBar } from "@/components/admin-panel/TopBar";
import { SeperatorWithText } from "@/components/SeperatorWithText";
import { WorkspaceExplorer } from "@/components/WorkspaceExplorer";
import { useIsAuthenticated } from "@/hooks/use-auth";

export default function Workspace() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <ContentLayout>
      <TopBar/>
      <AIPrompt/>
      <SeperatorWithText text="or"/>
      <ShowCase/>
      {isAuthenticated && (
        <>
          <SeperatorWithText text="Workspace Data"/>
          <WorkspaceExplorer/>
        </>
      )}
    </ContentLayout>
  );
}
