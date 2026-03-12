
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ShowCase } from "@/components/ShowCase";
import { AIPrompt } from "@/components/AIPrompt";
import { TopBar } from "@/components/admin-panel/TopBar";
import { SeperatorWithText } from "@/components/SeperatorWithText";
export default function Workspace() {
  return (
    <ContentLayout>
      <TopBar/>
      <AIPrompt/>
      <SeperatorWithText text="or"/>
      <ShowCase/>
    </ContentLayout>
  );
}
