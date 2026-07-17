
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ShowCase } from "@/components/ShowCase";
import { AIPrompt } from "@/components/AIPrompt";
import { TopBar } from "@/components/admin-panel/TopBar";
import { SeparatorWithText } from "@/components/SeparatorWithText";
import { WorkspaceExplorer } from "@/components/WorkspaceExplorer";
import { useIsAuthenticated } from "@/hooks/use-auth";

export default function Workspace() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <ContentLayout>
      <TopBar/>
      <AIPrompt/>
      <SeparatorWithText text="or"/>
      <ShowCase/>
      {isAuthenticated && (
        <>
          <SeparatorWithText text="Workspace Data"/>
          <WorkspaceExplorer/>
        </>
      )}
    </ContentLayout>
  );
}
