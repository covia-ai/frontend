
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { ShowCase } from "@/components/ShowCase";
import { AIPrompt } from "@/components/AIPrompt";
import { TopBar } from "@/components/admin-panel/TopBar";
import { SeparatorWithText } from "@/components/SeparatorWithText";

export default function Home() {
  return (
    <ContentLayout>
      <TopBar/>
      <AIPrompt/>
      <SeparatorWithText text="or"/>
      <ShowCase/>
    </ContentLayout>
  );
}
